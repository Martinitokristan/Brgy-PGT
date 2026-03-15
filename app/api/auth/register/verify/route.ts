import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!token || !email) {
    return NextResponse.redirect(`${appUrl}/verify-success?error=Invalid verification link`);
  }

  const supabaseService = createSupabaseServiceClient();

  // Find the pending registration
  const { data: pending, error: pendingError } = await supabaseService
    .from("pending_registrations")
    .select("*")
    .eq("email", email)
    .eq("otp_code", token)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError || !pending) {
    console.error("Verification Error:", pendingError);
    return NextResponse.redirect(`${appUrl}/verify-success?error=Link is invalid or has expired`);
  }

  // Check expiration (24 hours)
  if (pending.otp_expires_at && new Date(pending.otp_expires_at) < new Date()) {
    // Delete expired pending registration to keep DB clean
    await supabaseService.from("pending_registrations").delete().eq("id", pending.id);
    return NextResponse.redirect(`${appUrl}/verify-success?error=Link has expired. Please register again.`);
  }

  // Already verified? Just redirect to success
  if (pending.email_verified) {
    return NextResponse.redirect(`${appUrl}/verify-success`);
  }

  // Mark email as verified — do NOT create auth user or profile yet
  // Account will be created when admin approves
  const { error: updateError } = await supabaseService
    .from("pending_registrations")
    .update({ email_verified: true })
    .eq("id", pending.id);

  if (updateError) {
    console.error("Verify Update Error:", updateError);
    return NextResponse.redirect(`${appUrl}/verify-success?error=Could not verify email. Please try again.`);
  }

  return NextResponse.redirect(`${appUrl}/verify-success`);
}
