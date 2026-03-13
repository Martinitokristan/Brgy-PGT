import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!token || !email) {
    return NextResponse.redirect(`${appUrl}/login?error=Invalid verification link`);
  }

  const supabaseService = createSupabaseServiceClient();

  // Find the pending registration
  const { data: pending, error: pendingError } = await supabaseService
    .from("pending_registrations")
    .select("*")
    .eq("email", email)
    .eq("otp_code", token) // We used the otp_code field to store the token
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError || !pending) {
    console.error("Verification Error:", pendingError);
    return NextResponse.redirect(`${appUrl}/login?error=Link is invalid or has expired`);
  }

  // Check expiration (24 hours)
  if (pending.otp_expires_at && new Date(pending.otp_expires_at) < new Date()) {
    return NextResponse.redirect(`${appUrl}/login?error=Link has expired. Please register again.`);
  }

  // Create Supabase Auth User
  const { data: created, error: createError } = await supabaseService.auth.admin.createUser({
    email: pending.email,
    password: pending.password_hash,
    email_confirm: true,
  });

  if (createError || !created.user) {
    console.error("Auth Creation Error:", createError);
    // If user already exists (e.g. they clicked twice), just redirect
  if (createError?.message?.includes("already registered")) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signInWithPassword({
      email: pending.email,
      password: pending.password_hash,
    });
    return NextResponse.redirect(`${appUrl}/approval-pending`);
  }
  return NextResponse.redirect(`${appUrl}/login?error=Could not create account`);
}

  // Create Profile in PENDING status
  const { error: profileError } = await supabaseService.from("profiles").insert({
    id: created.user.id,
    name: pending.name,
    role: "resident",
    is_approved: false,
    barangay_id: pending.barangay_id,
    phone: pending.phone,
    purok_address: pending.purok_address,
    sex: pending.sex,
    birth_date: pending.birth_date,
    age: pending.age,
    valid_id_path: pending.valid_id_path,
    email: pending.email,
  });

  if (profileError) {
    console.error("Profile Error:", profileError);
  }

  // Pre-trust the device used for registration so they bypass device verification on first login
  if (pending.device_token) {
    try {
      await supabaseService.from("trusted_devices").insert({
        user_id: created.user.id,
        device_token: pending.device_token,
        last_used_at: new Date().toISOString(),
      });
    } catch (trustError) {
      console.error("Device Trust Error:", trustError);
    }
  }

  // Cleanup pending registration
  await supabaseService
    .from("pending_registrations")
    .delete()
    .eq("id", pending.id);

  // Sign the user in to establish a session
  try {
    const supabaseSession = await createSupabaseServerClient();
    await supabaseSession.auth.signInWithPassword({
      email: pending.email,
      password: pending.password_hash,
    });
  } catch (loginError) {
    console.error("Auto Login Error:", loginError);
  }

  return NextResponse.redirect(`${appUrl}/verify-success`);
}
