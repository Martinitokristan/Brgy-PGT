import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { scoreVerification } from "@/lib/verification/scoring";
import { runVerificationScan } from "@/lib/verification/scan";
import { createHash } from "crypto";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("verification_requests")
    .select("id, status, valid_id_type, submitted_at, rejection_reason, decision, overall_score, risk_flags")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { status: "none" });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();

  // Check if already verified
  const { data: profile } = await service
    .from("profiles")
    .select("is_verified")
    .eq("id", user.id)
    .single();

  if (profile?.is_verified) {
    return NextResponse.json({ error: "Account is already verified." }, { status: 400 });
  }

  // Check for pending request
  const { data: existing } = await service
    .from("verification_requests")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You already have a pending verification request." }, { status: 400 });
  }

  const formData = await request.formData();
  const validIdType = formData.get("valid_id_type") as string;
  const validIdFile = formData.get("valid_id") as File | null;
  const selfieFile = formData.get("selfie") as File | null;
  const consentBiometric = String(formData.get("consent_biometric") ?? "false") === "true";
  const consentDataPolicy = String(formData.get("consent_data_policy") ?? "false") === "true";
  const clientFaceMatchScore = formData.get("client_face_match_score") !== null
    ? Number(formData.get("client_face_match_score"))
    : null;
  const clientLivenessScore = formData.get("client_liveness_score") !== null
    ? Number(formData.get("client_liveness_score"))
    : null;

  if (!validIdType || !validIdFile || !selfieFile) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!consentBiometric || !consentDataPolicy) {
    return NextResponse.json({ error: "Consent is required to continue verification." }, { status: 400 });
  }

  // Basic anti-abuse rate limit
  const { count: attemptCount } = await service
    .from("verification_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("submitted_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if ((attemptCount ?? 0) >= 5) {
    return NextResponse.json({ error: "Too many verification attempts today. Please try again tomorrow." }, { status: 429 });
  }

  // Check duplicate ID usage and estimate duplicate risk
  const scanPreview = await runVerificationScan({
    validIdType,
    validIdFile,
    selfieFile,
    duplicateRiskScore: 0,
  });
  const idFingerprintHash = scanPreview.id_fingerprint_hash;
  const selfieHash = createHash("sha256")
    .update(Buffer.from(await selfieFile.arrayBuffer()))
    .digest("hex");

  const [{ count: sameIdCount }, { count: sameFaceCount }] = await Promise.all([
    service
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("id_fingerprint_hash", idFingerprintHash)
      .neq("user_id", user.id),
    service
      .from("verification_face_index")
      .select("id", { count: "exact", head: true })
      .eq("embedding_hash", selfieHash)
      .neq("user_id", user.id),
  ]);
  const duplicateRiskScore =
    (sameIdCount ?? 0) > 0 || (sameFaceCount ?? 0) > 0
      ? 96
      : 10;

  const finalScan = await runVerificationScan({
    validIdType,
    validIdFile,
    selfieFile,
    duplicateRiskScore,
    clientFaceMatchScore: clientFaceMatchScore ?? undefined,
    clientLivenessScore: clientLivenessScore ?? undefined,
  });
  const scoring = scoreVerification(finalScan.scores);
  const calibrationVersion = process.env.VERIFICATION_CALIBRATION_VERSION?.trim() || "v2";

  let initialStatus: "pending" | "rejected" = "pending";
  let rejectionReason: string | null = null;
  if (scoring.decision === "auto_fail") {
    initialStatus = "rejected";
    rejectionReason = scoring.hard_stop
      ? "Automatic verification failed due to high-risk identity signals."
      : "Automatic verification failed due to low confidence score.";
  }

  // Upload valid ID
  const idExt = validIdFile.name.split(".").pop() ?? "jpg";
  const idPath = `${user.id}/valid-id-${Date.now()}.${idExt}`;
  const { error: idError } = await service.storage
    .from("verification-ids")
    .upload(idPath, validIdFile, { upsert: true });

  if (idError) return NextResponse.json({ error: "Failed to upload ID." }, { status: 500 });

  // Upload selfie
  const selfieExt = selfieFile.name.split(".").pop() ?? "jpg";
  const selfiePath = `${user.id}/selfie-${Date.now()}.${selfieExt}`;
  const { error: selfieError } = await service.storage
    .from("verification-selfies")
    .upload(selfiePath, selfieFile, { upsert: true });

  if (selfieError) return NextResponse.json({ error: "Failed to upload selfie." }, { status: 500 });

  // Create verification request
  const { data: inserted, error: insertError } = await service.from("verification_requests").insert({
    user_id: user.id,
    valid_id_type: validIdType,
    valid_id_path: idPath,
    selfie_path: selfiePath,
    status: initialStatus,
    rejection_reason: rejectionReason,
    doc_auth_score: finalScan.scores.doc_auth_score,
    face_match_score: finalScan.scores.face_match_score,
    liveness_score: finalScan.scores.liveness_score,
    ocr_consistency_score: finalScan.scores.ocr_consistency_score,
    duplicate_risk_score: finalScan.scores.duplicate_risk_score,
    overall_score: scoring.overall_score,
    decision: scoring.decision,
    hard_stop: scoring.hard_stop,
    hard_stop_reason: scoring.hard_stop_reason,
    risk_flags: [...new Set([...(finalScan.risk_flags ?? []), ...(scoring.risk_flags ?? [])])],
    id_fingerprint_hash: idFingerprintHash,
    calibration_version: calibrationVersion,
    consent_biometric: consentBiometric,
    consent_data_policy: consentDataPolicy,
  }).select("id").maybeSingle();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  // Log audit event
  if (inserted?.id) {
    await service.from("verification_face_index").upsert({
      user_id: user.id,
      verification_request_id: inserted.id,
      embedding_hash: selfieHash,
      confidence: scoring.overall_score,
    });

    await service.from("verification_audit_logs").insert({
      verification_request_id: inserted.id,
      user_id: user.id,
      actor_id: user.id,
      action: "submitted",
      details: {
        engine_provider: finalScan.engine_provider,
        calibration_version: calibrationVersion,
        decision: scoring.decision,
        overall_score: scoring.overall_score,
        hard_stop: scoring.hard_stop,
        hard_stop_reason: scoring.hard_stop_reason,
        risk_flags: scoring.risk_flags,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      id: inserted?.id ?? null,
      decision: scoring.decision,
      risk_flags: scoring.risk_flags,
      status: initialStatus,
    },
  });
}
