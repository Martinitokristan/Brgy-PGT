"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Heart, ChevronDown, ChevronUp } from "lucide-react";
import useSWR from "swr";
import Link from "next/link";
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

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAdmin = me?.role === "admin";
  const profileBaseUrl = isAdmin ? "/admin/users" : "/profile";

  // Real-time
  useEffect(() => {
    if (!postId || !isOpen) return;
    const channel = supabase
      .channel(`post-comments-${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` }, () => mutate())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId, isOpen, mutate]);

  // Focus reply input when replying
  useEffect(() => {
    if (replyingTo) setTimeout(() => replyInputRef.current?.focus(), 100);
  }, [replyingTo]);

  const thread = useMemo(() => {
    const byParent: Record<string, Comment[]> = {};
    (comments ?? []).forEach((c) => {
      const key = String(c.parent_id ?? "root");
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(c);
    });
    return byParent;
  }, [comments]);

  const rootComments = thread["root"] ?? [];

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!newComment.trim() || isSubmitting || !postId) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, any> = { body: newComment.trim() };
      if (replyingTo) body.parent_id = replyingTo.id;
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNewComment("");
        setReplyingTo(null);
        mutate();
        // Scroll to bottom
        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }, 300);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLikeComment(commentId: number) {
    if (!postId) return;
    await fetch(`/api/posts/${postId}/comments/${commentId}/like`, { method: "POST" });
    mutate();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y" dragConstraints={{ top: 0 }} dragElastic={0.2}
            onDragEnd={(_, info) => { if (info.offset.y > 150) onClose(); }}
            className="fixed inset-x-0 bottom-0 z-[60] flex h-[88vh] flex-col rounded-t-[20px] bg-white shadow-2xl sm:h-[75vh]"
          >
            {/* Handle */}
            <div className="flex w-full shrink-0 items-center justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 pb-3">
              <h2 className="text-[17px] font-bold text-slate-900">
                Comments{comments && comments.length > 0 ? ` · ${comments.length}` : ""}
              </h2>
              <button onClick={onClose} className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>

            {/* Comments list */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {rootComments.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-20 text-center">
                  <p className="text-[15px] font-medium text-slate-400">No comments yet. Be the first!</p>
                </div>
              ) : (
                rootComments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    replies={thread[String(comment.id)] ?? []}
                    me={me}
                    profileBaseUrl={profileBaseUrl}
                    onReply={setReplyingTo}
                    onLike={handleLikeComment}
                    depth={0}
                  />
                ))
              )}
            </div>

            {/* Input area */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-4 pb-8 pt-3 sm:pb-4">
              {replyingTo && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-1.5">
                  <p className="text-xs text-slate-500">
                    Replying to <span className="font-bold text-blue-700">{replyingTo.profiles?.name || "comment"}</span>
                  </p>
                  <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {me?.name?.charAt(0) || "U"}
                </div>
                <div className="relative flex-1">
                  <input
                    ref={replyInputRef}
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSubmit(); } }}
                    placeholder={replyingTo ? `Reply to ${replyingTo.profiles?.name ?? ""}...` : "Write a public comment..."}
                    className="w-full rounded-full bg-slate-100 px-4 py-2.5 pr-14 text-[14px] text-slate-900 outline-none ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-blue-600 disabled:opacity-40"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Post"}
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

function CommentItem({
  comment, replies, me, profileBaseUrl, onReply, onLike, depth, rootComment,
}: {
  comment: Comment;
  replies: Comment[];
  me: any;
  profileBaseUrl: string;
  onReply: (c: Comment) => void;
  onLike: (id: number) => void;
  depth: number;
  rootComment?: Comment;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const likedBy = comment.liked_by ?? [];
  const isLiked = me?.id && likedBy.includes(me.id);
  const likeCount = likedBy.length;

  // Auto-expand replies if just posted
  useEffect(() => {
    if (replies.length > 0) setShowReplies(true);
  }, [replies.length]);

  return (
    <div className={`flex gap-2.5 ${depth > 0 ? "ml-10 mt-2" : "mt-4"}`}>
      {/* Avatar */}
      <Link href={`${profileBaseUrl}/${comment.user_id}`} className="shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white transition-transform hover:scale-105">
          {comment.profiles?.name?.charAt(0) || "U"}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        {/* Bubble */}
        <div className="inline-block max-w-full rounded-2xl bg-[#F0F2F5] px-3.5 py-2.5">
          <Link href={`${profileBaseUrl}/${comment.user_id}`}>
            <p className="text-[13px] font-bold text-slate-900 hover:underline leading-none mb-1">
              {comment.profiles?.name || "Resident"}
            </p>
          </Link>
          <p className="text-[14px] text-slate-800 leading-snug break-words">{comment.body}</p>
        </div>

        {/* Actions row */}
        <div className="mt-1 flex items-center gap-3 px-1">
          <button
            onClick={() => onLike(comment.id)}
            className={`text-[12px] font-bold transition-colors hover:underline ${isLiked ? "text-blue-600" : "text-slate-500"}`}
          >
            Like{likeCount > 0 && <span className="ml-1 text-slate-400">{likeCount}</span>}
          </button>
          <button
            onClick={() => {
              // Replies to replies go to the root parent (Facebook style flat threading)
              onReply(depth === 0 ? comment : (rootComment ?? comment));
            }}
            className="text-[12px] font-bold text-slate-500 hover:underline hover:text-blue-600 transition-colors"
          >
            Reply
          </button>
          <span className="text-[11px] text-slate-400">{formatRelativeTime(comment.created_at)}</span>
          {likeCount > 0 && (
            <span className="ml-auto flex items-center gap-0.5 text-[11px] text-slate-400">
              <Heart size={10} className="fill-red-400 text-red-400" /> {likeCount}
            </span>
          )}
        </div>

        {/* View replies toggle */}
        {depth === 0 && replies.length > 0 && (
          <button
            onClick={() => setShowReplies((v) => !v)}
            className="mt-1.5 flex items-center gap-1 rounded-xl px-2 py-1 text-[12px] font-bold text-blue-600 hover:bg-blue-50 transition-colors"
          >
            {showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showReplies ? "Hide" : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
          </button>
        )}

        {/* Replies */}
        <AnimatePresence>
          {showReplies && depth === 0 && replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-1 pt-1">
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    replies={[]}
                    me={me}
                    profileBaseUrl={profileBaseUrl}
                    onReply={onReply}
                    onLike={onLike}
                    depth={1}
                    rootComment={comment}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
