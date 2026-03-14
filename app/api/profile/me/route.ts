import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

// GET /api/profile/me - current user's profile
export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, email, role, is_approved, barangay_id, phone, purok_address, sex, birth_date, age, avatar, cover_photo"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ...(data ?? {}), email: data?.email ?? user.email },
    { status: 200 }
  );
}

// PATCH /api/profile/me - update allowed profile fields
export async function PATCH(request: Request) {
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

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

