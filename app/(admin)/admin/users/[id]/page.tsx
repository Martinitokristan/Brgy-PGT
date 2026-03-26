"use client";

import { useParams } from "next/navigation";
import ProfileView from "@/app/components/ProfileView";

export default function AdminUserProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  if (!id) return null;

  return (
    <div className="mx-auto max-w-5xl">
      <ProfileView userId={id} />
    </div>
  );
}
