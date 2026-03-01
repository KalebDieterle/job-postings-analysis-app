import { DollarSign } from "lucide-react";
import { SalaryPredictorForm } from "@/components/ui/intelligence/salary-predictor-form";
import { MobilePageShell } from "@/components/ui/mobile/mobile-page-shell";

export default function SalaryPredictorPage() {
  return (
    <MobilePageShell>
      <div>
        <div className="mb-2 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
            <DollarSign className="h-4 w-4" />
          </div>
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            Salary Predictor
          </h1>
        </div>
        <p className="max-w-xl text-muted-foreground">
          Get ML-powered salary estimates with P10-P90 confidence intervals
          based on real job posting data.
        </p>
      </div>

      <SalaryPredictorForm />
    </MobilePageShell>
  );
}

