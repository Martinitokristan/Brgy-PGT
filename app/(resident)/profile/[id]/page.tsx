"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { supabase } from "@/lib/supabaseClient";
import { 
  MapPin, 
  Mail, 
  Phone, 
  UserPlus, 
  UserCheck, 
  MessageCircle,
  Heart as HeartIcon,
  Share,
  Send,
  ChevronRight,
  Siren,
  Trash2,
  Ban,
  CheckCircle,
  X,
  MoreHorizontal,
  LayoutGrid,
  Info,
  Calendar,
  Clock,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import CommentDrawer from "@/app/components/ui/CommentDrawer";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

type Post = {
  id: number;
  title: string | null;
  description: string | null;
  purpose: string | null;
  urgency_level: string | null;
  status: string | null;
  created_at: string;
  admin_response: string | null;
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

// Custom Filled Share Icon to match Old UI
const ShareIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
     <path d="M14 9V5L22 12L14 19V14.9C8.5 14.9 4.7 16.6 2 20.4C3.1 14.9 6.4 9.5 14 9Z" />
  </svg>
);

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data: profile, mutate, isLoading: profileLoading } = useSWR<ProfileData>(id ? `/api/profile/${id}` : null, fetcher);
  const { data: me } = useSWR("/api/profile/me", fetcher);
  
  // Real-time subscription
  useEffect(() => {
    if (!id) return;

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
          mutate(); // Re-fetch entire profile data on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, profile?.user?.id, mutate]);
  
  const [activeTab, setActiveTab] = useState<"posts" | "about">("posts");
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Admin Action States
  const [menuOpenPostId, setMenuOpenPostId] = useState<number | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdatePost, setStatusUpdatePost] = useState<Post | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [newStatus, setNewStatus] = useState("pending");

  if (profileLoading) return (
     <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
     </div>
  );

  if (!profile) return null;

  const { user, stats, posts, is_following } = profile;
  const isOwn = me?.profile?.id === user.id;
  const isAdminView = me?.profile?.role === "admin";

  const handleFollow = async () => {
    if (isOwn) return;
    await fetch(`/api/profile/${id}/follow`, { method: "POST" });
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
    <div className="flex flex-1 flex-col bg-slate-50 min-h-screen overflow-x-hidden">
      {/* Header / Cover Section - Full Width */}
      <div className="relative h-64 w-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 sm:h-80">
        {user.cover_photo && (
          <img 
            src={user.cover_photo} 
            alt="" 
            className="h-full w-full object-cover" 
          />
        )}
      </div>

      {/* Profile Info Section - Full Width Flat White (NO CARD BORDERS) */}
      <div className="relative -mt-20 w-full bg-white pb-12 pt-0 sm:-mt-24">
        <div className="mx-auto w-full max-w-2xl px-4">
          {/* Avatar Area */}
          <div className="relative mx-auto mb-6 flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
             <div className="relative h-full w-full overflow-hidden rounded-full border-[6px] border-white bg-slate-100 shadow-lg">
               {user.avatar ? (
                 <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
               ) : (
                 <div className="flex h-full w-full items-center justify-center bg-slate-100 text-6xl font-black text-slate-300">
                   {user.name.charAt(0)}
                 </div>
               )}
             </div>
          </div>

          {/* User Basic Info */}
          <div className="flex flex-col items-center space-y-4 text-center">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {user.name}
            </h1>
            <div className="flex items-center justify-center">
              <span className="rounded-full bg-slate-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                {user.role}
              </span>
            </div>

            {/* Stats Summary - Inline with dots */}
            <div className="flex items-center justify-center gap-1.5 py-2 text-[13px] font-bold text-slate-500">
              <span><span className="text-slate-900">{stats.followers_count}</span> followers</span>
              <span className="px-1 text-slate-300">•</span>
              <span><span className="text-slate-900">{stats.following_count}</span> following</span>
              <span className="px-1 text-slate-300">•</span>
              <span><span className="text-slate-900">{stats.posts_count}</span> posts</span>
            </div>

            {/* Detailed Contact List */}
            <div className="flex flex-col items-center gap-2 pt-2 text-[13px] font-medium text-slate-600">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{user.barangays?.name || "Barangay Pagatpatan"}</span>
                </div>
                {user.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{user.email}</span>
                  </div>
                )}
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500 font-bold">+63{user.phone}</span>
                </div>
              )}
            </div>

            {/* Action Buttons - Perfect Row */}
            <div className="flex items-center justify-center gap-2 pt-8">
              {me && !isOwn && (
                <button 
                  onClick={handleFollow}
                  className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-[13px] font-black transition-all active:scale-95 ${
                    is_following 
                      ? "bg-slate-100 text-slate-700" 
                      : "bg-[#0095f6] text-white hover:bg-[#1877f2]"
                  }`}
                >
                  {is_following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  <span>{is_following ? "Following" : "Follow"}</span>
                </button>
              )}

              {me && isAdminView && !isOwn && (
                <button 
                  onClick={handleSendSms}
                  disabled={isSendingSms}
                  className="flex items-center gap-2 rounded-lg bg-[#007AB8] px-6 py-2.5 text-[13px] font-black text-white transition-all hover:bg-[#006699] active:scale-95 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSendingSms ? "Sending..." : "Send SMS"}</span>
                </button>
              )}

              <button 
                onClick={handleShare}
                className="flex h-11 w-11 items-center justify-center text-slate-900 transition-all hover:scale-110 active:scale-90"
              >
                <ShareIcon className="h-7 w-7" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Content Section - Centered Post Container */}
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
          {/* Custom Tab Switcher */}
          <div className="flex items-center justify-center gap-2 border-b border-slate-200 pb-px">
            <button 
              onClick={() => setActiveTab("posts")}
              className={`relative px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-colors ${
                activeTab === "posts" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Posts
              {activeTab === "posts" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-blue-600" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab("about")}
              className={`relative px-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-colors ${
                activeTab === "about" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              About
              {activeTab === "about" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 rounded-full bg-blue-600" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === "posts" ? (
              <div className="grid gap-6">
                {posts.map((post) => (
                  <div 
                    key={post.id} 
                    className="group relative flex cursor-pointer flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md sm:p-6"
                    onClick={() => openComments(post.id)}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4267B2] font-bold text-white text-xl shadow-sm">
                            {user.name.charAt(0)}
                         </div>
                         <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 flex-wrap">
                               <span className="text-[15px] font-bold text-[#385898] hover:underline">{user.name}</span>
                               <div className="flex items-center gap-1 text-slate-400">
                                  <Siren size={14} className="opacity-70" />
                                  <span className="text-[14px] font-medium">• {post.purpose || "General"}</span>
                               </div>
                            </div>
                            <span className="text-[13px] font-medium text-slate-400">
                               {new Date(post.created_at).toLocaleString()}
                            </span>
                         </div>
                      </div>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => setMenuOpenPostId(menuOpenPostId === post.id ? null : post.id)}
                          className="rounded-full p-2 hover:bg-red-50 text-red-500 transition-colors"
                        >
                          <MoreHorizontal size={20} />
                        </button>
                        
                        {/* Admin/Owner Menu */}
                        {menuOpenPostId === post.id && (
                          <div className="absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
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
                      <div className="flex flex-wrap gap-2">
                        {post.status === "resolved" && (
                          <div className="inline-flex items-center rounded-full bg-[#e7f3ff] px-3 py-1 text-[12px] font-bold text-[#1877f2]">
                             Resolved
                          </div>
                        )}
                        {post.status === "in_progress" && (
                          <div className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[12px] font-bold text-amber-600 ring-1 ring-amber-100">
                             In Progress
                          </div>
                        )}
                        {post.status === "pending" && (
                          <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[12px] font-bold text-slate-500">
                             Pending
                          </div>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">{post.title}</h3>
                      <p className="line-clamp-3 text-[15px] font-medium leading-relaxed text-slate-500">
                        {post.description}
                      </p>
                      
                      {post.admin_response && (
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Response</p>
                          <p className="text-[13px] font-medium text-slate-600 italic">"{post.admin_response}"</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex items-center justify-around border-t border-slate-100 pt-4" onClick={(e) => e.stopPropagation()}>
                       <button className="flex items-center gap-2.5 text-[15px] font-bold text-[#e41e3f] transition-all hover:scale-105">
                          <HeartIcon size={24} className="fill-[#e41e3f]" /> <span>Heart</span>
                       </button>
                       <button 
                         onClick={() => openComments(post.id)}
                         className="flex items-center gap-2.5 text-[15px] font-bold text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-md transition-all"
                       >
                          <MessageCircle size={22} /> <span>Comment</span>
                       </button>
                       <button 
                         onClick={handleShare}
                         className="flex items-center gap-2.5 text-[15px] font-bold text-slate-500 hover:bg-slate-50 px-3 py-1.5 rounded-md transition-all"
                       >
                          <ShareIcon className="h-6 w-6" /> <span>Share</span>
                       </button>
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                   <div className="flex flex-col items-center justify-center py-20 text-center">
                     <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-300">
                        <LayoutGrid size={32} />
                     </div>
                     <h4 className="text-lg font-black text-slate-900">No posts yet</h4>
                     <p className="text-sm font-bold text-slate-400">When this user shares something, it will appear here.</p>
                   </div>
                )}
              </div>
            ) : (
              <div className="rounded-[40px] bg-white p-8 shadow-xl shadow-slate-200/40 ring-1 ring-slate-100 sm:p-12">
                <h3 className="mb-10 text-xs font-black uppercase tracking-[0.2em] text-blue-600">Personal Information</h3>
                <div className="grid gap-10 sm:grid-cols-2">
                   <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                         <Calendar size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Birth Date</p>
                         <p className="text-base font-black text-slate-900">{user.birth_date ? new Date(user.birth_date).toLocaleDateString() : "Not specified"}</p>
                      </div>
                   </div>
                   <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                         <Clock size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sex / Gender</p>
                         <p className="text-base font-black text-slate-900 capitalize">{user.sex || "Not specified"}</p>
                      </div>
                   </div>
                   <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                         <MapPin size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Address</p>
                         <p className="text-base font-black text-slate-900">{user.purok_address || "Barangay Pagatpatan"}</p>
                      </div>
                   </div>
                   <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                         <Info size={20} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Member Status</p>
                         <p className="text-base font-black text-slate-900">Verified Citizen</p>
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

      {/* Admin Status Modal */}
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
