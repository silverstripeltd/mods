// filepath: scripts/generate-rss.js
import { writeFileSync } from 'fs';

class RSSGenerator {
  constructor(modules, siteConfig) {
    this.modules = modules;
    this.siteConfig = siteConfig;
  }

  generate() {
    const rssItems = this.modules.slice(0, 20).map(module => this.createRSSItem(module));
    const rss = this.createRSSFeed(rssItems);
    return rss;
  }

  createRSSFeed(items) {
    const now = new Date();
    const buildDate = now.toUTCString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
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
      <url>${this.siteConfig.siteUrl}/favicon.ico</url>
      <title>${this.escapeXml(this.siteConfig.title)}</title>
      <link>${this.siteConfig.siteUrl}</link>
      <width>32</width>
      <height>32</height>
    </image>
${items.join('')}
  </channel>
</rss>`;
  }

  createRSSItem(module) {
    const pubDate = new Date(module.published).toUTCString();
    const description = this.createItemDescription(module);
    const guid = this.createGuid(module);

    return `    <item>
      <title>${this.escapeXml(module.name)}</title>
      <link>${this.escapeXml(module.url)}</link>
      <description>${this.escapeXml(description)}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="false">${guid}</guid>
      <category>Silverstripe</category>
      <category>Module</category>
    </item>
`;
  }

  createItemDescription(module) {
    const description = module.description || 'No description available';
    const publishedDate = new Date(module.published).toISOString().split('T')[0];

    return `${description}

Published: ${publishedDate}
Repository: ${module.url}`;
  }

  createGuid(module) {
    // Create a unique identifier based on module name and published date
    const date = new Date(module.published).toISOString().split('T')[0];
    return `silverstripe-mod-${module.name.replace(/[^a-zA-Z0-9]/g, '-')}-${date}`;
  }

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

export function generateRSSFeed(modules, outputPath, siteConfig = {}) {
  const defaultConfig = {
    title: 'Silverstripe Mods',
    description: 'Latest Silverstripe modules - automatically updated daily',
    siteUrl: 'https://username.github.io/silverstripe-mods',
    email: 'noreply@example.com'
  };

  const config = { ...defaultConfig, ...siteConfig };
  const generator = new RSSGenerator(modules, config);
  const rssXml = generator.generate();

  writeFileSync(outputPath, rssXml, 'utf-8');
  console.log(`✅ Generated RSS feed with ${modules.length} items: ${outputPath}`);

  return rssXml;
}
