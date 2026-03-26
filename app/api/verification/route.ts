import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("verification_requests")
    .select("id, status, valid_id_type, submitted_at, rejection_reason")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { status: "none" });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createSupabaseServiceClient();

  // Check if already verified
  const { data: profile } = await service
    .from("profiles")
    .select("is_verified")
    .eq("id", user.id)
    .single();

  if (profile?.is_verified) {
    return NextResponse.json({ error: "Account is already verified." }, { status: 400 });
  }

  // Check for pending request
  const { data: existing } = await service
    .from("verification_requests")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You already have a pending verification request." }, { status: 400 });
  }

  const formData = await request.formData();
  const validIdType = formData.get("valid_id_type") as string;
  const validIdFile = formData.get("valid_id") as File | null;
  const selfieFile = formData.get("selfie") as File | null;

  if (!validIdType || !validIdFile || !selfieFile) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Upload valid ID
  const idExt = validIdFile.name.split(".").pop() ?? "jpg";
  const idPath = `${user.id}/valid-id-${Date.now()}.${idExt}`;
  const { error: idError } = await service.storage
    .from("verification-ids")
    .upload(idPath, validIdFile, { upsert: true });

  if (idError) return NextResponse.json({ error: "Failed to upload ID." }, { status: 500 });

  // Upload selfie
  const selfieExt = selfieFile.name.split(".").pop() ?? "jpg";
  const selfiePath = `${user.id}/selfie-${Date.now()}.${selfieExt}`;
  const { error: selfieError } = await service.storage
    .from("verification-selfies")
    .upload(selfiePath, selfieFile, { upsert: true });

  if (selfieError) return NextResponse.json({ error: "Failed to upload selfie." }, { status: 500 });

  // Create verification request
  const { error: insertError } = await service.from("verification_requests").insert({
    user_id: user.id,
    valid_id_type: validIdType,
    valid_id_path: idPath,
    selfie_path: selfiePath,
    status: "pending",
  });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
