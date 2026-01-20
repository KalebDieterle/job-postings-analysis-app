import React from "react";
import {
  Code,
  Briefcase,
  User,
  Truck,
  Stethoscope,
  Tag,
  Activity,
  ShoppingCart,
} from "lucide-react";

// Lightweight mapping of role keywords to lucide icons
const ICON_MAP: Array<[RegExp, React.ElementType]> = [
  [/engineer|developer|software|frontend|backend|programmer/i, Code],
  [/sales|account|business|executive|salesperson/i, Briefcase],
  [/manager|lead|director/i, User],
  [/retail|store|shop|cashier/i, ShoppingCart],
  [/nurse|health|medical|doctor/i, Stethoscope],
  [/marketing|brand|content/i, Tag],
  [/operations|ops|logistics/i, Truck],
  [/trend|analytics|data/i, Activity],
];

export function pickIconForRole(role: string) {
  for (const [re, Icon] of ICON_MAP) if (re.test(role)) return Icon;
  return Briefcase;
}

export function colorFromString(s: string) {
  const palette = [
    "#7c3aed", // purple
    "#06b6d4", // cyan
    "#f97316", // orange
    "#10b981", // green
    "#ef4444", // red
    "#2563eb", // blue
  ];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function fgForBg(hex: string) {
  // compute luminance and return white or dark foreground
  const c = hex.substring(1);
  const bigint = parseInt(c, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 140 ? "#fff" : "#0f172a";
}

export default null;
