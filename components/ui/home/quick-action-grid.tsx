import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Code, Building2, MapPin, ArrowRight } from "lucide-react";

const actions = [
  {
    href: "/roles",
    icon: Briefcase,
    title: "Explore Roles",
    description: "Discover trending job positions and career opportunities",
    gradient: "from-blue-500/10 via-blue-500/5 to-transparent hover:from-blue-500/20",
    iconColor: "text-blue-600",
  },
  {
    href: "/skills",
    icon: Code,
    title: "Find Skills",
    description: "Analyze in-demand skills and technology trends",
    gradient: "from-purple-500/10 via-purple-500/5 to-transparent hover:from-purple-500/20",
    iconColor: "text-purple-600",
  },
  {
    href: "/companies",
    icon: Building2,
    title: "Top Companies",
    description: "Explore leading employers and hiring patterns",
    gradient: "from-green-500/10 via-green-500/5 to-transparent hover:from-green-500/20",
    iconColor: "text-green-600",
  },
  {
    href: "/locations",
    icon: MapPin,
    title: "Salary Insights",
    description: "Compare compensation across locations and roles",
    gradient: "from-orange-500/10 via-orange-500/5 to-transparent hover:from-orange-500/20",
    iconColor: "text-orange-600",
  },
];

export function QuickActionGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => (
        <Link key={action.href} href={action.href}>
          <Card className={`group h-full border-2 bg-gradient-to-br ${action.gradient} transition-all duration-300 hover:border-primary/50 hover:shadow-xl md:hover:scale-105`}>
            <CardContent className="flex flex-col items-center space-y-3 p-5 text-center md:space-y-4 md:p-6">
              <div className={`rounded-2xl bg-background p-3 transition-transform duration-300 group-hover:scale-110 md:p-4`}>
                <action.icon className={`h-10 w-10 md:h-12 md:w-12 ${action.iconColor}`} />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                  {action.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Explore
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
