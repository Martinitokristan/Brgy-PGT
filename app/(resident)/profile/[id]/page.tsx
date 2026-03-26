"use client";

import { useParams } from "next/navigation";
import ProfileView from "@/app/components/ProfileView";

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  if (!id) return null;

  return <ProfileView userId={id} />;
}
