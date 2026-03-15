import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's barangay_id from profile.
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("barangay_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.barangay_id) {
    return NextResponse.json(
      { error: "No barangay configured for user." },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await service
    .from("events")
    .select("id, title, description, location, event_date, image")
    .eq("barangay_id", profile.barangay_id)
    .gte("event_date", today)
    .order("event_date", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

