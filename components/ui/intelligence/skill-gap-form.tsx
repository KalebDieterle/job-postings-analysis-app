"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SkillGapResult } from "./skill-gap-result";

interface SkillDetail {
  skill: string;
  importance: number;
  status: "matched" | "gap" | "bonus";
}

interface GapResult {
  canonical_role: string;
  match_percentage: number;
  skills: SkillDetail[];
  learning_priority: string[];
}

export function SkillGapForm() {
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [currentSkills, setCurrentSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [result, setResult] = useState<GapResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ml/skill-gap/roles")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setRoles(Array.isArray(data) ? data : []))
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false));
  }, []);

  const addSkill = () => {
    const skill = skillInput.trim();
    if (skill && !currentSkills.includes(skill)) {
      setCurrentSkills((prev) => [...prev, skill]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setCurrentSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const handleAnalyze = async () => {
    if (!selectedRole) {
      setError("Please select a target role");
      return;
    }
    if (currentSkills.length === 0) {
      setError("Please add at least one skill");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ml/skill-gap/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_skills: currentSkills,
          target_role: selectedRole,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to analyze skill gap");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Target Role</Label>
            {rolesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading roles...
              </div>
            ) : (
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Your Current Skills</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Python, SQL, React..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button variant="outline" onClick={addSkill} type="button">
                Add
              </Button>
            </div>
            {currentSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {currentSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="secondary"
                    className="cursor-pointer gap-1 pr-1"
                    onClick={() => removeSkill(skill)}
                  >
                    {skill}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Skill Gap"
            )}
          </Button>
        </CardContent>
      </Card>

      <SkillGapResult result={result} loading={loading} />
    </div>
  );
}
