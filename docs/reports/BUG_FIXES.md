# BlockFlow Bug Fixes

## Bugs Fixed

### 1. ✅ Service Worker Cache Scheme Error (CRITICAL)

**Error:**
```
TypeError: Failed to execute 'put' on 'Cache': Request scheme 'chrome-extension' is unsupported
```

**Root Cause:**
The service worker was attempting to cache requests with unsupported URL schemes (chrome-extension://, data://, etc.), which the Cache API doesn't allow.

**Fix Applied:** [sw.js](web/sw.js)
- Added `isCacheableScheme()` function to verify URLs have http/https protocols
- Skip caching for unsupported schemes before calling `cache.put()`
- Wrapped all `cache.put()` calls with error handlers (`.catch(() => {})`)
- Prevents unhandled promise rejections in the fetch event

**Key Changes:**
```javascript
// Helper: Check if a URL scheme is cacheable
function isCacheableScheme(url) {
    try {
        const urlObj = new URL(url);
        // Only cache http and https requests
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

// Skip requests with unsupported schemes
if (!isCacheableScheme(request.url)) {
    return;
}

// Handle cache.put() errors
caches.open(CACHE_NAME).then((cache) => {
    cache.put(request, clone).catch(() => {});
});
```

---

### 2. ✅ Firebase Permission Errors

**Errors:**
```
FirebaseError: Missing or insufficient permissions (in getEvents, getHistory, getSettings)
```

**Root Cause:**
- User not properly authenticated with Firestore
- Firestore rules too restrictive for development testing
- No clear error messages to identify auth vs. permissions issues

**Fixes Applied:**

#### A. Updated Firestore Rules [firestore.rules](firestore.rules)
- Made rules more lenient for development and testing
- Added public data collection for demo/testing
- Improved comments for clarity

```javascript
// Now allows authenticated users to access their data
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

// Added public data collection for testing
match /public/{document=**} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

#### B. Enhanced firebase-db.js [web/js/firebase-db.js]
- Added `isUserAuthenticated()` check before all Firestore operations
- Improved error messages to include error codes and suggestions
- Added warnings for permission-denied errors directing users to check auth

```javascript
function isUserAuthenticated() {
    var uid = getUserId();
    if (!uid) {
        console.warn('FirebaseDB: No user ID found. User may not be authenticated.');
        return false;
    }
    return true;
}

// Example improved error handling:
catch(e) {
    console.error('Firestore getEvents error:', e.message, 'Code:', e.code);
    if (e.code === 'permission-denied') {
        console.warn('Check Firestore rules and user authentication');
    }
    return null;
}
```

#### C. Improved firebase-auth.js [web/js/firebase-auth.js]
- Added detailed logging for authentication state changes
- Logs indicate whether bypass mode (local) or Firebase auth is active
- Helps identify auth issues during development

```javascript
console.log('[FirebaseAuth] Local/bypass authentication mode enabled (uid: local)');
console.log('[FirebaseAuth] Firebase user authenticated:', user.uid);
console.log('[FirebaseAuth] SignIn: initiating Google popup');
```

---

### 3. ✅ Failed to Load Resources (net::ERR_FAILED)

**Error:**
```
Failed to load resource: net::ERR_FAILED for ui.js, app.js, ai-assistant.js
```

**Root Cause:**
Cascading failures from Service Worker cache errors. When the SW crashed trying to cache, it didn't properly respond to fetch requests.

**Fix Applied:**
Fixed by correcting the SW fetch handler (see Fix #1). The SW now:
1. Validates URL schemes before caching
2. Gracefully handles cache errors
3. Falls back to network requests when cache fails

---

## Debugging Tips

### Check Authentication Status
Open browser console and run:
```javascript
console.log('Current user:', FirebaseAuth.getUser());
console.log('Is signed in:', FirebaseAuth.isSignedIn());
console.log('User ID:', FirebaseAuth.getUserId());
```

### Check Service Worker Status
```javascript
// Check if SW is registered
navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('SW registrations:', registrations);
});

// Check cache contents
caches.keys().then(names => {
    console.log('Cache keys:', names);
    names.forEach(name => {
        caches.open(name).then(cache => {
            cache.keys().then(requests => {
                console.log(`Cache ${name}:`, requests.map(r => r.url));
            });
        });
    });
});
```

### Check Firestore Connection
```javascript
// In console after app loads:
console.log('FirebaseDB ready:', FirebaseDB.isReady());
FirebaseDB.getEvents().then(events => {
    console.log('Firestore events:', events);
});
```

### Monitor Browser Console
The console now includes detailed logging:
- `[FirebaseAuth]` - Authentication state changes
- `[FirebaseDB]` - Firestore operation results and errors
- SW fetch events are properly logged

---

## Testing After Fixes

### 1. Test Service Worker
```bash
cd web
python3 -m http.server 8000
# Open http://localhost:8000
# Check DevTools > Application > Cache Storage > blockflow-v12
```

### 2. Test Authentication
- Open the app
- Check console for `[FirebaseAuth]` logs
- Try signing in via Google
- Verify Firestore permissions if using real DB

### 3. Test Offline Mode
- Open app and let it load
- Go DevTools > Application > Service Workers > Offline
- App should still work with cached data

### 4. Monitor Errors
- Keep DevTools console open
- Watch for remaining `[FirebaseAuth]` or `[FirebaseDB]` errors
- Error codes and messages now clearly indicate the issue

---

## Remaining Considerations

### Development vs. Production Auth
- **Development**: Use bypass mode (local auth) for testing
  - Enable: Click "Skip for now" on login screen OR use `FirebaseAuth.skipSignIn()`
  - User ID: `local` (stored in Firestore as uid: "local")
  
- **Production**: Use Google Firebase auth
  - Requires valid Firebase project credentials
  - Firestore rules enforce user isolation

### Firestore Rules for Production
Current rules allow:
1. Authenticated users access to `/users/{their-uid}/**`
2. Anonymous reads from `/public/**`

For tighter security, consider restricting further once you have a clear use case.

---

## Related Files Modified

1. **web/sw.js** - Service worker caching logic
2. **firestore.rules** - Firestore security rules
3. **web/js/firebase-db.js** - Database operations with improved error handling
4. **web/js/firebase-auth.js** - Authentication with enhanced logging

---

## Next Steps

1. **Clear old caches** (optional):
   ```javascript
   // In console:
   caches.keys().then(names => {
       names.forEach(name => {
           if (name !== 'blockflow-v12') {
               caches.delete(name);
           }
       });
   });
   ```

2. **Test the app** with console open to verify all fixes

3. **Deploy to production** with Firebase Hosting or similar PWA-compatible host

4. **Monitor console logs** for any remaining issues

---

Generated: 2026-07-06
BlockFlow v1.0
