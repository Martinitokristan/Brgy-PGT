import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

// GET /api/posts - list posts
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is approved
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_approved")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || !profile.is_approved) {
      return NextResponse.json({ error: "Account not approved" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles(name, avatar),
        reactions(type, user_id),
        comments(id)
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Posts fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch posts" },
        { status: 500 }
      );
    }

    // Transform data to include counts and user status
    const posts = (data ?? []).map((post: any) => {
      const reactions = post.reactions || [];
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
        profiles: post.profiles,
        reaction_counts: counts,
        my_reaction: myReaction,
        comment_count: post.comments?.length || 0,
        reactions: undefined, // remove raw data
        comments: undefined,   // remove raw data
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
  const supabase = await createSupabaseServerClient();
  const supabaseService = createSupabaseServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("barangay_id")
    .eq("id", user.id)
    .maybeSingle();

  const barangayId = profile?.barangay_id;

  const { data, error } = await supabase
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

