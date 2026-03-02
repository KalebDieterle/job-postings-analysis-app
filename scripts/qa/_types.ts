export type QaSeverity = "low" | "medium" | "high" | "critical";

export interface QaCheckResult {
  name: string;
  passed: boolean;
  details: string;
  severity?: QaSeverity;
}

export interface QaRunSummary {
  suite: string;
  startedAt: string;
  completedAt: string;
  passed: boolean;
  checks: QaCheckResult[];
}

