import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

async function requireAdmin(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401, user: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, barangay_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return { error: "Forbidden", status: 403, user: null };
  return { error: null, status: 200, user, barangayId: profile.barangay_id };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { error, status, barangayId } = await requireAdmin(supabase);
  if (error) return NextResponse.json({ error }, { status });

  const { data, error: fetchError } = await supabase
    .from("events")
    .select("id, title, description, location, event_date, image")
    .eq("barangay_id", barangayId)
    .order("event_date", { ascending: true });

  if (fetchError) {
    console.error(fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();
  const { error, status, user, barangayId } = await requireAdmin(supabase);
  if (error || !user) return NextResponse.json({ error: error || "Unauthorized" }, { status });

  const body = await request.json().catch(() => null);
  if (!body?.title || !body?.event_date) {
    return NextResponse.json({ error: "title and event_date are required" }, { status: 400 });
  }

  const { data, error: insertError } = await service
    .from("events")
    .insert({ 
      ...body, 
      barangay_id: barangayId,
      created_by: user.id 
    })
    .select()
    .single();

  if (insertError) {
    console.error("Insert Error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();
  const { error, status } = await requireAdmin(supabase);
  if (error) return NextResponse.json({ error }, { status });

  const body = await request.json().catch(() => null);
  if (!body?.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { id, ...updates } = body;

  const { data, error: updateError } = await service
    .from("events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();
  const { error, status } = await requireAdmin(supabase);
  if (error) return NextResponse.json({ error }, { status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const { error: deleteError } = await service.from("events").delete().eq("id", id);
  if (deleteError) {
    console.error(deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
