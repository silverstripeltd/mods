#!/usr/bin/env node

/**
 * Development file copying utility
 * Copies site files to distribution directory for development workflow
 *
 * This utility enables hot reload development by copying source files
 * from the site/ directory to dist/ where they can be served and watched.
 * Used as part of the development workflow alongside live-server.
 *
 * @requires fs/promises File system operations with promises
 * @requires path Path utilities for cross-platform compatibility
 * @requires url URL utilities for ES modules
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility - get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Copy a single file with directory creation
 * Ensures destination directory exists before copying
 * @param {string} src - Source file path
 * @param {string} dest - Destination file path
 * @returns {Promise<void>}
 */
async function copyFile(src, dest) {
  try {
    // Ensure destination directory exists
    await fs.mkdir(path.dirname(dest), { recursive: true });

    // Copy the file
    await fs.copyFile(src, dest);
    console.log(`Copied: ${path.basename(src)}`);
  } catch (error) {
    console.error(`Error copying ${src}:`, error.message);
  }
}

/**
 * Main development copy function
 * Copies all necessary development files from site/ to dist/
 * Used for hot reload development workflow
 * @returns {Promise<void>}
 */
async function devCopy() {
  const siteDir = path.join(__dirname, '..', 'site');
  const distDir = path.join(__dirname, '..', 'dist');

  console.log('Copying site files to dist for development...');

  // List of files to copy for development
  // Note: excludes index-template.html as it needs processing
  const files = [
    'styles.css',    // Main stylesheet
    'app.js',        // Client-side JavaScript
    'index.html'     // Main HTML file (development version)
  ];

  // Copy each file asynchronously
  for (const file of files) {
    const srcPath = path.join(siteDir, file);
    const destPath = path.join(distDir, file);
    await copyFile(srcPath, destPath);
  }

  console.log('Development files copied successfully!');
}

// Execute the copy operation
devCopy().catch(console.error);
