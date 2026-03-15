import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const body = await request.json().catch(() => null);

  const email = body?.email as string | undefined;

  if (!email) {
    return NextResponse.json(
      { error: "Email is required." },
      { status: 400 }
    );
  }

  // Rate limit: max 3 reset requests per email per 15 minutes
  const rl = rateLimit(`forgot-pw:${email.toLowerCase()}`, 3, 15 * 60 * 1000);
  if (rl.limited) {
    const mins = Math.ceil(rl.retryAfterMs / 60000);
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${mins} minute${mins > 1 ? "s" : ""}.` },
      { status: 429 }
    );
  }

  const origin = request.headers.get("origin") ?? "http://localhost:3000";
  const redirectTo = `${origin}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to send reset email." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, message: "If this email exists, a reset link was sent." },
    { status: 200 }
  );
}

