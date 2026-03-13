"use client";

import { useState } from "react";
import { 
  Heart, 
  Reply, 
  Pencil, 
  Trash2, 
  MoreHorizontal, 
  CornerDownRight,
  Smile,
  X,
  Check,
  Loader2
} from "lucide-react";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

type Profile = {
  name: string;
};

type Comment = {
  id: number;
  post_id: number;
  user_id: string;
  parent_id: number | null;
  body: string;
  liked_by: string[];
  profiles: Profile | null;
  created_at: string;
};

interface CommentItemProps {
  comment: Comment;
  me: any;
  depth?: number;
  replies?: Comment[];
  onReply: (commentId: number, name: string) => void;
  onLike: (commentId: number) => void;
  onDelete: (commentId: number) => void;
  onUpdate: (commentId: number, body: string) => Promise<void>;
}

export default function CommentItem({
  comment,
  me,
  depth = 0,
  replies = [],
  onReply,
  onLike,
  onDelete,
  onUpdate,
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.body);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const isOwn = me?.profile?.id === comment.user_id;
  const isLiked = comment.liked_by?.includes(me?.profile?.id);

  const handleUpdate = async () => {
    if (!editText.trim() || editText === comment.body) {
      setIsEditing(false);
      return;
    }
    setIsUpdating(true);
    await onUpdate(comment.id, editText);
    setIsUpdating(false);
    setIsEditing(false);
  };

  const addEmoji = (emoji: string) => {
    setEditText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const emojis = ["👍", "❤️", "😂", "😮", "😢", "🔥", "💯", "🙏"];

  return (
    <div className={`group relative ${depth > 0 ? "mt-4" : "mt-6"}`}>
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-bold text-slate-600 shadow-sm ${depth > 0 ? "h-8 w-8 text-xs" : ""}`}>
            {comment.profiles?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          {depth > 0 && (
            <div className="absolute -left-6 top-4 h-px w-6 bg-slate-200" />
          )}
        </div>

        {/* Content Box */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className={`rounded-[24px] px-5 py-3 transition-colors ${isOwn ? "bg-blue-50/50 ring-1 ring-blue-100" : "bg-slate-50 ring-1 ring-slate-100"}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-black text-slate-900 truncate">
                  {comment.profiles?.name || "Anonymous Resident"}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                   {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {isEditing ? (
                <div className="relative mt-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full rounded-xl border-0 bg-white p-3 text-sm text-slate-900 shadow-inner ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                    rows={2}
                    autoFocus
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Smile size={18} />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 flex gap-1 rounded-full bg-white p-2 shadow-xl ring-1 ring-slate-200 z-10">
                        {emojis.map(e => (
                          <button key={e} onClick={() => addEmoji(e)} className="hover:scale-125 transition-transform p-1">{e}</button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="rounded-lg bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                      >
                        <X size={16} />
                      </button>
                      <button 
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className="rounded-lg bg-blue-600 p-1.5 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700"
                      >
                        {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                  {comment.body}
                </p>
              )}
            </div>

            {/* Actions Popover */}
            {isOwn && !isEditing && (
              <div className="absolute -right-2 top-0 translate-x-full opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex flex-col gap-1 rounded-xl bg-white p-1 shadow-lg ring-1 ring-slate-200">
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Pencil size={14} />
                  </button>
                  <button 
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="mt-2 flex items-center gap-6 px-4">
            <button 
              onClick={() => onLike(comment.id)}
              className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors ${
                isLiked ? "text-rose-600" : "text-slate-500 hover:text-rose-600"
              }`}
            >
              <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
              {comment.liked_by?.length > 0 && <span>{comment.liked_by.length}</span>}
              <span>{isLiked ? "Liked" : "Like"}</span>
            </button>
            
            <button 
              onClick={() => onReply(comment.id, comment.profiles?.name || "Resident")}
              className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors"
            >
              <Reply size={14} />
              <span>Reply</span>
            </button>

            <span className="text-[10px] font-semibold text-slate-300">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Nested Replies */}
          {replies.length > 0 && (
            <div className="relative mt-2 ml-2 border-l-2 border-slate-100 pl-2">
              {replies.map(reply => (
                <CommentItem 
                  key={reply.id}
                  comment={reply}
                  me={me}
                  depth={depth + 1}
                  onReply={onReply}
                  onLike={onLike}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={isDeleteDialogOpen}
        title="Delete Comment?"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
        onConfirm={() => {
          onDelete(comment.id);
          setIsDeleteDialogOpen(false);
        }}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </div>
  );
}
