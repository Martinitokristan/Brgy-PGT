import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, props: Params) {
  const service = createSupabaseServiceClient();
  const { id: targetUserId } = await props.params;

  const authUser = await getAuthUser();
  const currentUserId = authUser?.id;

  // 1. Fetch Profile info
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("*, barangays(name)")
    .eq("id", targetUserId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // 1.5 Privacy Check: Residents/Riders cannot view Admin profiles
  // Allow: admin viewing their own profile, OR another admin viewing an admin profile
  if (profile.role === "admin") {
    const isSelf = currentUserId === targetUserId;
    if (!isSelf) {
      const { data: currentUserProfile } = await service
        .from("profiles")
        .select("role")
        .eq("id", currentUserId ?? "")
        .maybeSingle();

      if (currentUserProfile?.role !== "admin") {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
    }
  }

  // 2. Fetch Stats
  const [postsCount, followersCount, followingCount] = await Promise.all([
    service.from("posts").select("id", { count: "exact", head: true }).eq("user_id", targetUserId),
    service.from("followers").select("id", { count: "exact", head: true }).eq("following_id", targetUserId),
    service.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", targetUserId),
  ]);

  // 3. Check if following
  let isFollowing = false;
  if (currentUserId && currentUserId !== targetUserId) {
    const { count } = await service
      .from("followers")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId);
    isFollowing = (count ?? 0) > 0;
  }

  // 4. Fetch User Posts (latest 20) — use service client so RLS doesn't block
  const { data: posts } = await service
    .from("posts")
    .select(`
      id, title, description, purpose, urgency_level, status,
      created_at, admin_response, image, user_id,
      reactions(type, user_id),
      comments(id)
    `)
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Transform posts to include counts
  const transformedPosts = (posts ?? []).map((post: any) => {
    const reactions = post.reactions || [];
    const counts: Record<string, number> = {};
    let myReaction = null;

    for (const r of reactions) {
      counts[r.type] = (counts[r.type] ?? 0) + 1;
      if (currentUserId && r.user_id === currentUserId) {
        myReaction = r.type;
      }
    }

    return {
      ...post,
      profiles: post.profiles,
      reaction_counts: counts,
      my_reaction: myReaction,
      comment_count: post.comments?.length || 0,
      reactions: undefined,
      comments: undefined,
    };
  });

  return NextResponse.json({
    user: profile,
    stats: {
      posts_count: postsCount.count ?? 0,
      followers_count: followersCount.count ?? 0,
      following_count: followingCount.count ?? 0,
      joined_date: profile.created_at,
    },
    posts: transformedPosts,
    is_following: isFollowing
  });
}
