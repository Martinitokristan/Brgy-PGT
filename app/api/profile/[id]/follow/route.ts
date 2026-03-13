import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, props: Params) {
  const supabase = await createSupabaseServerClient();
  const { id: targetUserId } = await props.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.id === targetUserId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  // 1. Check if existing
  const { data: existing } = await supabase
    .from("followers")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existing) {
    // Unfollow
    await supabase.from("followers").delete().eq("id", existing.id);
    return NextResponse.json({ is_following: false });
  } else {
    // Follow
    await supabase.from("followers").insert({
      follower_id: user.id,
      following_id: targetUserId,
    });
    return NextResponse.json({ is_following: true });
  }
}
