interface UrgencyBadgeProps {
  level?: string | null;
  className?: string;
}

export function UrgencyBadge({ level, className = "" }: UrgencyBadgeProps) {
  if (!level) return null;

  const urgencyConfig = {
    high: {
      className: "bg-red-50 text-red-600 ring-red-100"
    },
    medium: {
      className: "bg-amber-50 text-amber-700 ring-amber-100"
    },
    low: {
      className: "bg-emerald-50 text-emerald-600 ring-emerald-100"
    }
  };

  const config = urgencyConfig[level as keyof typeof urgencyConfig];
  if (!config) return null;

  return (
    <span className={`
      inline-flex items-center rounded-full px-3 py-1.5 
      text-xs font-bold uppercase tracking-wider ring-1
      ${config.className}
      ${className}
    `}>
      {level}
    </span>
  );
}
