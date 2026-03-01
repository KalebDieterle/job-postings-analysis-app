import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import React from "react";

const Header = () => {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-5xl space-y-4 px-2 py-8 text-center md:px-4 md:py-12">
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className="px-3 py-1 text-xs tracking-widest uppercase text-muted-foreground"
          >
            Job Market Intelligence
          </Badge>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
          Welcome to{" "}
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-violet-400 bg-clip-text text-transparent">
            SkillMap
          </span>
        </h1>

        <p className="mx-auto max-w-xl text-sm text-muted-foreground md:text-lg">
          Explore in-demand skills, hiring trends, and salary insights across
          thousands of real job postings.
        </p>

        <Separator className="mt-8 max-w-xs mx-auto opacity-50" />
      </div>
    </header>
  );
};

export default Header;
