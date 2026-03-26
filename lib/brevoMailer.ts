// Minimal Brevo API mailer based on your Laravel BrevoApiMailer.
// Fill in BREVO_API_KEY, BREVO_FROM_EMAIL, BREVO_FROM_NAME in .env.local.

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const fromEmail = process.env.BREVO_FROM_EMAIL || "no-reply@example.com";
const fromName = process.env.BREVO_FROM_NAME || "BarangayPGT";

export async function sendDeviceOtpEmail(
  toEmail: string,
  toName: string,
  code: string
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  const htmlContent = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
    <h2 style="color:#1d4ed8;">New Device Login - BarangayPGT</h2>
    <p>Hello, <strong>${toName}</strong>!</p>
    <p>A login attempt was made from a new device. Use the code below to verify it's you:</p>
    <div style="text-align:center;margin:32px 0;font-size:36px;font-weight:bold;letter-spacing:8px;color:#1d4ed8;">
      ${code}
    </div>
    <p style="color:#6b7280;font-size:14px;">This code will expire in 15 minutes.</p>
    <p style="color:#6b7280;font-size:14px;">If you did not attempt to log in, please change your password immediately.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:13px;">Regards, BarangayPGT</p>
  </div>`;

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: toEmail, name: toName }],
      subject: "Login Verification Code - BarangayPGT",
      htmlContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Failed to send email via Brevo: status ${res.status} body ${body}`
    );
  }
}

export async function sendRegistrationLinkEmail(
  toEmail: string,
  toName: string,
  verificationUrl: string
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  const htmlContent = `
  <div style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;background-color:#f6f9fc;">
    <div style="background-color:#ffffff;border-radius:24px;padding:48px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.05);">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="color:#2563eb;margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Barangay Pagatpatan</h1>
        <p style="color:#64748b;font-size:16px;margin:8px 0 0 0;font-weight:500;">Resident Portal Registration</p>
      </div>
      
      <div style="margin-bottom:32px;">
        <p style="font-size:16px;color:#1e293b;margin-bottom:16px;">Hello <strong>${toName}</strong>,</p>
        <p style="font-size:16px;color:#475569;line-height:1.7;">Welcome! We're excited to have you join our digital barangay community. To finish setting up your account, please verify your email address by clicking the button below:</p>
      </div>

      <div style="text-align:center;margin:40px 0;">
        <a href="${verificationUrl}" style="background-color:#2563eb;color:#ffffff;padding:16px 36px;border-radius:14px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;box-shadow:0 10px 15px -3px rgba(37,99,235,0.25);transition:all 0.2s ease;">Verify My Email Address</a>
      </div>

      <div style="padding:24px;background-color:#f8fafc;border-radius:16px;margin-bottom:32px;">
        <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">If the button above doesn't work, copy and paste this link into your browser:</p>
        <p style="margin:8px 0 0 0;font-size:13px;word-break:break-all;"><a href="${verificationUrl}" style="color:#2563eb;text-decoration:none;">${verificationUrl}</a></p>
      </div>

      <div style="border-top:1px solid #e2e8f0;padding-top:24px;text-align:center;">
        <p style="color:#94a3b8;font-size:13px;margin:0;">This verification link will expire in 15 minutes.</p>
        <p style="color:#94a3b8;font-size:13px;margin:8px 0 0 0;">If you didn't sign up for an account, you can safely ignore this email.</p>
      </div>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">&copy; 2026 Barangay Pagatpatan Digital Portal. All rights reserved.</p>
    </div>
  </div>`;

  const res = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: toEmail, name: toName }],
      subject: "Verify Your Account - Barangay Pagatpatan",
      htmlContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Failed to send email via Brevo: status ${res.status} body ${body}`
    );
  }
}

