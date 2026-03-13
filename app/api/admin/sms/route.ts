import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { createSupabaseServiceClient } from "@/lib/supabaseService";
import { sendSms } from "@/lib/smsSender";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, error: "Unauthorized" as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") {
    return { supabase, user: null, error: "Forbidden" as const };
  }

  return { supabase, user, error: null };
}

// GET /api/admin/sms - list recent SMS logs (admin only)
export async function GET() {
  const { error, user } = await requireAdmin();

  if (error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "Forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

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
    return NextResponse.json(
      { error: "Failed to fetch SMS logs" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? [], { status: 200 });
}

// POST /api/admin/sms - send an SMS and log it
export async function POST(request: Request) {
  const { error, user } = await requireAdmin();

  if (error === "Unauthorized") {
    return NextResponse.json({ error }, { status: 401 });
  }
  if (error === "Forbidden") {
    return NextResponse.json({ error }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
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
    return NextResponse.json(
      { success: true, sid: result.sid },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { success: false, error: result.error },
    { status: 422 }
  );
}

