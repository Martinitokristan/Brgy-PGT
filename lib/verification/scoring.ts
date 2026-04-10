export type VerificationDecision = "auto_pass" | "manual_review" | "auto_fail";

export type VerificationScores = {
  doc_auth_score: number;
  face_match_score: number;
  liveness_score: number;
  ocr_consistency_score: number;
  duplicate_risk_score: number;
};

export type VerificationRiskResult = {
  overall_score: number;
  decision: VerificationDecision;
  hard_stop: boolean;
  hard_stop_reason: string | null;
  risk_flags: string[];
};

export const VERIFICATION_WEIGHTS = {
  doc_auth_score: Number(process.env.VERIFICATION_WEIGHT_DOC_AUTH ?? 0.25),
  face_match_score: Number(process.env.VERIFICATION_WEIGHT_FACE_MATCH ?? 0.35),
  liveness_score: Number(process.env.VERIFICATION_WEIGHT_LIVENESS ?? 0.2),
  ocr_consistency_score: Number(process.env.VERIFICATION_WEIGHT_OCR ?? 0.15),
  duplicate_risk_score: Number(process.env.VERIFICATION_WEIGHT_DUPLICATE ?? 0.05),
} as const;

export const VERIFICATION_THRESHOLDS = {
  auto_pass_min: Number(process.env.VERIFICATION_AUTO_PASS_MIN ?? 80),
  manual_review_min: Number(process.env.VERIFICATION_MANUAL_REVIEW_MIN ?? 55),
  // below manual_review_min => auto_fail
  hard_stop: {
    min_face_match: Number(process.env.VERIFICATION_HARDSTOP_MIN_FACE_MATCH ?? 35),
    min_liveness: Number(process.env.VERIFICATION_HARDSTOP_MIN_LIVENESS ?? 30),
    max_duplicate_risk: Number(process.env.VERIFICATION_HARDSTOP_MAX_DUPLICATE_RISK ?? 95),
  },
} as const;

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreVerification(scores: VerificationScores): VerificationRiskResult {
  const normalized: VerificationScores = {
    doc_auth_score: clampScore(scores.doc_auth_score),
    face_match_score: clampScore(scores.face_match_score),
    liveness_score: clampScore(scores.liveness_score),
    ocr_consistency_score: clampScore(scores.ocr_consistency_score),
    duplicate_risk_score: clampScore(scores.duplicate_risk_score),
  };

  const riskFlags: string[] = [];
  let hardStop = false;
  let hardStopReason: string | null = null;

  if (normalized.face_match_score < VERIFICATION_THRESHOLDS.hard_stop.min_face_match) {
    hardStop = true;
    hardStopReason = "face_mismatch";
    riskFlags.push("face_mismatch");
  }
  if (normalized.liveness_score < VERIFICATION_THRESHOLDS.hard_stop.min_liveness) {
    hardStop = true;
    hardStopReason = hardStopReason ?? "liveness_failed";
    riskFlags.push("liveness_failed");
  }
  if (normalized.duplicate_risk_score >= VERIFICATION_THRESHOLDS.hard_stop.max_duplicate_risk) {
    hardStop = true;
    hardStopReason = hardStopReason ?? "high_duplicate_risk";
    riskFlags.push("high_duplicate_risk");
  }

  if (normalized.doc_auth_score < 45) riskFlags.push("low_document_auth");
  if (normalized.ocr_consistency_score < 45) riskFlags.push("low_ocr_consistency");
  if (normalized.duplicate_risk_score >= 70) riskFlags.push("possible_duplicate_identity");

  const weightTotal =
    VERIFICATION_WEIGHTS.doc_auth_score +
    VERIFICATION_WEIGHTS.face_match_score +
    VERIFICATION_WEIGHTS.liveness_score +
    VERIFICATION_WEIGHTS.ocr_consistency_score +
    VERIFICATION_WEIGHTS.duplicate_risk_score;
  const safeWeightTotal = weightTotal > 0 ? weightTotal : 1;

  const weighted =
    normalized.doc_auth_score * (VERIFICATION_WEIGHTS.doc_auth_score / safeWeightTotal) +
    normalized.face_match_score * (VERIFICATION_WEIGHTS.face_match_score / safeWeightTotal) +
    normalized.liveness_score * (VERIFICATION_WEIGHTS.liveness_score / safeWeightTotal) +
    normalized.ocr_consistency_score * (VERIFICATION_WEIGHTS.ocr_consistency_score / safeWeightTotal) +
    // duplicate risk is inverted (higher risk lowers confidence)
    (100 - normalized.duplicate_risk_score) * (VERIFICATION_WEIGHTS.duplicate_risk_score / safeWeightTotal);

  const overall = clampScore(weighted);

  let decision: VerificationDecision;
  if (hardStop) {
    decision = "auto_fail";
  } else if (overall >= VERIFICATION_THRESHOLDS.auto_pass_min) {
    decision = "auto_pass";
  } else if (overall >= VERIFICATION_THRESHOLDS.manual_review_min) {
    decision = "manual_review";
  } else {
    decision = "auto_fail";
  }

  return {
    overall_score: overall,
    decision,
    hard_stop: hardStop,
    hard_stop_reason: hardStopReason,
    risk_flags: [...new Set(riskFlags)],
  };
}

