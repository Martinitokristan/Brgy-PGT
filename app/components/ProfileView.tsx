"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { supabase } from "@/lib/supabaseClient";
import { 
  MapPin, 
  Mail, 
  Phone, 
  UserPlus, 
  UserCheck, 
  MessageCircle,
  ThumbsUp,
  Send,
  Siren,
  Trash2,
  Ban,
  CheckCircle,
  X,
  MoreHorizontal,
  Camera,
  UserMinus,
  BellRing,
  BellOff,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";
import CommentDrawer from "@/app/components/ui/CommentDrawer";
import { useT } from "@/lib/useT";

type Post = {
  id: number;
  title: string | null;
  description: string | null;
  purpose: string | null;
  urgency_level: string | null;
  status: string | null;
  created_at: string;
  admin_response: string | null;
  comment_count: number;
  reaction_counts: Record<string, number>;
  my_reaction: string | null;
};

type ProfileData = {
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    avatar: string | null;
    cover_photo: string | null;
    barangays: { name: string } | null;
    sex: string | null;
    birth_date: string | null;
    purok_address: string | null;
  };
  stats: {
    posts_count: number;
    followers_count: number;
    following_count: number;
    joined_date: string;
  };
  posts: Post[];
  is_following: boolean;
};

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function getAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

function getCoverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/profile-covers/${path}`;
}

const ShareIcon = ({ className = "h-5 w-5" }: { className?: string }) => (

  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
     <path d="M14 9V5L22 12L14 19V14.9C8.5 14.9 4.7 16.6 2 20.4C3.1 14.9 6.4 9.5 14 9Z" />
  </svg>
);

function formatPhoneForDisplay(raw: string | null | undefined) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("63") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }
  if (digits.startsWith("9") && digits.length === 10) {
    return `+63${digits}`;
  }
  return raw;
}

export default function ProfileView({ userId }: { userId: string }) {
  const { data: profile, mutate, isLoading: profileLoading } = useSWR<ProfileData>(userId ? `/api/profile/${userId}` : null, fetcher);
  const { data: me } = useSWR("/api/profile/me", fetcher);
  const { t } = useT();
  
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("profile-posts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `user_id=eq.${profile?.user?.id}`
        },
        () => {
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, profile?.user?.id, mutate]);

  useEffect(() => {
    const channel = supabase
      .channel("profile-comment-counts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
        },
        () => {
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mutate]);
  
  const [activeTab, setActiveTab] = useState<"posts" | "about">("posts");
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showFollowMenu, setShowFollowMenu] = useState(false);
  
  const [menuOpenPostId, setMenuOpenPostId] = useState<number | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdatePost, setStatusUpdatePost] = useState<Post | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [newStatus, setNewStatus] = useState("pending");
  const [uploadingPhoto, setUploadingPhoto] = useState<"avatar" | "cover" | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  function handlePhotoUpload(file: File, type: "avatar" | "cover_photo") {
    const which = type === "avatar" ? "avatar" : "cover";
    setUploadingPhoto(which);
    setUploadProgress(0);

    const fd = new FormData();
    fd.append(type, file);

    const xhr = new XMLHttpRequest();
    xhr.open("PATCH", "/api/profile/me");
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
    };
    xhr.onload = () => {
      setUploadProgress(100);
      void mutate();
      setTimeout(() => { setUploadingPhoto(null); setUploadProgress(0); }, 600);
    };
    xhr.onerror = () => { setUploadingPhoto(null); setUploadProgress(0); };
    xhr.send(fd);
  }

  if (profileLoading) return (
     <div className="flex min-h-[400px] items-center justify-center bg-transparent">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
     </div>
  );

  if (!profile) return null;

  const { user, stats, posts, is_following } = profile;
  const isOwn = me?.id === user.id;
  const isAdminView = me?.role === "admin";

  const handleFollow = async () => {
    if (isOwn) return;
    await fetch(`/api/profile/${userId}/follow`, { method: "POST" });
    mutate();
  };

  const handleShare = () => {
    const url = window.location.origin + `/profile/${user.id}`;
    if (navigator.share) {
      navigator.share({ title: user.name, url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Profile link copied!");
    }
  };

  const handleSendSms = async () => {
    if (!user.phone) return alert("User has no phone number verified.");
    const message = prompt(`Enter SMS message for ${user.name}:`);
    if (!message) return;

    setIsSendingSms(true);
    try {
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: user.phone, message }),
      });
      if (res.ok) alert("SMS sent successfully!");
      else alert("Failed to send SMS.");
    } finally {
      setIsSendingSms(false);
    }
  };

  const openComments = (postId: number) => {
    setSelectedPostId(postId);
    setIsDrawerOpen(true);
  };

  const handleReact = async (postId: number, type: string) => {
    try {
      await fetch(`/api/posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      mutate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSuspendUser = async () => {
    if (!isAdminView || !user) return;
    const confirmSuspend = window.confirm(`Are you sure you want to suspend ${user.name}? This will revoke their access.`);
    if (!confirmSuspend) return;

    setIsSuspending(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, is_approved: false }),
      });
      if (res.ok) alert("User has been suspended.");
      else alert("Failed to suspend user.");
    } finally {
      setIsSuspending(false);
    }
  };

  const handleRemovePost = async (postId: number) => {
    if (!isAdminView && !isOwn) return;
    const confirmDelete = window.confirm("Are you sure you want to remove this post?");
    if (!confirmDelete) return;

    setIsDeletingPost(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) mutate();
      else alert("Failed to delete post.");
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusUpdatePost) return;

    try {
      const res = await fetch(`/api/posts/${statusUpdatePost.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, admin_response: adminResponse }),
      });
      if (res.ok) {
        setShowStatusModal(false);
        setAdminResponse("");
        mutate();
      } else {
        alert("Failed to update status.");
      }
    } catch (error) {
       console.error(error);
    }
  };

  return (
    <div className="relative flex flex-1 flex-col bg-white dark:bg-slate-950 min-h-screen overflow-x-hidden">
      {/* Cover area — extends ~half over the profile avatar */}
      <div className="relative h-72 w-full overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 sm:h-80">
        {getCoverUrl(user.cover_photo) && (
          <img src={getCoverUrl(user.cover_photo)!} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      {/* Change Cover button — top-right of cover (below transparent header buttons) */}
      {isOwn && (
        <label className="absolute right-4 top-16 z-30 flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow-lg backdrop-blur-sm hover:bg-white transition-colors">
          {uploadingPhoto === "cover" ? (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              {uploadProgress}%
            </span>
          ) : user.cover_photo ? (
            <>
              <Camera className="h-3.5 w-3.5" />
              {t("change_cover")}
            </>
          ) : (
            <>
              <ImageIcon className="h-3.5 w-3.5" />
              {t("add_cover")}
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePhotoUpload(f, "cover_photo");
            }}
          />
        </label>
      )}

      {/* Profile content overlaps ~half into the cover (avatar is centered at the cover/content boundary) */}
      <div className="relative -mt-24 w-full bg-white dark:bg-slate-950 pb-12 pt-0 sm:-mt-28">
        <div className="mx-auto w-full max-w-2xl px-4">
          <div className="relative mx-auto mb-4 flex h-36 w-36 items-center justify-center sm:h-40 sm:w-40">
             <div className="relative h-full w-full overflow-hidden rounded-full border-[5px] border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 shadow-lg">
               {getAvatarUrl(user.avatar) ? (
                 <img src={getAvatarUrl(user.avatar)!} alt={user.name} className="h-full w-full object-cover" />
               ) : (
                 <div className="flex h-full w-full items-center justify-center bg-slate-100 text-5xl font-black text-slate-300">
                   {user.name.charAt(0)}
                 </div>
               )}
             </div>
             {isOwn && (
               <label className="absolute bottom-1 right-1 flex h-9 w-9 cursor-pointer flex-col items-center justify-center rounded-full bg-white shadow-lg hover:bg-slate-50 transition-colors overflow-hidden">
                 {uploadingPhoto === "avatar" ? (
                   <>
                     <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                     <span className="text-[7px] font-bold text-blue-600 mt-0.5">{uploadProgress}%</span>
                   </>
                 ) : (
                   <Camera className="h-4 w-4 text-slate-600" />
                 )}
                 <input
                   type="file"
                   className="hidden"
                   accept="image/*"
                   onChange={(e) => {
                     const f = e.target.files?.[0];
                     if (f) handlePhotoUpload(f, "avatar");
                   }}
                 />
               </label>
             )}
          </div>

          <div className="flex flex-col items-center space-y-2 text-center">
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900 dark:text-white">
              {user.name}
            </h1>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              {user.role}
            </span>

            <div className="flex items-center justify-center gap-1 py-1 text-[13px] font-semibold text-slate-500 dark:text-slate-400">
              <span><span className="font-bold text-slate-900 dark:text-white">{stats.followers_count}</span> {t("followers")}</span>
              <span className="text-slate-300 dark:text-slate-600 px-0.5">•</span>
              <span><span className="font-bold text-slate-900 dark:text-white">{stats.following_count}</span> {t("following")}</span>
              <span className="text-slate-300 dark:text-slate-600 px-0.5">•</span>
              <span><span className="font-bold text-slate-900 dark:text-white">{stats.posts_count}</span> {t("posts")}</span>
            </div>

            <div className="flex flex-col items-center gap-1.5 pt-2 text-[13px] font-medium text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{user.barangays?.name || "Barangay Pagatpatan"}</span>
              </div>
              {user.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[12px]">{user.email}</span>
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[13px] font-semibold text-slate-600">{formatPhoneForDisplay(user.phone)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 pt-6">
              {me && !isOwn && (
                <div className="relative">
                  {!is_following ? (
                    <button
                      onClick={handleFollow}
                      className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-[13px] font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95"
                    >
                      <UserPlus size={16} />
                      <span>{t("follow")}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setShowFollowMenu((v) => !v)}
                        className="flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-[13px] font-bold text-slate-700 transition-all hover:bg-slate-200 active:scale-95"
                      >
                        <UserCheck size={16} className="text-blue-600" />
                        <span>{t("following_btn")}</span>
                        <ChevronDown size={14} className={`transition-transform ${showFollowMenu ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  )}

                  {showFollowMenu && is_following && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowFollowMenu(false)} />
                      <div className="absolute left-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in slide-in-from-top-1 duration-150">
                        <button
                          onClick={() => { handleFollow(); setShowFollowMenu(false); }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <UserMinus size={16} /> {t("unfollow")}
                        </button>
                        <button
                          onClick={() => setShowFollowMenu(false)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <BellOff size={16} /> {t("snooze_30")}
                        </button>
                        <button
                          onClick={() => setShowFollowMenu(false)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <BellRing size={16} /> {t("bell_priority")}
                          <span className="ml-auto text-[10px] font-bold uppercase text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">{t("notify_first")}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {me && isAdminView && !isOwn && (
                <button 
                  onClick={handleSendSms}
                  disabled={isSendingSms}
                  className="flex items-center gap-2 rounded-xl bg-[#007AB8] px-5 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-[#006699] active:scale-95 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSendingSms ? t("sending") : t("send_sms")}</span>
                </button>
              )}

              <button 
                onClick={handleShare}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-all hover:bg-slate-100 active:scale-90"
              >
                <ShareIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-0 sm:px-4 pt-2 pb-8">
          <div className="flex items-center justify-around border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
            <button 
              onClick={() => setActiveTab("posts")}
              className={`relative flex-1 py-4 text-[13px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === "posts" ? "text-blue-600" : "text-slate-500 hover:text-slate-600"
              }`}
            >
              {t("posts_tab")}
              {activeTab === "posts" && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-blue-600" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab("about")}
              className={`relative flex-1 py-4 text-[13px] font-bold uppercase tracking-wider transition-colors ${
                activeTab === "about" ? "text-blue-600" : "text-slate-500 hover:text-slate-600"
              }`}
            >
              {t("about_tab")}
              {activeTab === "about" && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full bg-blue-600" />
              )}
            </button>
          </div>

          <div className="min-h-[400px] pt-6">
            {activeTab === "posts" ? (
              <div className="grid gap-6 py-4">
                {posts.map((post) => (
                  <div 
                    key={post.id} 
                    className="group relative flex cursor-pointer flex-col rounded-none border-x-0 border-y border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/50 sm:rounded-[20px] sm:border sm:p-5"
                    onClick={() => openComments(post.id)}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4267B2] font-bold text-white text-xl shadow-sm">
                            {user.name.charAt(0)}
                         </div>
                         <div className="flex flex-col leading-tight">
                            <span className="text-[16px] font-bold text-[#385898] hover:underline cursor-pointer">{user.name}</span>
                            <div className="mt-0.5 flex items-center gap-1.5 text-slate-400">
                               <Siren size={14} className="opacity-70" />
                               <span className="text-[13px] font-medium">• {post.purpose || "General"}</span>
                            </div>
                            <span className="mt-0.5 text-[12px] font-medium text-slate-400">
                               {new Date(post.created_at).toLocaleString()}
                            </span>
                         </div>
                      </div>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setMenuOpenPostId(menuOpenPostId === post.id ? null : post.id)}
                          className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                        
                        {menuOpenPostId === post.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
                             {isAdminView && (
                               <>
                                 <button 
                                   onClick={() => {
                                      setStatusUpdatePost(post);
                                      setNewStatus(post.status || "pending");
                                      setShowStatusModal(true);
                                      setMenuOpenPostId(null);
                                   }}
                                   className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-blue-600 hover:bg-blue-50"
                                 >
                                   <CheckCircle size={16} /> Admin Response
                                 </button>
                                 <button 
                                   onClick={() => {
                                     handleSuspendUser();
                                     setMenuOpenPostId(null);
                                   }}
                                   className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-amber-600 hover:bg-amber-50"
                                 >
                                   <Ban size={16} /> Suspend User
                                 </button>
                               </>
                             )}
                             {(isAdminView || isOwn) && (
                               <button 
                                 onClick={() => {
                                   handleRemovePost(post.id);
                                   setMenuOpenPostId(null);
                                 }}
                                 className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                               >
                                 <Trash2 size={16} /> Remove Post
                               </button>
                             )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 px-1">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {post.urgency_level && (
                          <div className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ring-1 ${
                            post.urgency_level === 'high' 
                              ? 'bg-red-50 text-red-600 ring-red-100' 
                              : post.urgency_level === 'medium'
                                ? 'bg-amber-50 text-amber-600 ring-amber-100'
                                : 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                          }`}>
                            {post.urgency_level}
                          </div>
                        )}
                        {post.status && (
                          <div className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 ring-1 ring-slate-100">
                             {post.status}
                          </div>
                        )}
                      </div>
                      <h3 className="text-[17px] font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">{post.title}</h3>
                      <p className="line-clamp-3 text-[14px] font-medium leading-relaxed text-slate-500/80 dark:text-slate-400">
                        {post.description}
                      </p>
                      
                      {post.admin_response && (
                        <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 ring-1 ring-slate-100 dark:ring-slate-700">
                          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{t("admin_response")}</p>
                          <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 italic">"{post.admin_response}"</p>
                        </div>
                      )}
                    </div>

                    {/* Interaction Section */}
                    <div className="mt-6" onClick={(e) => e.stopPropagation()}>
                      {/* Count Row */}
                      <div className="flex justify-end border-b border-slate-50 dark:border-slate-700 pb-2 px-1">
                        {post.comment_count > 0 && (
                          <button 
                            onClick={() => openComments(post.id)}
                            className="text-[12px] font-medium text-slate-500 hover:underline"
                          >
                            {post.comment_count} {t("comments")}
                          </button>
                        )}
                      </div>

                      {/* Buttons Row */}
                      <div className="grid grid-cols-3 gap-1 pt-1 sm:gap-2">
                        <button 
                          onClick={() => handleReact(post.id, "like")}
                          className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800 sm:gap-2 sm:text-[14px] ${
                            post.my_reaction === "like" ? "text-blue-600" : "text-[#65676B] dark:text-slate-400"
                          }`}
                        >
                          <ThumbsUp size={18} className={`shrink-0 ${post.my_reaction === "like" ? "fill-current" : ""}`} />
                          <span className="truncate">{t("like")}</span>
                        </button>
                        <button 
                          onClick={() => openComments(post.id)}
                          className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold text-[#65676B] dark:text-slate-400 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 sm:gap-2 sm:text-[14px]"
                        >
                          <MessageCircle size={18} className="shrink-0" /> 
                          <span className="truncate">{t("comment")}</span>
                        </button>
                        <button 
                          onClick={() => {
                            const url = `${window.location.origin}/posts/${post.id}`;
                            if (navigator.share) {
                              navigator.share({ title: post.title || 'Post', url });
                            } else {
                              navigator.clipboard.writeText(url);
                              alert("Link copied!");
                            }
                          }}
                          className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-2 text-[13px] font-bold text-[#65676B] dark:text-slate-400 transition-all hover:bg-slate-50 dark:hover:bg-slate-800 sm:gap-2 sm:text-[14px]"
                        >
                          <ShareIcon className="h-[18px] w-[18px] shrink-0" /> 
                          <span className="truncate">{t("share")}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-20 text-center">
                     <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        <MessageCircle size={24} />
                     </div>
                     <h4 className="text-lg font-black text-slate-900 dark:text-white">{t("no_posts_title")}</h4>
                     <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">{user.name} {t("no_posts_user")}</p>
                   </div>
                )}
              </div>
            ) : (
              <div className="rounded-[32px] bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-100 dark:border-slate-700 sm:p-8">
                <div className="space-y-6">
                   <div className="flex items-start gap-4">
                      <div>
                         <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{t("purok_address")}</p>
                         <p className="text-sm font-bold text-slate-900 dark:text-white">{user.purok_address || "None specified"}</p>
                      </div>
                   </div>
                   <div className="flex items-start gap-4">
                      <div>
                         <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{t("barangay")}</p>
                         <p className="text-sm font-bold text-slate-900 dark:text-white">{user.barangays?.name || "Barangay Pagatpatan"}</p>
                      </div>
                   </div>
                   <div className="flex items-start gap-4">
                      <div>
                         <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{t("member_since")}</p>
                         <p className="text-sm font-bold text-slate-900 dark:text-white">Jan 2025</p>
                      </div>
                   </div>
                   <div className="flex items-start gap-4">
                      <div className="w-full">
                         <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{t("profile_link")}</p>
                         <div className="flex items-center gap-2">
                           <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-500 truncate border border-slate-100 dark:border-slate-700">
                             brgypgt.com/profile/{user.id.substring(0,8)}...
                           </div>
                           <button 
                             onClick={() => {
                               navigator.clipboard.writeText(`https://brgypgt.com/profile/${user.id}`);
                               alert("Link copied!");
                             }}
                             className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors"
                           >
                             {t("copy")}
                           </button>
                         </div>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <CommentDrawer 
        postId={selectedPostId} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        me={me}
      />

      {showStatusModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowStatusModal(false)} />
           <div className="relative w-full max-w-lg rounded-[32px] bg-white p-8 shadow-2xl animate-in zoom-in duration-200">
              <div className="mb-6 flex items-center justify-between">
                 <h3 className="text-xl font-black text-slate-900">Admin Response</h3>
                 <button onClick={() => setShowStatusModal(false)} className="rounded-full p-2 hover:bg-slate-100 text-slate-400">
                    <X size={20} />
                 </button>
              </div>

              <form onSubmit={handleUpdateStatus} className="space-y-6">
                 <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-400">Status Update</label>
                    <div className="grid grid-cols-3 gap-3">
                       {['pending', 'in_progress', 'resolved'].map((s) => (
                         <button
                           key={s}
                           type="button"
                           onClick={() => setNewStatus(s)}
                           className={`rounded-2xl py-3 text-xs font-black uppercase tracking-widest transition-all ${
                             newStatus === s 
                               ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                               : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                           }`}
                         >
                           {s.replace('_', ' ')}
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
                      className="min-h-[120px] w-full rounded-2xl border-0 bg-slate-50 p-4 text-sm font-medium text-slate-900 shadow-inner ring-1 ring-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600/20"
                    />
                 </div>

                 <div className="flex justify-end gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowStatusModal(false)}
                      className="rounded-2xl px-6 py-3 text-sm font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="rounded-2xl bg-blue-600 px-8 py-3 text-sm font-black text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95"
                    >
                       Update Post
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
