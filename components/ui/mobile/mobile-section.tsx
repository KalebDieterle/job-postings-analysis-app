"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export type MobileSectionProps = {
  title?: string;
  description?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
};

export function MobileSection({
  title,
  description,
  collapsible = false,
  defaultOpen = true,
  children,
  className,
}: MobileSectionProps) {
  if (!collapsible) {
    return (
      <section className={cn("space-y-3", className)}>
        {title ? <h2 className="text-lg font-bold md:text-xl">{title}</h2> : null}
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        {children}
      </section>
    );
  }

  return (
    <Collapsible defaultOpen={defaultOpen} className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          {title ? <h2 className="text-lg font-bold md:text-xl">{title}</h2> : null}
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            View
            <ChevronDown className="size-4" />
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

