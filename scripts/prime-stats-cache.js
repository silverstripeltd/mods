/**
 * Prime GitHub Stats Cache
 *
 * Hits the /stats/commit_activity endpoint for all known Silverstripe module repos.
 * GitHub computes stats lazily — the first request returns 202 and triggers background
 * computation. By running this ~30 minutes before the real build, the stats will be
 * cached and ready when fetch-modules.js collects them.
 *
 * This script is intentionally fire-and-forget: it doesn't retry or collect results.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'Silverstripe-Mods-Bot/1.0'
};

if (GITHUB_TOKEN) {
  headers['Authorization'] = `token ${GITHUB_TOKEN}`;
}

// Same search queries as fetch-modules.js — we need to discover the same repos
const searchQueries = [
  'silverstripe language:PHP pushed:>2024-01-01',
  'silverstripe language:PHP updated:>2024-06-01',
  'silverstripe language:JavaScript pushed:>2024-01-01',
  'topic:silverstripe-vendormodule language:JavaScript',
  'user:silverstripe language:PHP pushed:>2023-01-01',
  'user:silverstripeltd language:PHP pushed:>2023-01-01',
  'topic:silverstripe-vendormodule language:PHP',
  'topic:silverstripe-module language:PHP',
  'topic:silverstripe-theme language:PHP',
  'user:jonom language:PHP',
  'user:lozcalver language:PHP',
  'user:nswdpc language:PHP',
  'user:silverstripe-terraformers language:PHP',
  'user:wilr language:PHP',
  'user:sunnysideup language:PHP',
  'user:dnadesign language:PHP',
  'user:tractorcow language:PHP',
  'user:firesphere language:PHP',
  'user:bigfork language:PHP',
  'user:lekoala language:PHP',
  'user:axllent language:PHP',
  'user:WPP-Public language:PHP',
  'user:cambis language:PHP',
  'user:silvershop language:PHP',
  'user:undefinedoffset language:PHP',
  'user:undigitalvn language:PHP',
  'user:dft language:PHP',
  'user:emteknetnz language:PHP',
  'user:catalyst language:PHP',
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🔥 Priming GitHub stats cache...\n');

  const repos = new Set();

  // Discover repos using the same search queries
  for (const query of searchQueries) {
    try {
      const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=50`;
      const response = await fetch(url, { headers });
      if (!response.ok) continue;

      const data = await response.json();
      for (const repo of data.items || []) {
        repos.add(repo.full_name);
      }

      await sleep(100); // rate limiting
    } catch (error) {
      // Continue with other queries
    }
  }

  console.log(`Found ${repos.size} unique repos to prime\n`);

  // Fire stats requests for all repos — we don't care about the response
  let primed = 0;
  for (const fullName of repos) {
    try {
      const url = `${GITHUB_API_BASE}/repos/${fullName}/stats/code_frequency`;
      await fetch(url, { headers });
      primed++;
      await sleep(100); // rate limiting
    } catch (error) {
      // Ignore — just warming the cache
    }
  }

  console.log(`✅ Primed stats cache for ${primed} repos`);
  console.log('   GitHub will compute these in the background over the next few minutes.');
}

main().catch(error => {
  console.error('❌ Cache priming failed:', error.message);
  process.exit(1);
});
