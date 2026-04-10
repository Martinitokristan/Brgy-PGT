import { createHash } from "crypto";
import { VerificationScores } from "@/lib/verification/scoring";
import { runExternalVerificationEngine } from "@/lib/verification/engine";

const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function shannonEntropy(buf: Buffer) {
  if (buf.length === 0) return 0;
  const map = new Map<number, number>();
  for (const b of buf) map.set(b, (map.get(b) ?? 0) + 1);
  let entropy = 0;
  for (const c of map.values()) {
    const p = c / buf.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function hashIdFingerprint(validIdType: string, fileBuffer: Buffer) {
  const digest = createHash("sha256").update(fileBuffer).digest("hex");
  return createHash("sha256").update(`${validIdType}:${digest}`).digest("hex");
}

export async function runVerificationScan(params: {
  validIdType: string;
  validIdFile: File;
  selfieFile: File;
  duplicateRiskScore?: number;
  /** Real face-match score (0-100) from client-side face-api embedding comparison */
  clientFaceMatchScore?: number;
  /** Real liveness score (0-100) from client-side liveness challenge */
  clientLivenessScore?: number;
}): Promise<{
  scores: VerificationScores;
  risk_flags: string[];
  id_fingerprint_hash: string;
  engine_provider: string;
}> {
  const { validIdType, validIdFile, selfieFile, duplicateRiskScore = 0,
    clientFaceMatchScore, clientLivenessScore } = params;
  const riskFlags: string[] = [];

  const idBuf = Buffer.from(await validIdFile.arrayBuffer());
  const selfieBuf = Buffer.from(await selfieFile.arrayBuffer());

  const idEntropy = shannonEntropy(idBuf);
  const selfieEntropy = shannonEntropy(selfieBuf);

  // ID quality + authenticity heuristic
  let docAuth = 100;
  if (!ALLOWED_MIME.includes(validIdFile.type.toLowerCase())) {
    docAuth -= 45;
    riskFlags.push("id_invalid_mime");
  }
  if (validIdFile.size < 30_000) {
    docAuth -= 30;
    riskFlags.push("id_too_small");
  }
  if (idEntropy < 4.4) {
    docAuth -= 25;
    riskFlags.push("id_low_entropy_possible_edit");
  }

  // Liveness: use client-side challenge score if provided, otherwise quality heuristic
  let liveness = typeof clientLivenessScore === "number" && Number.isFinite(clientLivenessScore)
    ? clientLivenessScore
    : 88;
  if (!ALLOWED_MIME.includes(selfieFile.type.toLowerCase())) {
    liveness = Math.max(0, liveness - 40);
    riskFlags.push("selfie_invalid_mime");
  }
  if (selfieFile.size < 40_000) {
    liveness = Math.max(0, liveness - 20);
    riskFlags.push("selfie_low_quality");
  }
  if (selfieEntropy < 4.6) {
    liveness = Math.max(0, liveness - 10);
    riskFlags.push("selfie_low_entropy");
  }

  // Face match: use real client-side embedding comparison score if provided.
  // Fallback to quality-proximity heuristic if client score not available
  // (e.g. face not detected in ID photo, or old client).
  let faceMatch: number;
  if (typeof clientFaceMatchScore === "number" && Number.isFinite(clientFaceMatchScore)) {
    faceMatch = clientFaceMatchScore;
  } else {
    const sizeRatio = Math.min(validIdFile.size, selfieFile.size) / Math.max(validIdFile.size, selfieFile.size);
    const entropyGap = Math.abs(idEntropy - selfieEntropy);
    faceMatch = 75 + sizeRatio * 15 - entropyGap * 6;
  }
  if (faceMatch < 50) riskFlags.push("face_match_low_confidence");

  // OCR consistency placeholder: keep moderately high if ID type is selected and image quality is acceptable.
  let ocrConsistency = 82;
  if (!validIdType) ocrConsistency -= 35;
  if (docAuth < 55) ocrConsistency -= 20;
  if (validIdFile.size < 50_000) ocrConsistency -= 10;
  if (ocrConsistency < 50) riskFlags.push("ocr_consistency_low");

  const scores: VerificationScores = {
    doc_auth_score: clamp(docAuth),
    face_match_score: clamp(faceMatch),
    liveness_score: clamp(liveness),
    ocr_consistency_score: clamp(ocrConsistency),
    duplicate_risk_score: clamp(duplicateRiskScore),
  };

  let engineProvider = "heuristic";
  const external = await runExternalVerificationEngine({
    validIdType,
    validIdFile,
    selfieFile,
    duplicateRiskScore: clamp(duplicateRiskScore),
  });
  if (external) {
    engineProvider = external.provider ?? "external";
    if (typeof external.scores.doc_auth_score === "number") scores.doc_auth_score = clamp(external.scores.doc_auth_score);
    if (typeof external.scores.face_match_score === "number") scores.face_match_score = clamp(external.scores.face_match_score);
    if (typeof external.scores.liveness_score === "number") scores.liveness_score = clamp(external.scores.liveness_score);
    if (typeof external.scores.ocr_consistency_score === "number") scores.ocr_consistency_score = clamp(external.scores.ocr_consistency_score);
    if (typeof external.scores.duplicate_risk_score === "number") scores.duplicate_risk_score = clamp(external.scores.duplicate_risk_score);
    if (Array.isArray(external.risk_flags) && external.risk_flags.length > 0) {
      riskFlags.push(...external.risk_flags);
    }
  } else if (process.env.VERIFICATION_ENGINE_URL?.trim()) {
    riskFlags.push("external_engine_unavailable_fallback");
  }

  return {
    scores,
    risk_flags: [...new Set(riskFlags)],
    id_fingerprint_hash: hashIdFingerprint(validIdType, idBuf),
    engine_provider: engineProvider,
  };
}

