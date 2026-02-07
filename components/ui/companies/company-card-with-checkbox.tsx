"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { CompanyCard } from "@/components/ui/company-card";
import { useToast } from "@/hooks/use-toast";

interface CompanyCardWithCheckboxProps {
  name: string;
  size: string;
  country: string;
  rank: number;
  count: number;
  companyId: string;
  isSelected: boolean;
  onSelectionChange: (companyId: string, checked: boolean) => void;
  maxSelectionsReached: boolean;
}

export function CompanyCardWithCheckbox({
  name,
  size,
  country,
  rank,
  count,
  companyId,
  isSelected,
  onSelectionChange,
  maxSelectionsReached,
}: CompanyCardWithCheckboxProps) {
  const { toast } = useToast();

  const handleCheckboxChange = (checked: boolean) => {
    if (checked && maxSelectionsReached && !isSelected) {
      toast({
        title: "Selection Limit Reached",
        description: "You can compare up to 5 companies at a time.",
        variant: "destructive",
      });
      return;
    }
    onSelectionChange(companyId, checked);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    // Prevent link navigation when clicking checkbox
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="relative group">
      {/* Checkbox - Always visible on mobile, appears on hover on desktop */}
      <div
        className="absolute top-4 right-4 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
        onClick={handleCheckboxClick}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            disabled={maxSelectionsReached && !isSelected}
            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        </div>
      </div>

      {/* Selection indicator border */}
      {isSelected && (
        <div className="absolute inset-0 rounded-2xl border-2 border-blue-500 dark:border-blue-400 pointer-events-none animate-pulse" />
      )}

      {/* Original CompanyCard */}
      <CompanyCard
        name={name}
        size={size}
        country={country}
        rank={rank}
        count={count}
      />
    </div>
  );
}
