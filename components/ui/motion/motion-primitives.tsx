"use client";

import { m, Variants } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Stagger container for grid items
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// Individual item animation
const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

interface MotionGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * Animated grid container with staggered children
 */
export function MotionGrid({ children, className }: MotionGridProps) {
  return (
    <m.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn("bento-grid", className)}
    >
      {children}
    </m.div>
  );
}

interface MotionItemProps {
  children: ReactNode;
  className?: string;
}

/**
 * Animated grid item with entrance animation
 */
export function MotionItem({ children, className }: MotionItemProps) {
  return (
    <m.div variants={itemVariants} className={className}>
      {children}
    </m.div>
  );
}

// Fade in animation for sections
const fadeInVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

interface MotionFadeProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Simple fade-in animation wrapper
 */
export function MotionFade({
  children,
  className,
  delay = 0,
}: MotionFadeProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </m.div>
  );
}

// List stagger for leaderboards
const listContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 },
  },
};

interface MotionListProps {
  children: ReactNode;
  className?: string;
}

/**
 * Animated list container for leaderboards
 */
export function MotionList({ children, className }: MotionListProps) {
  return (
    <m.ul
      variants={listContainerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </m.ul>
  );
}

export function MotionListItem({ children, className }: MotionItemProps) {
  return (
    <m.li variants={listItemVariants} className={className}>
      {children}
    </m.li>
  );
}
