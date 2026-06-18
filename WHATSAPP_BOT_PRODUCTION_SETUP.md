# WhatsApp Bot Production Setup Guide

## Issue: QR Code Not Generated in Production

The WhatsApp bot works fine in preview/dev mode but fails in production with the error:
```
[WhatsApp Bot] Failed to initialize: {}
```

This is because **whatsapp-web.js requires Chromium/Chrome browser to run**, but it's not available in the production environment.

---

## Solutions

### Solution 1: Install Chromium in Production (Recommended)

The bot now automatically detects and uses system Chromium. Ensure your production environment has Chromium installed:

```bash
apt-get update
apt-get install -y chromium-browser
```

**Supported Chromium paths:**
- `/usr/bin/chromium-browser` (Debian/Ubuntu)
- `/usr/bin/chromium`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable` (Google Chrome)
- `/snap/bin/chromium` (Snap package)

**How to verify:**
```bash
which chromium-browser
# or
which chromium
# or
which google-chrome
```

---

### Solution 2: Use Puppeteer's Bundled Chromium

If you prefer not to install system Chromium, Puppeteer can download and use its own Chromium binary:

1. Ensure `puppeteer` is in your dependencies (it already is)
2. The bot will automatically use Puppeteer's Chromium if available

**Note:** This requires additional disk space (~500MB) and download time during build.

---

### Solution 3: Switch to WhatsApp Cloud API (Most Reliable for Production)

For production environments where browser automation is not ideal, consider using the official **WhatsApp Cloud API** instead of whatsapp-web.js:

**Advantages:**
- No browser required
- Official WhatsApp support
- Better scalability
- More reliable for production

**Disadvantages:**
- Requires WhatsApp Business Account
- Requires API credentials setup

**Implementation:**
Replace whatsapp-web.js with official WhatsApp Cloud API client:
```bash
npm uninstall whatsapp-web.js
npm install whatsapp-cloud-api
```

Then update the bot service to use the Cloud API instead.

---

## Troubleshooting

### Error: "Failed to launch browser"

**Check 1:** Verify Chromium is installed
```bash
ls -la /usr/bin/chromium* /usr/bin/google-chrome* /snap/bin/chromium
```

**Check 2:** Verify Chromium has execute permissions
```bash
chmod +x /usr/bin/chromium-browser
```

**Check 3:** Check for missing dependencies
```bash
ldd /usr/bin/chromium-browser
```

**Check 4:** Run in sandbox mode (already configured in bot service)
The bot uses these Chromium flags:
- `--no-sandbox` - Disable sandbox
- `--disable-dev-shm-usage` - Disable /dev/shm usage
- `--disable-setuid-sandbox` - Disable setuid sandbox

### Error: "Chromium not found"

If Chromium is not found, the bot logs will show:
```
[WhatsApp Bot] Chromium/Browser initialization failed
```

**Solution:** Install Chromium using the command above.

---

## Environment Variables

You can optionally set a custom Chromium path via environment variable:

```bash
export CHROMIUM_PATH=/custom/path/to/chromium
```

Then update the bot service to use this variable:
```typescript
const chromiumPath = process.env.CHROMIUM_PATH || '/usr/bin/chromium-browser';
```

---

## Testing in Production

After deploying to production:

1. **Check bot status:**
   ```
   GET /api/bot/status
   ```

2. **Check QR code:**
   ```
   GET /api/bot/qr
   ```

3. **Check logs:**
   Look for `[WhatsApp Bot]` messages in production logs

4. **Test command:**
   Send `/help` from an authorized WhatsApp group

---

## Manus Hosting Specific

If you're using Manus hosting:

1. **Contact Manus Support** to ensure Chromium is available in the production environment
2. **Or** request to add Chromium installation to your deployment configuration
3. **Or** use the WhatsApp Cloud API solution instead

---

## Summary

| Solution | Pros | Cons | Recommended |
|----------|------|------|-------------|
| System Chromium | Simple, lightweight | Requires system install | ✅ Yes |
| Puppeteer Chromium | Self-contained | Large download (~500MB) | For testing |
| Cloud API | Production-ready, official | Requires Business Account | ✅ For Production |

---

## Next Steps

1. **For Development:** Continue using whatsapp-web.js with system Chromium
2. **For Production:** Either install Chromium or switch to Cloud API
3. **For Scaling:** Consider Cloud API for better reliability

---

**Last Updated:** March 17, 2026
