import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";
import { sendSms } from "@/lib/smsSender";

async function requireAdmin() {
  const service = createSupabaseServiceClient();
  const authUser = await getAuthUser();

  if (!authUser) {
    return { service, user: null, error: "Unauthorized" as const, barangayId: null };
  }

  const { data: profile } = await service
    .from("profiles")
    .select("role, barangay_id")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return { service, user: null, error: "Forbidden" as const, barangayId: null };
  }

  return { service, user: authUser, error: null, barangayId: profile.barangay_id };
}

function adminError(error: "Unauthorized" | "Forbidden") {
  return NextResponse.json({ error }, { status: error === "Unauthorized" ? 401 : 403 });
}

// ─── GET /api/admin?action=users|events|sms|stats ─────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "users";

  const { error, user, barangayId, service } = await requireAdmin();
  if (error) return adminError(error);

  switch (action) {
    case "users":
      return handleGetUsers();
    case "events":
      return handleGetEvents(barangayId, service);
    case "sms":
      return handleGetSmsLogs();
    case "stats":
      return handleGetStats(service);
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// ─── POST /api/admin  { action: "..." } ───────────────────────
export async function POST(request: Request) {
  const { error, user, barangayId, service } = await requireAdmin();
  if (error || !user) return adminError(error || "Unauthorized");

  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  switch (action) {
    case "sms":
      return handleSendSms(body, user);
    case "create_event":
      return handleCreateEvent(body, user, barangayId);
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// ─── PATCH /api/admin  { action: "..." } ──────────────────────
export async function PATCH(request: Request) {
  const { error, user } = await requireAdmin();
  if (error || !user) return adminError(error || "Unauthorized");

  const body = await request.json().catch(() => null);
  const action = body?.action as string | undefined;

  switch (action) {
    case "update_user":
      return handleUpdateUser(body, user);
    case "update_event":
      return handleUpdateEvent(body);
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// ─── DELETE /api/admin?action=event&id=... ────────────────────
export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return adminError(error);

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "event";
  const id = searchParams.get("id");

  if (action === "event") {
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const service = createSupabaseServiceClient();
    const { error: deleteError } = await service.from("events").delete().eq("id", id);
    if (deleteError) {
      console.error(deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

// ═══════════════════════════════════════════════════════════════
// GET USERS
// ═══════════════════════════════════════════════════════════════
async function handleGetUsers() {
  const service = createSupabaseServiceClient();

  const { data: profiles, error: profilesError } = await service
    .from("profiles")
    .select(
      "id, name, email, role, is_approved, is_verified, barangay_id, phone, purok_address, sex, birth_date, age, valid_id_path, avatar, created_at, barangays(name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (profilesError) {
    console.error(profilesError);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  const { data: pending } = await service
    .from("pending_registrations")
    .select("id, name, email, barangay_id, phone, purok_address, sex, birth_date, age, valid_id_path, email_verified, created_at")
    .eq("email_verified", true)
    .order("created_at", { ascending: false })
    .limit(100);

  const pendingAsProfiles = (pending ?? []).map((p) => ({
    id: `pending_${p.id}`,
    pending_id: p.id,
    name: p.name,
    email: p.email,
    role: "resident",
    is_approved: false,
    barangay_id: p.barangay_id,
    phone: p.phone,
    purok_address: p.purok_address,
    sex: p.sex,
    birth_date: p.birth_date,
    age: p.age,
    valid_id_path: p.valid_id_path,
    avatar: null,
    created_at: p.created_at,
    barangays: null,
    source: "pending" as const,
  }));

  const existingProfiles = (profiles ?? []).map((p) => ({
    ...p,
    source: "profile" as const,
  }));

  const merged = [...pendingAsProfiles, ...existingProfiles];
  return NextResponse.json(merged, { status: 200 });
}

// ═══════════════════════════════════════════════════════════════
// UPDATE USER (approve/reject/role change)
// ═══════════════════════════════════════════════════════════════
async function handleUpdateUser(body: any, adminUser: any) {
  const id = body?.id as string | undefined;
  const isApproved = body?.is_approved as boolean | undefined;
  const role = body?.role as string | undefined;

  if (!id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  // Handle pending registration approval
  if (id.startsWith("pending_") && isApproved === true) {
    const pendingId = Number(id.replace("pending_", ""));

    const { data: pending, error: pendingError } = await service
      .from("pending_registrations")
      .select("*")
      .eq("id", pendingId)
      .maybeSingle();

    if (pendingError || !pending) {
      return NextResponse.json({ error: "Pending registration not found." }, { status: 404 });
    }

    // Create Supabase Auth User
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email: pending.email,
      password: pending.password_hash,
      email_confirm: true,
    });

    let userId: string | null = created?.user?.id ?? null;
    if (createError) {
      console.error("Auth Creation Error:", createError.message);
      if (createError.message?.includes("already been registered") || createError.message?.includes("already registered")) {
        const { data: existingUsers } = await service.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u) => u.email === pending.email);
        if (existingUser) {
          userId = existingUser.id;
        } else {
          return NextResponse.json(
            { error: "User already registered but could not be found." },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: createError.message || "Failed to create user account." },
          { status: 500 }
        );
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Failed to create user account." }, { status: 500 });
    }

    // Create or update profile
    const { data: existingProfile } = await service
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile) {
      const { error: updateErr } = await service.from("profiles")
        .update({ is_approved: true, role: role || "resident" })
        .eq("id", userId);
      if (updateErr) console.error("Profile Update Error:", updateErr);
    } else {
      const { error: profileError } = await service.from("profiles").insert({
        id: userId,
        name: pending.name,
        role: role || "resident",
        is_approved: true,
        barangay_id: pending.barangay_id,
        phone: pending.phone,
        purok_address: pending.purok_address,
        sex: pending.sex,
        birth_date: pending.birth_date,
        age: pending.age,
        valid_id_path: pending.valid_id_path,
        email: pending.email,
      });
      if (profileError) console.error("Profile Creation Error:", profileError);
    }

    // Trust the device used during registration
    if (pending.device_token) {
      try {
        await service.from("trusted_devices").upsert({
          user_id: userId,
          device_token: pending.device_token,
          last_used_at: new Date().toISOString(),
        }, { onConflict: "user_id,device_token" });
      } catch (trustErr) {
        console.error("Device Trust Error:", trustErr);
      }
    }

    // Delete the pending registration
    await service.from("pending_registrations").delete().eq("id", pendingId);

    // Send SMS notification
    if (pending.phone) {
      const msg = "Congratulations! Your registration with Brgy. Pagatpatan has been approved. You can now access all resident features.";
      const result = await sendSms(pending.phone, msg);

      await service.from("sms_logs").insert({
        admin_id: adminUser?.id ?? null,
        recipient_phone: pending.phone,
        message_content: msg,
        status: result.success ? "sent" : "failed",
        provider_message_id: result.success ? result.sid : null,
        error_message: !result.success ? result.error : null,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Handle rejection of pending registration
  if (id.startsWith("pending_") && isApproved === false) {
    const pendingId = Number(id.replace("pending_", ""));
    await service.from("pending_registrations").delete().eq("id", pendingId);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Handle existing profile updates
  const updates: Record<string, unknown> = {};
  if (typeof isApproved === "boolean") updates.is_approved = isApproved;
  if (role) updates.role = role;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let profileToNotify = null;
  if (isApproved === true) {
    const { data: profile } = await service
      .from("profiles")
      .select("phone, is_approved")
      .eq("id", id)
      .maybeSingle();

    if (profile && !profile.is_approved) {
      profileToNotify = profile;
    }
  }

  const { error: updateError } = await service
    .from("profiles")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    console.error("Profile update error:", updateError);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }

  if (profileToNotify && profileToNotify.phone) {
    const msg = "Congratulations! Your registration with Brgy. Pagatpatan has been approved. You can now access all resident features.";
    const result = await sendSms(profileToNotify.phone, msg);

    await service.from("sms_logs").insert({
      admin_id: adminUser?.id ?? null,
      recipient_phone: profileToNotify.phone,
      message_content: msg,
      status: result.success ? "sent" : "failed",
      provider_message_id: result.success ? result.sid : null,
      error_message: !result.success ? result.error : null,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

// ═══════════════════════════════════════════════════════════════
// GET EVENTS (admin)
// ═══════════════════════════════════════════════════════════════
async function handleGetEvents(barangayId: number | null, service: any) {
  const { data, error: fetchError } = await service
    .from("events")
    .select("id, title, description, location, event_date, image")
    .eq("barangay_id", barangayId)
    .order("event_date", { ascending: true });

  if (fetchError) {
    console.error(fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// ═══════════════════════════════════════════════════════════════
// CREATE EVENT
// ═══════════════════════════════════════════════════════════════
async function handleCreateEvent(body: any, user: any, barangayId: number | null) {
  if (!body?.title || !body?.event_date) {
    return NextResponse.json({ error: "title and event_date are required" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { action: _, ...eventData } = body;

  const { data, error: insertError } = await service
    .from("events")
    .insert({
      ...eventData,
      barangay_id: barangayId,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Insert Error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// ═══════════════════════════════════════════════════════════════
// UPDATE EVENT
// ═══════════════════════════════════════════════════════════════
async function handleUpdateEvent(body: any) {
  if (!body?.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  const { id, action: _, ...updates } = body;

  const { data, error: updateError } = await service
    .from("events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ═══════════════════════════════════════════════════════════════
// GET SMS LOGS
// ═══════════════════════════════════════════════════════════════
async function handleGetSmsLogs() {
  const service = createSupabaseServiceClient();

  const { data, error: logsError } = await service
    .from("sms_logs")
    .select(
      "id, admin_id, recipient_phone, message_content, status, provider_message_id, error_message, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (logsError) {
    console.error(logsError);
    return NextResponse.json({ error: "Failed to fetch SMS logs" }, { status: 500 });
  }

  const logs = data ?? [];
  const phones = [...new Set(logs.map((l) => l.recipient_phone).filter(Boolean))];

  let phoneNameMap: Record<string, string> = {};
  if (phones.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("name, phone")
      .in("phone", phones);

    if (profiles) {
      for (const p of profiles) {
        if (p.phone && p.name) phoneNameMap[p.phone] = p.name;
      }
    }
  }

  const enriched = logs.map((log) => ({
    ...log,
    recipient_name: phoneNameMap[log.recipient_phone] ?? null,
  }));

  return NextResponse.json(enriched, { status: 200 });
}

// ═══════════════════════════════════════════════════════════════
// SEND SMS
// ═══════════════════════════════════════════════════════════════
async function handleSendSms(body: any, user: any) {
  const to = body?.to as string | undefined;
  const message = body?.message as string | undefined;

  if (!to || !message) {
    return NextResponse.json(
      { error: "Both 'to' and 'message' are required." },
      { status: 400 }
    );
  }

  const result = await sendSms(to, message);
  const service = createSupabaseServiceClient();

  try {
    await service.from("sms_logs").insert({
      admin_id: user?.id ?? null,
      recipient_phone: to,
      message_content: message,
      status: result.success ? "sent" : "failed",
      provider_message_id: result.success ? result.sid : null,
      error_message: !result.success ? result.error : null,
    });
  } catch (e) {
    console.error("Failed to insert sms_logs entry", e);
  }

  if (result.success) {
    return NextResponse.json({ success: true, sid: result.sid }, { status: 200 });
  }

  return NextResponse.json({ success: false, error: result.error }, { status: 422 });
}

// ═══════════════════════════════════════════════════════════════
// GET STATS
// ═══════════════════════════════════════════════════════════════
async function handleGetStats(service: any) {
  const { data: posts } = await service
    .from("posts")
    .select("id, status, urgency_level, purpose, created_at");

  const { data: profiles } = await service
    .from("profiles")
    .select("id, role, is_approved, created_at");

  const allPosts = posts ?? [];
  const allProfiles = profiles ?? [];

  const totalPosts = allPosts.length;
  const pendingPosts = allPosts.filter((p: any) => p.status === "pending").length;
  const inProgressPosts = allPosts.filter((p: any) => p.status === "in_progress").length;
  const resolvedPosts = allPosts.filter((p: any) => p.status === "resolved").length;
  const urgentPosts = allPosts.filter(
    (p: any) => p.urgency_level === "high" && p.status !== "resolved"
  ).length;

  const totalResidents = allProfiles.filter((p: any) => p.role === "resident").length;
  const approvedResidents = allProfiles.filter(
    (p: any) => p.role === "resident" && p.is_approved
  ).length;

  const purposeMap: Record<string, number> = {};
  for (const post of allPosts) {
    const p = post.purpose || "General";
    purposeMap[p] = (purposeMap[p] ?? 0) + 1;
  }

  const urgencyMap: Record<string, number> = {};
  for (const post of allPosts) {
    const u = post.urgency_level || "low";
    urgencyMap[u] = (urgencyMap[u] ?? 0) + 1;
  }

  const userGrowth: { month: string; count: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const count = allProfiles.filter((p: any) => {
      if (!p.created_at) return false;
      return p.created_at.startsWith(monthKey);
    }).length;
    userGrowth.push({ month: label, count });
  }

  return NextResponse.json({
    totalPosts,
    pendingPosts,
    inProgressPosts,
    resolvedPosts,
    urgentPosts,
    totalResidents,
    approvedResidents,
    byPurpose: purposeMap,
    byUrgency: urgencyMap,
    userGrowth,
  });
}
