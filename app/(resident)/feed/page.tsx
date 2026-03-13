"use client";

import useSWR from "swr";
import { useState, useRef } from "react";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  MoreHorizontal, 
  Search,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  X,
  Send,
  Loader2,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

type Post = {
  id: number;
  user_id: string;
  title: string | null;
  description: string | null;
  purpose: string | null;
  urgency_level: string | null;
  status: string | null;
  created_at: string | null;
  image: string | null;
  profiles: { name: string } | null;
  reaction_counts: Record<string, number>;
  my_reaction: string | null;
  comment_count: number;
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

export default function FeedPage() {
  const { data: me } = useSWR("/api/profile/me", fetcher);
  const { data, error, isLoading, mutate } = useSWR<Post[]>("/api/posts", fetcher);
  const [showingEmojiFor, setShowingEmojiFor] = useState<number | null>(null);
  
  // Post Creation State
  const [isExpanding, setIsExpanding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("general");
  const [urgency, setUrgency] = useState("low");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("purpose", purpose);
    formData.append("urgency_level", urgency);
    if (selectedImage) {
      formData.append("image", selectedImage);
    }

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        setPurpose("general");
        setUrgency("low");
        removeImage();
        setIsExpanding(false);
        mutate();
      }
    } catch (err) {
      console.error("Failed to create post:", err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReact = async (postId: number, type: string) => {
    fetch(`/api/posts/${postId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    }).then(() => {
      setShowingEmojiFor(null);
      void mutate();
    });
  };

  const reactionEmojis: Record<string, string> = {
    like: "👍",
    heart: "❤️",
    support: "🤝",
    sad: "😢"
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

  const getStorageUrl = (path: string) => {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${path}`;
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* What's on your mind? Card */}
      <div className={`overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition-all ${isExpanding ? "p-6" : "p-4"}`}>
        {!isExpanding ? (
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <UserIcon className="h-5 w-5" />
            </div>
            <button 
              onClick={() => setIsExpanding(true)}
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-6 py-2.5 text-left text-sm font-medium text-slate-500 transition-all hover:bg-slate-100"
            >
              What&apos;s on your mind, {me?.profile?.name?.split(" ")[0] || "Barangay"}?
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <h2 className="text-sm font-bold text-slate-900">Create New Post</h2>
              <button 
                type="button"
                onClick={() => {
                  setIsExpanding(false);
                  removeImage();
                }}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your post a title..."
                className="w-full border-0 bg-transparent px-0 text-lg font-bold text-slate-900 focus:outline-none placeholder:text-slate-400"
              />
              
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={`Tell us more about it...`}
                rows={3}
                className="w-full resize-none border-0 bg-transparent px-0 text-sm text-slate-600 focus:outline-none placeholder:text-slate-400"
              />

              {imagePreview && (
                <div className="relative mt-2 rounded-xl overflow-hidden ring-1 ring-slate-200">
                  <img src={imagePreview} alt="Preview" className="w-full object-cover max-h-72" />
                  <button 
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 rounded-full bg-slate-900/50 p-1.5 text-white backdrop-blur-sm hover:bg-slate-900/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <select 
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 focus:outline-none"
                >
                  <option value="general">General</option>
                  <option value="emergency">Emergency</option>
                  <option value="complaint">Complaint</option>
                  <option value="suggestion">Suggestion</option>
                </select>

                <select 
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold focus:outline-none ${
                    urgency === "high" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div className="flex-1 flex justify-end items-center gap-2">
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                  title="Attach Image"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                
                <button 
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Post</span>
                      <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
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
          {(data ?? []).length === 0 && !isLoading && !error && (
            <div className="rounded-xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
              <p className="text-slate-500">No updates to show right now.</p>
            </div>
          )}

          {(data ?? []).map((post) => (
            <article
              key={post.id}
              className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition-all"
            >
              <div className="p-6 pb-4">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex gap-4">
                    <Link href={`/profile/${post.user_id}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-sm shadow-md transition-transform hover:scale-105">
                      {(post.profiles?.name || "K").charAt(0)}
                    </Link>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/profile/${post.user_id}`}
                          className="text-sm font-bold text-slate-900 transition-colors hover:text-blue-600"
                        >
                          {post.profiles?.name || "Anonymous Resident"}
                        </Link>
                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                          • <AlertCircle className="h-3 w-3" /> {post.purpose || "General"}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-400">
                        {post.created_at ? new Date(post.created_at).toLocaleString() : "Recently"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {post.status === "resolved" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-100">
                        Resolved
                      </span>
                    )}
                    <button className="text-slate-300 hover:text-slate-600">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mb-4 space-y-1">
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">
                    {post.title || "Naay Kawatan"}
                  </h2>
                  <p className="text-sm font-medium leading-relaxed text-slate-600">
                    {post.description || "Nawad-an mig manok diris among purok"}
                  </p>
                </div>

                {post.image && (
                  <div className="mb-4 mt-4 overflow-hidden rounded-xl ring-1 ring-slate-100">
                    <img 
                      src={getStorageUrl(post.image) || ""} 
                      alt={post.title || ""} 
                      className="w-full object-cover max-h-[450px]"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center border-t border-slate-100 px-6 py-3">
                <div className="grid w-full grid-cols-3">
                  <div className="relative flex justify-center">
                    <button 
                      onClick={() => setShowingEmojiFor(showingEmojiFor === post.id ? null : post.id)}
                      className={`flex items-center justify-center gap-2 text-xs font-bold transition-colors ${
                        post.my_reaction 
                          ? "text-rose-500" 
                          : "text-slate-500 hover:text-rose-500"
                      }`}
                    >
                      {post.my_reaction ? (
                        <span className="text-sm">{reactionEmojis[post.my_reaction]}</span>
                      ) : (
                        <Heart className="h-4 w-4" />
                      )}
                      <span>
                        {Object.values(post.reaction_counts || {}).reduce((a, b) => a + b, 0) || "Heart"}
                      </span>
                    </button>

                    {showingEmojiFor === post.id && (
                      <div className="absolute bottom-full mb-2 flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-xl ring-1 ring-black/5">
                        {Object.entries(reactionEmojis).map(([type, emoji]) => (
                          <button
                            key={type}
                            onClick={() => void handleReact(post.id, type)}
                            className="text-lg transition-transform hover:scale-125"
                            title={type}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <Link 
                    href={`/posts/${post.id}`}
                    className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-blue-500"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comment_count || ""} Comment</span>
                  </Link>
                  
                  <button 
                    onClick={() => handleShare(post.id)}
                    className="flex items-center justify-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-indigo-500"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
