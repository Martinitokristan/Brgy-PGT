import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { sendVerificationApprovedSms } from "@/lib/smsSender";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();

  const { data, error } = await service
    .from("verification_requests")
    .select(`
      id, status, valid_id_type, valid_id_path, selfie_path,
      submitted_at, rejection_reason,
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
    .select("user_id")
    .eq("id", id)
    .single();

  if (!verReq) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (action === "approve") {
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

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
