import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, props: Params) {
  const supabase = await createSupabaseServerClient();
  const { id: targetUserId } = await props.params;

  const { data: userData } = await supabase.auth.getUser();
  const currentUserId = userData.user?.id;

  // 1. Fetch Profile info
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*, barangays(name)")
    .eq("id", targetUserId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // 2. Fetch Stats
  const [postsCount, followersCount, followingCount] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", targetUserId),
    supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", targetUserId),
    supabase.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", targetUserId),
  ]);

  // 3. Check if following
  let isFollowing = false;
  if (currentUserId && currentUserId !== targetUserId) {
    const { count } = await supabase
      .from("followers")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId);
    isFollowing = (count ?? 0) > 0;
  }

  // 4. Fetch User Posts (latest 10)
  const { data: posts } = await supabase
    .from("posts")
    .select("*, profiles(name)")
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    user: profile,
    stats: {
      posts_count: postsCount.count ?? 0,
      followers_count: followersCount.count ?? 0,
      following_count: followingCount.count ?? 0,
      joined_date: new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
      })
    },
    posts: posts ?? [],
    is_following: isFollowing
  });
}
