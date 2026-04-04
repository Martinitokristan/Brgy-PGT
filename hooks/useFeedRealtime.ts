import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UseFeedRealtimeProps {
  mutate: () => void;
}

export function useFeedRealtime({ mutate }: UseFeedRealtimeProps) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("feed-comment-counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
        },
        () => {
          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => mutate(), 3000);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase.removeChannel(channel);
    };
  }, [mutate]);
}
