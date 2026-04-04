import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";

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

    // Batch-fetch profiles, reactions, and comments IN PARALLEL
    const userIds = [...new Set(postList.map((p: any) => p.user_id).filter(Boolean))];
    const postIds = postList.map((p: any) => p.id);
    const profileMap: Record<string, { name: string | null; avatar: string | null; role: string | null }> = {};
    const reactionsMap: Record<number, { type: string; user_id: string }[]> = {};
    const commentsCountMap: Record<number, number> = {};

    // Run all 3 queries in parallel instead of sequentially
    const [profilesResult, reactionsResult, commentsResult] = await Promise.all([
      userIds.length > 0
        ? service.from("profiles").select("id, name, avatar, role").in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
      postIds.length > 0
        ? service.from("reactions").select("post_id, type, user_id").in("post_id", postIds)
        : Promise.resolve({ data: [], error: null }),
      postIds.length > 0
        ? service.from("comments").select("id, post_id").in("post_id", postIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    for (const p of profilesResult.data ?? []) {
      profileMap[p.id] = { name: p.name, avatar: p.avatar, role: p.role };
    }
    for (const r of reactionsResult.data ?? []) {
      if (!reactionsMap[r.post_id]) reactionsMap[r.post_id] = [];
      reactionsMap[r.post_id].push(r);
    }
    for (const c of commentsResult.data ?? []) {
      commentsCountMap[c.post_id] = (commentsCountMap[c.post_id] ?? 0) + 1;
    }

    // Transform data to include counts and user status
    const posts = postList.map((post: any) => {
      const reactions = reactionsMap[post.id] || [];
      const counts: Record<string, number> = {};
      let myReaction = null;

      for (const r of reactions) {
        counts[r.type] = (counts[r.type] ?? 0) + 1;
        if (userId && r.user_id === userId) {
          myReaction = r.type;
        }
      }

      return {
        ...post,
        profiles: profileMap[post.user_id] ?? null,
        author_role: profileMap[post.user_id]?.role ?? null,
        reaction_counts: counts,
        my_reaction: myReaction,
        comment_count: commentsCountMap[post.id] ?? 0,
      };
    });

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

  if (!title) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 }
    );
  }

  let imagePath = null;
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

