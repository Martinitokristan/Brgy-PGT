import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";

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
  if (action === "delete") {
    return handleDeleteOne(body);
  }
  if (action === "mute_post") {
    return handleMutePost(body);
  }
  if (action === "mute_resident") {
    return handleMuteResident(body);
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

// ═══════════════════════════════════════════════════════════════
// LIST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════
async function handleList() {
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();

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

  const notifications = data ?? [];

  // Apply per-user mute filters
  const [postMutesRes, residentMutesRes] = await Promise.all([
    service.from("notification_post_mutes").select("post_id").eq("user_id", user.id),
    service.from("notification_resident_mutes").select("muted_user_id").eq("user_id", user.id),
  ]);

  const mutedPostIds = new Set<number>((postMutesRes.data ?? []).map((r: any) => Number(r.post_id)).filter((n: number) => Number.isFinite(n)));
  const mutedResidentIds = new Set<string>((residentMutesRes.data ?? []).map((r: any) => String(r.muted_user_id)));

  const postIds = [...new Set(notifications.map((n: any) => n.post_id).filter(Boolean))];
  const postOwnerMap = new Map<number, string>();
  if (postIds.length > 0) {
    const { data: posts } = await service
      .from("posts")
      .select("id, user_id")
      .in("id", postIds);
    for (const p of posts ?? []) postOwnerMap.set(Number(p.id), String(p.user_id));
  }

  const filtered = notifications
    .filter((n: any) => !n.post_id || !mutedPostIds.has(Number(n.post_id)))
    .filter((n: any) => {
      if (!n.post_id) return true;
      const ownerId = postOwnerMap.get(Number(n.post_id));
      return ownerId ? !mutedResidentIds.has(ownerId) : true;
    })
    .map((n: any) => ({
      ...n,
      source_user_id: n.post_id ? postOwnerMap.get(Number(n.post_id)) ?? null : null,
    }));

  return NextResponse.json(filtered);
}

// ═══════════════════════════════════════════════════════════════
// UNREAD COUNT
// ═══════════════════════════════════════════════════════════════
async function handleUnreadCount() {
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();

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
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();

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
  const service = createSupabaseServiceClient();

  const id = Number(body?.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const user = await getAuthUser();

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

async function handleDeleteOne(body: any) {
  const service = createSupabaseServiceClient();
  const id = Number(body?.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await service
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleMutePost(body: any) {
  const service = createSupabaseServiceClient();
  const id = Number(body?.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: notif } = await service
    .from("notifications")
    .select("id, post_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!notif?.post_id) {
    return NextResponse.json({ error: "No related post found for this notification" }, { status: 400 });
  }

  const { error } = await service
    .from("notification_post_mutes")
    .upsert({ user_id: user.id, post_id: notif.post_id }, { onConflict: "user_id,post_id", ignoreDuplicates: true });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to mute post notifications" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleMuteResident(body: any) {
  const service = createSupabaseServiceClient();
  const id = Number(body?.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: notif } = await service
    .from("notifications")
    .select("id, post_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!notif?.post_id) {
    return NextResponse.json({ error: "No related resident found for this notification" }, { status: 400 });
  }

  const { data: post } = await service
    .from("posts")
    .select("id, user_id")
    .eq("id", notif.post_id)
    .maybeSingle();

  if (!post?.user_id) {
    return NextResponse.json({ error: "No related resident found for this notification" }, { status: 400 });
  }

  const { error } = await service
    .from("notification_resident_mutes")
    .upsert({ user_id: user.id, muted_user_id: post.user_id }, { onConflict: "user_id,muted_user_id", ignoreDuplicates: true });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to mute resident notifications" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
