"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Send, 
  MessageCircle, 
  Heart, 
  Reply,
  Loader2,
  MoreHorizontal
} from "lucide-react";
import useSWR from "swr";
import { supabase } from "@/lib/supabaseClient";
import { formatRelativeTime } from "@/app/utils/dateUtils";

type Comment = {
  id: number;
  post_id: number;
  user_id: string;
  parent_id: number | null;
  body: string;
  liked_by: string[];
  profiles: { name: string; avatar?: string } | null;
  created_at: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CommentDrawerProps {
  postId: number | null;
  isOpen: boolean;
  onClose: () => void;
  me: any;
}

export default function CommentDrawer({ postId, isOpen, onClose, me }: CommentDrawerProps) {
  const { data: comments, mutate } = useSWR<Comment[]>(
    postId ? `/api/posts/${postId}/comments` : null, 
    fetcher
  );
  
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Real-time comments
  useEffect(() => {
    if (!postId || !isOpen) return;

    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`
        },
        () => {
          mutate(); // Update comments list in real-time
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, isOpen, mutate]);

  const thread = useMemo(() => {
    const byParent: Record<string, Comment[]> = {};
    (comments ?? []).forEach(c => {
      const key = String(c.parent_id ?? "root");
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(c);
    });
    return byParent;
  }, [comments]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newComment.trim() || isSubmitting || !postId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment.trim() }),
      });
      if (res.ok) {
        setNewComment("");
        mutate();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-[60] flex h-[85vh] flex-col rounded-t-[20px] bg-white shadow-2xl sm:h-[70vh]"
          >
            {/* Handle */}
            <div className="flex w-full items-center justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-50 px-6 pb-4">
              <h2 className="text-[17px] font-bold text-slate-900">Comments</h2>
              <button 
                onClick={onClose}
                className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Comments List */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4"
            >
              {comments && comments.length > 0 ? (
                <div className="space-y-6">
                  {(thread["root"] ?? []).map(comment => (
                    <CommentItemFB 
                      key={comment.id} 
                      comment={comment} 
                      replies={thread[String(comment.id)] || []}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                  <p className="text-[15px] font-medium text-slate-500">No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-100 bg-white p-4 pb-8 sm:pb-4">
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1877f2] font-bold text-white text-sm">
                  {me?.profile?.name?.charAt(0) || "U"}
                </div>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a public comment..."
                    className="w-full rounded-full bg-slate-100 px-4 py-2.5 text-[15px] outline-none ring-1 ring-inset ring-slate-200 focus:bg-white focus:ring-[#1877f2]"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] font-bold text-[#1877f2] disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Post"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CommentItemFB({ comment, replies }: { comment: Comment, replies: Comment[] }) {
  return (
    <div className="flex gap-2">
      {/* Avatar */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4267B2] font-bold text-white text-sm">
        {comment.profiles?.name?.charAt(0) || "U"}
      </div>

      <div className="flex flex-col max-w-[85%]">
        {/* Bubble */}
        <div className="rounded-[18px] bg-[#F0F2F5] px-3.5 py-2">
          <p className="text-[13px] font-bold text-slate-900 leading-tight mb-0.5">
            {comment.profiles?.name || "Anonymous Resident"}
          </p>
          <p className="text-[15px] text-[#050505] leading-snug">
            {comment.body}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="mt-1 flex items-center gap-3 px-2">
          <button className="text-[12px] font-bold text-[#65676B] hover:underline">Like</button>
          <button className="text-[12px] font-bold text-[#65676B] hover:underline">Reply</button>
          <span className="text-[11px] text-[#65676B]">
            {formatRelativeTime(comment.created_at)}
          </span>
        </div>

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-2 space-y-3">
            {replies.map(reply => (
              <CommentItemFB key={reply.id} comment={reply} replies={[]} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
