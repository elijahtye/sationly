# Clear Favicon Cache - Browser Instructions

Browsers cache favicons VERY aggressively. Here's how to force them to reload:

## Method 1: Hard Refresh (Try This First)
- **Chrome/Edge**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- **Safari**: `Cmd+Option+R`
- **Firefox**: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)

## Method 2: Clear Site Data (Most Effective)
1. Open DevTools (`F12`)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **"Clear site data"** or **"Clear storage"**
4. Check all boxes
5. Click **"Clear site data"**
6. Refresh the page

## Method 3: Test in Incognito/Private Window
- Open a new incognito/private window
- Visit `http://localhost:5000/dashboard.html`
- The new favicon should appear

## Method 4: Direct URL Test
Visit these URLs directly:
- `http://localhost:5000/favicon.png?t=1734123456`
- `http://localhost:5000/favicon.ico`

You should see your new favicon image.

## Method 5: Chrome - Clear Favicon Cache Specifically
1. Close all browser tabs for localhost:5000
2. Open Chrome DevTools (`F12`)
3. Go to **Application** → **Storage**
4. Click **"Clear site data"**
5. Or manually delete: `chrome://favicon/http://localhost:5000/` (type in address bar)

## Method 6: Nuclear Option - Clear All Browser Cache
1. Chrome: Settings → Privacy → Clear browsing data → Cached images and files
2. Safari: Safari → Clear History → All History
3. Firefox: Settings → Privacy → Clear Data → Cached Web Content

---

**After clearing cache, hard refresh the page and the new favicon should appear!**

