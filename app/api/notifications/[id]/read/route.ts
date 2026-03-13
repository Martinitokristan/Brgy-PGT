import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, props: Params) {
  const supabase = await createSupabaseServerClient();
  const { id: idStr } = await props.params;
  const id = Number(idStr);

  if (!id || Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

