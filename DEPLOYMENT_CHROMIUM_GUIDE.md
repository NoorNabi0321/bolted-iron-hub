# Production Deployment: Chromium Setup Guide

## Problem Analysis

The WhatsApp bot fails in production with this error:

```
Error: Could not find Chrome (ver. 146.0.7680.66)
```

**Root Cause:** Puppeteer (used by whatsapp-web.js) requires Chromium/Chrome to be installed, but it's not available in the production environment.

---

## Solution Overview

We've implemented **three-layer automatic Chromium installation**:

1. **Build-time installation** - Chromium is installed during the build process
2. **Postinstall script** - Chromium is installed after dependencies
3. **Runtime detection** - Bot detects and uses available Chromium

---

## Deployment Steps

### Step 1: Rebuild Your Project

When you publish/deploy, the new build script will automatically install Chromium:

```bash
npm run build
```

This will:
1. Run `scripts/install-chromium.mjs` to install Chromium
2. Build the frontend with Vite
3. Bundle the server code with esbuild

### Step 2: Verify Chromium Installation

After deployment, check that Chromium is available:

```bash
# Check if Chromium is installed
which chromium-browser
# or
which chromium
# or
which google-chrome
```

### Step 3: Monitor Bot Startup

Check the server logs for:

```
[WhatsApp Bot] Using system Chromium at: /usr/bin/chromium-browser
```

Or if using Puppeteer's cached version:

```
[WhatsApp Bot] ⚠️ System Chromium not found in common paths
[WhatsApp Bot] Will attempt to use Puppeteer's bundled Chromium
```

---

## What Changed

### New Files

- `scripts/install-chromium.mjs` - Automatic Chromium installation script

### Updated Files

- `package.json` - Added postinstall and build scripts
- `server/services/whatsappBotService.ts` - Better error messages and Chromium detection

### How It Works

**During Build:**
```json
{
  "scripts": {
    "build": "node scripts/install-chromium.mjs && vite build && esbuild ...",
    "postinstall": "node scripts/install-chromium.mjs"
  }
}
```

**During Runtime:**
The bot checks for Chromium in this order:
1. `/usr/bin/chromium-browser` (Debian/Ubuntu)
2. `/usr/bin/chromium`
3. `/usr/bin/google-chrome` (Google Chrome)
4. `/usr/bin/google-chrome-stable`
5. `/snap/bin/chromium` (Snap package)
6. `/root/.cache/puppeteer/chrome/linux-*/chrome-linux/chrome` (Puppeteer cache)

If none found, Puppeteer will attempt to use its bundled version.

---

## Troubleshooting

### Error: "Could not find Chrome"

**Solution 1: Manual Installation**
```bash
# On Debian/Ubuntu
apt-get update
apt-get install -y chromium-browser

# Or install via Puppeteer
npx puppeteer browsers install chrome
```

**Solution 2: Rebuild**
```bash
npm run build
```

**Solution 3: Check Logs**
```bash
# Look for Chromium detection in logs
grep "Chromium" /path/to/logs
```

### Error: "Chromium not found in common paths"

This is a warning, not an error. The bot will attempt to use Puppeteer's bundled Chromium. If it still fails:

1. Install Chromium manually (see Solution 1 above)
2. Rebuild the project
3. Restart the bot

### Bot Starts But QR Code Never Appears

Check the server logs for:
```
[WhatsApp Bot] ❌ Chromium/Browser initialization failed
```

If you see this, follow the solutions provided in the error message.

---

## Environment Variables

You can optionally configure Chromium paths via environment variables:

```bash
# Use a specific Chromium binary
export PUPPETEER_EXECUTABLE_PATH=/custom/path/to/chromium

# Use a specific cache directory
export PUPPETEER_CACHE_DIR=/custom/cache/path
```

---

## Manus Hosting Specific

If deploying to Manus hosting:

1. **The new build script will automatically install Chromium**
2. **No additional configuration needed**
3. **Just publish your project normally**

The postinstall script will run during deployment and install Chromium automatically.

---

## Performance Notes

- **First build:** ~500MB download for Chromium (one-time)
- **Subsequent builds:** Uses cached Chromium (~5 seconds)
- **Runtime:** No performance impact after initialization

---

## Verification Checklist

After deployment:

- [ ] Bot starts without "Could not find Chrome" error
- [ ] QR code is generated and displayed
- [ ] Bot can be scanned with WhatsApp
- [ ] Commands work after authentication
- [ ] No Chromium-related errors in logs

---

## Support

If you continue to experience issues:

1. Check `WHATSAPP_BOT_PRODUCTION_SETUP.md` for detailed troubleshooting
2. Review server logs for specific error messages
3. Contact your hosting provider to ensure Chromium can be installed

---

**Last Updated:** March 17, 2026
