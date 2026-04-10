import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getAuthUser } from "@/lib/getUser";
import { detectProfanity } from "@/lib/profanity";

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
  const user = await getAuthUser();
  const userId = user?.id ?? null;

  const { data: post, error } = await service
    .from("posts")
    .select("*, original_post_id, metadata")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: profile }, { data: reactions }, { data: comments }] = await Promise.all([
    service
      .from("profiles")
      .select("name, avatar, role")
      .eq("id", post.user_id)
      .maybeSingle(),
    service
      .from("reactions")
      .select("user_id, type")
      .eq("post_id", id),
    service
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", id),
  ]);

  const counts: Record<string, number> = {};
  let myReaction: string | null = null;
  for (const r of reactions ?? []) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
    if (userId && r.user_id === userId) myReaction = r.type;
  }

  return NextResponse.json(
    {
      ...post,
      profiles: profile ?? null,
      author_role: profile?.role ?? null,
      reaction_counts: counts,
      my_reaction: myReaction,
      comment_count: (comments as any)?.count ?? 0,
    },
    { status: 200 }
  );
}

async function handleGetComments(postId: number) {
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();
  const userId = user?.id ?? null;

  const { data: comments, error } = await service
    .from("comments")
    .select("id, post_id, user_id, parent_id, body, created_at, is_hidden")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }

  const commentListRaw = comments ?? [];

  // Visibility rules for hidden comments:
  // - Admins: see all
  // - Author: can see their own hidden comments
  // - Other residents: hidden comments are excluded
  let isAdmin = false;
  if (userId) {
    const { data: myProfile } = await service
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    isAdmin = myProfile?.role === "admin";
  }

  const commentList = commentListRaw.filter((c: any) => {
    if (!c?.is_hidden) return true;
    if (isAdmin) return true;
    if (userId && c.user_id === userId) return true;
    return false;
  });

  // Enrich comments with reactions from comment_reactions table.
  const commentIds = commentList.map((c: any) => c.id).filter(Boolean);
  const reactionsByComment: Record<number, { user_id: string; type: string }[]> = {};
  if (commentIds.length > 0) {
    try {
      const { data: commentReactions, error: reactionError } = await service
        .from("comment_reactions")
        .select("comment_id, user_id, type")
        .in("comment_id", commentIds);

      if (reactionError) throw reactionError;

      for (const r of commentReactions ?? []) {
        if (!reactionsByComment[r.comment_id]) reactionsByComment[r.comment_id] = [];
        reactionsByComment[r.comment_id].push({ user_id: r.user_id, type: r.type });
      }
    } catch {
      // comment_reactions unavailable, comments will have empty reactions
    }
  }

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
    commentList.map((c: any) => {
      const reactions = reactionsByComment[c.id] ?? null;
      if (reactions && reactions.length > 0) {
        const counts: Record<string, number> = {};
        let myReaction: string | null = null;
        for (const r of reactions) {
          counts[r.type] = (counts[r.type] ?? 0) + 1;
          if (userId && r.user_id === userId) myReaction = r.type;
        }
        return {
          ...c,
          profiles: profileMap[c.user_id] ?? null,
          reaction_counts: counts,
          my_reaction: myReaction,
        };
      }

      return {
        ...c,
        profiles: profileMap[c.user_id] ?? null,
        reaction_counts: {},
        my_reaction: null,
      };
    }),
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

// POST /api/posts/:id  { action: "comment" | "reaction" | "comment_like" | "comment_reaction" }
export async function POST(request: Request, props: Params) {
  const { id: idStr } = await props.params;
  const id = Number(idStr);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Parse body and auth in parallel to save time
  const [user, body] = await Promise.all([
    getAuthUser(),
    request.json().catch(() => null),
  ]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if user is verified (or admin)
  const service2 = createSupabaseServiceClient();
  const { data: myProfile } = await service2
    .from("profiles")
    .select("is_verified, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!myProfile?.is_verified && myProfile?.role !== "admin") {
    return NextResponse.json(
      { error: "Your account must be verified to interact with posts." },
      { status: 403 }
    );
  }
  const action = body?.action as string | undefined;

  if (action === "comment") return handleAddComment(id, user.id, body);
  if (action === "reaction") return handleToggleReaction(id, user.id, body);
  if (action === "comment_like") return handleCommentLike(user.id, body);
  if (action === "comment_reaction") return handleCommentReaction(user.id, body);

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

async function handleAddComment(postId: number, userId: string, body: any) {
  const service = await createSupabaseServerClient();
  const commentBody = body?.body as string | undefined;
  const parentId = body?.parent_id as number | null | undefined;

  if (!commentBody?.trim()) {
    return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
  }

  // Restriction check (24h comment restriction)
  const { data: p } = await service
    .from("profiles")
    .select("comment_restricted_until, profanity_violations")
    .eq("id", userId)
    .maybeSingle();
  if (p?.comment_restricted_until) {
    const until = new Date(p.comment_restricted_until).getTime();
    if (Number.isFinite(until) && until > Date.now()) {
      return NextResponse.json(
        { error: "You are temporarily restricted from commenting. Please try again later." },
        { status: 403 }
      );
    }
  }

  // Profanity enforcement (comments)
  const prof = detectProfanity(commentBody);
  if (prof) {
    const prev = Number(p?.profanity_violations ?? 0);
    const next = prev + 1;
    const restrict = next >= 3;
    const restrictedUntil = restrict ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

    // Save the comment but hide it from other residents (visible to author + admins)
    const { data: inserted, error: insertErr } = await service
      .from("comments")
      .insert({
        post_id: postId,
        user_id: userId,
        parent_id: parentId ?? null,
        body: commentBody.trim(),
        is_hidden: true,
        flag_reason: "profanity",
        flagged_at: new Date().toISOString(),
      })
      .select("id, post_id, user_id, parent_id, body, created_at")
      .maybeSingle();

    if (insertErr) {
      console.error(insertErr);
      return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
    }

    // Update profile violations count and restriction
    await service
      .from("profiles")
      .update({
        profanity_violations: next,
        comment_restricted_until: restrictedUntil,
      })
      .eq("id", userId);

    // Insert profanity notification
    try {
      await service
        .from("notifications")
        .insert({
          user_id: userId,
          type: "policy_violation",
          title: restrict ? "Comment restricted (24 hours)" : "Comment policy warning",
          message: restrict
            ? "Your comment contains prohibited words. Due to repeated violations, you are restricted from commenting for 24 hours."
            : "Your comment contains prohibited words. Please keep the community respectful. Repeated violations may restrict your commenting privileges.",
          post_id: postId,
          comment_id: inserted?.id ?? null,
          is_read: false,
        });
    } catch (notifError) {
      console.error("Failed to insert profanity notification:", notifError);
    }

    try {
      await sendCommentActivityNotification(service, {
        actorUserId: userId,
        postId,
        commentId: inserted?.id ?? null,
        parentId: parentId ?? null,
        commentBody: commentBody.trim(),
      });
    } catch (notifError) {
      console.error("Failed to send comment activity notification:", notifError);
    }

    return NextResponse.json(inserted, { status: 201 });
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

  try {
    await sendCommentActivityNotification(service, {
      actorUserId: userId,
      postId,
      commentId: data?.id ?? null,
      parentId: parentId ?? null,
      commentBody: commentBody.trim(),
    });
  } catch (notifError) {
    console.error("Failed to send comment activity notification:", notifError);
  }

  return NextResponse.json(data, { status: 201 });
}

async function sendCommentActivityNotification(
  service: ReturnType<typeof createSupabaseServiceClient>,
  params: {
    actorUserId: string;
    postId: number;
    commentId: number | null;
    parentId: number | null;
    commentBody: string;
  }
) {
  const { actorUserId, postId, commentId, parentId, commentBody } = params;
  if (!commentId) return;

  const [{ data: actor }, { data: post }] = await Promise.all([
    service.from("profiles").select("name").eq("id", actorUserId).maybeSingle(),
    service.from("posts").select("id, user_id, title").eq("id", postId).maybeSingle(),
  ]);

  const actorName = actor?.name || "Someone";
  const postTitle = post?.title || "your post";

  if (!parentId) {
    // New top-level comment: notify post owner (if commenter isn't owner)
    if (post?.user_id && post.user_id !== actorUserId) {
      await service.from("notifications").insert({
        user_id: post.user_id,
        type: "post_comment",
        title: "New comment on your post",
        message: `${actorName} commented on your post "${postTitle}".`,
        post_id: postId,
        comment_id: commentId,
        is_read: false,
      });
    }
    return;
  }

  // Reply: notify parent comment author (if replier isn't parent author)
  const { data: parent } = await service
    .from("comments")
    .select("id, user_id")
    .eq("id", parentId)
    .maybeSingle();

  if (parent?.user_id && parent.user_id !== actorUserId) {
    await service.from("notifications").insert({
      user_id: parent.user_id,
      type: "comment_reply",
      title: "New reply to your comment",
      message: `${actorName} replied to your comment: "${commentBody.slice(0, 80)}${commentBody.length > 80 ? "..." : ""}"`,
      post_id: postId,
      comment_id: commentId,
      is_read: false,
    });
  }
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
  // Routes through handleCommentReaction with type="like"
  return handleCommentReaction(userId, { ...body, type: "like" });
}

async function handleCommentReaction(userId: string, body: any) {
  const service = createSupabaseServiceClient();
  const commentId = Number(body?.comment_id);
  const type = body?.type as string | undefined;
  if (!commentId || Number.isNaN(commentId)) {
    return NextResponse.json({ error: "Invalid comment id" }, { status: 400 });
  }

  // If the reactions table is missing, fall back to legacy like/unlike.
  // Non-like emoji types won't be persisted in legacy mode.
  try {
    const { data: existing } = await service
      .from("comment_reactions")
      .select("id, type")
      .eq("comment_id", commentId)
      .eq("user_id", userId)
      .maybeSingle();

    // Treat "unlike" (or missing type) as clear reaction
    const wantsClear = !type || type === "unlike";
    if (wantsClear) {
      if (existing?.id) {
        await service.from("comment_reactions").delete().eq("id", existing.id);
      }
    } else if (existing?.type === type) {
      await service.from("comment_reactions").delete().eq("id", existing.id);
    } else if (existing) {
      await service.from("comment_reactions").update({ type }).eq("id", existing.id);
    } else {
      await service.from("comment_reactions").insert({ comment_id: commentId, user_id: userId, type });
    }

    const { data: all, error: allErr } = await service
      .from("comment_reactions")
      .select("user_id, type")
      .eq("comment_id", commentId);
    if (allErr) throw allErr;

    const counts: Record<string, number> = {};
    let myReaction: string | null = null;
    for (const r of all ?? []) {
      counts[r.type] = (counts[r.type] ?? 0) + 1;
      if (r.user_id === userId) myReaction = r.type;
    }
    return NextResponse.json({ counts, myReaction }, { status: 200 });
  } catch (err) {
    console.error("handleCommentReaction error:", err);
    return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
  }
}

// PUT /api/posts/:id - edit post content (owner only)
export async function PUT(request: Request, props: Params) {
  const service = createSupabaseServiceClient();
  const { id: idStr } = await props.params;
  const id = Number(idStr);

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: post } = await service
    .from("posts")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { title, description, purpose, urgency_level } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const { error } = await service
    .from("posts")
    .update({ title: title.trim(), description: description?.trim() ?? null, purpose: purpose ?? "general", urgency_level: urgency_level ?? "low", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Post edit error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
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

  // Get post owner before updating
  const { data: existingPost } = await service
    .from("posts")
    .select("user_id, title, status")
    .eq("id", id)
    .maybeSingle();

  const { error } = await service
    .from("posts")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Post update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // Send in-app notification to post owner when status changes
  if (existingPost && status && status !== existingPost.status && existingPost.user_id !== user.id) {
    const statusLabels: Record<string, string> = {
      pending: "Pending",
      in_progress: "In Progress",
      resolved: "Resolved",
    };
    const statusLabel = statusLabels[status] ?? status;
    const notifMessage = admin_response
      ? `Your post "${existingPost.title || "Untitled"}" has been updated to ${statusLabel}. Admin says: ${admin_response}`
      : `Your post "${existingPost.title || "Untitled"}" has been updated to ${statusLabel}.`;

    const { error: notifError } = await service.from("notifications").insert({
      user_id: existingPost.user_id,
      type: "post_status_update",
      title: `Post ${statusLabel}`,
      message: notifMessage,
      post_id: id,
      is_read: false,
    });
    if (notifError) console.error("Notification insert error:", notifError);
  }

  return NextResponse.json({ ok: true });
}

