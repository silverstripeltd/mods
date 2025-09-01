/**
 * Silverstripe Modules Fetcher
 *
 * This script fetches the latest Silverstripe modules from GitHub and Packagist APIs.
 * It searches for repositories and packages that are identified as Silverstripe modules
 * and creates a JSON data file with module information including versions and release dates.
 */

// filepath: scripts/fetch-modules.js
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// Configuration constants
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';
const PACKAGIST_API_BASE = 'https://packagist.org';
const MAX_MODULES = 20;

/**
 * ModuleFetcher Class
 *
 * Handles fetching and processing Silverstripe modules from GitHub and Packagist APIs.
 * Implements rate limiting, caching, and fallback strategies to ensure reliable data collection.
 */
class ModuleFetcher {
  /**
   * Initialize the ModuleFetcher with API configuration
   * Sets up authentication headers and rate limiting
   */
  constructor() {
    // Configure GitHub API headers with authentication if available
    this.headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Silverstripe-Mods-Bot/1.0'
    };

    if (GITHUB_TOKEN) {
      this.headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    } else {
      console.warn('⚠️  No GITHUB_TOKEN found. API rate limits will be much lower.');
    }

    // Rate limiting and caching properties
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.notFoundCache = new Set(); // Cache 404 responses to avoid duplicate calls
  }

  /**
   * Sleep utility function for rate limiting
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after the specified time
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Rate-limited fetch wrapper
   * Implements delays between requests and caches 404 responses
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} The fetch response
   */
  async rateLimitedFetch(url, options = {}) {
    // Check cache for known 404s to avoid redundant requests
    if (this.notFoundCache.has(url)) {
      throw new Error('HTTP 404: Not Found (cached)');
    }

    // Add delay between requests to be gentle on the API
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < 100) { // Min 100ms between requests
      await this.sleep(100 - timeSinceLastRequest);
    }

    // Track request count for logging
    this.requestCount++;
    this.lastRequestTime = Date.now();

    if (this.requestCount % 10 === 0) {
      console.log(`📊 Made ${this.requestCount} API requests so far...`);
    }

    return this.fetchWithRetry(url, options);
  }

  /**
   * Fetch with retry logic and enhanced error handling
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @param {number} maxRetries - Maximum number of retry attempts
   * @returns {Promise<Response>} The fetch response
   */
  async fetchWithRetry(url, options = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, { ...options, headers: { ...this.headers, ...options.headers } });
        if (response.ok) {
          return response;
        }

        // Enhanced error logging with rate limit information
        const errorDetails = {
          status: response.status,
          statusText: response.statusText,
          url: url.replace(GITHUB_TOKEN, 'TOKEN_HIDDEN'),
          rateLimitRemaining: response.headers.get('x-ratelimit-remaining'),
          rateLimitReset: response.headers.get('x-ratelimit-reset'),
          rateLimitUsed: response.headers.get('x-ratelimit-used')
        };

        // Handle specific HTTP status codes
        if (response.status === 403) {
          if (response.headers.get('x-ratelimit-remaining') === '0') {
            const resetTime = response.headers.get('x-ratelimit-reset');
            const resetDate = new Date(resetTime * 1000);
            console.warn(`⚠️  Rate limit exceeded. Resets at ${resetDate.toLocaleTimeString()}`);
            console.warn(`   Used: ${response.headers.get('x-ratelimit-used')} requests`);
          } else {
            console.warn(`⚠️  HTTP 403 Forbidden (not rate limit): ${url.split('?')[0]}`);
            const responseText = await response.text();
            console.warn(`   Response: ${responseText.substring(0, 200)}`);
          }
        } else if (response.status === 422) {
          const responseText = await response.text();
          console.warn(`⚠️  HTTP 422 Validation Error: ${url.split('?')[0]}`);
          console.warn(`   Response: ${responseText.substring(0, 200)}`);
        } else if (response.status === 404) {
          // Don't retry 404s - the resource doesn't exist
          console.log(`⚠️  HTTP 404: Resource not found (no releases) - ${url.split('?')[0]}`);
          this.notFoundCache.add(url); // Cache this 404 to avoid future calls
          throw new Error(`HTTP ${response.status}: ${response.statusText}`, { noRetry: true });
        } else {
          console.warn(`⚠️  HTTP ${response.status}: ${response.statusText} - ${url.split('?')[0]}`);
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        // Don't retry 404s - resource doesn't exist
        if (error.message.includes('HTTP 404')) {
          throw error;
        }

        if (i === maxRetries - 1) {
          console.error(`❌ Final attempt failed for: ${url.split('?')[0]}`);
          console.error(`   Error: ${error.message}`);
          throw error;
        }
        console.warn(`🔄 Attempt ${i + 1} failed for ${url.split('?')[0]}: ${error.message}, retrying...`);
        await this.sleep(1000 * (i + 1)); // Exponential backoff
      }
    }
  }

  /**
   * Sleep utility function (duplicate method - should be removed)
   * @deprecated Use the sleep method defined in constructor scope
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Promise that resolves after the specified time
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Search GitHub repositories for Silverstripe modules
   * Uses multiple search strategies to find diverse and recent modules
   * @returns {Promise<Array>} Array of module data objects
   */
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
      'user:jonom language:PHP',
      'user:lozcalver language:PHP', // kinglozzer/metatitle is actually here
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

      // Priority 5: Simplified content-based searches to avoid rate limits
      'silverstripe in:name language:PHP',
      '"silverstripe/framework" in:file filename:composer.json'
    ];    const foundRepos = new Set();
    const modules = [];

    for (const query of searchQueries) {
      if (modules.length >= MAX_MODULES * 3) break; // Get more than we need for better diversity

      try {
        // Sort by updated (recently maintained) rather than created (first published)
        const url = `${GITHUB_API_BASE}/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=50`;
        const response = await this.rateLimitedFetch(url);
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

  /**
   * Validate if a GitHub repository is a Silverstripe module
   * Checks composer.json for Silverstripe-specific indicators
   * @param {Object} repo - GitHub repository object from API
   * @returns {Promise<boolean>} True if the repository is a valid Silverstripe module
   */
  async validateSilverstripeModule(repo) {
    try {
      // Check if composer.json exists and has silverstripe type
      const composerUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/contents/composer.json`;
      const response = await this.rateLimitedFetch(composerUrl);

      if (!response.ok) return false;

      const data = await response.json();
      const composerContent = Buffer.from(data.content, 'base64').toString('utf-8');
      const composer = JSON.parse(composerContent);

      // Check if it's a Silverstripe module by examining composer.json
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

  /**
   * Extract module data from a GitHub repository
   * Gathers package name, description, version, and publication date
   * @param {Object} repo - GitHub repository object from API
   * @returns {Promise<Object|null>} Module data object or null if extraction fails
   */
  async extractModuleData(repo) {
    try {
      // Try to get composer.json for accurate package name and description
      let packageName = repo.full_name;
      let description = repo.description || 'No description available';

      try {
        const composerUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/contents/composer.json`;
        const response = await this.rateLimitedFetch(composerUrl);

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

      // Try to get the most recent activity date
      let publishedDate = repo.pushed_at || repo.updated_at; // Use recent push/update as primary

      try {
        // Try to get latest release date
        const releasesUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/releases/latest`;
        const releasesResponse = await this.rateLimitedFetch(releasesUrl);

        if (releasesResponse.ok) {
          const release = await releasesResponse.json();
          if (release.published_at) {
            // Use the more recent of: latest release or latest push
            const releaseDate = new Date(release.published_at);
            const pushDate = new Date(publishedDate);
            publishedDate = releaseDate > pushDate ? release.published_at : publishedDate;
          }
        }
      } catch (error) {
        // Keep using push/update date
      }

      return {
        name: packageName,
        description: description.trim(),
        url: repo.html_url,
        published: publishedDate,
        version: await this.getLatestVersion(repo)
      };
    } catch (error) {
      console.warn(`Failed to extract data for ${repo.full_name}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get the latest version/release tag for a repository
   * Tries releases first, falls back to tags if no releases are found
   * @param {Object} repo - GitHub repository object from API
   * @returns {Promise<string|null>} Latest version string or null if none found
   */
  async getLatestVersion(repo) {
    try {
      // Try to get the latest release first
      const releasesUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/releases/latest`;
      const response = await this.rateLimitedFetch(releasesUrl);

      if (response.ok) {
        const release = await response.json();
        return release.tag_name || release.name || null;
      }

      // Fallback to tags if no releases are available
      const tagsUrl = `${GITHUB_API_BASE}/repos/${repo.full_name}/tags?per_page=1`;
      const tagsResponse = await this.rateLimitedFetch(tagsUrl);

      if (tagsResponse.ok) {
        const tags = await tagsResponse.json();
        return tags.length > 0 ? tags[0].name : null;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Fallback method to search Packagist when GitHub search yields insufficient results
   * @returns {Promise<Array>} Array of module data objects from Packagist
   */
  /**
   * Fallback method to search Packagist when GitHub search yields insufficient results
   * @returns {Promise<Array>} Array of module data objects from Packagist
   */
  async fallbackToPackagist() {
    console.log('Falling back to Packagist search...');

    try {
      const response = await this.fetchWithRetry(`${PACKAGIST_API_BASE}/search.json?q=silverstripe&type=silverstripe-module&per_page=100`);
      const data = await response.json();

      const modules = await Promise.all(
        data.results.map(module => this.extractPackagistModuleData(module))
      );

      return modules.filter(module => module !== null);
    } catch (error) {
      console.error('Packagist fallback failed:', error);
      return [];
    }
  }

  /**
   * Extract module data from Packagist API response
   * @param {Object} module - Packagist module object from search results
   * @returns {Promise<Object|null>} Extracted module data or null if extraction fails
   */
  async extractPackagistModuleData(module) {
    try {
      const detailResponse = await this.fetchWithRetry(`${PACKAGIST_API_BASE}/packages/${module.name}.json`);
      const detail = await detailResponse.json();

      const latestVersion = detail.package.versions[detail.package.version];
      const publishedDate = new Date(latestVersion.time);

      return {
        name: module.name,
        description: module.description || 'No description available',
        url: module.url || latestVersion.homepage || `https://packagist.org/packages/${module.name}`,
        published: publishedDate,
        version: detail.package.version
      };
    } catch (error) {
      console.warn(`Failed to extract Packagist data for ${module.name}: ${error.message}`);
      return null;
    }
  }

  /**
   * Sort modules by publication date (newest first)
   * @param {Array} modules - Array of module objects with published property
   * @returns {Array} Sorted array of modules
   */
  sortModulesByDate(modules) {
    return modules.sort((a, b) => new Date(b.published) - new Date(a.published));
  }

  /**
   * Main method to fetch and process all Silverstripe modules
   * Orchestrates the entire data collection process from multiple sources
   * @returns {Promise<Array>} Array of processed module objects sorted by date
   */
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

/**
 * Main execution function
 * Creates a ModuleFetcher instance and saves the fetched data to JSON file
 * Handles errors gracefully and provides console output for monitoring
 * @returns {Promise<void>}
 */
async function main() {
  console.log('Fetching Silverstripe modules...\n');

  try {
    // Initialize the fetcher and retrieve all module data
    const fetcher = new ModuleFetcher();
    const modules = await fetcher.fetchModules();

    // Ensure the data directory exists for output
    mkdirSync('data', { recursive: true });

    // Write the processed modules data to JSON file
    writeFileSync('data/modules.json', JSON.stringify(modules, null, 2));
    console.log(`\n✅ Successfully wrote ${modules.length} modules to data/modules.json`);

  } catch (error) {
    console.error('❌ Failed to fetch modules:', error.message);
    process.exit(1);
  }
}

// Execute the main function
main();
