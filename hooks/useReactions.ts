import { useCallback } from "react";
import { REACTION_EMOJIS, Post } from "@/lib/types";

interface UseReactionsProps {
  mutate: (data?: any, options?: any) => any;
  userId?: string;
}

export function useReactions({ mutate, userId }: UseReactionsProps) {
  const handleReact = useCallback(async (postId: number, type: string) => {
    // Optimistic update: update the post locally without refetching everything
    mutate(
      (currentPosts: Post[]) => {
        if (!currentPosts) return currentPosts;
        return currentPosts.map((post: Post) => {
          if (post.id !== postId) return post;
          const newCounts = { ...post.reaction_counts };
          // Remove old reaction
          if (post.my_reaction) {
            newCounts[post.my_reaction] = Math.max((newCounts[post.my_reaction] || 1) - 1, 0);
            if (newCounts[post.my_reaction] === 0) delete newCounts[post.my_reaction];
          }
          // Add new reaction (or toggle off if same)
          const newReaction = post.my_reaction === type ? null : type;
          if (newReaction) {
            newCounts[newReaction] = (newCounts[newReaction] || 0) + 1;
          }
          return { ...post, my_reaction: newReaction, reaction_counts: newCounts };
        });
      },
      { revalidate: false }
    );
    // Fire API call in background
    fetch(`/api/posts/${postId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reaction", type }),
    });
  }, [mutate, userId]);

  return { handleReact };
}
