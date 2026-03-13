// Lightweight port of your Laravel SmsSender to Next.js.
// Uses environment variables so you never expose your real keys.

type SmsResult =
  | { success: true; sid: string }
  | { success: false; error: string };

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

  let phoneNumber = to;
  if (to.startsWith("+63")) {
    phoneNumber = "63" + to.slice(3);
  } else if (to.startsWith("0")) {
    phoneNumber = "63" + to.slice(1);
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_token: apiToken,
        phone_number: phoneNumber,
        message,
        sms_provider: 0,
      }),
    });

    const rawText = await response.text();
    console.log("SMS Provider Raw Response:", rawText);
    const data = JSON.parse(rawText || "{}");

    if (response.ok && data?.status === 200) {
      return {
        success: true,
        sid: data?.message_id ?? crypto.randomUUID(),
      };
    }

    return {
      success: false,
      error: (data && (data.message as string)) || "SMS sending failed",
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown SMS error",
    };
  }
}

