"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Building2, DollarSign, MapPin, Users } from "lucide-react";
import { TrendIndicator } from "@/components/ui/trend-indicator";

interface AnimatedStatCardProps {
  icon: "briefcase" | "building" | "dollar" | "map" | "users";
  label: string;
  value: number;
  trend?: number;
  formatter?: (value: number) => string;
  gradientFrom?: string;
  gradientTo?: string;
}

export function AnimatedStatCard({
  icon,
  label,
  value,
  trend,
  formatter = (v) => v.toLocaleString(),
  gradientFrom = "from-blue-500",
  gradientTo = "to-purple-500",
}: AnimatedStatCardProps) {
  const [count, setCount] = useState(0);

  // Map icon string to component
  const iconMap = {
    briefcase: Briefcase,
    building: Building2,
    dollar: DollarSign,
    map: MapPin,
    users: Users,
  };
  const Icon = iconMap[icon];

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card className="hover:shadow-lg transition-shadow h-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div
              className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} p-3 rounded-lg`}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
            {trend !== undefined && <TrendIndicator value={trend} />}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-3xl font-bold">{formatter(count)}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
