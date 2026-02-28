import { DollarSign } from "lucide-react";
import { SalaryPredictorForm } from "@/components/ui/intelligence/salary-predictor-form";

export default function SalaryPredictorPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
            <DollarSign className="h-4 w-4" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Salary Predictor
          </h1>
        </div>
        <p className="text-muted-foreground max-w-xl">
          Get ML-powered salary estimates with P10–P90 confidence intervals
          based on real job posting data.
        </p>
      </div>

      <SalaryPredictorForm />
    </div>
  );
}
