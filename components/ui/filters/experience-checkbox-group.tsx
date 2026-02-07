"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EXPERIENCE_LEVELS } from "@/lib/skills-search-params";

interface ExperienceCheckboxGroupProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function ExperienceCheckboxGroup({
  value,
  onChange,
}: ExperienceCheckboxGroupProps) {
  const toggleExperience = (level: string) => {
    const newValue = value.includes(level)
      ? value.filter((v) => v !== level)
      : [...value, level];
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      {EXPERIENCE_LEVELS.map((level) => (
        <div key={level} className="flex items-center space-x-2">
          <Checkbox
            id={`exp-${level}`}
            checked={value.includes(level)}
            onCheckedChange={() => toggleExperience(level)}
          />
          <Label
            htmlFor={`exp-${level}`}
            className="text-sm font-normal cursor-pointer"
          >
            {level}
          </Label>
        </div>
      ))}
    </div>
  );
}
