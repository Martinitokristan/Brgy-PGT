import { X, Loader2, CheckCircle2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShareModalState } from "@/lib/types";

interface ShareModalProps extends ShareModalState {
  onClose: () => void;
  onShareToFeed: () => void;
}

export function ShareModal({ 
  sharePostId, 
  shareCopied, 
  isSharingToFeed, 
  shareSuccess,
  onClose,
  onShareToFeed
}: ShareModalProps) {
  if (!sharePostId) return null;

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/posts/${sharePostId}`;

  const copyShareLink = () => {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      // This would be handled by parent component
      console.log("Link copied");
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-[15px] font-bold text-slate-900">Share Post</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {/* Copy Link */}
          <button
            onClick={copyShareLink}
            className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 text-left transition-colors hover:bg-slate-100"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <span className="text-[14px] font-semibold text-slate-700">
              {shareCopied ? "Link copied!" : "Copy Link"}
            </span>
          </button>
          
          {/* Share on Feed */}
          <button
            onClick={onShareToFeed}
            disabled={isSharingToFeed || shareSuccess}
            className="flex w-full items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3.5 text-left transition-colors hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
              {isSharingToFeed ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : shareSuccess ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Share2 className="h-5 w-5" />
              )}
            </div>
            <span className="text-[14px] font-semibold text-blue-700">
              {isSharingToFeed ? "Sharing..." : shareSuccess ? "Shared to Feed!" : "Share on Feed"}
            </span>
          </button>
          {/* Share on Facebook */}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank" rel="noopener noreferrer"
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-2xl bg-[#1877F2]/10 px-4 py-3.5 text-left transition-colors hover:bg-[#1877F2]/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <span className="text-[14px] font-semibold text-[#1877F2]">Share on Facebook</span>
          </a>
          {/* Share on Messenger */}
          <a
            href={`fb-messenger://share?link=${encodeURIComponent(shareUrl)}`}
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-2xl bg-[#0084FF]/10 px-4 py-3.5 text-left transition-colors hover:bg-[#0084FF]/20"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0084FF] to-[#A334FA] text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.683V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
              </svg>
            </div>
            <span className="text-[14px] font-semibold text-[#0084FF]">Send via Messenger</span>
          </a>
          {/* Share on TikTok */}
          <a
            href={`https://www.tiktok.com/share?url=${encodeURIComponent(shareUrl)}`}
            target="_blank" rel="noopener noreferrer"
            onClick={onClose}
            className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 text-left transition-colors hover:bg-slate-100"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.53V6.76a4.85 4.85 0 01-1.02-.07z"/>
              </svg>
            </div>
            <span className="text-[14px] font-semibold text-slate-700">Share on TikTok</span>
          </a>
        </div>
      </div>
    </div>
  );
}
