import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";

export async function POST(request: Request) {
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
        const { original_post_id } = body;
    
    if (!original_post_id) {
      return NextResponse.json({ error: "Original post ID is required" }, { status: 400 });
    }

    // Convert to number if it's a string
    const postId = typeof original_post_id === 'string' ? parseInt(original_post_id, 10) : original_post_id;
    
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
        user_id,
        barangay_id
      `)
      .eq("id", postId)
      .single();

    if (originalError || !originalPost) {
      console.error("Error finding original post:", originalError);
      return NextResponse.json({ 
        error: "Original post not found", 
        details: originalError?.message,
        postId: postId 
      }, { status: 404 });
    }

    // Get the original author name
    let authorName = 'Unknown';
    if (originalPost.user_id) {
      const { data: authorProfile } = await service
        .from("profiles")
        .select("name")
        .eq("id", originalPost.user_id)
        .single();
      authorName = authorProfile?.name || 'Unknown';
    }

    // Get the sharer's profile
    const { data: sharerProfile } = await service
      .from("profiles")
      .select("name, avatar")
      .eq("id", user.id)
      .single();

    const sharerName = sharerProfile?.name || 'Unknown';

    // Prepare the shared post data
    const sharedPostData = {
      user_id: user.id,
      title: `${sharerName} - Share a post`, // Required field - show who shared
      description: `Original post by ${authorName}`, // Required field - describe the original
      image: null, // No main image - will show original post content
      purpose: "shared_post",
      urgency_level: originalPost.urgency_level || "low",
      original_post_id: postId,
      status: "active",
      barangay_id: originalPost.barangay_id, // Include required barangay_id
      // Store metadata for rendering
      metadata: {
        sharer_name: sharerName,
        original_author_name: authorName,
        original_title: originalPost.title,
        original_description: originalPost.description,
        original_image: originalPost.image,
        original_created_at: originalPost.created_at
      }
    };

    
    // Create the shared post with Facebook-style layout
    const { data: sharedPost, error: shareError } = await service
      .from("posts")
      .insert(sharedPostData)
      .select()
      .single();

    if (shareError) {
      console.error("Error sharing post:", shareError);
      console.error("Error details:", JSON.stringify(shareError, null, 2));
      return NextResponse.json({ 
        error: "Failed to share post", 
        details: shareError.message,
        code: shareError.code
      }, { status: 500 });
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
