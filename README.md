# Silverstripe Mods

A GitHub Pages site that automatically displays the latest 20 Silverstripe modules in a clean, responsive table format. The site updates three times daily via GitHub Actions and shows module names, descriptions, repository links, and publication dates. Includes an RSS feed for easy subscription to new modules.

## 🚀 Features

- **Automated Updates**: GitHub Actions workflow fetches the latest Silverstripe modules three times daily
- **RSS Feed**: Subscribe to new modules via `/feed.xml`
- **Static HTML**: Fast loading with zero JavaScript - all data embedded at build time
- **Fast Loading**: Optimized for performance with minimal payload

## 📊 Data Sources

The site uses a robust data fetching strategy with fallbacks:

1. **Primary**: GitHub Search API to find repositories with:
   - `topic:silverstripe-vendormodule` or `topic:silverstripe-module`
   - Repository names containing "silverstripe-"
	- Specific known Silverstripe GitHub users
   - Validates modules by checking `composer.json` for Silverstripe types

2. **Fallback**: Packagist API for `silverstripe-vendormodule` and `silverstripe-module` packages

For each module, we collect:
- **Name**: Composer package name or repository name
- **Description**: From composer.json or repository description
- **Link**: Repository URL
- **Published Date**: First release date, or repository creation date as fallback

## 🛠️ Local Development

### Prerequisites

- Node.js 18+ (uses native `fetch` and ES modules)
- Git

### Setup and Run

1. **Clone and install**:
   ```bash
   git clone https://github.com/username/silverstripe-mods.git
   cd silverstripe-mods
   ```

2. **Run the build process**:
   ```bash
   npm run build
   ```

3. **Start a local server**:
   ```bash
   npm run dev
   # or manually:
   npx serve dist
   # or any static file server
   ```

4. **Visit** `http://localhost:3000` (or the port shown)

### Available Scripts

**Development Workflow:**
- `npm run dev:full` - Complete development setup with hot reload
- `npm run dev:copy` - Copy site files to dist for development
- `npm run dev:serve` - Start live-server on port 3000
- `npm run dev:watch` - Watch for file changes and auto-copy
- `npm run dev` - Quick dev setup (copy + serve)

**Production Workflow:**
- `npm run build` - Full production build: fetch data + build site
- `npm run fetch` - Fetch modules data only (updates data/modules.json)

**Individual Scripts:**
- `npm run dev:copy` - Copy development files to dist/
- `npm run dev:serve` - Start development server
- `npm run dev:watch` - File watcher for hot reload
- `npm run fetch` - Fetch latest module data from APIs

### Manual Commands

```bash
# Fetch latest module data
node scripts/fetch-modules.js

# Build site for deployment
node scripts/build.js

# Serve locally (requires npx serve or similar)
npx serve dist
```

## 🔧 GitHub Pages Setup

### Enable GitHub Pages

1. Go to your repository **Settings** → **Pages**
2. Under **Source**, select **"GitHub Actions"**
3. The workflow will automatically run and deploy your site

### Workflow Details

The GitHub Actions workflow (`.github/workflows/deploy.yml`):

- **Triggers**: Three times daily at 01:00, 09:00, 17:00 UTC, on pushes to `main`, and manual triggers
- **Uses**: Built-in `GITHUB_TOKEN` (no secrets required)
- **Deploys**: To GitHub Pages using official actions
- **Generates**: RSS feed at `/feed.xml` with latest modules
- **Concurrency**: Prevents overlapping deployments

Your site will be available at: `https://username.github.io/repository-name`

## 📁 Project Structure

```
├── .github/workflows/
│   └── deploy.yml           # GitHub Actions workflow
├── scripts/
│   ├── fetch-modules.js     # Data fetching logic
│   ├── build.js            # Site build script
│   ├── generate-rss.js     # RSS feed generation
│   └── generate-html.js    # Static HTML generation
├── site/
│   ├── index-template.html # HTML template for static generation
│   ├── styles.css          # Responsive CSS with dark mode
│   └── app.js              # Minimal JS (optional)
├── data/
│   └── modules.json        # Generated modules data
├── dist/                   # Built site (generated)
│   ├── feed.xml           # RSS feed (generated)
│   └── ...                # Other site files
├── package.json            # Node.js scripts and metadata
└── README.md              # This file
```

## 🔍 Troubleshooting

### Build Issues

- **"modules.json not found"**: Run `npm run fetch` first
- **API rate limits**: Wait a few minutes or check if GITHUB_TOKEN is available
- **Node version**: Ensure Node.js 18+ for native fetch support

### Deployment Issues

- **Pages not enabled**: Check repository Settings → Pages → Source = "GitHub Actions"
- **Workflow failing**: Check Actions tab for detailed error logs
- **Site not updating**: Workflow runs three times daily at 01:00, 09:00, 17:00 UTC, or push to `main` branch

### Local Development

- **Port in use**: Change port with `npx serve dist -p 3001`
- **Modules not loading**: Check browser console for fetch errors
- **Styling issues**: Clear browser cache

## 📈 Monitoring

The workflow logs show:
- Number of modules found
- API response status
- Build success/failure
- Deployment status

Check the **Actions** tab in your repository for detailed logs.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test locally: `npm run build && npm run dev`
4. Commit changes: `git commit -m "Description"`
5. Push and create a Pull Request

## 📄 License

MIT License
