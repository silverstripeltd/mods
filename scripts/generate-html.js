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

  createGitHubIcon() {
    return `
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
    `;
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
    const githubIcon = this.createGitHubIcon();

    return `
        <tr>
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
          <td>
            <a href="${module.url}"
               target="_blank"
               rel="noopener noreferrer"
               class="repo-link"
               title="View ${this.escapeHtml(module.name)} repository">
              ${githubIcon}
            </a>
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
