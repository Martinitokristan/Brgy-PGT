"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Profile = {
  id: string;
};


export default function MyProfileRedirectPage() {
  const router = useRouter();
  const { data: profile, isLoading } = useSWR<Profile>("/api/profile?action=me", fetcher);

  useEffect(() => {
    if (profile?.id) {
      router.replace(`/profile/${profile.id}`);
    }
  }, [profile, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
}
