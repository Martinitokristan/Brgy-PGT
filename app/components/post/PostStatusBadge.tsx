import { CheckCircle2, Clock, Loader2 } from "lucide-react";

interface PostStatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function PostStatusBadge({ status, className = "" }: PostStatusBadgeProps) {
  if (!status) return null;

  const statusConfig = {
    pending: {
      icon: Clock,
      text: "Pending",
      className: "bg-amber-500 text-white shadow-sm"
    },
    resolved: {
      icon: CheckCircle2,
      text: "Resolved",
      className: "bg-emerald-500 text-white shadow-sm"
    },
    in_progress: {
      icon: Loader2,
      text: "In Progress", 
      className: "bg-teal-500 text-white shadow-sm"
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 
      text-[10px] font-bold shrink-0
      ${config.className}
      ${className}
    `}>
      <Icon className="h-3 w-3" />
      {config.text}
    </span>
  );
}
