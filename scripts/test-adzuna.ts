import { adzunaClient } from '../lib/adzuna';

async function testAdzunaAPI() {
  console.log('Testing Adzuna API connection...\n');

  try {
    // Test 1: Basic search
    console.log('Test 1: Basic search for "software engineer"');
    const results = await adzunaClient.search({
      what: 'software engineer',
      results_per_page: 5,
    });
    console.log(`✓ Found ${results.count} total jobs`);
    console.log(`✓ Retrieved ${results.results.length} results\n`);

    // Test 2: Top roles
    console.log('Test 2: Get top roles');
    const topRoles = await adzunaClient.getTopRoles(5);
    console.log(`✓ Retrieved ${topRoles.results.length} top jobs\n`);

    // Test 3: Role-specific search
    console.log('Test 3: Search by role "data analyst"');
    const roleJobs = await adzunaClient.searchByRole('data analyst');
    console.log(`✓ Found ${roleJobs.count} data analyst jobs\n`);

    console.log('All tests passed! ✅');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testAdzunaAPI();
