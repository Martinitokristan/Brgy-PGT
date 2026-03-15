import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// PATCH /api/posts/comments/:id - update own comment
export async function PATCH(request: Request, props: Params) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();
  const { id: idStr } = await props.params;
  const id = Number(idStr);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyData = await request.json().catch(() => null);
  const commentBody = bodyData?.body as string | undefined;

  if (!commentBody) {
    return NextResponse.json(
      { error: "Comment body is required." },
      { status: 400 }
    );
  }

  const { error } = await service
    .from("comments")
    .update({ body: commentBody })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

// DELETE /api/posts/comments/:id - delete own comment
export async function DELETE(_request: Request, props: Params) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();
  const { id: idStr } = await props.params;
  const id = Number(idStr);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await service
    .from("comments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

