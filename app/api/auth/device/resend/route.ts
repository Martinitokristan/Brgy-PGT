import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { sendDeviceOtpEmail } from "@/lib/brevoMailer";

export async function POST(request: Request) {
  const service = createSupabaseServiceClient();
  const body = await request.json().catch(() => null);

  const email = body?.email as string | undefined;
  const deviceToken = body?.device_token as string | undefined;

  if (!email || !deviceToken) {
    return NextResponse.json(
      { error: "Email and device_token are required." },
      { status: 400 }
    );
  }

  // Look up user via profiles
  const { data: profileRow } = await service
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profileRow) {
    // Return 200 anyway to avoid email enumeration
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const userId = profileRow.id as string;

  // Delete any old OTPs for this user+device
  await service
    .from("device_otps")
    .delete()
    .eq("user_id", userId)
    .eq("device_token", deviceToken);

  // Generate new OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await service.from("device_otps").insert({
    user_id: userId,
    device_token: deviceToken,
    code,
    expires_at: expiresAt,
  });

  try {
    await sendDeviceOtpEmail(email, email, code);
  } catch (e) {
    console.error("Failed to resend OTP:", e);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
