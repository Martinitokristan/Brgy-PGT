import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: max 5 password changes per user per 15 minutes
  const rl = rateLimit(`change-pw:${user.id}`, 5, 15 * 60 * 1000);
  if (rl.limited) {
    const mins = Math.ceil(rl.retryAfterMs / 60000);
    return NextResponse.json(
      { error: `Too many attempts. Please try again in ${mins} minute${mins > 1 ? "s" : ""}.` },
      { status: 429 }
    );
  }

  const { newPassword } = await request.json().catch(() => ({}));
  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true }, { status: 200 });
}
