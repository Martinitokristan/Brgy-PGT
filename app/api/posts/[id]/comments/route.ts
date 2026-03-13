import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// GET /api/posts/:id/comments - list comments for a post
export async function GET(_request: Request, props: Params) {
  const supabase = await createSupabaseServerClient();
  const { id: idStr } = await props.params;
  const postId = Number(idStr);

  if (!postId || Number.isNaN(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles(name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? [], { status: 200 });
}

// POST /api/posts/:id/comments - add a comment
export async function POST(request: Request, props: Params) {
  const supabase = await createSupabaseServerClient();
  const { id: idStr } = await props.params;
  const postId = Number(idStr);

  if (!postId || Number.isNaN(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const commentBody = body?.body as string | undefined;
  const parentId = body?.parent_id as number | undefined;

  if (!commentBody) {
    return NextResponse.json(
      { error: "Comment body is required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      parent_id: parentId ?? null,
      body: commentBody,
    })
    .select("id, post_id, user_id, parent_id, body, created_at")
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}

