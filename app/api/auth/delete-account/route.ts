import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason } = await request.json().catch(() => ({}));

  // Soft delete: mark profile as deactivated with timestamp
  const { error: updateError } = await service
    .from("profiles")
    .update({
      is_approved: false,
      deleted_at: new Date().toISOString(),
      delete_reason: reason ?? null,
    })
    .eq("id", user.id);

  if (updateError) {
    // If column doesn't exist yet, just mark as not approved
    await service.from("profiles").update({ is_approved: false }).eq("id", user.id);
  }

  // Sign out globally
  await supabase.auth.signOut({ scope: "global" });

  return NextResponse.json({ success: true }, { status: 200 });
}
