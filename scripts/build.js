// filepath: scripts/build.js
import { cpSync, mkdirSync, existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { generateRSSFeed } from './generate-rss.js';
import { generateStaticHTML } from './generate-html.js';

const DIST_DIR = 'dist';
const SITE_DIR = 'site';
const DATA_DIR = 'data';

function cleanDist() {
  if (existsSync(DIST_DIR)) {
    rmSync(DIST_DIR, { recursive: true, force: true });
    console.log('🧹 Cleaned dist directory');
  }
}

function createDist() {
  mkdirSync(DIST_DIR, { recursive: true });
  console.log('📁 Created dist directory');
}

function copySiteAssets() {
  if (!existsSync(SITE_DIR)) {
    throw new Error(`Site directory '${SITE_DIR}' does not exist`);
  }

  // Copy CSS and other assets, but not the template
  cpSync(join(SITE_DIR, 'styles.css'), join(DIST_DIR, 'styles.css'));
  console.log('📋 Copied site assets to dist');
}

function generateStaticHTMLFile() {
  const modulesPath = join(DATA_DIR, 'modules.json');
  if (!existsSync(modulesPath)) {
    throw new Error('modules.json not found for HTML generation.');
  }

  const modulesData = JSON.parse(readFileSync(modulesPath, 'utf-8'));
  const templatePath = join(SITE_DIR, 'index-template.html');
  const outputPath = join(DIST_DIR, 'index.html');

  generateStaticHTML(modulesData, templatePath, outputPath);
}

function copyDataFiles() {
  if (!existsSync(join(DATA_DIR, 'modules.json'))) {
    throw new Error('modules.json not found. Run fetch-modules.js first.');
  }

  // No need to copy modules.json anymore since we generate static HTML
  console.log('📊 Module data embedded in static HTML');
}

function generateRSSFile() {
  const modulesPath = join(DATA_DIR, 'modules.json');
  if (!existsSync(modulesPath)) {
    throw new Error('modules.json not found for RSS generation.');
  }

  const modulesData = JSON.parse(readFileSync(modulesPath, 'utf-8'));
  const rssPath = join(DIST_DIR, 'feed.xml');

  // You can customize this config based on your actual site URL
  const siteConfig = {
    title: 'Silverstripe Mods',
    description: 'Latest Silverstripe modules - automatically updated daily',
    siteUrl: 'https://username.github.io/silverstripe-mods', // Update with your actual URL
    email: 'noreply@example.com'
  };

  generateRSSFeed(modulesData, rssPath, siteConfig);
}

function main() {
  console.log('Building site for deployment...\n');

  try {
    cleanDist();
    createDist();
    copySiteAssets();
    copyDataFiles();
    generateStaticHTMLFile();
    generateRSSFile();

    console.log('\n✅ Build completed successfully!');
    console.log(`📦 Site ready in '${DIST_DIR}' directory`);
    console.log('🌐 Static HTML generated with embedded module data');
    console.log('📡 RSS feed available at /feed.xml');

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

main();
