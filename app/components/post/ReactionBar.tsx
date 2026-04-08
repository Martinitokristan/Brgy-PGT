import { useRef, useState } from "react";
import { ThumbsUp, MessageCircle } from "lucide-react";
import { REACTION_EMOJIS, Post, PostVariant } from "@/lib/types";

const ShareIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M14 9V5L22 12L14 19V14.9C8.5 14.9 4.7 16.6 2 20.4C3.1 14.9 6.4 9.5 14 9Z" />
  </svg>
);

interface ReactionBarProps {
  post: Post;
  onReact: (postId: number, type: string) => void;
  onComment: (postId: number) => void;
  onShare: (postId: number) => void;
  isVerified: boolean;
  variant: PostVariant;
  showEmojiPicker?: boolean;
  onEmojiPickerToggle?: (postId: number | null) => void;
}

export function ReactionBar({ 
  post, 
  onReact, 
  onComment, 
  onShare, 
  isVerified,
  variant,
  showEmojiPicker,
  onEmojiPickerToggle
}: ReactionBarProps) {
  const canInteract = isVerified || variant === "admin";

  // Track which emoji is currently highlighted during drag
  const [draggedOver, setDraggedOver] = useState<string | null>(null);

  // Pointer/drag refs (Facebook style: tap = Like, hold = open picker, drag = choose)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const isPointerDown = useRef(false);
  const didMove = useRef(false);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const capturedPointerId = useRef<number | null>(null);

  const openPicker = () => {
    if (variant === "resident") onEmojiPickerToggle?.(post.id);
  };
  const closePicker = () => {
    onEmojiPickerToggle?.(null);
    setDraggedOver(null);
  };

  // Find which emoji is at a given screen coordinate
  const getReactionAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    const btn = el?.closest("[data-reaction]") as HTMLElement | null;
    return btn?.dataset.reaction ?? null;
  };

  // ── Pointer Events (works on both mouse & touch, respects touch-action: none) ──

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (variant !== "resident") return;
    // Prevent iOS "touch callout" / text selection on press-and-hold.
    e.preventDefault();

    isPointerDown.current = true;
    isLongPress.current = false;
    didMove.current = false;
    startPoint.current = { x: e.clientX, y: e.clientY };

    // Store refs before setTimeout (currentTarget becomes null after handler returns)
    const el = e.currentTarget;
    const pointerId = e.pointerId;
    longPressTimer.current = setTimeout(() => {
      if (!isPointerDown.current) return;
      isLongPress.current = true;
      openPicker();
      // Capture so we keep receiving pointermove even outside the button
      try { el.setPointerCapture(pointerId); } catch {}
      capturedPointerId.current = pointerId;
    }, 350);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
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

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    const wasLongPress = isLongPress.current;
    isPointerDown.current = false;

    if (wasLongPress) {
      // Long-press released: select the emoji under the pointer (if any)
      const reaction = getReactionAt(e.clientX, e.clientY);
      if (reaction) {
        onReact(post.id, reaction);
        closePicker();
      } else {
        closePicker();
      }
      isLongPress.current = false;
      capturedPointerId.current = null;
    } else {
      // Short tap: behave like Facebook (toggle Like)
      onReact(post.id, "like");
    }

    didMove.current = false;
    startPoint.current = null;
  };

  const handlePointerCancel = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    isPointerDown.current = false;
    isLongPress.current = false;
    didMove.current = false;
    startPoint.current = null;
    capturedPointerId.current = null;
    setDraggedOver(null);
  };

  // Desktop mouse-hover: open after 600 ms of hovering the Like button
  const handleMouseEnter = () => {
    if (variant !== "resident") return;
    hoverTimer.current = setTimeout(openPicker, 600);
  };
  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };

  return (
    <>
      {/* Count Row */}
      <div className="flex justify-end border-b border-slate-50 dark:border-slate-700/40 pb-2 px-1">
        {post.comment_count > 0 && (
          <button
            onClick={() => onComment(post.id)}
            className="text-xs font-medium text-muted-foreground hover:underline"
          >
            {post.comment_count} {post.comment_count === 1 ? "comment" : "comments"}
          </button>
        )}
      </div>

      {/* Buttons Row */}
      <div className="relative grid grid-cols-3 gap-1 pt-1 sm:gap-2">

        {/* ── Facebook-style emoji picker popup ── */}
        {variant === "resident" && showEmojiPicker && (
          <>
            {/* Backdrop — tap outside closes */}
            <div className="fixed inset-0 z-10" onClick={closePicker} />

            <div className="absolute -top-[72px] left-0 z-20 flex items-end gap-1 rounded-full bg-white dark:bg-slate-800 px-3 py-2.5 shadow-2xl border border-slate-200 dark:border-slate-600">
              {REACTION_EMOJIS.map((r) => {
                const isActive = draggedOver === r.type;
                return (
                  <button
                    key={r.type}
                    data-reaction={r.type}
                    onClick={() => { onReact(post.id, r.type); closePicker(); }}
                    title={r.label}
                    className="relative flex flex-col items-center gap-0.5 transition-all duration-150"
                    style={{
                      transform: isActive ? "translateY(-14px) scale(1.35)" : "translateY(0) scale(1)",
                    }}
                  >
                    <span className="text-[26px] leading-none select-none drop-shadow-sm pointer-events-none">
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

        {/* ── Like button ── */}
        {canInteract ? (
          <button
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onContextMenu={(e) => e.preventDefault()}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              touchAction: "none",
              WebkitTouchCallout: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
            className={`flex min-w-0 select-none items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all hover:bg-accent sm:gap-2 sm:text-sm ${
              post.my_reaction ? "text-primary" : "text-muted-foreground"
            }`}
          >
            {post.my_reaction ? (
              <span className="text-lg leading-none">
                {REACTION_EMOJIS.find(r => r.type === post.my_reaction)?.emoji ?? "👍"}
              </span>
            ) : (
              <ThumbsUp size={18} className="shrink-0" />
            )}
            <span className="truncate capitalize pointer-events-none">
              {post.my_reaction
                ? (REACTION_EMOJIS.find(r => r.type === post.my_reaction)?.label ?? "Like")
                : "Like"}
            </span>
          </button>
        ) : (
          <div
            className="flex min-w-0 select-none items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-muted-foreground sm:gap-2 sm:text-sm opacity-60"
            title="Verify your account to react"
          >
            <ThumbsUp size={18} className="shrink-0" />
            <span className="truncate">Like</span>
          </div>
        )}

        {/* ── Comment button ── */}
        {canInteract ? (
          <button
            onClick={() => onComment(post.id)}
            className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-accent sm:gap-2 sm:text-sm"
          >
            <MessageCircle size={18} className="shrink-0" />
            <span className="truncate">Comment</span>
          </button>
        ) : (
          <div
            className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-muted-foreground sm:gap-2 sm:text-sm opacity-60"
            title="Verify your account to comment"
          >
            <MessageCircle size={18} className="shrink-0" />
            <span className="truncate">Comment</span>
          </div>
        )}

        {/* ── Share button ── */}
        <button
          onClick={() => onShare(post.id)}
          className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold text-muted-foreground transition-all hover:bg-accent sm:gap-2 sm:text-sm"
        >
          <ShareIcon className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">Share</span>
        </button>
      </div>
    </>
  );
}
