import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";

// POST - Share a post to feed
export async function POST(request: Request) {
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { original_post_id } = await request.json();

    if (!original_post_id) {
      return NextResponse.json({ error: "Original post ID is required" }, { status: 400 });
    }

    // Get the original post details
    const { data: originalPost, error: originalError } = await service
      .from("posts")
      .select(`
        id,
        title,
        description,
        image,
        purpose,
        urgency_level,
        created_at,
        profiles!inner(name, avatar)
      `)
      .eq("id", original_post_id)
      .single();

    if (originalError || !originalPost) {
      return NextResponse.json({ error: "Original post not found" }, { status: 404 });
    }

    // Get the original author name
    let authorName = 'Unknown';
    if (originalPost.profiles) {
      if (Array.isArray(originalPost.profiles) && originalPost.profiles.length > 0) {
        authorName = (originalPost.profiles[0] as any)?.name || 'Unknown';
      } else if (!Array.isArray(originalPost.profiles)) {
        authorName = (originalPost.profiles as any)?.name || 'Unknown';
      }
    }

    // Get the sharer's profile
    const { data: sharerProfile } = await service
      .from("profiles")
      .select("name, avatar")
      .eq("id", user.id)
      .single();

    const sharerName = sharerProfile?.name || 'Unknown';

    // Create the shared post with Facebook-style layout
    const { data: sharedPost, error: shareError } = await service
      .from("posts")
      .insert({
        user_id: user.id,
        title: null, // No title for shared posts - like FB
        description: null, // No main description - content will be in original_post
        image: null, // No main image - will show original post content
        purpose: "shared_post",
        urgency_level: originalPost.urgency_level || "low",
        original_post_id: original_post_id,
        status: "active",
        // Store metadata for rendering
        metadata: {
          sharer_name: sharerName,
          original_author_name: authorName,
          original_title: originalPost.title,
          original_description: originalPost.description,
          original_image: originalPost.image,
          original_created_at: originalPost.created_at
        }
      })
      .select()
      .single();

    if (shareError) {
      console.error("Error sharing post:", shareError);
      return NextResponse.json({ error: "Failed to share post" }, { status: 500 });
    }

    // Get the user's profile for the response
    const { data: userProfile } = await service
      .from("profiles")
      .select("name, avatar")
      .eq("id", user.id)
      .single();

    return NextResponse.json({ 
      message: "Post shared successfully",
      shared_post: {
        ...sharedPost,
        profiles: userProfile
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
