import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  // Check if a profile exists for this email
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    console.error("Status Check Error:", profileError);
    return NextResponse.json({ verified: false });
  }

  if (profile) {
    return NextResponse.json({ verified: true });
  }

  return NextResponse.json({ verified: false });
}
