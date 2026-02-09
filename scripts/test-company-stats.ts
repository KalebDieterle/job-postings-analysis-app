/**
 * Test script to verify company statistics queries
 * Run with: npx tsx scripts/test-company-stats.ts
 */

import { getCompaniesHeroStats, getCompanyComparisonData } from '@/db/queries';

async function testCompanyStats() {
  console.log('\n🧪 Testing Company Statistics Queries\n');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Hero Stats
    console.log('\n📊 Test 1: Hero Statistics');
    console.log('-'.repeat(60));
    const heroStats = await getCompaniesHeroStats();
    console.log('\nResults:');
    console.log('  Total Companies:', heroStats.totalCompanies.toLocaleString());
    console.log('  Avg Postings per Company:', heroStats.avgPostings);
    console.log('  Highest Paying Company:', heroStats.highestPayingCompany);
    console.log('  Highest Avg Salary:', `$${heroStats.highestPayingSalary.toLocaleString()}`);
    console.log('  Most Active Industry:', heroStats.mostActiveIndustry);
    console.log('  Industry Job Count:', heroStats.mostActiveIndustryCount.toLocaleString());
    
    // Validation
    const issues = [];
    if (heroStats.highestPayingSalary === 0) issues.push('❌ Salary is 0');
    if (heroStats.mostActiveIndustry === 'N/A') issues.push('❌ No industry found');
    if (heroStats.avgPostings === 0) issues.push('❌ Avg postings is 0');
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      issues.forEach(issue => console.log('  ', issue));
    } else {
      console.log('\n✅ All hero stats look good!');
    }

    // Test 2: Company Comparison
    console.log('\n\n📊 Test 2: Company Comparison Query');
    console.log('-'.repeat(60));
    
    // Get some sample company IDs from the database
    const { db } = await import('@/db');
    const { companies } = await import('@/db/schema');
    const { sql } = await import('drizzle-orm');
    
    const sampleCompanies = await db
      .select({ company_id: companies.company_id, name: companies.name })
      .from(companies)
      .limit(3);
    
    if (sampleCompanies.length === 0) {
      console.log('⚠️  No companies found in database');
      return;
    }
    
    console.log('\nTesting with companies:');
    sampleCompanies.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.name} (${c.company_id})`);
    });
    
    const companyIds = sampleCompanies.map(c => c.company_id);
    const comparisonData = await getCompanyComparisonData(companyIds);
    
    console.log('\nComparison Results:');
    comparisonData.forEach((company, i) => {
      console.log(`\n  ${i + 1}. ${company.name}`);
      console.log(`     Location: ${company.location}`);
      console.log(`     Size: ${company.company_size || 'N/A'}`);
      console.log(`     Postings: ${company.posting_count}`);
      console.log(`     Avg Salary: $${company.avg_salary?.toLocaleString() || 0}`);
      console.log(`     Industries: ${company.industry_count}`);
    });
    
    // Validation
    const comparisonIssues = comparisonData.filter(c => c.avg_salary === 0 || !c.avg_salary);
    if (comparisonIssues.length > 0) {
      console.log(`\n⚠️  ${comparisonIssues.length} companies have $0 salary`);
    } else {
      console.log('\n✅ All companies have salary data!');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully\n');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
testCompanyStats()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
