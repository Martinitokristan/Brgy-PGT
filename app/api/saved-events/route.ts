import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";

// GET - Get user's saved events
export async function GET() {
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await service
      .from("saved_events")
      .select(`
        event_id,
        created_at,
        events!inner(
          id,
          title,
          description,
          location,
          event_date,
          image,
          barangay_id
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching saved events:", error);
      return NextResponse.json({ error: "Failed to fetch saved events" }, { status: 500 });
    }

    // Get user's interests for these events
    const eventIds = data?.map(item => item.event_id) || [];
    const { data: interests, error: interestsError } = await service
      .from("event_interests")
      .select("event_id, reminder_3d_sent, reminder_10h_sent")
      .eq("user_id", user.id)
      .in("event_id", eventIds);

    if (interestsError) {
      console.error("Error fetching interests:", interestsError);
    }

    // Combine saved events with interest status
    const eventsWithInterests = data?.map(savedEvent => {
      const interest = interests?.find(i => i.event_id === savedEvent.event_id);
      return {
        ...savedEvent.events,
        saved_at: savedEvent.created_at,
        is_interested: !!interest,
        reminder_3d_sent: interest?.reminder_3d_sent || false,
        reminder_10h_sent: interest?.reminder_10h_sent || false,
      };
    }) || [];

    return NextResponse.json(eventsWithInterests);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Save or unsave an event
export async function POST(request: Request) {
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { event_id, action } = await request.json();

    if (!event_id || !action || !["save", "unsave"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (action === "save") {
      // Check if already saved
      const { data: existing } = await service
        .from("saved_events")
        .select("id")
        .eq("user_id", user.id)
        .eq("event_id", event_id)
        .single();

      if (existing) {
        return NextResponse.json({ message: "Event already saved" }, { status: 200 });
      }

      // Save the event
      const { error } = await service
        .from("saved_events")
        .insert({ user_id: user.id, event_id });

      if (error) {
        console.error("Error saving event:", error);
        return NextResponse.json({ error: "Failed to save event" }, { status: 500 });
      }

      return NextResponse.json({ message: "Event saved successfully" }, { status: 201 });
    } else {
      // Unsave the event
      const { error } = await service
        .from("saved_events")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", event_id);

      if (error) {
        console.error("Error unsaving event:", error);
        return NextResponse.json({ error: "Failed to unsave event" }, { status: 500 });
      }

      return NextResponse.json({ message: "Event unsaved successfully" }, { status: 200 });
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
