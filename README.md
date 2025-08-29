# Silverstripe Mods

A GitHub Pages site that automatically displays the latest 20 Silverstripe modules in a clean, responsive table format. The site updates daily via GitHub Actions and shows module names, descriptions, repository links, and publication dates. Includes an RSS feed for easy subscription to new modules.

## 🚀 Features

- **Automated Updates**: Daily GitHub Actions workflow fetches the latest Silverstripe modules
- **RSS Feed**: Subscribe to new modules via `/feed.xml`
- **Static HTML**: Fast loading with zero JavaScript - all data embedded at build time
- **Clean Design**: Modern, responsive table with light/dark mode support
- **Accessible**: Semantic HTML, proper ARIA labels, keyboard navigation, and high contrast
- **Zero Dependencies**: Uses only Node.js built-in features and GitHub's API
- **Fast Loading**: Optimized for performance with minimal payload

## 📊 Data Sources

The site uses a robust data fetching strategy with fallbacks:

1. **Primary**: GitHub Search API to find repositories with:
   - `topic:silverstripe-vendormodule` or `topic:silverstripe-module`
   - Repository names containing "silverstripe-"
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

- `npm run build` - Full build: fetch data + build site
- `npm run fetch` - Fetch modules data only
- `npm run dev` - Build and serve locally

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

- **Triggers**: Daily at 6:00 AM UTC, on pushes to `main`, and manual triggers
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

## 🎨 Design Features

- **Responsive**: Works on desktop, tablet, and mobile
- **Dark Mode**: Automatic based on system preference
- **Accessible**: WCAG compliant with semantic markup
- **Performance**: Minimal JavaScript, optimized CSS
- **Typography**: System font stack for optimal rendering
- **RSS Feed**: XML feed available at `/feed.xml` for syndication
- **Static Generation**: All module data embedded at build time for instant loading

## 🔍 Troubleshooting

### Build Issues

- **"modules.json not found"**: Run `npm run fetch` first
- **API rate limits**: Wait a few minutes or check if GITHUB_TOKEN is available
- **Node version**: Ensure Node.js 18+ for native fetch support

### Deployment Issues

- **Pages not enabled**: Check repository Settings → Pages → Source = "GitHub Actions"
- **Workflow failing**: Check Actions tab for detailed error logs
- **Site not updating**: Workflow runs daily at 6 AM UTC, or push to `main` branch

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

MIT License - see the repository for details.

---

**Last Updated**: Auto-generated daily by GitHub Actions
**Data Sources**: GitHub API & Packagist
**Hosting**: GitHub Pages
