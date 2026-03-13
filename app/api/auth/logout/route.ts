import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  
  // Sign out from Supabase (this will clear session and cookies managed by supabaseServer)
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
