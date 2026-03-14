import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { sendSms } from "@/lib/smsSender";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: "Unauthorized" as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return { supabase, user: null, error: "Forbidden" as const };
  }

  return { supabase, user, error: null };
}

// GET /api/admin/users - list users + profiles
export async function GET() {
  const { supabase, error } = await requireAdmin();

  if (error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "Forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  const { data, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, name, email, role, is_approved, barangay_id, phone, purok_address, sex, birth_date, age, valid_id_path, created_at, barangays(name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (profilesError) {
    console.error(profilesError);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? [], { status: 200 });
}

// PATCH /api/admin/users - approve/change role
export async function PATCH(request: Request) {
  const { supabase, error, user } = await requireAdmin();

  if (error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "Forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = body?.id as string | undefined;
  const isApproved = body?.is_approved as boolean | undefined;
  const role = body?.role as string | undefined;

  if (!id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof isApproved === "boolean") {
    updates.is_approved = isApproved;
  }
  if (role) {
    updates.role = role;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Fetch current profile to check phone and approval status before updating
  let profileToNotify = null;
  if (isApproved === true) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, is_approved")
      .eq("id", id)
      .maybeSingle();
    
    if (profile && !profile.is_approved) {
      profileToNotify = profile;
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }

  // If approved and has phone, send SMS
  if (profileToNotify && profileToNotify.phone) {
    const msg = "Congratulations! Your registration with Brgy. Pagatpatan has been approved. You can now access all resident features.";
    const result = await sendSms(profileToNotify.phone, msg);

    // Write to logs using service client
    const service = createSupabaseServiceClient();
    await service.from("sms_logs").insert({
      admin_id: user?.id ?? null,
      recipient_phone: profileToNotify.phone,
      message_content: msg,
      status: result.success ? "sent" : "failed",
      provider_message_id: result.success ? result.sid : null,
      error_message: !result.success ? result.error : null,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

