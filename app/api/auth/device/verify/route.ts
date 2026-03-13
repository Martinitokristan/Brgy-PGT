import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

export async function POST(request: Request) {
  const service = createSupabaseServiceClient();
  const body = await request.json().catch(() => null);

  const email = body?.email as string | undefined;
  const code = body?.code as string | undefined;
  const deviceToken = body?.device_token as string | undefined;

  if (!email || !code || !deviceToken) {
    return NextResponse.json(
      { error: "Email, code, and device_token are required." },
      { status: 400 }
    );
  }

  const { data: userRow, error: userError } = await service
    .from("auth.users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle();

  if (userError || !userRow) {
    return NextResponse.json(
      { error: "Invalid email or code." },
      { status: 400 }
    );
  }

  const userId = userRow.id as string;

  const { data: otpRow, error: otpError } = await service
    .from("device_otps")
    .select("id, code, expires_at")
    .eq("user_id", userId)
    .eq("device_token", deviceToken)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpError || !otpRow || otpRow.code !== code) {
    return NextResponse.json(
      { error: "Invalid or expired code." },
      { status: 400 }
    );
  }

  if (new Date(otpRow.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "This code has expired. Please log in again." },
      { status: 400 }
    );
  }

  // Insert trusted device.
  await service.from("trusted_devices").upsert(
    {
      user_id: userId,
      device_token: deviceToken,
      last_used_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,device_token",
    } as any
  );

  // Clean up OTP.
  await service
    .from("device_otps")
    .delete()
    .eq("id", otpRow.id);

  return NextResponse.json(
    { ok: true, message: "Device verified and trusted." },
    { status: 200 }
  );
}

