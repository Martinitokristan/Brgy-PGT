import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// GET /api/posts/:id/reactions - summary + current user's reaction
export async function GET(_request: Request, props: Params) {
  const supabase = await createSupabaseServerClient();
  const { id: idStr } = await props.params;
  const postId = Number(idStr);

  if (!postId || Number.isNaN(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("reactions")
    .select("user_id, type")
    .eq("post_id", postId);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch reactions" },
      { status: 500 }
    );
  }

  const counts: Record<string, number> = {};
  let myReaction: string | null = null;

  for (const r of data ?? []) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
    if (user && r.user_id === user.id) {
      myReaction = r.type;
    }
  }

  return NextResponse.json(
    {
      counts,
      myReaction,
    },
    { status: 200 }
  );
}

// POST /api/posts/:id/reactions - toggle/set reaction for current user
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
  const type = body?.type as string | undefined;

  if (!type) {
    return NextResponse.json(
      { error: "Reaction type is required." },
      { status: 400 }
    );
  }

  const { data: existing, error: existingError } = await supabase
    .from("reactions")
    .select("id, type")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error(existingError);
    return NextResponse.json(
      { error: "Failed to read reactions" },
      { status: 500 }
    );
  }

  if (existing && existing.type === type) {
    // Same reaction exists -> remove it (toggle off).
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("id", existing.id);

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to remove reaction" },
        { status: 500 }
      );
    }
  } else if (existing) {
    // Different reaction exists -> update it.
    const { error } = await supabase
      .from("reactions")
      .update({ type })
      .eq("id", existing.id);

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to update reaction" },
        { status: 500 }
      );
    }
  } else {
    // No reaction yet -> insert.
    const { error } = await supabase.from("reactions").insert({
      post_id: postId,
      user_id: user.id,
      type,
    });

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: "Failed to add reaction" },
        { status: 500 }
      );
    }
  }

  // Return updated summary.
  return GET(request, props);
}

