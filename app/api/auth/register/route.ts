import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { sendRegistrationLinkEmail } from "@/lib/brevoMailer";
import { rateLimit } from "@/lib/rateLimit";

// ─── GET /api/auth/register?action=status|verify ──────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "status";

  switch (action) {
    case "status":
      return handleStatus(searchParams);
    case "verify":
      return handleVerify(request, searchParams);
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// ─── POST /api/auth/register ──────────────────────────────────
// action=register (FormData) or action=resend (JSON)
export async function POST(request: Request) {
  // Peek at content-type to determine if FormData or JSON
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // Register always sends FormData
    return handleRegister(request);
  }

  // JSON body with action
  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  switch (action) {
    case "resend":
      return handleResend(body);
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// ═══════════════════════════════════════════════════════════════
// REGISTER (FormData)
// ═══════════════════════════════════════════════════════════════
async function handleRegister(request: Request) {
  const supabase = createSupabaseServiceClient();
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const email = formData.get("email") as string;
  const name = formData.get("name") as string;
  const password = formData.get("password") as string;
  const phone = formData.get("phone") as string;
  const purok_address = formData.get("purok_address") as string;
  const sex = formData.get("sex") as string;
  const birth_date = formData.get("birth_date") as string;
  const age = formData.get("age") ? Number(formData.get("age")) : null;
  const device_token = formData.get("device_token") as string;
  const validIdFile = formData.get("valid_id") as File;

  if (!email || !name || !password) {
    return NextResponse.json(
      { error: "Name, email, and password are required." },
      { status: 400 }
    );
  }

  // Check if email already exists in auth users (approved accounts)
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const emailTaken = existingUsers?.users?.some((u) => u.email === email);
  if (emailTaken) {
    return NextResponse.json(
      { error: "This email is already registered. Please sign in instead." },
      { status: 409 }
    );
  }

  // Check if email already has a pending registration
  const { data: pendingEmail } = await supabase
    .from("pending_registrations")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (pendingEmail) {
    return NextResponse.json(
      { error: "A registration with this email is already pending. Check your Gmail for the verification link, or try signing in." },
      { status: 409 }
    );
  }

  // Check if phone number is already used by an approved account
  if (phone) {
    const { data: phoneTaken } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (phoneTaken) {
      return NextResponse.json(
        { error: "This phone number is already registered to another account." },
        { status: 409 }
      );
    }

    const { data: pendingPhone } = await supabase
      .from("pending_registrations")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (pendingPhone) {
      return NextResponse.json(
        { error: "This phone number is already used in a pending registration." },
        { status: 409 }
      );
    }
  }

  // Upload file if exists
  let validIdPath = null;
  if (validIdFile && validIdFile.size > 0) {
    const fileExt = validIdFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("valid-ids")
      .upload(filePath, validIdFile);

    if (uploadError) {
      console.error("Storage Error:", uploadError);
      return NextResponse.json({ error: "Failed to upload ID." }, { status: 500 });
    }
    validIdPath = filePath;
  }

  // Create a secure URL-safe token.
  let token;
  try {
    const { randomBytes } = await import("node:crypto");
    token = randomBytes(32).toString("hex");
  } catch (e) {
    token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

  const defaultBarangayId = process.env.DEFAULT_BARANGAY_ID
    ? Number(process.env.DEFAULT_BARANGAY_ID)
    : null;

  const { error } = await supabase.from("pending_registrations").insert({
    email,
    name,
    password_hash: password, // Supabase will hash on user creation later
    barangay_id: defaultBarangayId,
    phone,
    purok_address,
    sex,
    birth_date,
    age,
    valid_id_path: validIdPath,
    otp_code: token,
    otp_expires_at: expiresAt,
    device_token,
  });

  if (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Failed to start registration." }, { status: 500 });
  }

  // Send the verification email with magic link
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error("NEXT_PUBLIC_APP_URL is not set!");
      return NextResponse.json(
        { error: "Server configuration error. Please contact support." },
        { status: 500 }
      );
    }
    const verificationUrl = `${appUrl}/api/auth/register?action=verify&token=${token}&email=${encodeURIComponent(email)}`;

    await sendRegistrationLinkEmail(email, name, verificationUrl);
  } catch (emailError) {
    console.error("Email Error:", emailError);
    return NextResponse.json(
      { error: "Account created but failed to send verification email. Please contact support." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message: "Registration successful! Please check your Gmail for the verification link.",
    },
    { status: 200 }
  );
}

// ═══════════════════════════════════════════════════════════════
// RESEND VERIFICATION (JSON)
// ═══════════════════════════════════════════════════════════════
async function handleResend(body: any) {
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error("NEXT_PUBLIC_APP_URL is not set!");
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
    }
    const verificationUrl = `${appUrl}/api/auth/register?action=verify&token=${token}&email=${encodeURIComponent(email)}`;
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

// ═══════════════════════════════════════════════════════════════
// STATUS (GET ?action=status&email=...)
// ═══════════════════════════════════════════════════════════════
async function handleStatus(searchParams: URLSearchParams) {
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data: pending, error: pendingError } = await supabase
    .from("pending_registrations")
    .select("id, email_verified")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError) {
    console.error("Status Check Error:", pendingError);
    return NextResponse.json({ verified: false });
  }

  if (pending?.email_verified) {
    return NextResponse.json({ verified: true });
  }

  return NextResponse.json({ verified: false });
}

// ═══════════════════════════════════════════════════════════════
// VERIFY (GET ?action=verify&token=...&email=...)
// ═══════════════════════════════════════════════════════════════
async function handleVerify(request: Request, searchParams: URLSearchParams) {
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://barangay-pgt.vercel.app";

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

  // Check expiration
  if (pending.otp_expires_at && new Date(pending.otp_expires_at) < new Date()) {
    await supabaseService.from("pending_registrations").delete().eq("id", pending.id);
    return NextResponse.redirect(`${appUrl}/verify-success?error=Link has expired. Please register again.`);
  }

  // Already verified? Just redirect to success
  if (pending.email_verified) {
    return NextResponse.redirect(`${appUrl}/verify-success`);
  }

  // Mark email as verified
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
