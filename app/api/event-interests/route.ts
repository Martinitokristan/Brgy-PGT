import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";

// POST - Toggle interest in an event
export async function POST(request: Request) {
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { event_id, action } = await request.json();

    if (!event_id || !action || !["interested", "not_interested"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (action === "interested") {
      // Check if already interested
      const { data: existing } = await service
        .from("event_interests")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_id", event_id)
        .single();

      if (existing) {
        return NextResponse.json({ message: "Already interested in this event" }, { status: 200 });
      }

      // Add interest
      const { error } = await service
        .from("event_interests")
        .insert({ 
          user_id: user.id, 
          event_id,
          reminder_3d_sent: false,
          reminder_10h_sent: false
        });

      if (error) {
        console.error("Error adding interest:", error);
        return NextResponse.json({ error: "Failed to add interest" }, { status: 500 });
      }

      // Get total interested count
      const { count, error: countError } = await service
        .from("event_interests")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event_id);

      if (countError) {
        console.error("Error getting count:", countError);
      }

      return NextResponse.json({ 
        message: "Interest added successfully",
        interested_count: count || 0
      }, { status: 201 });
    } else {
      // Remove interest
      const { error } = await service
        .from("event_interests")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", event_id);

      if (error) {
        console.error("Error removing interest:", error);
        return NextResponse.json({ error: "Failed to remove interest" }, { status: 500 });
      }

      // Get total interested count
      const { count, error: countError } = await service
        .from("event_interests")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event_id);

      if (countError) {
        console.error("Error getting count:", countError);
      }

      return NextResponse.json({ 
        message: "Interest removed successfully",
        interested_count: count || 0
      }, { status: 200 });
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Get interest status for specific events
export async function GET(request: Request) {
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const event_ids = searchParams.get("event_ids");

    if (!event_ids) {
      return NextResponse.json({ error: "event_ids parameter required" }, { status: 400 });
    }

    const eventIdArray = event_ids.split(",").map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    const { data, error } = await service
      .from("event_interests")
      .select("event_id")
      .eq("user_id", user.id)
      .in("event_id", eventIdArray);

    if (error) {
      console.error("Error fetching interests:", error);
      return NextResponse.json({ error: "Failed to fetch interests" }, { status: 500 });
    }

    const interestedEventIds = data?.map(item => item.event_id) || [];
    return NextResponse.json({ interested_events: interestedEventIds });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
