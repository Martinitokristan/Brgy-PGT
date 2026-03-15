import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

// ─── GET /api/notifications?action=list|unread_count ──────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "list";

  switch (action) {
    case "list":
      return handleList();
    case "unread_count":
      return handleUnreadCount();
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// ─── PATCH /api/notifications  (mark all as read) ─────────────
export async function PATCH() {
  return handleMarkAllRead();
}

// ─── POST /api/notifications  { action: "mark_read", id: ... } 
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  if (action === "mark_read") {
    return handleMarkOneRead(body);
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

// ═══════════════════════════════════════════════════════════════
// LIST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
async function handleList() {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await service
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// ═══════════════════════════════════════════════════════════════
// UNREAD COUNT
// ═══════════════════════════════════════════════════════════════
async function handleUnreadCount() {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  const { count, error } = await service
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error(error);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  return NextResponse.json({ count: count ?? 0 }, { status: 200 });
}

// ═══════════════════════════════════════════════════════════════
// MARK ALL READ
// ═══════════════════════════════════════════════════════════════
async function handleMarkAllRead() {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await service
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ═══════════════════════════════════════════════════════════════
// MARK ONE READ
// ═══════════════════════════════════════════════════════════════
async function handleMarkOneRead(body: any) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  const id = Number(body?.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await service
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
