import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { sendRegistrationLinkEmail } from "@/lib/brevoMailer";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email as string | undefined;

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  // Rate limit: max 3 resends per email per 15 minutes
  const rl = rateLimit(`resend-verify:${email.toLowerCase()}`, 3, 15 * 60 * 1000);
  if (rl.limited) {
    const mins = Math.ceil(rl.retryAfterMs / 60000);
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${mins} minute${mins > 1 ? "s" : ""}.` },
      { status: 429 }
    );
  }

  const supabase = createSupabaseServiceClient();

  // Find the pending registration
  const { data: pending, error: pendingError } = await supabase
    .from("pending_registrations")
    .select("*")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError || !pending) {
    return NextResponse.json(
      { error: "No pending registration found for this email." },
      { status: 404 }
    );
  }

  // Already verified — no need to resend
  if (pending.email_verified) {
    return NextResponse.json(
      { error: "Email is already verified. Please log in." },
      { status: 400 }
    );
  }

  // Generate a new token
  let token;
  try {
    const { randomBytes } = await import("node:crypto");
    token = randomBytes(32).toString("hex");
  } catch {
    token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  // Update the token in the database
  const { error: updateError } = await supabase
    .from("pending_registrations")
    .update({ otp_code: token, otp_expires_at: expiresAt })
    .eq("id", pending.id);

  if (updateError) {
    console.error("Resend Update Error:", updateError);
    return NextResponse.json(
      { error: "Failed to generate new verification link." },
      { status: 500 }
    );
  }

  // Send the verification email
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/api/auth/register/verify?token=${token}&email=${encodeURIComponent(email)}`;
    await sendRegistrationLinkEmail(email, pending.name, verificationUrl);
  } catch (emailError) {
    console.error("Resend Email Error:", emailError);
    return NextResponse.json(
      { error: "Failed to resend verification email." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Verification email resent successfully.",
  });
}
