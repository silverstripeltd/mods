/**
 * RSS Feed Generator for Silverstripe Modules Site
 * Creates RSS/XML feeds for module updates and syndication
 *
 * This module generates RSS feeds by:
 * 1. Processing module data into RSS-compliant XML items
 * 2. Creating proper RSS channel metadata and headers
 * 3. Formatting descriptions with module information
 * 4. Generating unique GUIDs for each module entry
 * 5. Escaping XML content to ensure valid feed structure
 *
 * The RSS feed allows users to subscribe to module updates and
 * enables automated syndication of new Silverstripe modules.
 *
 * @requires fs File system operations for writing RSS files
 */

// filepath: scripts/generate-rss.js
import { writeFileSync } from 'fs';

/**
 * RSS Generator Class
 * Handles the creation of RSS/XML feeds from module data
 */
class RSSGenerator {
  /**
   * Initialize RSS generator with modules and site configuration
   * @param {Array} modules - Array of module objects
   * @param {Object} siteConfig - Site configuration with title, description, URL, email
   */
  constructor(modules, siteConfig) {
    this.modules = modules;
    this.siteConfig = siteConfig;
  }

  /**
   * Generate complete RSS feed XML
   * Limits to most recent 20 modules to keep feed manageable
   * @returns {string} Complete RSS XML feed content
   */
  generate() {
    // Limit to most recent 20 modules for RSS feed performance
    const rssItems = this.modules.slice(0, 20).map(module => this.createRSSItem(module));
    const rss = this.createRSSFeed(rssItems);
    return rss;
  }

  /**
   * Create complete RSS feed XML structure with channel metadata
   * @param {Array} items - Array of RSS item XML strings
   * @returns {string} Complete RSS feed XML document
   */
  createRSSFeed(items) {
    const now = new Date();
    const buildDate = now.toUTCString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${this.escapeXml(this.siteConfig.title)}</title>
    <link>${this.siteConfig.siteUrl}</link>
    <description>${this.escapeXml(this.siteConfig.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <pubDate>${buildDate}</pubDate>
    <generator>Silverstripe Mods Generator</generator>
    <webMaster>${this.siteConfig.email || 'noreply@example.com'} (Silverstripe Mods)</webMaster>
    <managingEditor>${this.siteConfig.email || 'noreply@example.com'} (Silverstripe Mods)</managingEditor>
    <atom:link href="${this.siteConfig.siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${this.siteConfig.siteUrl}/images/meta-image.jpg</url>
      <title>${this.escapeXml(this.siteConfig.title)}</title>
      <link>${this.siteConfig.siteUrl}</link>
      <width>1200</width>
      <height>630</height>
    </image>
${items.join('')}
  </channel>
</rss>`;
  }

  /**
   * Create individual RSS item XML for a single module
   * @param {Object} module - Module object with name, description, url, published, version
   * @returns {string} RSS item XML element
   */
  createRSSItem(module) {
    const pubDate = new Date(module.published).toUTCString();
    const description = this.createItemDescription(module);
    const guid = this.createGuid(module);
    const title = this.createItemTitle(module);
    const htmlContent = this.createHtmlContent(module);

    return `    <item>
      <title>${this.escapeXml(title)}</title>
      <link>${this.escapeXml(module.url)}</link>
      <description>${this.escapeXml(description)}</description>
      <content:encoded><![CDATA[${htmlContent}]]></content:encoded>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${guid}</guid>
      <category>Silverstripe</category>
      <category>Module</category>
    </item>
`;
  }

  /**
   * Create detailed item description for RSS feed
   * Includes module description and publication date
   * @param {Object} module - Module object
   * @returns {string} Formatted description text
   */
  createItemDescription(module) {
    const description = module.description || 'No description available';
    const publishedDate = new Date(module.published).toISOString().split('T')[0];

    return `${description}

Published: ${publishedDate}`;
  }

  /**
   * Create item title with version if available
   * @param {Object} module - Module object
   * @returns {string} Title with optional version
   */
  createItemTitle(module) {
    if (module.version && module.version !== '-') {
      return `${module.name} ${module.version}`;
    }
    return module.name;
  }

  /**
   * Create HTML content for content:encoded tag
   * @param {Object} module - Module object
   * @returns {string} HTML content with links
   */
  createHtmlContent(module) {
    const description = module.description || 'No description available';
    let html = `<p>${this.escapeHtml(description)}</p>`;

    // Add repository link
    html += `<p><strong>Repository:</strong> <a href="${this.escapeHtml(module.url)}" target="_blank" rel="noopener">${this.escapeHtml(module.name)}</a></p>`;

    // Add release notes link if version exists
    if (module.version && module.version !== '-') {
      const releaseUrl = `${module.url}/releases/tag/${module.version}`;
      html += `<p><strong>Release Notes:</strong> <a href="${this.escapeHtml(releaseUrl)}" target="_blank" rel="noopener">${this.escapeHtml(module.version)}</a></p>`;
    }

    return html;
  }

  /**
   * Escape HTML special characters for HTML content
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
   * Create unique GUID for RSS item
   * Generates identifier based on module name and publication date
   * @param {Object} module - Module object
   * @returns {string} Unique GUID string
   */
  createGuid(module) {
    // Create a unique identifier based on module name and published date
    const date = new Date(module.published).toISOString().split('T')[0];
    return `silverstripe-mod-${module.name.replace(/[^a-zA-Z0-9]/g, '-')}-${date}`;
  }

  /**
   * Escape XML special characters to ensure valid XML
   * @param {string} text - Text to escape
   * @returns {string} XML-escaped text
   */
  escapeXml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}

/**
 * Generate RSS feed from modules data
 * Main export function for RSS feed generation
 * @param {Array} modules - Array of module objects
 * @param {string} outputPath - Path to write RSS XML file
 * @param {Object} siteConfig - Site configuration object (optional)
 * @returns {string} Generated RSS XML content
 */
export function generateRSSFeed(modules, outputPath, siteConfig = {}) {
  // Default configuration for RSS feed metadata
  const defaultConfig = {
    title: 'Silverstripe Mods',
    description: 'Latest Silverstripe module releases, updated daily',
    siteUrl: 'https://silverstripeltd.github.io/mods',
    email: 'noreply@silverstripeltd.github.io'
  };

  // Merge provided config with defaults
  const config = { ...defaultConfig, ...siteConfig };

  // Generate RSS feed
  const generator = new RSSGenerator(modules, config);
  const rssXml = generator.generate();

  // Write RSS feed to file
  writeFileSync(outputPath, rssXml, 'utf-8');
  console.log(`✅ Generated RSS feed with ${modules.length} items: ${outputPath}`);

  return rssXml;
}
