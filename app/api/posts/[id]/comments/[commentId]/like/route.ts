import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    id: string;
    commentId: string;
  }>;
};

export async function POST(_request: Request, props: Params) {
  const supabase = await createSupabaseServerClient();
  const { commentId: cIdStr } = await props.params;
  const commentId = Number(cIdStr);

  if (!commentId || Number.isNaN(commentId)) {
    return NextResponse.json({ error: "Invalid comment id" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Get existing liked_by
  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("liked_by")
    .eq("id", commentId)
    .single();

  if (fetchError || !comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const likedBy = (comment.liked_by as string[]) || [];
  const index = likedBy.indexOf(user.id);

  let updatedLikedBy: string[];
  if (index === -1) {
    // Like
    updatedLikedBy = [...likedBy, user.id];
  } else {
    // Unlike
    updatedLikedBy = likedBy.filter((id) => id !== user.id);
  }

  // 2. Update
  const { data: updated, error: updateError } = await supabase
    .from("comments")
    .update({ liked_by: updatedLikedBy })
    .eq("id", commentId)
    .select("liked_by")
    .single();

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ error: "Failed to update like" }, { status: 500 });
  }

  return NextResponse.json(updated);
}
