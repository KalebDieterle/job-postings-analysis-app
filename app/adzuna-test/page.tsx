import { fetchJobsWithCache, formatSalary } from '@/lib/adzuna';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdzunaTestPage() {
  // Fetch some sample data
  const softwareJobs = await fetchJobsWithCache({
    what: 'software engineer',
    results_per_page: 20,
    sort_by: 'date',
  });

  // Calculate salary statistics
  const jobsWithSalary = softwareJobs.results.filter(
    job => job.salary_min && job.salary_max
  );

  const avgSalaries = jobsWithSalary.map(job => 
    ((job.salary_min || 0) + (job.salary_max || 0)) / 2
  );

  const avgSalary = avgSalaries.length > 0
    ? avgSalaries.reduce((a, b) => a + b, 0) / avgSalaries.length
    : 0;

  // Group jobs by location
  const locationCounts = softwareJobs.results.reduce((acc, job) => {
    const location = job.location.display_name;
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topLocations = Object.entries(locationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Adzuna API Test Page</h1>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Total Jobs Found</CardTitle>
            <CardDescription>Software Engineer</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{softwareJobs.count.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retrieved</CardTitle>
            <CardDescription>Sample size</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{softwareJobs.results.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg Salary</CardTitle>
            <CardDescription>From {jobsWithSalary.length} jobs with salary</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              ${Math.round(avgSalary).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simple Bar Chart - Top Locations */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Top 10 Locations</CardTitle>
          <CardDescription>Software Engineer job postings by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topLocations.map(([location, count]) => {
              const maxCount = topLocations[0][1];
              const percentage = (count / maxCount) * 100;
              
              return (
                <div key={location} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{location}</span>
                    <span className="text-gray-600">{count} jobs</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Raw Job Data */}
      <Card>
        <CardHeader>
          <CardTitle>Latest Job Postings</CardTitle>
          <CardDescription>First 10 results from Adzuna API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {softwareJobs.results.slice(0, 10).map((job) => (
              <div 
                key={job.id} 
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{job.title}</h3>
                  {(job.salary_min || job.salary_max) && (
                    <span className="text-green-600 font-medium text-sm">
                      {formatSalary(job.salary_min, job.salary_max, job.salary_is_predicted)}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Company:</strong> {job.company.display_name}</p>
                  <p><strong>Location:</strong> {job.location.display_name}</p>
                  <p><strong>Category:</strong> {job.category.label}</p>
                  <p><strong>Posted:</strong> {new Date(job.created).toLocaleDateString()}</p>
                  {job.contract_type && (
                    <p><strong>Contract:</strong> {job.contract_type}</p>
                  )}
                </div>
                
                <a 
                  href={job.redirect_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm mt-3 inline-block"
                >
                  View Job Details →
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Raw JSON Data (collapsible) */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Raw API Response</CardTitle>
          <CardDescription>Full JSON data from Adzuna (first job only)</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-background-100 p-4 rounded-lg overflow-x-auto text-xs">
            {JSON.stringify(softwareJobs.results[0], null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}