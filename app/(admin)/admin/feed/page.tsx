"use client";

import { useState } from "react";
import useSWR from "swr";
import { AlertCircle, User as UserIcon } from "lucide-react";
import { Post, PostVariant } from "@/lib/types";

// New shared components
import { PostCard } from "@/app/components/post/PostCard";
import { ReactionBar } from "@/app/components/post/ReactionBar";
import { PostForm } from "@/app/components/post/PostForm";

// New shared hooks
import { useReactions } from "@/hooks/useReactions";
import { useFeedRealtime } from "@/hooks/useFeedRealtime";
import { usePostForm } from "@/hooks/usePostForm";

// UI components
import CommentDrawer from "@/app/components/ui/CommentDrawer";
import VideoLightbox from "@/app/components/ui/VideoLightbox";

const fetcher = (url: string) => fetch(url).then((res) => { if (!res.ok) throw new Error('Failed to fetch'); return res.json(); });


const ShareIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M14 9V5L22 12L14 19V14.9C8.5 14.9 4.7 16.6 2 20.4C3.1 14.9 6.4 9.5 14 9Z" />
  </svg>
);

export default function AdminFeedPage() {
  const { data: me, mutate: mutateMe } = useSWR("/api/profile?action=me", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
  const { data: posts = [], isLoading, error, mutate } = useSWR<Post[]>("/api/posts", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5000,
  });

  // Shared hooks
  const reactions = useReactions({ mutate, userId: me?.id });
  const realtime = useFeedRealtime({ mutate });
  const postForm = usePostForm();

  const handleToggleAutoplay = async (nextValue: boolean) => {
    const fd = new FormData();
    fd.append("autoplay_videos", String(nextValue));
    await fetch("/api/profile", { method: "PATCH", body: fd });
    void mutateMe();
  };

  // Local state
  const [isExpanding, setIsExpanding] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [statusModal, setStatusModal] = useState<Post | null>(null);
  const [videoLightboxSrc, setVideoLightboxSrc] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState("pending");
  const [adminResponse, setAdminResponse] = useState("");

  // Post management handlers
  const handleDeletePost = async (postId: number) => {
    if (!window.confirm("Delete this post?")) return;
    await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    void mutate();
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModal) return;
    await fetch(`/api/posts/${statusModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, admin_response: adminResponse }),
    });
    setStatusModal(null);
    setAdminResponse("");
    void mutate();
  };

  // Event handlers
  const openComments = (postId: number) => {
    setSelectedPostId(postId);
    setIsDrawerOpen(true);
  };

  const handleShare = (postId: number) => {
    const url = `${window.location.origin}/posts/${postId}`;
    if (navigator.share) {
      void navigator.share({
        title: "Check out this post",
        url: url,
      });
    } else {
      void navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <>
      {videoLightboxSrc && (
        <VideoLightbox src={videoLightboxSrc} onClose={() => setVideoLightboxSrc(null)} />
      )}
      {/* Create Post Modal */}
      <PostForm
        isOpen={isExpanding}
        onClose={() => setIsExpanding(false)}
        onSubmit={async (formData) => {
          await postForm.handleSubmit(formData);
          setIsExpanding(false);
          void mutate();
        }}
        userName={me?.name || "Admin"}
        variant="admin"
        formState={postForm}
        onMediaSelect={postForm.handleMediaSelect}
        onRemoveMedia={postForm.removeMedia}
        fileInputRef={postForm.fileInputRef}
      />

      <div className="mx-auto w-full max-w-5xl space-y-6 px-0 sm:px-4">
        {/* What's on your mind? Card */}
        <div className={`overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/60 transition-all ${isExpanding ? "p-6" : "p-4"}`}>
          {!isExpanding ? (
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <UserIcon className="h-5 w-5" />
              </div>
              <button 
                onClick={() => setIsExpanding(true)}
                className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-6 py-2.5 text-left text-sm font-medium text-slate-500 transition-all hover:bg-slate-100"
              >
                What&apos;s on your mind, {me?.name?.split(" ")[0] || "Admin"}?
              </button>
            </div>
          ) : (
            // This is handled by PostForm component
            null
          )}
        </div>

        <section className="space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="mt-4 text-sm font-medium">Loading feed...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-6 text-center ring-1 ring-red-100">
              <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
              <p className="mt-2 text-sm font-bold text-red-600">Failed to load posts</p>
            </div>
          )}

          <div className="grid gap-6">
            {(posts ?? []).length === 0 && !isLoading && !error && (
              <div className="rounded-xl bg-white dark:bg-slate-900 p-12 text-center shadow-sm ring-1 ring-slate-200 dark:ring-slate-700/60">
                <p className="text-slate-500">No updates to show right now.</p>
              </div>
            )}

            {(posts ?? []).map((post) => (
              <PostCard
                key={post.id}
                post={post}
                variant="admin"
                isAdmin={true}
                autoplayVideos={me?.autoplay_videos ?? true}
                onToggleAutoplayVideos={handleToggleAutoplay}
                onVideoClick={setVideoLightboxSrc}
                onDelete={handleDeletePost}
                onStatusUpdate={(p) => { setStatusModal(p); setNewStatus(p.status || "pending"); setAdminResponse(""); }}
              >
                <ReactionBar
                  post={post}
                  onReact={reactions.handleReact}
                  onComment={openComments}
                  onShare={handleShare}
                  isVerified={true}
                  variant="admin"
                />
              </PostCard>
            ))}
          </div>
        </section>
      </div>

      <CommentDrawer 
        postId={selectedPostId} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        me={me}
      />

      {/* Status Update Modal */}
      {statusModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setStatusModal(null)} />
          <div className="relative w-full max-w-lg rounded-[32px] bg-white p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">Update Post Status</h3>
              <button onClick={() => setStatusModal(null)} className="rounded-full p-2 hover:bg-slate-100 text-slate-400">
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateStatus} className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {["pending", "in_progress", "resolved"].map((s) => (
                    <button key={s} type="button" onClick={() => setNewStatus(s)}
                      className={`rounded-2xl py-3 text-xs font-black uppercase tracking-widest transition-all ${
                        newStatus === s ? "bg-blue-600 text-white shadow-lg" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                      }`}
                    >
                      {s.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Response Message</label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Enter admin response or feedback..."
                  className="min-h-[100px] w-full rounded-2xl border-0 bg-slate-50 p-4 text-sm font-medium text-slate-900 ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setStatusModal(null)}
                  className="rounded-2xl px-6 py-3 text-sm font-black text-slate-400 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit"
                  className="rounded-2xl bg-blue-600 px-8 py-3 text-sm font-black text-white hover:bg-blue-700">
                  Update Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
