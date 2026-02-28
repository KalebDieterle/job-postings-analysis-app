"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import { SalaryPredictionResult } from "./salary-prediction-result";

const EXPERIENCE_LEVELS = [
  { value: "Entry", label: "Entry Level" },
  { value: "Associate", label: "Associate" },
  { value: "Mid-Senior", label: "Mid-Senior" },
  { value: "Director", label: "Director" },
  { value: "Executive", label: "Executive" },
];

const WORK_TYPES = [
  { value: "Full-time", label: "Full-time" },
  { value: "Part-time", label: "Part-time" },
  { value: "Contract", label: "Contract" },
  { value: "Temporary", label: "Temporary" },
];

const FALLBACK_COMPANY_SCALE_TIERS = [
  { value: "micro", label: "Micro (1-25 postings)" },
  { value: "small", label: "Small (26-100 postings)" },
  { value: "mid", label: "Mid (101-500 postings)" },
  { value: "large", label: "Large (501-2000 postings)" },
  { value: "enterprise", label: "Enterprise (2000+ postings)" },
];

interface PredictionResult {
  predicted_salary: number;
  lower_bound: number;
  upper_bound: number;
  confidence: number;
  factors: { feature: string; importance: number }[];
  adjustments?: { source: string; delta: number }[];
}

interface SalaryMetadataSkill {
  abr: string;
  name: string;
  freq: number;
}

interface SalaryMetadataTitle {
  title: string;
  count: number;
}

interface SalaryMetadataTier {
  value: string;
  label: string;
}

interface SalaryMetadataResponse {
  skills: SalaryMetadataSkill[];
  titles: SalaryMetadataTitle[];
  company_scale_tiers: SalaryMetadataTier[];
}

export function SalaryPredictorForm() {
  const [title, setTitle] = useState("");
  const [titleOpen, setTitleOpen] = useState(false);
  const [titleQuery, setTitleQuery] = useState("");
  const [titleSuggestions, setTitleSuggestions] = useState<SalaryMetadataTitle[]>([]);
  const [defaultTitles, setDefaultTitles] = useState<SalaryMetadataTitle[]>([]);

  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("us");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [workType, setWorkType] = useState("");
  const [remoteAllowed, setRemoteAllowed] = useState<string>("any");
  const [companyScale, setCompanyScale] = useState<string>("mid");

  const [availableSkills, setAvailableSkills] = useState<SalaryMetadataSkill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [companyScaleTiers, setCompanyScaleTiers] = useState<SalaryMetadataTier[]>(
    FALLBACK_COMPANY_SCALE_TIERS,
  );
  const [metadataLoading, setMetadataLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState("");

  const selectedTitleExactMatch = useMemo(
    () => titleSuggestions.some((t) => t.title.toLowerCase() === titleQuery.trim().toLowerCase()),
    [titleSuggestions, titleQuery],
  );

  useEffect(() => {
    let cancelled = false;

    const loadMetadata = async () => {
      try {
        const res = await fetch("/api/ml/salary/metadata?limit=60");
        if (!res.ok) throw new Error("Failed to load salary metadata");

        const data = (await res.json()) as SalaryMetadataResponse;
        if (cancelled) return;

        setAvailableSkills(Array.isArray(data.skills) ? data.skills : []);

        const titles = Array.isArray(data.titles) ? data.titles : [];
        setDefaultTitles(titles);
        setTitleSuggestions(titles.slice(0, 15));

        if (Array.isArray(data.company_scale_tiers) && data.company_scale_tiers.length > 0) {
          setCompanyScaleTiers(data.company_scale_tiers);
          setCompanyScale((prev) =>
            data.company_scale_tiers.some((tier) => tier.value === prev)
              ? prev
              : data.company_scale_tiers[0].value,
          );
        }
      } catch {
        if (!cancelled) {
          setAvailableSkills([]);
          setDefaultTitles([]);
          setTitleSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      }
    };

    loadMetadata();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!titleOpen) return;

    const trimmed = titleQuery.trim();
    if (!trimmed) {
      setTitleSuggestions(defaultTitles.slice(0, 15));
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/ml/salary/metadata?q=${encodeURIComponent(trimmed.toLowerCase())}&limit=15`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as SalaryMetadataResponse;
        if (!cancelled && Array.isArray(data.titles)) {
          setTitleSuggestions(data.titles);
        }
      } catch {
        if (!cancelled) {
          setTitleSuggestions([]);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [titleOpen, titleQuery, defaultTitles]);

  const toggleSkill = (skillAbr: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillAbr)
        ? prev.filter((s) => s !== skillAbr)
        : [...prev, skillAbr],
    );
  };

  const handleSubmit = async () => {
    const normalizedTitle = title.trim() || titleQuery.trim();

    if (!normalizedTitle) {
      setError("Job title is required");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ml/salary/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: normalizedTitle,
          location,
          country,
          experience_level: experienceLevel,
          work_type: workType,
          remote_allowed: remoteAllowed === "any" ? null : remoteAllowed === "true",
          skills: selectedSkills,
          industries: [],
          employee_count: null,
          company_scale_tier: companyScale || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Prediction failed");
      }

      const data = await res.json();
      setTitle(normalizedTitle);
      setTitleQuery(normalizedTitle);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to get prediction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Job Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title-combobox">Job Title</Label>
            <Popover
              open={titleOpen}
              onOpenChange={(open) => {
                setTitleOpen(open);
                if (open) {
                  setTitleQuery(title || titleQuery);
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  id="title-combobox"
                  variant="outline"
                  role="combobox"
                  aria-expanded={titleOpen}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate text-left">
                    {title || "Search or type a job title"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search title..."
                    value={titleQuery}
                    onValueChange={setTitleQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No title found.</CommandEmpty>
                    <CommandGroup>
                      {titleQuery.trim() && !selectedTitleExactMatch && (
                        <CommandItem
                          value={`custom-${titleQuery}`}
                          onSelect={() => {
                            const custom = titleQuery.trim();
                            setTitle(custom);
                            setTitleQuery(custom);
                            setTitleOpen(false);
                          }}
                        >
                          Use custom title: {titleQuery.trim()}
                        </CommandItem>
                      )}

                      {titleSuggestions.map((option) => (
                        <CommandItem
                          key={option.title}
                          value={option.title}
                          onSelect={() => {
                            setTitle(option.title);
                            setTitleQuery(option.title);
                            setTitleOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              title.toLowerCase() === option.title.toLowerCase()
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <span className="truncate">{option.title}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{option.count}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Pick a suggested canonical title or type your own.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="gb">United Kingdom</SelectItem>
                  <SelectItem value="ca">Canada</SelectItem>
                  <SelectItem value="de">Germany</SelectItem>
                  <SelectItem value="au">Australia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Experience Level</Label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Work Type</Label>
              <Select value={workType} onValueChange={setWorkType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {WORK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Remote</Label>
              <Select value={remoteAllowed} onValueChange={setRemoteAllowed}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Company Scale</Label>
              <Select value={companyScale} onValueChange={setCompanyScale}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company scale" />
                </SelectTrigger>
                <SelectContent>
                  {companyScaleTiers.map((tier) => (
                    <SelectItem key={tier.value} value={tier.value}>
                      {tier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills (select relevant)</Label>
            {metadataLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading skill vocabulary...
              </div>
            ) : availableSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No model skill metadata found.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableSkills.map((skill) => (
                  <Badge
                    key={skill.abr}
                    variant={selectedSkills.includes(skill.abr) ? "default" : "outline"}
                    className="cursor-pointer select-none transition-colors"
                    onClick={() => toggleSkill(skill.abr)}
                    title={skill.name}
                  >
                    {skill.abr}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Predicting...
              </>
            ) : (
              "Predict Salary"
            )}
          </Button>
        </CardContent>
      </Card>

      <SalaryPredictionResult result={result} loading={loading} />
    </div>
  );
}
