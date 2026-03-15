import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  // Check if the pending registration has been email-verified
  const { data: pending, error: pendingError } = await supabase
    .from("pending_registrations")
    .select("id, email_verified")
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError) {
    console.error("Status Check Error:", pendingError);
    return NextResponse.json({ verified: false });
  }

  if (pending?.email_verified) {
    return NextResponse.json({ verified: true });
  }

  return NextResponse.json({ verified: false });
}
