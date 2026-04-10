import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";
import { detectProfanity } from "@/lib/profanity";

// GET /api/posts - list posts
export async function GET() {
  try {
    const service = createSupabaseServiceClient();
    const user = await getAuthUser();
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch posts without joins to avoid schema cache FK issues with service client
    const { data: postsRaw, error } = await service
      .from("posts")
      .select("*, original_post_id, metadata")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Posts fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch posts" },
        { status: 500 }
      );
    }

    const postList = postsRaw ?? [];

    // Batch-fetch profiles + reactions + comments counts
    const userIds = [...new Set(postList.map((p: any) => p.user_id).filter(Boolean))];
    const postIds = postList.map((p: any) => p.id);
    const profileMap: Record<string, { name: string | null; avatar: string | null; role: string | null }> = {};
    const myReactionsMap: Record<number, string> = {};
    const reactionCountsMap: Record<number, number> = {};
    const commentCountsMap: Record<number, number> = {};

    const [profilesResult, myReactionsResult, allReactionsResult, allCommentsResult] = await Promise.all([
      userIds.length > 0
        ? service.from("profiles").select("id, name, avatar, role").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      postIds.length > 0
        ? service.from("reactions").select("post_id, type").eq("user_id", userId).in("post_id", postIds)
        : Promise.resolve({ data: [], error: null }),
      postIds.length > 0
        ? service.from("reactions").select("post_id").in("post_id", postIds)
        : Promise.resolve({ data: [], error: null }),
      postIds.length > 0
        ? service.from("comments").select("post_id").in("post_id", postIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    for (const p of profilesResult.data ?? []) {
      profileMap[p.id] = { name: p.name, avatar: p.avatar, role: p.role };
    }
    for (const r of myReactionsResult.data ?? []) {
      myReactionsMap[r.post_id] = r.type;
    }
    for (const r of allReactionsResult.data ?? []) {
      reactionCountsMap[r.post_id] = (reactionCountsMap[r.post_id] ?? 0) + 1;
    }
    for (const c of allCommentsResult.data ?? []) {
      commentCountsMap[c.post_id] = (commentCountsMap[c.post_id] ?? 0) + 1;
    }

    // Transform data
    const posts = postList.map((post: any) => ({
      ...post,
      profiles: profileMap[post.user_id] ?? null,
      author_role: profileMap[post.user_id]?.role ?? null,
      reaction_counts: { total: reactionCountsMap[post.id] ?? 0 },
      my_reaction: myReactionsMap[post.id] ?? null,
      comment_count: commentCountsMap[post.id] ?? 0,
    }));

    return NextResponse.json(posts);
  } catch (err) {
    console.error("Posts GET unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/posts - create a new post for the current user
export async function POST(request: Request) {
  const supabaseService = createSupabaseServiceClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const purpose = formData.get("purpose") as string;
  const urgency_level = formData.get("urgency_level") as string;
  const imageFile = formData.get("image") as File | null;
  const videoFile = formData.get("video") as File | null;

  if (!title) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 }
    );
  }

  // Profanity enforcement (posts)
  const prof = detectProfanity(`${title ?? ""} ${description ?? ""}`);
  if (prof) {
    // increment violations + notify user; restrict commenting on 2nd offense
    const { data: currentProfile } = await supabaseService
      .from("profiles")
      .select("profanity_violations, comment_restricted_until")
      .eq("id", user.id)
      .maybeSingle();

    const prev = Number(currentProfile?.profanity_violations ?? 0);
    const next = prev + 1;
    const restrict = next >= 2;
    const restrictedUntil = restrict ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

    await supabaseService
      .from("profiles")
      .update({
        profanity_violations: next,
        ...(restrict ? { comment_restricted_until: restrictedUntil } : {}),
      })
      .eq("id", user.id);

    await supabaseService.from("notifications").insert({
      user_id: user.id,
      type: "policy_violation",
      title: restrict ? "Comment restricted (24 hours)" : "Content policy warning",
      message: restrict
        ? "Your content contains prohibited words. Due to repeated violations, you are restricted from commenting for 24 hours."
        : "Your content contains prohibited words. Please keep the community respectful. Repeated violations may restrict your commenting privileges.",
      is_read: false,
    });

    return NextResponse.json(
      { error: "Your post contains prohibited words. Please edit and try again." },
      { status: 400 }
    );
  }

  let imagePath = null;
  let videoPath = null;

  if (imageFile && videoFile) {
    return NextResponse.json({ error: "Only one media file is allowed (image or video)." }, { status: 400 });
  }

  if (imageFile && imageFile.size > 0) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabaseService.storage
      .from("post-images")
      .upload(filePath, imageFile);

    if (uploadError) {
      console.error("Storage Error:", uploadError);
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
    }
    imagePath = filePath;
  }

  if (videoFile && videoFile.size > 0) {
    const maxBytes = 50 * 1024 * 1024;
    if (videoFile.size > maxBytes) {
      return NextResponse.json({ error: "Video is too large. Max size is 50MB." }, { status: 400 });
    }

    const type = (videoFile.type || "").toLowerCase();
    const okType = type === "video/mp4" || type === "video/quicktime";
    if (!okType) {
      return NextResponse.json({ error: "Unsupported video type. Please upload MP4 or MOV." }, { status: 400 });
    }

    const fileExt = (videoFile.name.split(".").pop() || "").toLowerCase();
    const safeExt = fileExt || (type === "video/quicktime" ? "mov" : "mp4");
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${safeExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabaseService.storage
      .from("post-videos")
      .upload(filePath, videoFile);

    if (uploadError) {
      console.error("Storage Error (video):", uploadError);
      return NextResponse.json({ error: "Failed to upload video" }, { status: 500 });
    }
    videoPath = filePath;
  }

  const { data: profile } = await supabaseService
    .from("profiles")
    .select("barangay_id, is_verified, role")
    .eq("id", user.id)
    .maybeSingle();

  // Only verified residents (or admins) can post
  if (!profile?.is_verified && profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Your account must be verified before you can post. Please verify your identity in your account settings." },
      { status: 403 }
    );
  }

  const barangayId = profile?.barangay_id;

  const { data, error } = await supabaseService
    .from("posts")
    .insert({
      user_id: user.id,
      barangay_id: barangayId,
      title,
      description,
      purpose,
      urgency_level,
      image: imagePath,
      video: videoPath,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, id: data?.id }, { status: 201 });
}

