import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// GET /api/posts/:id - single post with basic fields
export async function GET(_request: Request, props: Params) {
  const service = createSupabaseServiceClient();
  const { id: idStr } = await props.params;
  const id = Number(idStr);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data, error } = await service
    .from("posts")
    .select(
      "id,title,description,purpose,urgency_level,status,created_at,barangay_id,user_id,image,profiles(name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data, { status: 200 });
}

// DELETE /api/posts/:id - delete post (admin or owner)
export async function DELETE(_request: Request, props: Params) {
  const service = createSupabaseServiceClient();
  const { id: idStr } = await props.params;
  const id = Number(idStr);

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get current user's profile to check role
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";

  const { data: post } = await service
    .from("posts")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (post.user_id !== user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await service.from("posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// PATCH /api/posts/:id - update post status/admin_response (admin only)
export async function PATCH(request: Request, props: Params) {
  const service = createSupabaseServiceClient();
  const { id: idStr } = await props.params;
  const id = Number(idStr);

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { status, admin_response } = body;

  const updates: Record<string, unknown> = {};
  if (status !== undefined && status !== null) updates.status = status;
  if (admin_response) {
    updates.admin_response = admin_response;
    updates.responded_by = user.id;
    updates.responded_at = new Date().toISOString();
  }

  const { error } = await service
    .from("posts")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Post update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

