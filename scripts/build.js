/**
 * Build script for Silverstripe Modules site
 * Compiles the site into a static distribution package ready for deployment
 *
 * This script performs the following operations:
 * 1. Cleans and creates the distribution directory
 * 2. Copies site assets (CSS, etc.) to dist
 * 3. Generates static HTML with embedded module data
 * 4. Creates RSS feed for module updates
 *
 * @requires fs filesystem operations
 * @requires path path utilities
 * @requires ./generate-rss.js RSS feed generation
 * @requires ./generate-html.js Static HTML generation
 */

// filepath: scripts/build.js
import { cpSync, mkdirSync, existsSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { minify as minifyCSS } from 'csso';
import { generateRSSFeed } from './generate-rss.js';
import { generateStaticHTML } from './generate-html.js';

// Configuration constants for build directories
const DIST_DIR = 'dist';
const SITE_DIR = 'site';
const DATA_DIR = 'data';

/**
 * Clean the distribution directory
 * Removes any existing dist folder and its contents to ensure clean build
 * @returns {void}
 */
function cleanDist() {
  if (existsSync(DIST_DIR)) {
    rmSync(DIST_DIR, { recursive: true, force: true });
    console.log('🧹 Cleaned dist directory');
  }
}

/**
 * Create the distribution directory structure
 * Ensures the dist directory exists and is ready for build output
 * @returns {void}
 */
function createDist() {
  mkdirSync(DIST_DIR, { recursive: true });
  console.log('📁 Created dist directory');
}

/**
 * Copy static site assets to distribution directory
 * Copies and minifies CSS and other assets to the dist folder
 * @throws {Error} When site directory doesn't exist
 * @returns {void}
 */
function copySiteAssets() {
  if (!existsSync(SITE_DIR)) {
    throw new Error(`Site directory '${SITE_DIR}' does not exist`);
  }

  // Read, minify and write CSS
  const cssContent = readFileSync(join(SITE_DIR, 'styles.css'), 'utf-8');
  const minifiedCSS = minifyCSS(cssContent).css;
  writeFileSync(join(DIST_DIR, 'styles.css'), minifiedCSS);

  console.log('📋 Copied and minified site assets to dist');
}

/**
 * Generate static HTML file with embedded module data
 * Creates index.html by processing the template with module data
 * @throws {Error} When modules.json is not found
 * @returns {Promise<void>}
 */
async function generateStaticHTMLFile() {
  const modulesPath = join(DATA_DIR, 'modules.json');
  if (!existsSync(modulesPath)) {
    throw new Error('modules.json not found for HTML generation.');
  }

  const modulesData = JSON.parse(readFileSync(modulesPath, 'utf-8'));
  const templatePath = join(SITE_DIR, 'index-template.html');
  const outputPath = join(DIST_DIR, 'index.html');

  await generateStaticHTML(modulesData, templatePath, outputPath);
}

/**
 * Process module data files for build
 * Validates that required data files exist and logs status
 * @throws {Error} When modules.json is not found
 * @returns {void}
 */
function copyDataFiles() {
  if (!existsSync(join(DATA_DIR, 'modules.json'))) {
    throw new Error('modules.json not found. Run fetch-modules.js first.');
  }

  // No need to copy modules.json anymore since we generate static HTML
  console.log('📊 Module data embedded in static HTML');
}

/**
 * Generate RSS feed file for module updates
 * Creates feed.xml with latest module information for syndication
 * @throws {Error} When modules.json is not found
 * @returns {void}
 */
function generateRSSFile() {
  const modulesPath = join(DATA_DIR, 'modules.json');
  if (!existsSync(modulesPath)) {
    throw new Error('modules.json not found for RSS generation.');
  }

  const modulesData = JSON.parse(readFileSync(modulesPath, 'utf-8'));
  const rssPath = join(DIST_DIR, 'feed.xml');

  // Site configuration for RSS feed metadata
  // TODO: Update with actual deployment URL and contact information
  const siteConfig = {
    title: 'Silverstripe Mods',
    description: 'Latest Silverstripe modules - automatically updated daily',
    siteUrl: 'https://username.github.io/silverstripe-mods', // Update with your actual URL
    email: 'noreply@example.com'
  };

  generateRSSFeed(modulesData, rssPath, siteConfig);
}

/**
 * Main build execution function
 * Orchestrates the entire build process with error handling
 * @returns {Promise<void>}
 */
async function main() {
  console.log('Building site for deployment...\n');

  try {
    // Execute build steps in sequence
    cleanDist();
    createDist();
    copySiteAssets();
    copyDataFiles();
    await generateStaticHTMLFile();
    generateRSSFile();

    // Success feedback
    console.log('\n✅ Build completed successfully!');
    console.log(`📦 Site ready in '${DIST_DIR}' directory`);
    console.log('🌐 Static HTML generated with embedded module data');
    console.log('📡 RSS feed available at /feed.xml');
    console.log('🗜️  CSS and HTML minified for production');

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Execute the build process
main();
