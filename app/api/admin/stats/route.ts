import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all posts
  const { data: posts } = await supabase
    .from("posts")
    .select("id, status, urgency_level, purpose, created_at");

  // Fetch all profiles (residents)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role, is_approved");

  const allPosts = posts ?? [];
  const allProfiles = profiles ?? [];

  const totalPosts = allPosts.length;
  const pendingPosts = allPosts.filter((p) => p.status === "pending").length;
  const inProgressPosts = allPosts.filter((p) => p.status === "in_progress").length;
  const resolvedPosts = allPosts.filter((p) => p.status === "resolved").length;
  const urgentPosts = allPosts.filter(
    (p) => p.urgency_level === "high" && p.status !== "resolved"
  ).length;

  const totalResidents = allProfiles.filter((p) => p.role === "resident").length;
  const approvedResidents = allProfiles.filter(
    (p) => p.role === "resident" && p.is_approved
  ).length;

  // Group by purpose
  const purposeMap: Record<string, number> = {};
  for (const post of allPosts) {
    const p = post.purpose || "General";
    purposeMap[p] = (purposeMap[p] ?? 0) + 1;
  }

  // Group by urgency
  const urgencyMap: Record<string, number> = {};
  for (const post of allPosts) {
    const u = post.urgency_level || "low";
    urgencyMap[u] = (urgencyMap[u] ?? 0) + 1;
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
  });
}
