import { User as UserIcon } from "lucide-react";
import { getStorageUrl } from "@/lib/utils/storage";
import { PostMetadata } from "@/lib/types";

interface SharedPostContentProps {
  metadata: PostMetadata;
  onImageClick?: (src: string) => void;
}

export function SharedPostContent({ metadata, onImageClick }: SharedPostContentProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-600 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/60">
      {/* Original Author Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <UserIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {metadata.original_author_name}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Original Post • {metadata.original_created_at ? 
              new Date(metadata.original_created_at).toLocaleDateString() : 
              'Recently'
            }
          </p>
        </div>
      </div>

      {/* Original Content */}
      {metadata.original_title && (
        <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight mb-2">
          {metadata.original_title}
        </h2>
      )}
      {metadata.original_description && (
        <p className="text-[15px] font-medium leading-relaxed text-slate-500/90 dark:text-slate-400 mb-3">
          {metadata.original_description}
        </p>
      )}

      {/* Original Image */}
      {metadata.original_image && (
        <div
          className="overflow-hidden rounded-xl border cursor-zoom-in"
          onClick={() => onImageClick?.(getStorageUrl(metadata.original_image!) || "")}
        >
          <img
            src={getStorageUrl(metadata.original_image) || ""}
            alt={metadata.original_title || ""}
            className="w-full object-contain pointer-events-none bg-muted"
          />
        </div>
      )}
    </div>
  );
}
