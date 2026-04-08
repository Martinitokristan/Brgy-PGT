// Shared types for posts, profiles, and reactions
// Used across resident feed, admin feed, and ProfileView

export type Post = {
  id: number;
  user_id: string;
  title: string | null;
  description: string | null;
  purpose: string | null;
  urgency_level: string | null;
  status: string | null;
  created_at: string | null;
  image: string | null;
  video?: string | null;
  profiles: { name: string; avatar?: string | null } | null;
  author_role: string | null;
  reaction_counts: Record<string, number>;
  my_reaction: string | null;
  comment_count: number;
  original_post_id?: number | null;
  metadata?: PostMetadata | null;
};

export type PostMetadata = {
  sharer_name?: string;
  original_author_name?: string;
  original_title?: string | null;
  original_description?: string | null;
  original_image?: string | null;
  original_created_at?: string | null;
};

export type ProfileData = {
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    avatar: string | null;
    is_verified: boolean;
    barangay_id?: number | null;
    purok_address?: string | null;
    sex?: string | null;
    birth_date?: string | null;
    age?: number | null;
    cover_photo?: string | null;
  };
  posts: Post[];
  followers: number;
  following: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  isAdminView: boolean;
};

export type ReactionEmoji = {
  type: string;
  emoji: string;
  label: string;
  color: string;
};

export const REACTION_EMOJIS: ReactionEmoji[] = [
  { type: "like",    emoji: "👍", label: "Like",    color: "text-blue-600" },
  { type: "heart",   emoji: "❤️", label: "Love",    color: "text-red-500"  },
  { type: "support", emoji: "🤝", label: "Support", color: "text-yellow-600" },
  { type: "haha",    emoji: "😂", label: "Haha",    color: "text-amber-500" },
  { type: "sad",     emoji: "😢", label: "Sad",     color: "text-blue-400"  },
  { type: "angry",   emoji: "😡", label: "Angry",   color: "text-red-700"  },
];

export type PostVariant = "resident" | "admin" | "profile";

export type PostFormState = {
  title: string;
  description: string;
  purpose: string;
  urgency: string;
  selectedMedia: File | null;
  mediaPreview: string | null;
  mediaType: "image" | "video" | null;
  isSubmitting: boolean;
  uploadProgress: number;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setPurpose: (value: string) => void;
  setUrgency: (value: string) => void;
};

export type ShareModalState = {
  sharePostId: number | null;
  shareCopied: boolean;
  isSharingToFeed: boolean;
  shareSuccess: boolean;
};
