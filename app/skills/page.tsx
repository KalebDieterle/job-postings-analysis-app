import { getAllSkills } from "@/db/queries";
import { SkillCard } from "@/components/ui/skill-card";
import { FilterBar } from "@/components/ui/filters/filter-bar";
import Link from "next/link";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SkillsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const parsedParams = await searchParams;
  const search = typeof parsedParams.q === "string" ? parsedParams.q : "";
  const page =
    typeof parsedParams.page === "string" ? parseInt(parsedParams.page) : 1;
  const limit = 24;

  const skillsData = await getAllSkills({
    search,
    page,
    limit,
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Skills Explorer</h1>
        <p className="text-muted-foreground">
          Analyze demand and salary trends across{" "}
          {search ? `results for "${search}"` : "all identified skills"}.
        </p>
      </div>

      <FilterBar />

      {skillsData.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {skillsData.map((skill) => (
            <Link
              key={skill.name}
              href={`/skills/${encodeURIComponent(skill.name.toLowerCase())}`}
              className="transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <SkillCard
                name={skill.name}
                count={Number(skill.count)}
                avgSalary={Number(skill.avg_salary)}
              />
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-xl">
          <h3 className="text-lg font-medium">No skills found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </div>
      )}

      <div className="flex justify-center gap-4 pt-8">
        {page > 1 && (
          <Link
            href={`/skills?page=${page - 1}${search ? `&q=${search}` : ""}`}
            className="px-4 py-2 border rounded-md hover:bg-secondary"
          >
            Previous
          </Link>
        )}
        <Link
          href={`/skills?page=${page + 1}${search ? `&q=${search}` : ""}`}
          className="px-4 py-2 border rounded-md hover:bg-secondary"
        >
          Next Page
        </Link>
      </div>
    </div>
  );
}
