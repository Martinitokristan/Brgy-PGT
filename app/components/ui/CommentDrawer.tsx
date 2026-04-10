"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import useSWR from "swr";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { formatRelativeTime } from "@/app/utils/dateUtils";
import { fetcher } from "@/lib/fetcher";
import { CommentListSkeleton } from "@/app/components/ui/Skeleton";

type Comment = {
  id: number;
  post_id: number;
  user_id: string;
  parent_id: number | null;
  body: string;
  liked_by: string[];
  reaction_counts?: Record<string, number>;
  my_reaction?: string | null;
  profiles: { name: string; avatar?: string } | null;
  created_at: string;
};

interface CommentDrawerProps {
  postId: number | null;
  isOpen: boolean;
  onClose: () => void;
  me: any;
  highlightCommentId?: number | null;
}

export default function CommentDrawer({ postId, isOpen, onClose, me, highlightCommentId }: CommentDrawerProps) {
  const { data: comments, mutate } = useSWR<Comment[]>(
    postId ? `/api/posts/${postId}?action=comments` : null,
    fetcher
  );

  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [disableDrawerDrag, setDisableDrawerDrag] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [flashCommentId, setFlashCommentId] = useState<number | null>(null);
  const isAdmin = me?.role === "admin";
  const profileBaseUrl = isAdmin ? "/admin/users" : "/profile";

  // Lock background (feed) scroll while drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const body = document.body;
    const docEl = document.documentElement;

    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    // Prevent layout shift when hiding scrollbar (desktop)
    const scrollbarWidth = window.innerWidth - docEl.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [isOpen]);

  // Handle Android back gesture: push history entry when drawer opens
  // so swiping back closes it instead of navigating away.
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ __drawer: "comments" }, "");

    const onPopState = () => {
      onClose();
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      if (window.history.state?.__drawer === "comments") {
        window.history.replaceState(null, "");
      }
    };
  }, [isOpen, onClose]);

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

  // Scroll to + highlight a specific comment (from notifications deep-link)
  useEffect(() => {
    if (!isOpen) return;
    if (!highlightCommentId) return;
    if (!comments || comments.length === 0) return;

    const el = scrollRef.current?.querySelector(`[data-comment-id="${highlightCommentId}"]`) as HTMLElement | null;
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlashCommentId(highlightCommentId);
    const t = window.setTimeout(() => setFlashCommentId(null), 2500);
    return () => window.clearTimeout(t);
  }, [isOpen, highlightCommentId, comments]);

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
      const res = await fetch(`/api/posts/${postId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", ...body }),
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
    await fetch(`/api/posts/${postId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment_like", comment_id: commentId }) });
    mutate();
  }

  async function handleReactComment(commentId: number, type: string) {
    if (!postId) return;
    // Optimistic update (instant UI like ReactionBar)
    mutate(
      (current: Comment[] | undefined) => {
        if (!current) return current;
        return current.map((c) => {
          if (c.id !== commentId) return c;

          const prevType = c.my_reaction ?? null;
          const nextType = type === "unlike" ? null : type;

          const prevCounts = c.reaction_counts ?? ((c.liked_by?.length ?? 0) > 0 ? { like: c.liked_by.length } : {});
          const counts = { ...prevCounts };

          if (prevType) {
            counts[prevType] = Math.max((counts[prevType] ?? 1) - 1, 0);
            if (counts[prevType] === 0) delete counts[prevType];
          }
          if (nextType) {
            counts[nextType] = (counts[nextType] ?? 0) + 1;
          }

          return {
            ...c,
            reaction_counts: counts,
            my_reaction: nextType,
          };
        });
      },
      { revalidate: false }
    );

    // Fire API call in background then revalidate
    fetch(`/api/posts/${postId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment_reaction", comment_id: commentId, type }),
    }).finally(() => {
      mutate();
    });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", ease: [0.25, 0.46, 0.45, 0.94], duration: 0.28 }}
            drag={disableDrawerDrag ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || (info.velocity.y > 500 && info.offset.y > 40)) {
                onClose();
              }
            }}
            style={{ willChange: "transform" }}
            className="fixed inset-x-0 bottom-0 z-[60] flex h-[88vh] flex-col rounded-t-[20px] bg-white dark:bg-slate-900 shadow-2xl sm:h-[75vh]"
          >
            {/* Handle */}
            <div className="flex w-full shrink-0 items-center justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 pb-3">
              <h2 className="text-[17px] font-bold text-slate-900 dark:text-slate-100">
                Comments{comments && comments.length > 0 ? ` · ${comments.length}` : ""}
              </h2>
              <button onClick={onClose} className="rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Comments list */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {!comments ? (
                <CommentListSkeleton />
              ) : rootComments.length === 0 ? (
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
                    onReact={handleReactComment}
                    setDisableDrawerDrag={setDisableDrawerDrag}
                    depth={0}
                    flashCommentId={flashCommentId}
                  />
                ))
              )}
            </div>

            {/* Input area */}
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pb-8 pt-3 sm:pb-4">
              {me && !me.is_verified && me.role !== "admin" ? (
                <div className="flex items-center gap-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3">
                  <ShieldCheck className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-amber-800 dark:text-amber-200">You can read comments</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-300/90">Verify your account to join the conversation.</p>
                  </div>
                  <a href="/verify-account" className="shrink-0 rounded-full bg-amber-500 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-amber-600 transition-colors">Verify</a>
                </div>
              ) : (
                <>
                  {replyingTo && (
                    <div className="mb-2 flex items-center justify-between rounded-xl bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5">
                      <p className="text-xs text-slate-500 dark:text-slate-300">
                        Replying to <span className="font-bold text-blue-700 dark:text-blue-300">{replyingTo.profiles?.name || "comment"}</span>
                      </p>
                      <button onClick={() => setReplyingTo(null)} className="text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
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
                        className="w-full rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-2.5 pr-14 text-[14px] text-slate-900 dark:text-slate-100 outline-none ring-1 ring-inset ring-slate-200 dark:ring-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={!newComment.trim() || isSubmitting}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-bold text-blue-600 dark:text-blue-400 disabled:opacity-40"
                      >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Post"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function CommentItem({
  comment, replies, me, profileBaseUrl, onReply, onLike, onReact, depth, rootComment,
  setDisableDrawerDrag,
  flashCommentId,
}: {
  comment: Comment;
  replies: Comment[];
  me: any;
  profileBaseUrl: string;
  onReply: (c: Comment) => void;
  onLike: (id: number) => void;
  onReact: (commentId: number, type: string) => void;
  setDisableDrawerDrag: (v: boolean) => void;
  depth: number;
  rootComment?: Comment;
  flashCommentId?: number | null;
}) {
  const [showReplies, setShowReplies] = useState(false);
  const myReaction = comment.my_reaction ?? (me?.id && (comment.liked_by ?? []).includes(me.id) ? "like" : null);
  const counts = comment.reaction_counts ?? ((comment.liked_by?.length ?? 0) > 0 ? { like: comment.liked_by.length } : {});
  const likeCount = Object.values(counts).reduce((a, b) => a + b, 0);

  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPointerDown = useRef(false);
  const isLongPress = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const didMove = useRef(false);
  const [showPicker, setShowPicker] = useState(false);

  const REACTIONS = [
    { type: "like", emoji: "👍", label: "Like" },
    { type: "heart", emoji: "❤️", label: "Love" },
    { type: "haha", emoji: "😂", label: "Haha" },
    { type: "sad", emoji: "😢", label: "Sad" },
  ] as const;

  const openPicker = () => setShowPicker(true);
  const closePicker = () => { setShowPicker(false); setDraggedOver(null); };

  const getReactionAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    const btn = el?.closest("[data-comment-reaction]") as HTMLElement | null;
    return btn?.dataset.commentReaction ?? null;
  };

  const handleLikePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    setDisableDrawerDrag(true);
    isPointerDown.current = true;
    isLongPress.current = false;
    didMove.current = false;
    startPoint.current = { x: e.clientX, y: e.clientY };
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      if (!isPointerDown.current) return;
      isLongPress.current = true;
      openPicker();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    }, 350);
  };

  const handleLikePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isPointerDown.current) return;
    if (startPoint.current) {
      const dx = Math.abs(e.clientX - startPoint.current.x);
      const dy = Math.abs(e.clientY - startPoint.current.y);
      if (dx + dy > 6) didMove.current = true;
    }
    if (!isLongPress.current) return;
    const reaction = getReactionAt(e.clientX, e.clientY);
    setDraggedOver(reaction);
  };

  const handleLikePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    const wasLongPress = isLongPress.current;
    isPointerDown.current = false;
    setDisableDrawerDrag(false);

    if (wasLongPress) {
      const reaction = getReactionAt(e.clientX, e.clientY);
      if (reaction) onReact(comment.id, reaction);
      closePicker();
      isLongPress.current = false;
    } else {
      // Short tap: toggle Like/Unlike
      if (myReaction) onReact(comment.id, "unlike");
      else onReact(comment.id, "like");
    }

    didMove.current = false;
    startPoint.current = null;
  };

  const handleLikePointerCancel = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    isPointerDown.current = false;
    isLongPress.current = false;
    didMove.current = false;
    startPoint.current = null;
    setDraggedOver(null);
    setShowPicker(false);
    setDisableDrawerDrag(false);
  };

  const reactionDisplay = myReaction
    ? (REACTIONS.find((r) => r.type === myReaction)?.emoji ?? "👍")
    : null;
  const reactionLabel = myReaction
    ? (REACTIONS.find((r) => r.type === myReaction)?.label ?? "Like")
    : "Like";

  const topReactions = Object.entries(counts)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .slice(0, 2)
    .map(([type]) => REACTIONS.find((r) => r.type === type)?.emoji)
    .filter(Boolean) as string[];

  // Auto-expand replies if just posted
  useEffect(() => {
    if (replies.length > 0) setShowReplies(true);
  }, [replies.length]);

  const isFlash = !!flashCommentId && flashCommentId === comment.id;

  return (
    <div
      data-comment-id={comment.id}
      className={`flex gap-2.5 rounded-2xl transition-colors ${
        depth > 0 ? "ml-10 mt-2" : "mt-4"
      } ${
        isFlash ? "bg-amber-50 ring-2 ring-amber-300 dark:bg-amber-950/30 dark:ring-amber-700/60" : ""
      }`}
    >
      {/* Avatar */}
      <Link href={`${profileBaseUrl}/${comment.user_id}`} className="shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white transition-transform hover:scale-105">
          {comment.profiles?.name?.charAt(0) || "U"}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        {/* Bubble */}
        <div className="inline-block max-w-full rounded-2xl bg-[#F0F2F5] dark:bg-slate-800 px-3.5 py-2.5">
          <Link href={`${profileBaseUrl}/${comment.user_id}`}>
            <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 hover:underline leading-none mb-1">
              {comment.profiles?.name || "Resident"}
            </p>
          </Link>
          <p className="text-[14px] text-slate-800 dark:text-slate-200 leading-snug break-words">{comment.body}</p>
        </div>

        {/* Actions row */}
        <div className="mt-1 flex items-center gap-3 px-1">
          <div className="relative">
            {showPicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={closePicker} />
                <div className="absolute -top-[64px] left-0 z-20 flex items-end gap-1 rounded-full bg-white dark:bg-slate-800 px-3 py-2 shadow-2xl border border-slate-200 dark:border-slate-600">
                  {REACTIONS.map((r) => {
                    const isActive = draggedOver === r.type;
                    return (
                      <button
                        key={r.type}
                        data-comment-reaction={r.type}
                        onClick={() => { onReact(comment.id, r.type); closePicker(); }}
                        title={r.label}
                        className="relative flex flex-col items-center gap-0.5 transition-all duration-150"
                        style={{
                          transform: isActive ? "translateY(-12px) scale(1.28)" : "translateY(0) scale(1)",
                        }}
                      >
                        <span className="text-[24px] leading-none select-none drop-shadow-sm pointer-events-none">
                          {r.emoji}
                        </span>
                        <span
                          className="absolute -bottom-5 whitespace-nowrap rounded-full bg-slate-800 dark:bg-slate-600 px-1.5 py-0.5 text-[9px] font-bold text-white transition-opacity duration-100 pointer-events-none"
                          style={{ opacity: isActive ? 1 : 0 }}
                        >
                          {r.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <button
              onPointerDown={handleLikePointerDown}
              onPointerMove={handleLikePointerMove}
              onPointerUp={handleLikePointerUp}
              onPointerCancel={handleLikePointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                touchAction: "none",
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
              }}
              className={`text-[12px] font-bold transition-colors hover:underline ${myReaction ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`}
            >
              {reactionDisplay ? <span className="mr-1">{reactionDisplay}</span> : null}
              <span className="pointer-events-none">{reactionLabel}</span>
              {likeCount > 0 && <span className="ml-1 text-slate-400 dark:text-slate-500">{likeCount}</span>}
            </button>
          </div>
          <button
            onClick={() => {
              // Replies to replies go to the root parent (Facebook style flat threading)
              onReply(depth === 0 ? comment : (rootComment ?? comment));
            }}
            className="text-[12px] font-bold text-slate-500 dark:text-slate-400 hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Reply
          </button>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatRelativeTime(comment.created_at)}</span>
          {likeCount > 0 && (
            <span className="ml-auto flex items-center gap-0.5 text-[11px] text-slate-400 dark:text-slate-500">
              {topReactions.map((e) => (
                <span key={e} className="text-[12px] leading-none">{e}</span>
              ))}
              <span className="ml-0.5">{likeCount}</span>
            </span>
          )}
        </div>

        {/* View replies toggle */}
        {depth === 0 && replies.length > 0 && (
          <button
            onClick={() => setShowReplies((v) => !v)}
            className="mt-1.5 flex items-center gap-1 rounded-xl px-2 py-1 text-[12px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
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
                    onReact={onReact}
                    setDisableDrawerDrag={setDisableDrawerDrag}
                    depth={1}
                    rootComment={comment}
                    flashCommentId={flashCommentId}
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
