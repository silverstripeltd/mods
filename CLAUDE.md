# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Silverstripe Mods is a static GitHub Pages site that displays Silverstripe modules published in the last 7 days. It updates daily via GitHub Actions, fetching data from GitHub and Packagist APIs, then generating static HTML with all data embedded at build time (zero client-side JavaScript for data). Includes an RSS feed at `/feed.xml`.

## Commands

```bash
npm run build          # Production build: fetch modules → build site (generates dist/)
npm run dev:full       # Development with hot reload (watch + live-server on :3000)
npm run dev            # Quick dev: copy site files to dist/ + serve
npm run fetch          # Fetch module data only (writes data/modules.json)
```

Individual scripts can be run directly:
```bash
node --env-file=.env scripts/fetch-modules.js   # Fetch module data (token loaded from .env)
node scripts/build.js                            # Build site from existing data/modules.json
```

The `GITHUB_TOKEN` is stored in `.env` (gitignored). Use `--env-file=.env` when running fetch scripts locally.

There are no tests or linting configured in this project.

## Architecture

The build pipeline is a sequential Node.js process using ES modules (`"type": "module"`). Requires Node.js 18+.

**Build flow:** `fetch-modules.js` → `data/modules.json` → `build.js` (orchestrator) → `dist/`

### Key scripts

- **`scripts/fetch-modules.js`** — `ModuleFetcher` class that queries GitHub Search API (18+ targeted queries by topic, org, language) with Packagist fallback. Validates repos by checking their `composer.json` for Silverstripe module types. Has built-in rate limiting (100ms between requests), retry with exponential backoff, and 404 caching. Outputs sorted by publication date, filtered to a 7-day rolling window.

- **`scripts/build.js`** — Orchestrator that cleans `dist/`, minifies CSS (via `csso`), copies images, then delegates to the two generators below.

- **`scripts/generate-html.js`** — `StaticHTMLGenerator` class that reads `site/index-template.html`, groups modules by relative date (Today / Yesterday / day name / dd/mm/yyyy) into separate sections with `<h2>` headings, HTML-escapes all user content, and minifies output (via `html-minifier-terser`). All dates use NZ timezone (`Pacific/Auckland`).

- **`scripts/generate-rss.js`** — `RSSGenerator` class that produces RSS 2.0 XML (`dist/feed.xml`) with XML-escaped content and `content:encoded` tags.

- **`scripts/dev-copy.js`** — Copies site files to `dist/` for local development without the full build.

### Source files

- **`site/index-template.html`** — HTML template with placeholder tokens, semantic HTML5, Open Graph/Twitter meta tags, and RSS auto-discovery.
- **`site/styles.css`** — CSS custom properties design system, Silverstripe blue (#005ae1) colour scheme, responsive grid, animated header with conic gradient, org avatars via CSS custom properties.

### Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`) runs daily at 17:00 UTC (5 AM NZST), on push to main, or manual dispatch. Uses `GITHUB_TOKEN` for API access. Deploys `dist/` to GitHub Pages.

## Working rules

- **Pre-release demos must use fresh data.** Before showing a built site for visual review, always run the full pipeline (`node --env-file=.env scripts/fetch-modules.js && node scripts/build.js`) so the demo reflects real, current data — not stale or missing fields from a previous fetch.
