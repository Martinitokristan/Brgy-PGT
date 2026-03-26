import { cookies } from "next/headers";
import { createSupabaseServiceClient } from "./supabaseService";
import { createSupabaseServerClient } from "./supabaseServer";

/**
 * Verify the current user by:
 * 1. First trying createSupabaseServerClient().auth.getUser() (uses @supabase/ssr)
 * 2. Falling back to manual cookie parsing + service client token verification
 */
export async function getAuthUser(): Promise<any | null> {
  // ── Strategy 1: createSupabaseServerClient (standard SSR path) ──
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) {
      return data.user;
    }
  } catch (e) {
    console.warn("getAuthUser SSR strategy failed:", e);
  }

  // ── Strategy 2: manual cookie parse + service token verify ──
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    let rawToken: string | null = null;

    // Single cookie: sb-<ref>-auth-token (no dot suffix)
    const authCookieBase = allCookies.find(
      (c) => c.name.includes("-auth-token") && !c.name.match(/\.\d+$/)
    );

    if (authCookieBase?.value) {
      rawToken = extractAccessToken(authCookieBase.value);
    }

    // Chunked cookies: sb-<ref>-auth-token.0, .1, ...
    if (!rawToken) {
      const chunked = allCookies
        .filter((c) => c.name.match(/-auth-token\.\d+$/))
        .sort((a, b) => {
          const n = (s: string) => parseInt(s.match(/\.(\d+)$/)![1]);
          return n(a.name) - n(b.name);
        });

      if (chunked.length > 0) {
        const combined = chunked.map((c) => c.value).join("");
        rawToken = extractAccessToken(combined);
      }
    }

    if (!rawToken) {
      return null;
    }

    const service = createSupabaseServiceClient();
    const { data, error } = await service.auth.getUser(rawToken);

    if (error || !data.user) {
      return null;
    }

    return data.user;
  } catch (err) {
    console.error("getAuthUser fallback error:", err);
    return null;
  }
}

function extractAccessToken(raw: string): string | null {
  try {
    // base64- prefix means the value is base64-encoded JSON
    const text = raw.startsWith("base64-")
      ? Buffer.from(raw.slice(7), "base64").toString("utf-8")
      : raw;

    // Could be a JWT directly (starts with "ey")
    if (text.startsWith("ey") && !text.startsWith("{")) {
      return text.split(".").length === 3 ? text : null;
    }

    const parsed = JSON.parse(text);
    return parsed?.access_token ?? null;
  } catch {
    return null;
  }
}
