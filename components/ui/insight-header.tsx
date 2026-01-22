import { TrendingUp, Award } from "lucide-react";

interface InsightHeaderProps {
  title: string;
  trend: number;
  topSkill: string;
}

export function InsightHeader({ title, trend, topSkill }: InsightHeaderProps) {
  return (
    <div className="mb-8 p-6 bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
      <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
        <span className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full shadow-xs border border-blue-200">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Postings up <span className="text-emerald-600">{trend}%</span> this
          month
        </span>
        <span className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full shadow-xs border border-blue-200">
          <Award className="w-4 h-4 text-indigo-600" />
          <span className="text-indigo-600">{topSkill}</span> is the #1
          requested skill
        </span>
      </div>
    </div>
  );
}
