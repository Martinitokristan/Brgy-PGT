import { VerificationScores } from "@/lib/verification/scoring";

export type ExternalEngineResult = {
  scores: Partial<VerificationScores>;
  risk_flags?: string[];
  provider?: string;
  raw?: unknown;
};

function asNumber(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}

function clamp100(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizeScores(input: Record<string, unknown>): Partial<VerificationScores> {
  const doc = asNumber(input.doc_auth_score);
  const face = asNumber(input.face_match_score);
  const live = asNumber(input.liveness_score);
  const ocr = asNumber(input.ocr_consistency_score);
  const dup = asNumber(input.duplicate_risk_score);
  const out: Partial<VerificationScores> = {};
  if (doc !== null) out.doc_auth_score = clamp100(doc);
  if (face !== null) out.face_match_score = clamp100(face);
  if (live !== null) out.liveness_score = clamp100(live);
  if (ocr !== null) out.ocr_consistency_score = clamp100(ocr);
  if (dup !== null) out.duplicate_risk_score = clamp100(dup);
  return out;
}

async function fileToBase64(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  return buf.toString("base64");
}

export async function runExternalVerificationEngine(params: {
  validIdType: string;
  validIdFile: File;
  selfieFile: File;
  duplicateRiskScore: number;
}): Promise<ExternalEngineResult | null> {
  const endpoint = process.env.VERIFICATION_ENGINE_URL?.trim();
  if (!endpoint) return null;

  const token = process.env.VERIFICATION_ENGINE_TOKEN?.trim();
  const timeoutMs = Math.max(1000, Number(process.env.VERIFICATION_ENGINE_TIMEOUT_MS ?? 7000));

  const payload = {
    valid_id_type: params.validIdType,
    duplicate_risk_score: params.duplicateRiskScore,
    valid_id: {
      filename: params.validIdFile.name,
      mime_type: params.validIdFile.type || "application/octet-stream",
      data_base64: await fileToBase64(params.validIdFile),
    },
    selfie: {
      filename: params.selfieFile.name,
      mime_type: params.selfieFile.type || "application/octet-stream",
      data_base64: await fileToBase64(params.selfieFile),
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    return {
      scores: normalizeScores(data),
      risk_flags: Array.isArray(data.risk_flags)
        ? data.risk_flags.filter((x): x is string => typeof x === "string")
        : [],
      provider: typeof data.provider === "string" ? data.provider : "external",
      raw: data.raw ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

