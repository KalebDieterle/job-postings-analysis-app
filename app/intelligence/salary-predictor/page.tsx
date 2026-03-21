import { SalaryPredictorForm } from "@/components/ui/intelligence/salary-predictor-form";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function SalaryPredictorPage() {
  return (
    <MobilePageShell>
      {/* Terminal page header */}
      <div className="space-y-1.5">
        <p className="term-label">{">"} SKILLMAP_ANALYTICS {">"} INTELLIGENCE {">"} SALARY_MODEL</p>

        <h1 className="text-xl font-bold tracking-tight md:text-3xl text-foreground">
          <span className="text-muted-foreground font-normal">SkillMap: </span>
          <span style={{ color: "var(--primary)" }}>Salary Predictor</span>
          <span className="term-cursor ml-1 text-xl md:text-3xl" />
        </h1>

        <p className="text-xs text-muted-foreground md:text-sm max-w-2xl">
          {"// "}ML-powered salary estimates with P10–P90 confidence intervals based on real job posting data.
        </p>

        {/* Status line */}
        <div
          className="flex items-center gap-2 text-xs pt-1"
          style={{ fontFamily: "var(--font-geist-mono), monospace" }}
        >
          <span className="term-status-dot term-status-dot-live" />
          <span style={{ color: "var(--success)" }}>MODEL_STATUS: ACTIVE</span>
          <span style={{ color: "var(--muted-foreground)" }}>·</span>
          <span style={{ color: "var(--muted-foreground)" }}>GRADIENT_BOOST + RIDGE_ENSEMBLE</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ background: "var(--border)" }} />

      {/* Form — picks up terminal CSS vars automatically */}
      <SalaryPredictorForm />
    </MobilePageShell>
  );
}
