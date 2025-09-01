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
   * Format date string to NZ locale format (dd/mm/yyyy)
   * @param {string} dateString - ISO date string or date-parseable string
   * @returns {string} Formatted date string or 'Unknown' if invalid
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }

      // Format as dd/mm/yyyy for NZ locale
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
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
   * Generate HTML anchor element for a single module
   * Creates accessible, semantic module links with article content that open in new tabs
   * @param {Object} module - Module object with name, description, url, published, version
   * @returns {string} Complete HTML anchor element containing article
   */
  generateModuleArticle(module) {
    const moduleName = this.formatModuleName(module.name, module.url);
    const escapedDescription = this.escapeHtml(module.description);
    const formattedDate = this.formatDate(module.published);
    const versionBadge = this.createVersionBadge(module.version);

    return `
            <a href="${module.url}" target="_blank" rel="noopener noreferrer" class="module-item"
                aria-label="View ${this.escapeHtml(module.name)} repository on GitHub">
              <article class="module-content">
                <h2 class="visually-hidden">Module: ${this.escapeHtml(module.name)}</h2>
                <div class="module-name-section">
                  <div class="module-name"><span class="visually-hidden">Module name: </span>${moduleName}</div>
                </div>
                <div class="module-description-section">
                  <div class="module-description"><span class="visually-hidden">Description: </span>${escapedDescription}</div>
                </div>
                <div class="module-version-section">
                  <span class="visually-hidden">Version: </span>${versionBadge}
                </div>
                <div class="module-date-section">
                  <div class="module-date"><span class="visually-hidden">Released: </span>${formattedDate}</div>
                </div>
              </article>
            </a>`;
  }

  /**
   * Generate HTML for all module links
   * Processes the entire module array and creates anchor elements
   * @returns {string} Combined HTML for all module links
   */
  generateModuleArticles() {
    console.log('Generating module articles...');
    return this.modules.map((module, index) => {
      console.log(`Processing module ${index + 1}: ${module.name}`);
      return this.generateModuleArticle(module);
    }).join('');
  }

  /**
   * Get current timestamp formatted for NZ locale
   * @returns {string} Formatted timestamp string with timezone
   */
  getCurrentTimestamp() {
    const now = new Date();
    return now.toLocaleDateString('en-NZ', {
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
      .replace('{{LAST_UPDATED}}', timestamp)
      .replace('{{MODULE_COUNT}}', this.modules.length);

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
