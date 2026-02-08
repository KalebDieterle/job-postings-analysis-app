import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SkillBadgeProps {
  skill: string;
  count?: number;
  variant?: "default" | "secondary" | "outline";
  className?: string;
}

export function SkillBadge({
  skill,
  count,
  variant = "secondary",
  className,
}: SkillBadgeProps) {
  return (
    <Badge
      variant={variant}
      className={cn(
        "hover:bg-primary/20 transition-colors cursor-pointer",
        className,
      )}
    >
      {skill}
      {count !== undefined && (
        <span className="ml-1 text-xs opacity-70">({count})</span>
      )}
    </Badge>
  );
}
