import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building2, DollarSign, Briefcase } from "lucide-react";

interface CompanyData {
  company_name: string;
  open_positions: number;
  top_skills: string[];
  avg_salary: number;
}

function CompanyCard({ company }: { company: CompanyData }) {
  const slug = company.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {company.company_name}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Briefcase className="h-3 w-3" />
                {company.open_positions} open positions
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Top Skills:</p>
          <div className="flex flex-wrap gap-2">
            {company.top_skills.slice(0, 3).map((skill, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-semibold">
              ${(company.avg_salary / 1000).toFixed(0)}k avg
            </span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/companies`}>
              View Jobs →
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TopCompaniesGrid({ data }: { data: CompanyData[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Top Hiring Companies</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Companies with the most active job postings
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((company, idx) => (
          <CompanyCard key={idx} company={company} />
        ))}
      </div>
    </div>
  );
}
