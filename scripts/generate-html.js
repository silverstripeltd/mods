/**
 * Static HTML Generator for Silverstripe Modules Site
 * Processes module data and generates static HTML from templates
 *
 * This module creates static HTML files by:
 * 1. Processing module data with proper escaping and formatting
 * 2. Generating individual module articles with interactive elements
 * 3. Formatting dates and versions for display
 * 4. Creating organization avatars from GitHub URLs
 * 5. Replacing template placeholders with generated content
 *
 * @requires fs File system operations for reading templates and writing output
 * @requires path Path utilities for file operations
 */

// filepath: scripts/generate-html.js
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { minify as minifyHTML } from 'html-minifier-terser';

/**
 * Static HTML Generator Class
 * Handles the generation of static HTML content from module data
 */
class StaticHTMLGenerator {
  /**
   * Initialize the generator with module data
   * @param {Array} modules - Array of module objects with name, description, url, published, version
   */
  constructor(modules) {
    this.modules = modules;

    // NZ timezone formatters for consistent date handling
    this.nzDateFormatter = new Intl.DateTimeFormat('en-NZ', {
      timeZone: 'Pacific/Auckland',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    this.nzDayFormatter = new Intl.DateTimeFormat('en-NZ', {
      timeZone: 'Pacific/Auckland',
      weekday: 'long'
    });
    this.todayNZ = this.nzDateFormatter.format(new Date());
  }

  /**
   * Format module name with vendor/package separation and organization avatars
   * Handles Composer-style package names (vendor/package) with GitHub integration
   * @param {string} name - Module name (may include vendor prefix)
   * @param {string} githubUrl - GitHub repository URL for avatar extraction
   * @returns {string} Formatted HTML for module name display
   */
  formatModuleName(name, githubUrl) {
    if (name.includes('/')) {
      const parts = name.split('/');
      const vendor = this.escapeHtml(parts[0]);
      const packageName = this.escapeHtml(parts.slice(1).join('/'));

      // Extract organization from GitHub URL for avatar background
      let orgAvatar = '';
      if (githubUrl) {
        const urlMatch = githubUrl.match(/github\.com\/([^\/]+)/);
        if (urlMatch) {
          const orgName = urlMatch[1];
          orgAvatar = `style="--org-avatar: url('https://github.com/${orgName}.png?size=32')"`;
        }
      }

      return `
        <span class="module-name-vendor" ${orgAvatar}>${vendor}</span>
        <span class="module-name-package">/${packageName}</span>
      `;
    }

    return this.escapeHtml(name);
  }

  /**
   * Format date string to NZ locale format (dd/mm/yyyy) in NZ timezone
   * @param {string} dateString - ISO date string or date-parseable string
   * @returns {string} Formatted date string or 'Unknown' if invalid
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }
      return this.nzDateFormatter.format(date);
    } catch (error) {
      console.warn('Failed to format date:', dateString, error);
      return 'Unknown';
    }
  }

  /**
   * Create version badge HTML element
   * @param {string|null} version - Version string or null
   * @returns {string} HTML span element for version display
   */
  createVersionBadge(version) {
    if (version) {
      return `<span class="version-badge">${this.escapeHtml(version)}</span>`;
    }
    return `<span class="version-badge no-version">-</span>`;
  }

  /**
   * Generate an inline SVG sparkline from weekly commit activity data
   * Creates a filled area chart with stroke line, plus month range labels
   * @param {number[]} activity - Array of up to 13 weekly commit totals (oldest first)
   * @returns {string} HTML string containing SVG sparkline and range labels
   */
  generateSparkline(activity) {
    const width = 110;
    const height = 28;
    const padding = 2;

    // Default to empty if no data; copy and pad to 13 if shorter
    if (!activity || activity.length === 0) {
      activity = new Array(13).fill(0);
    } else {
      activity = activity.slice(); // avoid mutating caller's data
    }
    while (activity.length < 13) activity.unshift(0);

    const max = Math.max(...activity, 1); // avoid division by zero
    const stepX = width / (activity.length - 1);

    const points = activity.map((val, i) => {
      const x = Math.round(i * stepX * 10) / 10;
      const y = Math.round((height - padding - (val / max) * (height - padding)) * 10) / 10;
      return `${x},${y}`;
    });

    const polylinePoints = points.join(' ');
    const pathD = `M0,${height} L${points.join(' L')} L${width},${height}Z`;

    const noData = activity.every(v => v === 0);
    const fillOpacity = noData ? '0.06' : '0.10';
    const strokeOpacity = noData ? ' opacity="0.3"' : '';

    // Compute month abbreviation for 3 months ago
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const monthLabel = threeMonthsAgo.toLocaleString('en-NZ', {
      month: 'short',
      timeZone: 'Pacific/Auckland'
    });

    const unavailableLabel = noData
      ? `<text x="${width / 2}" y="12" text-anchor="middle" dominant-baseline="middle" fill="var(--text-muted)" font-size="9" font-family="-apple-system, BlinkMacSystemFont, sans-serif">data unavailable</text>`
      : '';

    return `<div class="sparkline-wrap">
                                          <svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-label="${noData ? 'Activity data unavailable' : '13 weeks of commit activity'}">
                                            <path d="${pathD}" fill="rgba(0,90,225,${fillOpacity})" stroke="none"/>
                                            <polyline points="${polylinePoints}" stroke="#005ae1" stroke-width="1.5" fill="none" stroke-linejoin="round" stroke-linecap="round"${strokeOpacity}/>
                                            ${unavailableLabel}
                                          </svg>
                                          <div class="sparkline-range"><span>${monthLabel}</span><span>now</span></div>
                                        </div>`;
  }

  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} HTML-escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Get a relative date group label for a module's published date (NZ timezone)
   * @param {string} dateString - ISO date string
   * @returns {{ label: string, css: string }}
   */
  getDateGroupLabel(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return { label: 'Unknown', css: '' };

      const moduleDate = this.nzDateFormatter.format(date);

      // Both dates are parsed from NZ-formatted strings (dd/mm/yyyy), so the
      // timezone of the Date constructor cancels out in the subtraction.
      const todayParts = this.todayNZ.split('/');
      const moduleParts = moduleDate.split('/');
      const todayDate = new Date(todayParts[2], todayParts[1] - 1, todayParts[0]);
      const moduleDay = new Date(moduleParts[2], moduleParts[1] - 1, moduleParts[0]);
      const diffDays = Math.round((todayDate - moduleDay) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) return { label: 'Today', css: 'group-today' };
      if (diffDays === 1) return { label: 'Yesterday', css: 'group-yesterday' };
      if (diffDays < 7) {
        const dayName = this.nzDayFormatter.format(date);
        return { label: dayName, css: '' };
      }
      return { label: this.formatDate(dateString), css: 'group-date' };
    } catch {
      return { label: 'Unknown', css: '' };
    }
  }

  /**
   * Generate HTML anchor element for a single module
   * Creates accessible, semantic module links with article content that open in new tabs
   * @param {Object} module - Module object with name, description, url, published, version
   * @returns {string} Complete HTML anchor element containing article
   */
  generateModuleArticle(module) {
    const moduleName = this.formatModuleName(module.name, module.url);
    const escapedDescription = this.escapeHtml(module.description);
    const versionBadge = this.createVersionBadge(module.version);

    return `
            <a href="${module.url}" target="_blank" rel="noopener noreferrer" class="module-item"
                aria-label="View ${this.escapeHtml(module.name)} repository on GitHub">
              <article class="module-content">
                <h3 class="visually-hidden">Module: ${this.escapeHtml(module.name)}</h3>
                <div class="module-name-section">
                  <div class="module-name"><span class="visually-hidden">Module name: </span>${moduleName}</div>
                </div>
                <div class="module-description-section">
                  <div class="module-description"><span class="visually-hidden">Description: </span>${escapedDescription}</div>
                </div>
                <div class="module-version-section">
                  <span class="visually-hidden">Version: </span>${versionBadge}
                </div>
                <div class="module-activity-section">
                  <span class="visually-hidden">Commit activity: </span>${this.generateSparkline(module.activity)}
                </div>
              </article>
            </a>`;
  }

  /**
   * Generate HTML for all modules, grouped by date into separate sections.
   * Each group gets an h2 heading and its own table container.
   * Column headers only appear on the first group.
   * Assumes modules are pre-sorted by published date (newest first).
   * @returns {string} Combined HTML with date group sections
   */
  generateModuleArticles() {
    console.log('Generating grouped module articles...');

    // Group modules by date label (sequential run-length grouping)
    const groups = [];
    let currentLabel = null;

    this.modules.forEach((module, index) => {
      console.log(`Processing module ${index + 1}: ${module.name}`);
      const group = this.getDateGroupLabel(module.published);
      if (group.label !== currentLabel) {
        groups.push({ label: group.label, css: group.css, modules: [module] });
        currentLabel = group.label;
      } else {
        groups[groups.length - 1].modules.push(module);
      }
    });

    return groups.map((group, groupIndex) => {
      const count = group.modules.length;
      const modulesHtml = group.modules.map(m => this.generateModuleArticle(m)).join('');

      const headerHtml = groupIndex === 0 ? `
                        <div class="modules-header" aria-hidden="true">
                            <div class="header-name">Module Name</div>
                            <div class="header-description">Description</div>
                            <div class="header-version">Version</div>
                            <div class="header-activity">Activity</div>
                        </div>` : '';

      return `
                <section class="date-group ${group.css}" aria-label="Modules released ${this.escapeHtml(group.label)}">
                    <h2 class="date-group-heading">
                        ${this.escapeHtml(group.label)}
                        <span class="date-count">${count} module${count !== 1 ? 's' : ''}</span>
                    </h2>
                    <div class="modules-container">
                        <div class="modules-wrapper">
                            <div class="modules-list">
                                ${headerHtml}
                                <div class="modules-grid">
                                    ${modulesHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>`;
    }).join('');
  }

  /**
   * Get current timestamp formatted for NZ locale and timezone
   * @returns {string} Formatted timestamp string with timezone
   */
  getCurrentTimestamp() {
    const now = new Date();
    return now.toLocaleDateString('en-NZ', {
      timeZone: 'Pacific/Auckland',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  }

  /**
   * Generate complete HTML file from template and module data
   * Reads template, processes placeholders, minifies, and writes output file
   * @param {string} templatePath - Path to HTML template file
   * @param {string} outputPath - Path for generated HTML output
   * @returns {void}
   */
  async generateHTML(templatePath, outputPath) {
    // Read the HTML template
    const template = readFileSync(templatePath, 'utf-8');

    // Generate module links and metadata
    const moduleArticles = this.generateModuleArticles();
    const timestamp = this.getCurrentTimestamp();

    // Replace placeholders in template with generated content
    let html = template
      .replace('{{MODULE_ARTICLES}}', moduleArticles)
      .replace('{{LAST_UPDATED}}', timestamp);

    // Minify the HTML for production
    try {
      html = await minifyHTML(html, {
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        sortClassName: true,
        useShortDoctype: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        preserveLineBreaks: false,
        minifyCSS: true,
        minifyJS: true
      });
      console.log('✅ HTML minified for production');
    } catch (error) {
      console.warn('⚠️  HTML minification failed, using unminified version:', error.message);
    }

    // Write the generated HTML to output file
    writeFileSync(outputPath, html, 'utf-8');
    console.log(`✅ Generated static HTML with ${this.modules.length} modules: ${outputPath}`);
  }
}

/**
 * Export function for generating static HTML
 * Main entry point for HTML generation functionality
 * @param {Array} modules - Array of module objects
 * @param {string} templatePath - Path to HTML template
 * @param {string} outputPath - Path for output HTML file
 * @returns {Promise<void>}
 */
export async function generateStaticHTML(modules, templatePath, outputPath) {
  const generator = new StaticHTMLGenerator(modules);
  await generator.generateHTML(templatePath, outputPath);
}

// Main execution when run directly
// This allows the script to be both imported and executed standalone
(async () => {
  try {
    console.log('Starting HTML generation...');

    // Read the modules data from JSON file
    const modulesData = JSON.parse(readFileSync('data/modules.json', 'utf-8'));
    console.log(`Loaded ${modulesData.length} modules`);

    // Generate the static HTML using the loaded data
    console.log('Creating generator...');
    await generateStaticHTML(
      modulesData,
      'site/index-template.html',
      'site/index.html'
    );
  } catch (error) {
    console.error('❌ Error generating HTML:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
})();
