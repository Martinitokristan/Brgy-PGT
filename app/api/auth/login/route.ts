import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { sendDeviceOtpEmail } from "@/lib/brevoMailer";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const body = await request.json().catch(() => null);

  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;
  const deviceToken = body?.device_token as string | undefined;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError || !authData.session || !authData.user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const user = authData.user;

  // Use service client for profile/device checks so we are not blocked by RLS
  // on the first login request.
  const service = createSupabaseServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select(
      "id, role, is_approved, barangay_id, phone, purok_address, sex, birth_date, age"
    )
    .eq("id", user.id)
    .maybeSingle();

  // Admins and pending residents do not require device OTP.
  if (profile?.role === "admin" || profile?.is_approved === false || !deviceToken) {
    return NextResponse.json(
      {
        user,
        profile,
        device_trusted: true,
      },
      { status: 200 }
    );
  }

  // Check trusted_devices for this user + device_token.
  const { data: trusted } = await service
    .from("trusted_devices")
    .select("id")
    .eq("user_id", user.id)
    .eq("device_token", deviceToken)
    .maybeSingle();

  if (trusted) {
    // Update last_used_at and skip OTP.
    await service
      .from("trusted_devices")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", trusted.id);

    return NextResponse.json(
      {
        user,
        profile,
        device_trusted: true,
      },
      { status: 200 }
    );
  }

  // Not trusted yet: generate 6-digit OTP, store, and send via Brevo.
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await service.from("device_otps").insert({
    user_id: user.id,
    device_token: deviceToken,
    code,
    expires_at: expiresAt,
  });

  try {
    await sendDeviceOtpEmail(email, email, code);
  } catch (e) {
    console.error("Failed to send device OTP email", e);
    return NextResponse.json(
      { error: "Failed to send device verification code." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      user,
      profile,
      device_trusted: false,
      pending_device_verification: true,
    },
    { status: 200 }
  );
}

