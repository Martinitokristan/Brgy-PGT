import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { sendVerificationApprovedSms } from "@/lib/smsSender";
import { createHash } from "crypto";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "pending";

  const { data: adminProfile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "metrics") {
    const [{ data: reqs }, { data: audits }] = await Promise.all([
      service
        .from("verification_requests")
        .select("status, decision, overall_score, submitted_at")
        .gte("submitted_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      service
        .from("verification_audit_logs")
        .select("action, created_at")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const byStatus: Record<string, number> = {};
    const byDecision: Record<string, number> = {};
    let scoreSum = 0;
    let scoreCount = 0;
    for (const r of reqs ?? []) {
      byStatus[r.status ?? "unknown"] = (byStatus[r.status ?? "unknown"] ?? 0) + 1;
      byDecision[r.decision ?? "unknown"] = (byDecision[r.decision ?? "unknown"] ?? 0) + 1;
      if (typeof r.overall_score === "number") {
        scoreSum += r.overall_score;
        scoreCount += 1;
      }
    }

    const auditCounts: Record<string, number> = {};
    for (const a of audits ?? []) {
      auditCounts[a.action ?? "unknown"] = (auditCounts[a.action ?? "unknown"] ?? 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      data: {
        lookback_days: 30,
        by_status: byStatus,
        by_decision: byDecision,
        avg_overall_score: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null,
        audit_actions: auditCounts,
      },
    });
  }

  const { data, error } = await service
    .from("verification_requests")
    .select(`
      id, status, valid_id_type, valid_id_path, selfie_path,
      submitted_at, rejection_reason, decision, overall_score, hard_stop, hard_stop_reason,
      doc_auth_score, face_match_score, liveness_score, ocr_consistency_score, duplicate_risk_score, risk_flags,
      id_fingerprint_hash, calibration_version,
      profiles:user_id (id, name, email, phone, purok_address)
    `)
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json([]);

  // Generate signed URLs for private files
  const requestsWithUrls = await Promise.all(data.map(async (req) => {
    const { data: idData } = await service.storage
      .from("verification-ids")
      .createSignedUrl(req.valid_id_path, 3600); // 1 hour
    
    const { data: selfieData } = await service.storage
      .from("verification-selfies")
      .createSignedUrl(req.selfie_path, 3600);

    return {
      ...req,
      valid_id_url: idData?.signedUrl,
      selfie_url: selfieData?.signedUrl,
    };
  }));

  return NextResponse.json(requestsWithUrls);
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();
  const { data: adminProfile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "";
  if (action !== "retention_cleanup") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: oldRejected } = await service
    .from("verification_requests")
    .select("id")
    .eq("status", "rejected")
    .lt("submitted_at", cutoff);

  const ids = (oldRejected ?? []).map((r) => r.id).filter(Boolean);
  if (ids.length === 0) return NextResponse.json({ ok: true, data: { removed: 0 } });

  await service.from("verification_audit_logs").delete().in("verification_request_id", ids);
  const { error } = await service.from("verification_requests").delete().in("id", ids);
  if (error) return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });

  return NextResponse.json({ ok: true, data: { removed: ids.length } });
}


export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();

  // Verify the caller is an admin
  const { data: adminProfile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, action, reason } = body as {
    id: number;
    action: "approve" | "reject";
    reason?: string;
  };

  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  // Get the request to find the user
  const { data: verReq } = await service
    .from("verification_requests")
    .select("id, user_id, overall_score, hard_stop, risk_flags, selfie_path")
    .eq("id", id)
    .single();

  if (!verReq) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (action === "approve") {
    const riskyApproval = !!verReq.hard_stop || Number(verReq.overall_score ?? 0) < 80;
    if (riskyApproval && !reason?.trim()) {
      return NextResponse.json({ error: "Approval reason is required for risky verification requests." }, { status: 400 });
    }

    // Update the verification request
    await service
      .from("verification_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq("id", id);

    // Mark user as verified
    await service
      .from("profiles")
      .update({ is_verified: true })
      .eq("id", verReq.user_id);

    // Write placeholder face index reference (hash of selfie path)
    const embeddingHash = createHash("sha256").update(String(verReq.selfie_path ?? "")).digest("hex");
    await service.from("verification_face_index").upsert({
      user_id: verReq.user_id,
      verification_request_id: id,
      embedding_hash: embeddingHash,
      confidence: verReq.overall_score ?? null,
    });

    await service.from("verification_audit_logs").insert({
      verification_request_id: id,
      user_id: verReq.user_id,
      actor_id: user.id,
      action: "approved",
      details: {
        reason: reason ?? null,
        overall_score: verReq.overall_score ?? null,
        hard_stop: verReq.hard_stop ?? false,
        risk_flags: verReq.risk_flags ?? [],
      },
    });

    // Send SMS notification
    const { data: userProfile } = await service
      .from("profiles")
      .select("name, phone")
      .eq("id", verReq.user_id)
      .single();

    if (userProfile?.phone) {
      const result = await sendVerificationApprovedSms(userProfile.phone, userProfile.name ?? "Resident");
      
      // Log to SMS history
      const firstName = (userProfile.name ?? "Resident").split(" ")[0];
      const message =
        `Congratulations, ${firstName}! Your BarangayPGT account has been verified. ` +
        `You now have full access to post, comment, and participate in your community. ` +
        `- Barangay Pagatpatan`;

      await service.from("sms_logs").insert({
        admin_id: user.id,
        recipient_phone: userProfile.phone,
        message_content: message,
        status: result.success ? "sent" : "failed",
        provider_message_id: result.success ? result.sid : null,
        error_message: !result.success ? result.error : null,
      });
    }

    return NextResponse.json({ ok: true, message: "User verified and SMS logged." });
  }

  if (action === "reject") {
    await service
      .from("verification_requests")
      .update({
        status: "rejected",
        rejection_reason: reason ?? "Your ID could not be verified.",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", id);

    await service.from("verification_audit_logs").insert({
      verification_request_id: id,
      user_id: verReq.user_id,
      actor_id: user.id,
      action: "rejected",
      details: {
        reason: reason ?? "Your ID could not be verified.",
        overall_score: verReq.overall_score ?? null,
        hard_stop: verReq.hard_stop ?? false,
        risk_flags: verReq.risk_flags ?? [],
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
