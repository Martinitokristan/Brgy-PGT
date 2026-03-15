import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// GET /api/posts/:id?action=detail|comments|reactions
export async function GET(request: Request, props: Params) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "detail";
  const { id: idStr } = await props.params;
  const id = Number(idStr);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  if (action === "comments") return handleGetComments(id);
  if (action === "reactions") return handleGetReactions(id, request);
  return handleGetPost(id);
}

async function handleGetPost(id: number) {
  const service = createSupabaseServiceClient();

  const { data: post, error } = await service
    .from("posts")
    .select("id,title,description,purpose,urgency_level,status,created_at,barangay_id,user_id,image,admin_response,responded_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await service
    .from("profiles")
    .select("name, avatar")
    .eq("id", post.user_id)
    .maybeSingle();

  return NextResponse.json({ ...post, profiles: profile ?? null }, { status: 200 });
}

async function handleGetComments(postId: number) {
  const service = createSupabaseServiceClient();

  const { data: comments, error } = await service
    .from("comments")
    .select("id, post_id, user_id, parent_id, body, liked_by, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }

  const commentList = comments ?? [];
  const userIds = [...new Set(commentList.map((c: any) => c.user_id).filter(Boolean))];
  const profileMap: Record<string, { name: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    for (const p of profiles ?? []) profileMap[p.id] = { name: p.name };
  }

  return NextResponse.json(
    commentList.map((c: any) => ({ ...c, profiles: profileMap[c.user_id] ?? null })),
    { status: 200 }
  );
}

async function handleGetReactions(postId: number, request: Request) {
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();

  const { data, error } = await service
    .from("reactions")
    .select("user_id, type")
    .eq("post_id", postId);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch reactions" }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  let myReaction: string | null = null;
  for (const r of data ?? []) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
    if (user && r.user_id === user.id) myReaction = r.type;
  }

  return NextResponse.json({ counts, myReaction }, { status: 200 });
}

// POST /api/posts/:id  { action: "comment" | "reaction" | "comment_like" }
export async function POST(request: Request, props: Params) {
  const { id: idStr } = await props.params;
  const id = Number(idStr);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  if (action === "comment") return handleAddComment(id, user.id, body);
  if (action === "reaction") return handleToggleReaction(id, user.id, body);
  if (action === "comment_like") return handleCommentLike(user.id, body);

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

async function handleAddComment(postId: number, userId: string, body: any) {
  const service = createSupabaseServiceClient();
  const commentBody = body?.body as string | undefined;
  const parentId = body?.parent_id as number | null | undefined;

  if (!commentBody?.trim()) {
    return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
  }

  const { data, error } = await service
    .from("comments")
    .insert({ post_id: postId, user_id: userId, parent_id: parentId ?? null, body: commentBody.trim() })
    .select("id, post_id, user_id, parent_id, body, created_at")
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

async function handleToggleReaction(postId: number, userId: string, body: any) {
  const service = createSupabaseServiceClient();
  const type = body?.type as string | undefined;
  if (!type) return NextResponse.json({ error: "Reaction type is required." }, { status: 400 });

  const { data: existing } = await service
    .from("reactions")
    .select("id, type")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.type === type) {
    await service.from("reactions").delete().eq("id", existing.id);
  } else if (existing) {
    await service.from("reactions").update({ type }).eq("id", existing.id);
  } else {
    await service.from("reactions").insert({ post_id: postId, user_id: userId, type });
  }

  const { data: all } = await service.from("reactions").select("user_id, type").eq("post_id", postId);
  const counts: Record<string, number> = {};
  let myReaction: string | null = null;
  for (const r of all ?? []) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
    if (r.user_id === userId) myReaction = r.type;
  }
  return NextResponse.json({ counts, myReaction }, { status: 200 });
}

async function handleCommentLike(userId: string, body: any) {
  const service = createSupabaseServiceClient();
  const commentId = Number(body?.comment_id);
  if (!commentId || Number.isNaN(commentId)) {
    return NextResponse.json({ error: "Invalid comment id" }, { status: 400 });
  }

  const { data: comment } = await service.from("comments").select("liked_by").eq("id", commentId).single();
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const likedBy: string[] = comment.liked_by || [];
  const updated = likedBy.includes(userId)
    ? likedBy.filter((id) => id !== userId)
    : [...likedBy, userId];

  const { data, error } = await service
    .from("comments").update({ liked_by: updated }).eq("id", commentId).select("liked_by").single();

  if (error) return NextResponse.json({ error: "Failed to update like" }, { status: 500 });
  return NextResponse.json(data);
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

