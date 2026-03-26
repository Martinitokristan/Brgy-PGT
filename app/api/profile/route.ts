import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { getAuthUser } from "@/lib/getUser";

// ─── GET /api/profile?action=me|search&q=... ──────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "me";

  switch (action) {
    case "me":
      return handleGetMe();
    case "search":
      return handleSearch(request);
    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}

// ─── PATCH /api/profile (update my profile — FormData) ────────
export async function PATCH(request: Request) {
  return handleUpdateMe(request);
}

// ═══════════════════════════════════════════════════════════════
// GET ME
// ═══════════════════════════════════════════════════════════════
async function handleGetMe() {
  const service = createSupabaseServiceClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await service
    .from("profiles")
    .select(
      "id, name, email, role, is_approved, is_verified, barangay_id, phone, purok_address, sex, birth_date, age, avatar, cover_photo"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }

  return NextResponse.json(
    { ...(data ?? {}) },
    { status: 200 }
  );
}

// ═══════════════════════════════════════════════════════════════
// SEARCH USERS
// ═══════════════════════════════════════════════════════════════
async function handleSearch(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();

  if (!q) {
    return NextResponse.json([], { status: 200 });
  }

  const { data, error } = await service
    .from("profiles")
    .select("id, name, role, avatar, barangay_id")
    .ilike("name", `%${q}%`)
    .eq("is_approved", true)
    .neq("id", user.id)
    .limit(15);

  if (error) {
    console.error(error);
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data ?? [], { status: 200 });
}

// ═══════════════════════════════════════════════════════════════
// UPDATE ME (FormData)
// ═══════════════════════════════════════════════════════════════
async function handleUpdateMe(request: Request) {
  const supabaseService = createSupabaseServiceClient();
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const updates: Record<string, any> = {};
  const textFields = ["phone", "purok_address", "sex", "birth_date", "age"];

  for (const field of textFields) {
    const value = formData.get(field);
    if (value !== null) {
      updates[field] = value;
    }
  }

  const fileFields = ["avatar", "cover_photo"];
  for (const field of fileFields) {
    const file = formData.get(field) as File | null;
    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${field}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
      const bucketName = field === "cover_photo" ? "profile-covers" : "avatars";

      const { error: uploadError } = await supabaseService.storage
        .from(bucketName)
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error(`Storage Error (${field}):`, uploadError);
        return NextResponse.json({ error: `Failed to upload ${field}` }, { status: 500 });
      }
      updates[field] = filePath;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const { error } = await supabaseService
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
