import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  // scope: 'global' signs out all sessions for this user
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 200 });
}
