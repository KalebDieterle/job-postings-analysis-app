"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CompanyCardWithCheckbox } from "./company-card-with-checkbox";
import { ComparisonPanel } from "./comparison-panel";

interface Company {
  company_id?: string;
  name: string;
  company_size: string;
  country: string;
  postings_count: number;
  slug: string;
}

interface ComparisonPanelWrapperProps {
  companies: Company[];
  offset: number;
}

const MAX_SELECTIONS = 5;

export function ComparisonPanelWrapper({
  companies,
  offset,
}: ComparisonPanelWrapperProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load comparison data when selections change
  useEffect(() => {
    async function loadComparisonData() {
      if (selectedCompanies.length > 0) {
        setIsLoading(true);
        try {
          const response = await fetch("/api/companies/compare", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ companyIds: selectedCompanies }),
          });

          if (!response.ok) {
            throw new Error("Failed to fetch comparison data");
          }

          const data = await response.json();
          setComparisonData(data);
        } catch (error) {
          console.error("Failed to load comparison data:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setComparisonData([]);
      }
    }

    loadComparisonData();
  }, [selectedCompanies]);

  const handleSelectionChange = (companyId: string, checked: boolean) => {
    setSelectedCompanies((prev) => {
      if (checked) {
        if (prev.length >= MAX_SELECTIONS) return prev;
        return [...prev, companyId];
      } else {
        return prev.filter((id) => id !== companyId);
      }
    });
  };

  const handleClearAll = () => {
    setSelectedCompanies([]);
  };

  const maxSelectionsReached = selectedCompanies.length >= MAX_SELECTIONS;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {companies.map((company: Company, index: number) => {
          const companyId = company.company_id || company.slug;
          const isSelected = selectedCompanies.includes(companyId);

          return (
            <div
              key={`${company.name}-${offset + index}`}
              className="relative group"
            >
              <Link href={`/companies/${company.slug}`} className="block">
                <div className="rounded-2xl border bg-card p-4 hover:shadow-lg transition-shadow h-full">
                  <CompanyCardWithCheckbox
                    name={company.name || "N/A"}
                    size={company.company_size}
                    country={company.country || "N/A"}
                    rank={offset + index + 1}
                    count={company.postings_count}
                    companyId={companyId}
                    isSelected={isSelected}
                    onSelectionChange={handleSelectionChange}
                    maxSelectionsReached={maxSelectionsReached}
                  />
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Comparison Panel */}
      <ComparisonPanel
        selectedCompanies={selectedCompanies}
        companiesData={comparisonData}
        onClearAll={handleClearAll}
      />
    </>
  );
}
