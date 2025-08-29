// filepath: scripts/fetch-modules.js
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';
const PACKAGIST_API_BASE = 'https://packagist.org';
const MAX_MODULES = 20;

class ModuleFetcher {
  constructor() {
    this.headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'silverstripe-modules-site/1.0.0'
    };

    if (GITHUB_TOKEN) {
      this.headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }
  }

  async fetchWithRetry(url, options = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, { ...options, headers: { ...this.headers, ...options.headers } });
        if (response.ok) {
          return response;
        }
        if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
          const resetTime = response.headers.get('x-ratelimit-reset');
          console.warn(`Rate limit exceeded. Reset at ${new Date(resetTime * 1000)}`);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        console.warn(`Attempt ${i + 1} failed, retrying...`);
        await this.sleep(1000 * (i + 1));
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async searchGitHubRepositories() {
    console.log('Searching GitHub for Silverstripe modules...');

    // Balanced search strategy prioritizing recent activity and organizations from composer.json
    const searchQueries = [
      // Priority 1: Recent activity across all Silverstripe repos (most important)
      'silverstripe language:PHP pushed:>2024-01-01',
      'silverstripe language:PHP updated:>2024-06-01',
      
      // Priority 2: Main organizations with recent activity  
      'user:silverstripe language:PHP pushed:>2023-01-01',
      
      // Priority 3: Topic-based searches (well-categorized modules)
      'topic:silverstripe-vendormodule language:PHP',
      'topic:silverstripe-module language:PHP', 
      'topic:silverstripe-theme language:PHP',
      
      // Priority 4: Organizations from your composer.json + other active contributors
      'user:jonom silverstripe language:PHP',
      'user:kinglozzer silverstripe language:PHP', 
      'user:nswdpc silverstripe language:PHP',
      'user:silverstripe-terraformers silverstripe language:PHP',
      'user:wilr silverstripe language:PHP',
      'user:sunnysideup silverstripe language:PHP',
      'user:dnadesign silverstripe language:PHP',
      'user:tractorcow silverstripe language:PHP',
      'user:firesphere silverstripe language:PHP',
      'user:bigfork silverstripe language:PHP',
      'user:lekoala silverstripe language:PHP',
      'user:axllent silverstripe language:PHP',
      
      // Priority 5: Content-based searches for packages that might not be properly tagged
      'silverstripe in:name language:PHP pushed:>2023-01-01',
      '"silverstripe/framework" in:file filename:composer.json pushed:>2023-01-01',
      '"silverstripe/cms" in:file filename:composer.json pushed:>2023-01-01'
    ];

    const foundRepos = new Set();
    const modules = [];

    for (const query of searchQueries) {
      if (modules.length >= MAX_MODULES * 3) break; // Get more than we need for better diversity

      try {
        // Sort by updated (recently maintained) rather than created (first published)
        const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=50`;
        const response = await this.fetchWithRetry(url);
        const data = await response.json();

        for (const repo of data.items || []) {
          if (modules.length >= MAX_MODULES) break;
          if (foundRepos.has(repo.full_name)) continue;

          foundRepos.add(repo.full_name);

          try {
            const isValidModule = await this.validateSilverstripeModule(repo);
            if (isValidModule) {
              const moduleData = await this.extractModuleData(repo);
              if (moduleData) {
                modules.push(moduleData);
                console.log(`✓ Found module: ${moduleData.name}`);
              }
            }
          } catch (error) {
            console.warn(`Failed to validate ${repo.full_name}: ${error.message}`);
          }
        }
      } catch (error) {
        console.warn(`Search query failed: ${query} - ${error.message}`);
      }
    }

    return modules;
  }

  async validateSilverstripeModule(repo) {
    try {
      // Check if composer.json exists and has silverstripe type
      const composerUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/contents/composer.json`;
      const response = await this.fetchWithRetry(composerUrl);

      if (!response.ok) return false;

      const data = await response.json();
      const composerContent = Buffer.from(data.content, 'base64').toString('utf-8');
      const composer = JSON.parse(composerContent);

      // Check if it's a Silverstripe module
      const type = composer.type || '';
      const keywords = composer.keywords || [];
      const name = composer.name || '';

      return (
        type.includes('silverstripe-') ||
        keywords.some(k => k.toLowerCase().includes('silverstripe')) ||
        name.toLowerCase().includes('silverstripe')
      );
    } catch (error) {
      // Fallback: check if repo name suggests it's a Silverstripe module
      return repo.full_name.toLowerCase().includes('silverstripe') ||
             (repo.description && repo.description.toLowerCase().includes('silverstripe'));
    }
  }

  async extractModuleData(repo) {
    try {
      // Try to get composer.json for package name
      let packageName = repo.full_name;
      let description = repo.description || 'No description available';

      try {
        const composerUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/contents/composer.json`;
        const response = await this.fetchWithRetry(composerUrl);

        if (response.ok) {
          const data = await response.json();
          const composerContent = Buffer.from(data.content, 'base64').toString('utf-8');
          const composer = JSON.parse(composerContent);

          if (composer.name) packageName = composer.name;
          if (composer.description) description = composer.description;
        }
      } catch (error) {
        // Use repo data as fallback
      }

      // Try to get first release date, fallback to creation date
      let publishedDate = repo.created_at;

      try {
        const releasesUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/releases?per_page=1&direction=asc`;
        const releasesResponse = await this.fetchWithRetry(releasesUrl);

        if (releasesResponse.ok) {
          const releases = await releasesResponse.json();
          if (releases.length > 0) {
            publishedDate = releases[0].published_at || releases[0].created_at;
          }
        }
      } catch (error) {
        // Use creation date as fallback
      }

      return {
        name: packageName,
        description: description.trim(),
        url: repo.html_url,
        published: publishedDate,
        version: publishedDate !== repo.created_at ? await this.getLatestVersion(repo) : null
      };
    } catch (error) {
      console.warn(`Failed to extract data for ${repo.full_name}: ${error.message}`);
      return null;
    }
  }

  async getLatestVersion(repo) {
    try {
      const releasesUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/releases/latest`;
      const response = await this.fetchWithRetry(releasesUrl);

      if (response.ok) {
        const release = await response.json();
        return release.tag_name || release.name || null;
      }

      // Fallback to tags if no releases
      const tagsUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/tags?per_page=1`;
      const tagsResponse = await this.fetchWithRetry(tagsUrl);

      if (tagsResponse.ok) {
        const tags = await tagsResponse.json();
        return tags.length > 0 ? tags[0].name : null;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async fallbackToPackagist() {
    console.log('Falling back to Packagist API...');

    const modules = [];
    const packageTypes = ['silverstripe-vendormodule', 'silverstripe-module'];

    for (const type of packageTypes) {
      if (modules.length >= MAX_MODULES) break;

      try {
        const url = `${PACKAGIST_API_BASE}/search.json?q=silverstripe&type=${type}&per_page=50`;
        const response = await fetch(url);

        if (!response.ok) continue;

        const data = await response.json();

        for (const pkg of data.results || []) {
          if (modules.length >= MAX_MODULES) break;

          try {
            const moduleData = await this.extractPackagistModuleData(pkg);
            if (moduleData) {
              modules.push(moduleData);
              console.log(`✓ Found module via Packagist: ${moduleData.name}`);
            }
          } catch (error) {
            console.warn(`Failed to process package ${pkg.name}: ${error.message}`);
          }
        }
      } catch (error) {
        console.warn(`Packagist search failed for type ${type}: ${error.message}`);
      }
    }

    return modules;
  }

  async extractPackagistModuleData(pkg) {
    try {
      let publishedDate = new Date().toISOString(); // fallback to now

      // Try to get GitHub repo creation date
      if (pkg.repository) {
        const repoUrl = pkg.repository.replace('https://github.com/', '');
        try {
          const githubUrl = `${GITHUB_API_BASE}/repos/${repoUrl}`;
          const response = await this.fetchWithRetry(githubUrl);

          if (response.ok) {
            const repoData = await response.json();
            publishedDate = repoData.created_at;
          }
        } catch (error) {
          // Use fallback date
        }
      }

      return {
        name: pkg.name,
        description: pkg.description || 'No description available',
        url: pkg.repository || pkg.url || `https://packagist.org/packages/${pkg.name}`,
        published: publishedDate,
        version: null // Packagist doesn't easily provide latest version info
      };
    } catch (error) {
      console.warn(`Failed to extract Packagist data for ${pkg.name}: ${error.message}`);
      return null;
    }
  }

  sortModulesByDate(modules) {
    return modules.sort((a, b) => new Date(b.published) - new Date(a.published));
  }

  async fetchModules() {
    let modules = [];

    try {
      modules = await this.searchGitHubRepositories();

      if (modules.length < MAX_MODULES) {
        console.log(`Only found ${modules.length} modules via GitHub, trying Packagist...`);
        const packagistModules = await this.fallbackToPackagist();

        // Merge and deduplicate
        const existingNames = new Set(modules.map(m => m.name));
        const newModules = packagistModules.filter(m => !existingNames.has(m.name));
        modules = [...modules, ...newModules];
      }

    } catch (error) {
      console.error('GitHub search failed, using Packagist only:', error.message);
      modules = await this.fallbackToPackagist();
    }

    // Sort by published date and limit to MAX_MODULES
    modules = this.sortModulesByDate(modules).slice(0, MAX_MODULES);

    console.log(`\nFound ${modules.length} Silverstripe modules`);
    if (modules.length > 0) {
      console.log('Top 3 modules:');
      modules.slice(0, 3).forEach((mod, i) => {
        console.log(`  ${i + 1}. ${mod.name} (${mod.published.split('T')[0]})`);
      });
    }

    return modules;
  }
}

async function main() {
  console.log('Fetching Silverstripe modules...\n');

  try {
    const fetcher = new ModuleFetcher();
    const modules = await fetcher.fetchModules();

    // Ensure data directory exists
    mkdirSync('data', { recursive: true });

    // Write modules data
    writeFileSync('data/modules.json', JSON.stringify(modules, null, 2));
    console.log(`\n✅ Successfully wrote ${modules.length} modules to data/modules.json`);

  } catch (error) {
    console.error('❌ Failed to fetch modules:', error.message);
    process.exit(1);
  }
}

main();
