"use client";
import React from "react";
import { pickIconForRole, colorFromString, fgForBg } from "@/lib/iconHelpers";

interface IconAvatarProps {
  title: string;
  size?: number;
}

export default function IconAvatar({ title, size = 40 }: IconAvatarProps) {
  const Icon = pickIconForRole(title);
  const bg = colorFromString(title || "");
  const fg = fgForBg(bg);

  const px = Math.max(14, Math.min(20, Math.floor(size * 0.5)));

  return (
    <div
      style={{ backgroundColor: bg, color: fg }}
      className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
      aria-hidden
    >
      <Icon size={px} color={fg} />
    </div>
  );
}
