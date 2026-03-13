import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { sendRegistrationLinkEmail } from "@/lib/brevoMailer";

// Initial registration: create pending_registrations row with OTP.
export async function POST(request: Request) {
  const supabase = createSupabaseServiceClient();
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json(
      { error: "Invalid form data." },
      { status: 400 }
    );
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

  // Upload file if exists
  let validIdPath = null;
  if (validIdFile && validIdFile.size > 0) {
    const fileExt = validIdFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`; // Just the filename in the bucket

    const { error: uploadError } = await supabase.storage
      .from("valid-ids")
      .upload(filePath, validIdFile);

    if (uploadError) {
      console.error("Storage Error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload ID." },
        { status: 500 }
      );
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
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

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
    return NextResponse.json(
      { error: "Failed to start registration." },
      { status: 500 }
    );
  }

  // Send the verification email with magic link
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationUrl = `${appUrl}/api/auth/register/verify?token=${token}&email=${encodeURIComponent(email)}`;
    
    await sendRegistrationLinkEmail(email, name, verificationUrl);
  } catch (emailError) {
    console.error("Email Error:", emailError);
    // We don't necessarily want to fail the whole request if email fails, 
    // but the user won't get the code. In this flow, they NEED the code.
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

