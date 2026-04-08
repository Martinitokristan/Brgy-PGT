import { useState, useEffect } from "react";
import { X, Loader2, Send, ImageIcon, Video, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PostFormState, PostVariant } from "@/lib/types";

interface EditPost {
  id: number;
  title: string | null;
  description: string | null;
  purpose: string | null;
  urgency_level: string | null;
}

interface PostFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  userName: string;
  variant: PostVariant;
  formState: PostFormState;
  onMediaSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveMedia: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  editPost?: EditPost | null;
  onEditSubmit?: (postId: number, data: { title: string; description: string; purpose: string; urgency_level: string }) => Promise<void>;
}

export function PostForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  userName, 
  variant,
  formState,
  onMediaSelect,
  onRemoveMedia,
  fileInputRef,
  editPost,
  onEditSubmit
}: PostFormProps) {
  const isEditMode = !!editPost;

  // Local state for edit mode fields
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPurpose, setEditPurpose] = useState("general");
  const [editUrgency, setEditUrgency] = useState("low");
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    if (editPost) {
      setEditTitle(editPost.title || "");
      setEditDescription(editPost.description || "");
      setEditPurpose(editPost.purpose || "general");
      setEditUrgency(editPost.urgency_level || "low");
    }
  }, [editPost]);

  if (!isOpen) return null;

  const { title, description, purpose, urgency, selectedMedia, mediaPreview, mediaType, isSubmitting, uploadProgress } = formState;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Blur backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => { onClose(); onRemoveMedia(); }}
      />
      <div className="relative z-10 w-full max-w-lg mx-0 sm:mx-4 overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 h-[55vh] sm:h-auto flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white font-bold text-sm shadow">
              {userName?.charAt(0) || "U"}
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-900">{userName}</p>
              <p className="text-[11px] text-slate-400">
                {variant === "admin" ? "Admin Post" : "Public Post"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onClose(); onRemoveMedia(); }}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (isEditMode && editPost && onEditSubmit) {
            setEditSubmitting(true);
            try {
              await onEditSubmit(editPost.id, { title: editTitle, description: editDescription, purpose: editPurpose, urgency_level: editUrgency });
            } finally {
              setEditSubmitting(false);
            }
          } else {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("description", description);
            formData.append("purpose", purpose);
            formData.append("urgency_level", urgency);
            if (selectedMedia && mediaType) {
              formData.append(mediaType === "video" ? "video" : "image", selectedMedia);
            }
            onSubmit(formData);
          }
        }} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
            <Input
              type="text"
              required
              autoFocus
              value={isEditMode ? editTitle : title}
              onChange={(e) => isEditMode ? setEditTitle(e.target.value) : formState.setTitle?.(e.target.value)}
              placeholder="Give your post a title..."
              className="rounded-2xl border border-slate-900/20 bg-white px-4 py-3 text-[18px] font-bold text-slate-900 placeholder:text-slate-300 shadow-sm focus:border-slate-900/40 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
            <Textarea
              value={isEditMode ? editDescription : description}
              onChange={(e) => isEditMode ? setEditDescription(e.target.value) : formState.setDescription?.(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="resize-none rounded-2xl border border-slate-900/20 bg-white px-4 py-3 text-[15px] text-slate-700 shadow-sm placeholder:text-slate-300 leading-relaxed focus:border-slate-900/40 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />

            {!isEditMode && (
              <div className="pt-1">
                <input type="file" ref={fileInputRef} onChange={onMediaSelect} accept="image/*,video/*" className="hidden" />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-blue-700"
                >
                  <span className="inline-flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-emerald-600" />
                    <Video className="h-5 w-5 text-purple-600" />
                    Photo/Video
                  </span>
                </Button>
              </div>
            )}

            {mediaPreview && (
              <div className="relative overflow-hidden rounded-2xl ring-1 ring-slate-200">
                {mediaType === "video" ? (
                  <video
                    src={mediaPreview}
                    className="w-full object-cover max-h-56"
                    muted
                    controls
                    playsInline
                  />
                ) : (
                  <img src={mediaPreview} alt="Preview" className="w-full object-cover max-h-56" />
                )}
                <button
                  type="button"
                  onClick={onRemoveMedia}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-sm hover:bg-slate-900/80"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div
            className="shrink-0"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)",
            }}
          >
            {/* Tags row */}
            <div className="flex items-center gap-2 px-5 py-2 border-t border-slate-50">
              <Select value={isEditMode ? editPurpose : purpose} onValueChange={(value) => isEditMode ? setEditPurpose(value) : formState.setPurpose?.(value)}>
                <SelectTrigger className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 focus:outline-none border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="suggestion">Suggestion</SelectItem>
                </SelectContent>
              </Select>
              <Select value={isEditMode ? editUrgency : urgency} onValueChange={(value) => isEditMode ? setEditUrgency(value) : formState.setUrgency?.(value)}>
                <SelectTrigger className={`rounded-full px-3 py-1.5 text-xs font-bold focus:outline-none border-0 ${
                  urgency === "high" ? "bg-red-50 text-red-600" : 
                  urgency === "medium" ? "bg-amber-50 text-amber-700" : 
                  "bg-slate-100 text-slate-600"
                }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions row */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 pt-3 pb-5">
              <div />
              <Button
                type="submit"
                disabled={(isEditMode ? editSubmitting || !editTitle.trim() : isSubmitting || !title.trim())}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {(isEditMode ? editSubmitting : isSubmitting) ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /><span>{isEditMode ? "Saving…" : `${uploadProgress}%`}</span></>
                ) : (
                  isEditMode
                    ? <><span>Save Changes</span><Pencil className="h-3.5 w-3.5" /></>
                    : <><span>Post</span><Send className="h-3.5 w-3.5" /></>
                )}
              </Button>
            </div>
            {/* Upload progress bar */}
            {isSubmitting && (
              <div className="px-5 pb-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-1 text-center text-[11px] font-semibold text-slate-400">
                  Uploading… {uploadProgress}%
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
