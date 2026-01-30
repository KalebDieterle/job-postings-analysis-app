import { getDatabaseStats, getTopJobTitles, getRecentJobs } from "@/db/queries";

async function testDatabase() {
  console.log("🔍 Testing database connection...\n");

  try {
    // Test 1: Get stats
    console.log('📊 Database Stats:');
    const stats = await getDatabaseStats();
    console.log(stats);
    console.log('');

    // Test 2: Top Job Titles
    console.log('🏆 Top 10 Job Titles:');
    const topJobs = await getTopJobTitles();
    topJobs.forEach((job, i) => {
      console.log(`${i + 1}. ${job.title} - ${job.count} postings`);
    });
    console.log('');

    // Test 3: Recent jobs
    console.log('📅 Recent Jobs (5):');
    const recentJobs = await getRecentJobs(5);
    
    recentJobs.forEach(job => {
      // Fixed: Using snake_case property names to match the query output
      const salary = job.min_salary && job.max_salary 
        ? `$${job.min_salary.toLocaleString()} - $${job.max_salary.toLocaleString()}`
        : 'Not specified';
      
      console.log(`• ${job.title} at ${job.company_name || 'Unknown'}`);
      console.log(`  ${job.location || 'Remote'} | ${salary}`);
    });

    console.log('\n✅ Database connection and queries successful!');

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testDatabase();