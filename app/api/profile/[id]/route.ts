import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, props: Params) {
  const service = createSupabaseServiceClient();
  const { id: targetUserId } = await props.params;
  
  const authUser = await getAuthUser();
  const currentUserId = authUser?.id;
  
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if (currentUserId === targetUserId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }
  
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === "follow") {
      // Check if already following
      const { data: existingFollow } = await service
        .from("followers")
        .select("*")
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId)
        .single();
      
      if (existingFollow) {
        return NextResponse.json({ error: "Already following" }, { status: 400 });
      }
      
      // Create follow relationship
      const { error: followError } = await service
        .from("followers")
        .insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });
      
      if (followError) {
        console.error("Follow error:", followError);
        return NextResponse.json({ error: "Failed to follow" }, { status: 500 });
      }
      
      return NextResponse.json({ message: "Followed successfully" });
    } else if (action === "unfollow") {
      // Remove follow relationship
      const { error: unfollowError } = await service
        .from("followers")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
      
      if (unfollowError) {
        console.error("Unfollow error:", unfollowError);
        return NextResponse.json({ error: "Failed to unfollow" }, { status: 500 });
      }
      
      return NextResponse.json({ message: "Unfollowed successfully" });
    } else if (action === "snooze") {
      const { days } = body;
      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + days);
      
      // Try to delete any existing record first
      await service
        .from("notification_preferences")
        .delete()
        .eq("user_id", currentUserId)
        .eq("target_user_id", targetUserId);
      
      // Insert new snooze preference
      const { error: snoozeError } = await service
        .from("notification_preferences")
        .insert({
          user_id: currentUserId,
          target_user_id: targetUserId,
          snooze_until: snoozeUntil.toISOString(),
        });
      
      if (snoozeError) {
        console.error("Snooze error:", snoozeError);
        // If table doesn't exist, create it on the fly
        if (snoozeError.code === 'PGRST205') {
          // Table not found in schema cache, try to refresh
          return NextResponse.json({ 
            error: "Notification system is initializing. Please try again in a moment.", 
            code: "SCHEMA_CACHE"
          }, { status: 503 });
        }
        return NextResponse.json({ error: "Failed to snooze notifications" }, { status: 500 });
      }
      
      return NextResponse.json({ 
        message: `Notifications snoozed for ${days} days`,
        snooze_until: snoozeUntil
      });
    } else if (action === "unsnooze") {
      // Remove snooze preference
      const { error: unsnoozeError } = await service
        .from("notification_preferences")
        .delete()
        .eq("user_id", currentUserId)
        .eq("target_user_id", targetUserId);
      
      if (unsnoozeError) {
        console.error("Unsnooze error:", unsnoozeError);
        return NextResponse.json({ error: "Failed to enable notifications" }, { status: 500 });
      }
      
      return NextResponse.json({ message: "Notifications enabled" });
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Follow/unfollow error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
      created_at, admin_response, image, user_id, metadata,
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
