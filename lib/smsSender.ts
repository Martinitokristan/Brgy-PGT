// Lightweight port of your Laravel SmsSender to Next.js.
// Uses environment variables so you never expose your real keys.

type SmsResult =
  | { success: true; sid: string }
  | { success: false; error: string };

function normalizePhilippineNumber(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+63")) {
    const local = cleaned.slice(3).replace(/\D/g, "");
    return local.length === 10 ? `63${local}` : null;
  }

  if (cleaned.startsWith("63")) {
    const local = cleaned.slice(2).replace(/\D/g, "");
    return local.length === 10 ? `63${local}` : null;
  }

  if (cleaned.startsWith("0")) {
    const local = cleaned.slice(1).replace(/\D/g, "");
    return local.length === 10 ? `63${local}` : null;
  }

  if (cleaned.startsWith("9")) {
    return cleaned.length === 10 ? `63${cleaned}` : null;
  }

  return null;
}

export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const apiToken = process.env.IPROG_API_TOKEN;
  const endpoint = process.env.IPROG_ENDPOINT;

  if (!apiToken || !endpoint) {
    return {
      success: false,
      error:
        "SMS service is not configured (missing IPROG_API_TOKEN or IPROG_ENDPOINT).",
    };
  }

  const phoneNumber = normalizePhilippineNumber(to);
  if (!phoneNumber) {
    return {
      success: false,
      error:
        "Invalid phone number format. Use 09XXXXXXXXX or +639XXXXXXXXX.",
    };
  }

  try {
    // iPROG API expects query params in the URL + JSON body
    const url = new URL(endpoint);
    url.searchParams.set("api_token", apiToken);
    url.searchParams.set("message", message);
    url.searchParams.set("phone_number", phoneNumber);

    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_token: apiToken,
        phone_number: phoneNumber,
        message,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const rawText = await response.text();
        let data: Record<string, unknown> = {};
    try {
      data = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch (error) {
      console.error("Error parsing response:", error);
      data = { message: rawText };
    }

    const statusValue = data?.status;
    const statusIsSuccess =
      statusValue === 200 ||
      statusValue === "200" ||
      statusValue === "success" ||
      data?.success === true;

    if (response.ok && statusIsSuccess) {
      return {
        success: true,
        sid:
          (typeof data?.message_id === "string" && data.message_id) ||
          (typeof data?.id === "string" && data.id) ||
          crypto.randomUUID(),
      };
    }

    const errorMessage =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.error === "string" && data.error) ||
      `SMS sending failed (HTTP ${response.status})`;

    return {
      success: false,
      error: errorMessage,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown SMS error";
    console.error(`[SMS] Error sending to ${phoneNumber}:`, msg);

    if (msg.includes("abort") || msg.includes("timeout")) {
      return { success: false, error: "SMS request timed out. The SMS provider may be unreachable." };
    }
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
      return { success: false, error: `Cannot reach SMS provider (${msg}). Check IPROG_ENDPOINT in .env.local.` };
    }
    if (msg.includes("certificate") || msg.includes("SSL") || msg.includes("CERT")) {
      return { success: false, error: `SSL/certificate error connecting to SMS provider. Try using http:// instead of https:// in IPROG_ENDPOINT.` };
    }

    return {
      success: false,
      error: msg,
    };
  }
}

// ─── Verification Approved SMS ─────────────────────────────────────────────
export async function sendVerificationApprovedSms(
  phone: string,
  name: string
): Promise<SmsResult> {
  const firstName = name.split(" ")[0];
  const message =
    `Congratulations, ${firstName}! Your BarangayPGT account has been verified. ` +
    `You now have full access to post, comment, and participate in your community. ` +
    `- Barangay Pagatpatan`;
  return sendSms(phone, message);
}
