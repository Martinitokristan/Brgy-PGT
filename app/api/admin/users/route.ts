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

// GET /api/admin/users - list approved profiles + verified pending registrations
export async function GET() {
  const { error } = await requireAdmin();

  if (error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "Forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  const service = createSupabaseServiceClient();

  // Fetch existing profiles (already approved users)
  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select(
      "id, name, email, role, is_approved, barangay_id, phone, purok_address, sex, birth_date, age, valid_id_path, avatar, created_at, barangays(name)"
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

  // Fetch verified pending registrations (email verified, waiting for admin approval)
  const { data: pending } = await service
    .from("pending_registrations")
    .select("id, name, email, barangay_id, phone, purok_address, sex, birth_date, age, valid_id_path, email_verified, created_at")
    .eq("email_verified", true)
    .order("created_at", { ascending: false })
    .limit(100);

  // Convert pending registrations to same shape as profiles for the frontend
  const pendingAsProfiles = (pending ?? []).map((p) => ({
    id: `pending_${p.id}`,
    pending_id: p.id,
    name: p.name,
    email: p.email,
    role: "resident",
    is_approved: false,
    barangay_id: p.barangay_id,
    phone: p.phone,
    purok_address: p.purok_address,
    sex: p.sex,
    birth_date: p.birth_date,
    age: p.age,
    valid_id_path: p.valid_id_path,
    avatar: null,
    created_at: p.created_at,
    barangays: null,
    source: "pending" as const,
  }));

  // Mark existing profiles with source
  const existingProfiles = (profiles ?? []).map((p) => ({
    ...p,
    source: "profile" as const,
  }));

  // Merge: pending first, then existing
  const merged = [...pendingAsProfiles, ...existingProfiles];

  return NextResponse.json(merged, { status: 200 });
}

// PATCH /api/admin/users - approve pending registration or update existing user
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

  const service = createSupabaseServiceClient();

  // ── Handle pending registration approval ──
  if (id.startsWith("pending_") && isApproved === true) {
    const pendingId = Number(id.replace("pending_", ""));

    const { data: pending, error: pendingError } = await service
      .from("pending_registrations")
      .select("*")
      .eq("id", pendingId)
      .maybeSingle();

    if (pendingError || !pending) {
      return NextResponse.json({ error: "Pending registration not found." }, { status: 404 });
    }

    // Create Supabase Auth User
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email: pending.email,
      password: pending.password_hash,
      email_confirm: true,
    });

    // Handle case where user already exists in auth (e.g. from old registration flow)
    let userId: string | null = created?.user?.id ?? null;
    if (createError) {
      console.error("Auth Creation Error:", createError.message);
      if (createError.message?.includes("already been registered") || createError.message?.includes("already registered")) {
        // Look up existing auth user by email
        const { data: existingUsers } = await service.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u) => u.email === pending.email);
        if (existingUser) {
          userId = existingUser.id;
        } else {
          return NextResponse.json(
            { error: "User already registered but could not be found." },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: createError.message || "Failed to create user account." },
          { status: 500 }
        );
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Failed to create user account." },
        { status: 500 }
      );
    }

    // Create or update profile (approved immediately)
    // Check if profile already exists (old flow may have created one)
    const { data: existingProfile } = await service
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      // Profile exists — just approve it
      const { error: updateErr } = await service.from("profiles")
        .update({ is_approved: true, role: role || "resident" })
        .eq("id", userId);
      if (updateErr) console.error("Profile Update Error:", updateErr);
    } else {
      // Create fresh profile
      const { error: profileError } = await service.from("profiles").insert({
        id: userId,
        name: pending.name,
        role: role || "resident",
        is_approved: true,
        barangay_id: pending.barangay_id,
        phone: pending.phone,
        purok_address: pending.purok_address,
        sex: pending.sex,
        birth_date: pending.birth_date,
        age: pending.age,
        valid_id_path: pending.valid_id_path,
        email: pending.email,
      });
      if (profileError) console.error("Profile Creation Error:", profileError);
    }

    // Trust the device used during registration (skip device OTP on first login)
    if (pending.device_token) {
      try {
        await service.from("trusted_devices").upsert({
          user_id: userId,
          device_token: pending.device_token,
          last_used_at: new Date().toISOString(),
        }, { onConflict: "user_id,device_token" });
      } catch (trustErr) {
        console.error("Device Trust Error:", trustErr);
      }
    }

    // Delete the pending registration
    await service.from("pending_registrations").delete().eq("id", pendingId);

    // Send SMS notification
    if (pending.phone) {
      const msg = "Congratulations! Your registration with Brgy. Pagatpatan has been approved. You can now access all resident features.";
      const result = await sendSms(pending.phone, msg);

      await service.from("sms_logs").insert({
        admin_id: user?.id ?? null,
        recipient_phone: pending.phone,
        message_content: msg,
        status: result.success ? "sent" : "failed",
        provider_message_id: result.success ? result.sid : null,
        error_message: !result.success ? result.error : null,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ── Handle rejection of pending registration ──
  if (id.startsWith("pending_") && isApproved === false) {
    const pendingId = Number(id.replace("pending_", ""));
    await service.from("pending_registrations").delete().eq("id", pendingId);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // ── Handle existing profile updates (role change, revoke access, etc.) ──
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
    const { data: profile } = await service
      .from("profiles")
      .select("phone, is_approved")
      .eq("id", id)
      .maybeSingle();
    
    if (profile && !profile.is_approved) {
      profileToNotify = profile;
    }
  }

  const { error: updateError } = await service
    .from("profiles")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    console.error("Profile update error:", updateError);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }

  // If approved and has phone, send SMS
  if (profileToNotify && profileToNotify.phone) {
    const msg = "Congratulations! Your registration with Brgy. Pagatpatan has been approved. You can now access all resident features.";
    const result = await sendSms(profileToNotify.phone, msg);

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

