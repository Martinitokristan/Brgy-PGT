import { cookies } from "next/headers";
import { createSupabaseServiceClient } from "./supabaseService";

/**
 * Extract the Supabase access token from cookies and verify the user
 * using the service client. This avoids the @supabase/ssr cookie
 * integration which can throw in read-only / production contexts.
 */
export async function getAuthUser(): Promise<{ id: string } | null> {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Supabase stores auth in cookies named like:
    //   sb-<project-ref>-auth-token          (single cookie)
    //   sb-<project-ref>-auth-token.0, .1... (chunked cookies)
    const authCookieBase = allCookies.find(
      (c) => c.name.includes("-auth-token") && !c.name.includes(".")
    );

    // Try chunked cookies if single cookie not found or is a code-verifier
    let rawToken: string | null = null;

    if (authCookieBase && authCookieBase.value) {
      // Check if it's a chunked base64 cookie
      const value = authCookieBase.value;
      if (value.startsWith("base64-")) {
        // Decode base64 chunked format
        const decoded = Buffer.from(value.replace("base64-", ""), "base64").toString("utf-8");
        try {
          const parsed = JSON.parse(decoded);
          rawToken = parsed.access_token ?? null;
        } catch {
          rawToken = null;
        }
      } else {
        // Try parsing as JSON directly
        try {
          const parsed = JSON.parse(value);
          rawToken = parsed.access_token ?? null;
        } catch {
          rawToken = null;
        }
      }
    }

    // If no single cookie, try chunked cookies (.0, .1, .2, etc.)
    if (!rawToken) {
      const chunkedCookies = allCookies
        .filter((c) => c.name.includes("-auth-token."))
        .sort((a, b) => {
          const aNum = parseInt(a.name.split(".").pop() || "0");
          const bNum = parseInt(b.name.split(".").pop() || "0");
          return aNum - bNum;
        });

      if (chunkedCookies.length > 0) {
        const combined = chunkedCookies.map((c) => c.value).join("");
        let decoded = combined;
        if (combined.startsWith("base64-")) {
          decoded = Buffer.from(combined.replace("base64-", ""), "base64").toString("utf-8");
        }
        try {
          const parsed = JSON.parse(decoded);
          rawToken = parsed.access_token ?? null;
        } catch {
          rawToken = null;
        }
      }
    }

    if (!rawToken) {
      return null;
    }

    // Verify the token with Supabase
    const service = createSupabaseServiceClient();
    const { data, error } = await service.auth.getUser(rawToken);

    if (error || !data.user) {
      return null;
    }

    return { id: data.user.id };
  } catch (err) {
    console.error("getAuthUser error:", err);
    return null;
  }
}
