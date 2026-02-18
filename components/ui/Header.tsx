import { ModeToggle } from "@/components/ui/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import React from "react";

const Header = () => {
  return (
    <header className="relative border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="absolute top-4 right-6">
        <ModeToggle />
      </div>

      <div className="container mx-auto px-4 py-14 text-center space-y-4">
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className="px-3 py-1 text-xs tracking-widest uppercase text-muted-foreground"
          >
            Job Market Intelligence
          </Badge>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 bg-clip-text text-transparent">
            SkillMap
          </span>
        </h1>

        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Explore in-demand skills, hiring trends, and salary insights across
          thousands of real job postings.
        </p>

        <Separator className="mt-8 max-w-xs mx-auto opacity-50" />
      </div>
    </header>
  );
};

export default Header;
