import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LucideIcon } from "lucide-react";

interface HighlightCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

import React from "react";

export const HighlightCard: React.FC<HighlightCardProps> = ({
  title,
  description,
  icon: Icon,
}) => {
  return (
    <Card className="h-64">
      <CardHeader>
        <Icon className="h-10 w-10 mb-4 text-primary" /> {/* ← Render icon */}
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
};
