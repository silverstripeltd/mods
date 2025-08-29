// filepath: scripts/generate-html.js
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

class StaticHTMLGenerator {
  constructor(modules) {
    this.modules = modules;
  }

  formatModuleName(name) {
    if (name.includes('/')) {
      const parts = name.split('/');
      const vendor = this.escapeHtml(parts[0]);
      const packageName = this.escapeHtml(parts.slice(1).join('/'));

      return `
        <span class="module-name-vendor">${vendor}</span>
        <span class="module-name-package">/${packageName}</span>
      `;
    }

    return this.escapeHtml(name);
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Unknown';
      }

      // Format as dd/mm/yyyy for NZ
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();

      return `${day}/${month}/${year}`;
    } catch (error) {
      console.warn('Failed to format date:', dateString, error);
      return 'Unknown';
    }
  }

  createVersionBadge(version) {
    if (version) {
      return `<span class="version-badge">${this.escapeHtml(version)}</span>`;
    }
    return `<span class="version-badge no-version">-</span>`;
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  createTableRow(module) {
    const formattedDate = this.formatDate(module.published);
    const moduleName = this.formatModuleName(module.name);
    const escapedDescription = this.escapeHtml(module.description || 'No description available');
    const versionBadge = this.createVersionBadge(module.version);

    return `
        <tr class="module-row" onclick="window.open('${module.url}', '_blank')" 
            role="button" 
            tabindex="0" 
            aria-label="View ${this.escapeHtml(module.name)} repository on GitHub"
            onkeydown="if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); window.open('${module.url}', '_blank'); }">
          <td>
            <div class="module-name">${moduleName}</div>
          </td>
          <td>
            <div class="module-description">${escapedDescription}</div>
          </td>
          <td>
            ${versionBadge}
          </td>
          <td>
            <div class="module-date">${formattedDate}</div>
          </td>
        </tr>`;
  }

  generateTableRows() {
    if (this.modules.length === 0) {
      return `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">
            No modules available
          </td>
        </tr>`;
    }

    return this.modules.map(module => this.createTableRow(module)).join('');
  }

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

  generateHTML(templatePath, outputPath) {
    // Read the HTML template
    const template = readFileSync(templatePath, 'utf-8');

    // Generate table rows
    const tableRows = this.generateTableRows();
    const timestamp = this.getCurrentTimestamp();

    // Replace placeholders in template
    const html = template
      .replace('{{TABLE_ROWS}}', tableRows)
      .replace('{{LAST_UPDATED}}', timestamp)
      .replace('{{MODULE_COUNT}}', this.modules.length);

    // Write the generated HTML
    writeFileSync(outputPath, html, 'utf-8');
    console.log(`✅ Generated static HTML with ${this.modules.length} modules: ${outputPath}`);
  }
}

export function generateStaticHTML(modules, templatePath, outputPath) {
  const generator = new StaticHTMLGenerator(modules);
  generator.generateHTML(templatePath, outputPath);
}

// Main execution
try {
  // Read the modules data
  const modulesData = JSON.parse(readFileSync('data/modules.json', 'utf-8'));
  
  // Generate the static HTML
  generateStaticHTML(
    modulesData,
    'site/index-template.html',
    'site/index.html'
  );
} catch (error) {
  console.error('❌ Error generating HTML:', error.message);
  process.exit(1);
}
