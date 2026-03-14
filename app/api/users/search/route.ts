import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();

  if (!q) {
    return NextResponse.json([], { status: 200 });
  }

  const { data, error } = await service
    .from("profiles")
    .select("id, name, role, avatar, barangay_id")
    .ilike("name", `%${q}%`)
    .eq("is_approved", true)
    .neq("id", user.id)
    .limit(15);

  if (error) {
    console.error(error);
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data ?? [], { status: 200 });
}
