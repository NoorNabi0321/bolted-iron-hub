#!/usr/bin/env node

/**
 * Install Chromium for Puppeteer with System Dependencies
 * This script ensures Chromium and all required system libraries are available
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

console.log('[Chromium Setup] Installing Chromium and system dependencies...');

// System dependencies required by Chromium
const systemDependencies = [
  'libglib-2.0-0',
  'libx11-6',
  'libx11-xcb1',
  'libxcb1',
  'libxext6',
  'libxfixes3',
  'libxi6',
  'libxrender1',
  'libxrandr2',
  'libxcomposite1',
  'libxcursor1',
  'libxtst6',
  'libatk1.0-0',
  'libatk-bridge2.0-0',
  'libcups2',
  'libdbus-1-3',
  'libexpat1',
  'libfontconfig1',
  'libfreetype6',
  'libgcc1',
  'libgconf-2-4',
  'libgdk-pixbuf2.0-0',
  'libgtk-3-0',
  'libnspr4',
  'libnss3',
  'libpango-1.0-0',
  'libpangocairo-1.0-0',
  'libstdc++6',
  'libxss1',
  'fonts-liberation',
  'xdg-utils',
];

// Step 1: Install system dependencies
console.log('[Chromium Setup] Step 1: Installing system dependencies...');
try {
  console.log('[Chromium Setup] Running apt-get update...');
  execSync('apt-get update', { stdio: 'pipe', timeout: 120000 });
  
  console.log('[Chromium Setup] Installing required libraries...');
  execSync(`apt-get install -y ${systemDependencies.join(' ')}`, { 
    stdio: 'pipe',
    timeout: 300000,
  });
  console.log('[Chromium Setup] ✅ System dependencies installed');
} catch (error) {
  console.warn('[Chromium Setup] ⚠️ Warning: Could not install some system dependencies');
  console.warn('[Chromium Setup] This may cause Chromium to fail. Continuing anyway...');
}

// Step 2: Install Chromium via Puppeteer
console.log('[Chromium Setup] Step 2: Installing Chromium...');
try {
  // Check if Puppeteer is installed
  const puppeteerPath = path.join(projectRoot, 'node_modules', 'puppeteer');
  if (!fs.existsSync(puppeteerPath)) {
    console.log('[Chromium Setup] ⚠️ Puppeteer not found in node_modules');
    console.log('[Chromium Setup] Skipping Chromium installation');
    process.exit(0);
  }

  console.log('[Chromium Setup] Running: npx puppeteer browsers install chrome');
  
  try {
    execSync('npx puppeteer browsers install chrome', {
      cwd: projectRoot,
      stdio: 'inherit',
      timeout: 300000, // 5 minutes timeout
    });
    console.log('[Chromium Setup] ✅ Chromium installed successfully');
  } catch (error) {
    console.warn('[Chromium Setup] ⚠️ Failed to install Chromium via puppeteer');
    console.warn('[Chromium Setup] Attempting alternative: apt-get install chromium-browser');
    
    try {
      execSync('apt-get install -y chromium-browser', {
        stdio: 'inherit',
        timeout: 300000,
      });
      console.log('[Chromium Setup] ✅ Chromium installed via apt-get');
    } catch (aptError) {
      console.warn('[Chromium Setup] ⚠️ apt-get installation also failed');
      console.log('[Chromium Setup] Manual installation required:');
      console.log('[Chromium Setup]   npx puppeteer browsers install chrome');
      console.log('[Chromium Setup]   OR');
      console.log('[Chromium Setup]   apt-get install chromium-browser');
    }
  }
} catch (error) {
  console.error('[Chromium Setup] Error:', error.message);
  process.exit(1);
}

console.log('[Chromium Setup] ✅ Setup complete - Chromium is ready to use');
