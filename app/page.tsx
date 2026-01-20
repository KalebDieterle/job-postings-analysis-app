import Image from "next/image";
import Header from "../components/ui/Header";
import { HighlightCard } from "@/components/ui/highlight-card";
import { Building2, TrendingUp, Route } from "lucide-react";
import { getTrendingSkills } from "@/db/queries";
import { TrendingChartWrapper } from "@/components/ui/trending-chart-wrapper";

export const revalidate = 86400; // 24 hours

export default async function Home() {
  const trendingSkills = await getTrendingSkills(10);

  return (
    <>
      <Header />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 mt-30">
        <HighlightCard
          icon={TrendingUp}
          title="Real-Time Market Intelligence"
          description="Access live insights from 123,849 job postings across all industries. Track salary trends, skill demand, 
                       and hiring patterns to make data-driven career decisions."
        />
        <HighlightCard
          icon={Building2}
          title="Skills Gap Analysis"
          description="Identify the most in-demand skills for your target role. 
                       Compare your skillset against 213,768 job-skill mappings to discover opportunities for growth and competitive advantage."
        />
        <HighlightCard
          icon={Route}
          title="Location-Based Opportunities"
          description="Explore job market trends across cities and regions. Analyze salary ranges, remote work availability, 
                      and company concentrations to find your ideal work location."
        />
      </div>

      <div className="flex justify-center mt-10 px-4">
        <TrendingChartWrapper data={trendingSkills} />
      </div>
    </>
  );
}
