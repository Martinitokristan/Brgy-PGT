import { createClient } from "@supabase/supabase-js";

// Service-role client for backend-only operations (e.g. creating users).
// Make sure SUPABASE_SERVICE_ROLE_KEY is set ONLY on the server.

export function createSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Supabase service-role environment variables are not configured."
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

