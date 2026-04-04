import Link from "next/link";
import { getAvatarUrl } from "@/lib/utils/storage";

interface UserAvatarProps {
  name: string;
  avatar?: string | null;
  href?: string;
  isAdmin?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ 
  name, 
  avatar, 
  href, 
  isAdmin = false, 
  size = "md",
  className = ""
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-xl"
  };

  const avatarContent = (
    <div className={`
      flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-md overflow-hidden
      ${sizeClasses[size]}
      ${isAdmin ? "bg-gradient-to-br from-blue-600 to-indigo-700" : "bg-primary"}
      ${className}
    `}>
      {avatar ? (
        <img 
          src={getAvatarUrl(avatar)!} 
          alt={name} 
          className="h-full w-full object-cover" 
        />
      ) : (
        name.charAt(0)
      )}
    </div>
  );

  if (href) {
    return (
      <Link 
        href={href}
        className="transition-transform hover:scale-105"
      >
        {avatarContent}
      </Link>
    );
  }

  return avatarContent;
}
