# Fix Database Version Errors

If you're seeing errors like:
```
VersionError: The requested version (10) is less than the existing version (20)
DatabaseClosedError: VersionError...
```

This means there's old cached data in your browser that's conflicting with the new online-only system.

## Quick Fix

### Option 1: Browser Developer Tools
1. Open your browser's Developer Tools (F12)
2. Go to the **Application** tab (Chrome) or **Storage** tab (Firefox)
3. In the left sidebar, find:
   - **Local Storage** → Delete all entries for your domain
   - **Session Storage** → Delete all entries for your domain
   - **IndexedDB** → Delete all databases listed
   - **Cache Storage** → Delete all caches
4. Refresh the page

### Option 2: Use Our Storage Cleaner Page
1. Visit: `http://localhost:3000/clear-storage.html`
2. Click "Clear All Browser Storage"
3. Return to the main application

### Option 3: Browser Console Script (Advanced)
1. Open Developer Tools (F12) and go to the **Console** tab
2. Copy and paste this script:
   ```javascript
   fetch('/console-clear-script.js').then(r=>r.text()).then(eval)
   ```
3. Press Enter to run it
4. Refresh the page when prompted

### Option 4: Manual Browser Reset
1. **Chrome/Edge**: Settings → Privacy & Security → Clear browsing data → Choose "All time" and check all boxes
2. **Firefox**: Settings → Privacy & Security → Clear Data → Check all boxes
3. **Safari**: Develop menu → Empty Caches, then Safari → Clear History

## Why This Happens

The hotel management system previously had offline functionality using IndexedDB. After removing the offline features, old cached databases can cause version conflicts. Clearing browser storage removes these old databases and allows the system to work properly with the online-only Supabase database.

## After Clearing Storage

- You may need to log in again
- Theme preferences will reset to system default
- All data will be loaded fresh from the Supabase database
- No more offline functionality - internet connection required

## Prevention

To prevent this issue in the future:
- Regular browser cache clearing (every few weeks)
- Use incognito/private browsing for testing
- Clear storage when switching between major application versions 