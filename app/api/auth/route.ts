import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { sendDeviceOtpEmail } from "@/lib/brevoMailer";
import { rateLimit } from "@/lib/rateLimit";

// ─── POST /api/auth ───────────────────────────────────────────
// All auth actions are dispatched via { action: "..." } in the JSON body.
// Actions: login, logout, logout_all, delete_account,
//          email_resend, password_forgot, password_change,
//          device_verify, device_resend
export async function POST(request: Request) {
  // Clone the request so we can read body twice if needed
  const clonedReq = request.clone();
  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  switch (action) {
    case "login":
      return handleLogin(body);
    case "logout":
      return handleLogout();
    case "logout_all":
      return handleLogoutAll();
    case "delete_account":
      return handleDeleteAccount(body);
    case "email_resend":
      return handleEmailResend(body);
    case "password_forgot":
      return handlePasswordForgot(clonedReq, body);
    case "password_change":
      return handlePasswordChange(body);
    case "device_verify":
      return handleDeviceVerify(body);
    case "device_resend":
      return handleDeviceResend(body);
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}

// ═══════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════
async function handleLogin(body: any) {
  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;
  const deviceToken = body?.device_token as string | undefined;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const service = createSupabaseServiceClient();

  // Check if this email is still in pending_registrations
  const { data: pending } = await service
    .from("pending_registrations")
    .select("id, email_verified, password_hash")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending) {
    if (pending.password_hash !== password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!pending.email_verified) {
      return NextResponse.json(
        {
          needs_verification: true,
          redirect_to: `/verify-email?email=${encodeURIComponent(email)}`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        user: null,
        profile: { is_approved: false },
        device_trusted: true,
        pending_approval: true,
      },
      { status: 200 }
    );
  }

  // Normal login
  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (authError || !authData.session || !authData.user) {
    console.error("Login Auth Error:", authError?.message || authError);
    return NextResponse.json(
      { error: authError?.message || "Invalid email or password." },
      { status: 401 }
    );
  }

  const user = authData.user;

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select(
      "id, role, is_approved, barangay_id, phone, purok_address, sex, birth_date, age"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile Fetch Error:", profileError);
  }

  // Admins skip device verification
  if (profile?.role === "admin" || !deviceToken) {
    return NextResponse.json(
      { user, profile, device_trusted: true },
      { status: 200 }
    );
  }

  // Check trusted_devices
  const { data: trusted } = await service
    .from("trusted_devices")
    .select("id")
    .eq("user_id", user.id)
    .eq("device_token", deviceToken)
    .maybeSingle();

  if (trusted) {
    await service
      .from("trusted_devices")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", trusted.id);

    return NextResponse.json(
      { user, profile, device_trusted: true },
      { status: 200 }
    );
  }

  // Not trusted: generate OTP
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

// ═══════════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════════
async function handleLogout() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 200 });
}

// ═══════════════════════════════════════════════════════════════
// LOGOUT ALL
// ═══════════════════════════════════════════════════════════════
async function handleLogoutAll() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 200 });
}

// ═══════════════════════════════════════════════════════════════
// DELETE ACCOUNT
// ═══════════════════════════════════════════════════════════════
async function handleDeleteAccount(body: any) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reason = body?.reason ?? null;

  const { error: updateError } = await service
    .from("profiles")
    .update({
      is_approved: false,
      deleted_at: new Date().toISOString(),
      delete_reason: reason,
    })
    .eq("id", user.id);

  if (updateError) {
    await service.from("profiles").update({ is_approved: false }).eq("id", user.id);
  }

  await supabase.auth.signOut({ scope: "global" });
  return NextResponse.json({ success: true }, { status: 200 });
}

// ═══════════════════════════════════════════════════════════════
// EMAIL RESEND (Supabase native)
// ═══════════════════════════════════════════════════════════════
async function handleEmailResend(body: any) {
  const supabase = await createSupabaseServerClient();
  const email = body?.email as string | undefined;

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const { error } = await supabase.auth.resend({ type: "signup", email });

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to resend verification email." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, message: "Verification email resent if account exists." },
    { status: 200 }
  );
}

// ═══════════════════════════════════════════════════════════════
// PASSWORD FORGOT
// ═══════════════════════════════════════════════════════════════
async function handlePasswordForgot(clonedReq: Request, body: any) {
  const supabase = await createSupabaseServerClient();
  const email = body?.email as string | undefined;

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const rl = rateLimit(`forgot-pw:${email.toLowerCase()}`, 3, 15 * 60 * 1000);
  if (rl.limited) {
    const mins = Math.ceil(rl.retryAfterMs / 60000);
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${mins} minute${mins > 1 ? "s" : ""}.` },
      { status: 429 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || clonedReq.headers.get("origin") || "http://localhost:3000";
  const redirectTo = `${appUrl}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to send reset email." }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, message: "If this email exists, a reset link was sent." },
    { status: 200 }
  );
}

// ═══════════════════════════════════════════════════════════════
// PASSWORD CHANGE
// ═══════════════════════════════════════════════════════════════
async function handlePasswordChange(body: any) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimit(`change-pw:${user.id}`, 5, 15 * 60 * 1000);
  if (rl.limited) {
    const mins = Math.ceil(rl.retryAfterMs / 60000);
    return NextResponse.json(
      { error: `Too many attempts. Please try again in ${mins} minute${mins > 1 ? "s" : ""}.` },
      { status: 429 }
    );
  }

  const newPassword = body?.newPassword as string | undefined;
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true }, { status: 200 });
}

// ═══════════════════════════════════════════════════════════════
// DEVICE VERIFY
// ═══════════════════════════════════════════════════════════════
async function handleDeviceVerify(body: any) {
  const service = createSupabaseServiceClient();

  const email = body?.email as string | undefined;
  const code = body?.code as string | undefined;
  const deviceToken = body?.device_token as string | undefined;

  if (!email || !code || !deviceToken) {
    return NextResponse.json(
      { error: "Email, code, and device_token are required." },
      { status: 400 }
    );
  }

  // Find the user ID by email. Check profiles first, then auth.users as fallback.
  let userId: string | null = null;

  const { data: profileRow } = await service
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (profileRow) {
    userId = profileRow.id;
  } else {
    // Check auth.users directly via service-role
    const { data: authData } = await service.auth.admin.listUsers();
    const foundUser = authData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (foundUser) userId = foundUser.id;
  }

  if (!userId) {
    return NextResponse.json({ error: "Invalid email or code." }, { status: 400 });
  }

  const { data: otpRow, error: otpError } = await service
    .from("device_otps")
    .select("id, code, expires_at")
    .eq("user_id", userId)
    .eq("device_token", deviceToken)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (otpError || !otpRow) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  }

  if (new Date(otpRow.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "This code has expired. Please log in again to get a new code." },
      { status: 400 }
    );
  }

  if (otpRow.code !== code) {
    return NextResponse.json({ error: "Incorrect code. Please try again." }, { status: 400 });
  }

  await service.from("trusted_devices").upsert(
    {
      user_id: userId,
      device_token: deviceToken,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_token" } as any
  );

  await service.from("device_otps").delete().eq("id", otpRow.id);

  return NextResponse.json(
    { ok: true, message: "Device verified and trusted." },
    { status: 200 }
  );
}

// ═══════════════════════════════════════════════════════════════
// DEVICE RESEND
// ═══════════════════════════════════════════════════════════════
async function handleDeviceResend(body: any) {
  const service = createSupabaseServiceClient();

  const email = body?.email as string | undefined;
  const deviceToken = body?.device_token as string | undefined;

  if (!email || !deviceToken) {
    return NextResponse.json(
      { error: "Email and device_token are required." },
      { status: 400 }
    );
  }

  let userId: string | null = null;
  const { data: profileRow } = await service
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (profileRow) {
    userId = profileRow.id;
  } else {
    const { data: authData } = await service.auth.admin.listUsers();
    const foundUser = authData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (foundUser) userId = foundUser.id;
  }

  if (!userId) {
    return NextResponse.json({ ok: true }, { status: 200 }); // Silent fail as before
  }

  await service
    .from("device_otps")
    .delete()
    .eq("user_id", userId)
    .eq("device_token", deviceToken);

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
