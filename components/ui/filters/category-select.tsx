"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { SKILL_CATEGORIES } from "@/lib/skills-search-params";

interface CategorySelectProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggleCategory = (category: string) => {
    const newValue = value.includes(category)
      ? value.filter((v) => v !== category)
      : [...value, category];
    onChange(newValue);
  };

  const selectAll = () => {
    onChange([...SKILL_CATEGORIES]);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className="truncate">
            {value.length === 0
              ? "All Categories"
              : value.length === SKILL_CATEGORIES.length
                ? "All Categories"
                : `${value.length} selected`}
          </span>
          <div className="flex items-center gap-2">
            {value.length > 0 && value.length < SKILL_CATEGORIES.length && (
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal"
              >
                {value.length}
              </Badge>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search categories..." />
          <CommandList>
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={selectAll}
                className="justify-center font-medium"
              >
                Select All
              </CommandItem>
              <CommandItem
                onSelect={clearAll}
                className="justify-center font-medium"
              >
                Clear All
              </CommandItem>
            </CommandGroup>
            <CommandGroup>
              {SKILL_CATEGORIES.map((category) => (
                <CommandItem
                  key={category}
                  value={category}
                  onSelect={() => toggleCategory(category)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.includes(category) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
