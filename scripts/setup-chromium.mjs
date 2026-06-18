#!/usr/bin/env node

/**
 * Setup script to ensure Chromium is available for whatsapp-web.js
 * This script runs during the build process to download and cache Chromium
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('[Setup] Checking Chromium availability...');

// Check if Chromium is already installed
const chromiumPaths = [
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/snap/bin/chromium',
];

let chromiumFound = false;
for (const chromiumPath of chromiumPaths) {
  if (fs.existsSync(chromiumPath)) {
    console.log(`[Setup] ✅ Found system Chromium at: ${chromiumPath}`);
    chromiumFound = true;
    break;
  }
}

if (!chromiumFound) {
  console.log('[Setup] ⚠️ System Chromium not found');
  console.log('[Setup] Attempting to use Puppeteer\'s bundled Chromium...');
  
  // Try to trigger Puppeteer to download Chromium
  try {
    const puppeteerPath = path.join(projectRoot, 'node_modules', 'puppeteer');
    if (fs.existsSync(puppeteerPath)) {
      console.log('[Setup] Puppeteer found, attempting to download Chromium...');
      
      // This will trigger Puppeteer to download Chromium if not already present
      const proc = spawn('node', [
        '-e',
        `
          import puppeteer from 'puppeteer';
          console.log('[Setup] Downloading Chromium...');
          await puppeteer.launch();
          console.log('[Setup] ✅ Chromium downloaded successfully');
        `.trim()
      ], {
        cwd: projectRoot,
        stdio: 'inherit'
      });
      
      proc.on('error', (err) => {
        console.warn('[Setup] ⚠️ Could not auto-download Chromium:', err.message);
        console.log('[Setup] Please install Chromium manually:');
        console.log('[Setup]   apt-get update && apt-get install -y chromium-browser');
      });
    } else {
      console.warn('[Setup] ⚠️ Puppeteer not found in node_modules');
    }
  } catch (err) {
    console.warn('[Setup] ⚠️ Error during Chromium setup:', err.message);
  }
} else {
  console.log('[Setup] ✅ Chromium is available for whatsapp-web.js');
}

console.log('[Setup] Setup complete');
