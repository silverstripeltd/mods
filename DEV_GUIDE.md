# Development Workflow

## Available Scripts

### Production Build
```bash
npm run build
```
Fetches latest module data and builds the production site.

### Development with Hot Reload
```bash
npm run dev:full
```
Starts a development server with hot reload on http://localhost:3000. This will:
- Copy your site files (CSS, JS, HTML) to the dist directory
- Watch for changes in the `site/` directory
- Automatically refresh the browser when files change

### Quick Development (No Watch)
```bash
npm run dev
```
Copies files and starts the server without file watching.

### Individual Commands
- `npm run dev:copy` - Copy site files to dist
- `npm run dev:serve` - Start live-server on port 3000
- `npm run dev:watch` - Watch for file changes and copy automatically

## Development Tips

1. **For styling work**: Use `npm run dev:full` - it will automatically reload when you save CSS changes
2. **For content updates**: Use `npm run build` to fetch fresh data, then `npm run dev:serve`
3. **Quick testing**: Use `npm run dev` for a one-time copy and serve

The development server runs on http://localhost:3000 and will automatically open in your browser.
