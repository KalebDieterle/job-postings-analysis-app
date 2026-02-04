"use client";

import { m } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MotionCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "featured" | "wide" | "tall";
}

/**
 * Glassmorphic card with hover and tap animations
 */
export function MotionCard({
  children,
  className,
  onClick,
  variant = "default",
}: MotionCardProps) {
  const variantClasses = {
    default: "bento-card",
    featured: "bento-card-featured",
    wide: "bento-card-wide",
    tall: "bento-card-tall",
  };

  return (
    <m.div
      whileHover={{
        scale: 1.02,
        transition: { type: "spring", stiffness: 400, damping: 25 },
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        variantClasses[variant],
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </m.div>
  );
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: "primary" | "success" | "warning" | "destructive" | "none";
}

/**
 * Static glass card without motion (for server components)
 */
export function GlassCard({
  children,
  className,
  glow = "none",
}: GlassCardProps) {
  const glowClasses = {
    primary: "glow-primary",
    success: "glow-success",
    warning: "glow-warning",
    destructive: "glow-destructive",
    none: "",
  };

  return (
    <div className={cn("bento-card", glowClasses[glow], className)}>
      {children}
    </div>
  );
}
