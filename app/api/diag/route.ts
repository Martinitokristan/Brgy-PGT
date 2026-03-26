import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabaseService";

export async function GET() {
  const service = createSupabaseServiceClient();

  // 1. Get all residents
  const { data: users } = await service.auth.admin.listUsers();
  const residents = (users?.users ?? []).filter(u => u.email !== "admin@brgypgt.com");

  const results: any[] = [];

  // 2. Cascade cleanup of resident-related data
  // Due to foreign keys, we delete child tables first.
  const tables = [
    "notifications",
    "post_reactions",
    "comments",
    "posts",
    "verification_requests",
    "trusted_devices",
    "device_otps",
    "sms_logs",
    "pending_registrations"
  ];

  for (const table of tables) {
    try {
      const { error } = await service.from(table).delete().neq("id", -1); // Delete all
      results.push({ table, error: error?.message || "SUCCESS" });
    } catch(e: any) {
      results.push({ table, error: e.message });
    }
  }

  // 3. Delete profiles that are not admins
  try {
    const { error } = await service.from("profiles").delete().neq("role", "admin");
    results.push({ table: "profiles", error: error?.message || "SUCCESS" });
  } catch(e: any) {
    results.push({ table: "profiles", error: e.message });
  }

  // 4. Delete Auth Users
  for (const user of residents) {
    try {
      const { error } = await service.auth.admin.deleteUser(user.id);
      results.push({ user: user.email, error: error?.message || "SUCCESS" });
    } catch(e: any) {
      results.push({ user: user.email, error: e.message });
    }
  }

  return NextResponse.json({ cleanup: results });
}
