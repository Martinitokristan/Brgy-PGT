import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";
import { detectProfanity } from "@/lib/profanity";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// PATCH /api/posts/comments/:id - update own comment
export async function PATCH(request: Request, props: Params) {
  const service = createSupabaseServiceClient();
  const { id: idStr } = await props.params;
  const id = Number(idStr);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const user = await getAuthUser();

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

  // Restriction check + profanity enforcement on edit
  const { data: p } = await service
    .from("profiles")
    .select("comment_restricted_until, profanity_violations")
    .eq("id", user.id)
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

  const prof = detectProfanity(commentBody);
  if (prof) {
    const prev = Number(p?.profanity_violations ?? 0);
    const next = prev + 1;
    const restrict = next >= 3;
    const restrictedUntil = restrict ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

    const { data: commentMeta } = await service
      .from("comments")
      .select("post_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    // Save the edit but hide it from other residents (visible to author + admins)
    await service
      .from("comments")
      .update({
        body: commentBody,
        is_hidden: true,
        flag_reason: "profanity",
        flagged_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    await service
      .from("profiles")
      .update({
        profanity_violations: next,
        ...(restrict ? { comment_restricted_until: restrictedUntil } : {}),
      })
      .eq("id", user.id);

    await service.from("notifications").insert({
      user_id: user.id,
      type: "policy_violation",
      title: restrict ? "Comment restricted (24 hours)" : "Comment policy warning",
      message: restrict
        ? "Your comment contains prohibited words. Due to repeated violations, you are restricted from commenting for 24 hours."
        : "Your comment contains prohibited words. Please keep the community respectful. Repeated violations may restrict your commenting privileges.",
      post_id: commentMeta?.post_id ?? null,
      comment_id: id,
      is_read: false,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
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
  const service = createSupabaseServiceClient();
  const { id: idStr } = await props.params;
  const id = Number(idStr);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const user = await getAuthUser();

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

