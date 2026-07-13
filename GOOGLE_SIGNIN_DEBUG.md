# Google Sign-In Debug Report

## Root Cause

**Two bugs broke Google Sign-In after migrating to GitHub Pages:**

1. **Runtime TypeError**: `settings.html:1009` calls `FirebaseAuth.isBypassMode()` — this method does not exist
2. **Firebase Auth not initialized**: `auth` is null in `signIn()`, causing automatic bypass fallback

---

## Bug 1: `FirebaseAuth.isBypassMode()` does not exist

### Evidence

**settings.html line 1009:**
```javascript
} else if (FirebaseAuth.isBypassMode()) {
```

**firebase-auth.js — the function is `isBypassActive()` (private, not exported):**
```javascript
// Line 11-13 (private function, inside IIFE)
function isBypassActive() {
    return localStorage.getItem(BYPASS_KEY) === 'true';
}

// Lines 34-155 (exported public methods)
return {
    init: function() { ... },
    onAuthChange: function(callback) { ... },
    signIn: async function() { ... },
    signOut: async function() { ... },
    skipSignIn: function() { ... },
    getUser: function() { ... },
    isSignedIn: function() { ... },
    getUserId: function() { ... },
    getUserEmail: function() { ... },
    getUserName: function() { ... },
    getUserPhoto: function() { ... }
    // NOTE: isBypassMode is NOT here
};
```

### Impact

When `onAuthChange` fires on settings.html:
1. If `user` is null (not authenticated) → falls to `else if` on line 1009
2. `FirebaseAuth.isBypassMode()` → **TypeError: FirebaseAuth.isBypassMode is not a function**
3. This crashes the settings page auth handler
4. The account section never renders properly

### Why it worked on Firebase Hosting

This bug existed before but was masked — on Firebase Hosting, the auth flow may have always provided a `user` object (either Firebase-authenticated or bypass), so the `else if` branch was never reached.

---

## Bug 2: "SignIn: no auth available"

### Evidence

**firebase-auth.js line 96-100:**
```javascript
signIn: async function() {
    if (isBypassActive()) {
        // ... returns cached user
    }
    if (!auth) {  // ← auth is null
        console.log('[FirebaseAuth] SignIn: no auth available, enabling bypass mode');
        notifyListeners(getBypassUser());
        setBypass(true);
        return { success: true, user: currentUser };
    }
    // ... Firebase Google Sign-In
}
```

### Why `auth` is null

In `init()` (line 35-80):
```javascript
init: function() {
    if (isBypassActive()) {
        // Line 38: returns early — auth is NEVER set
        notifyListeners(getBypassUser());
        return true;
    }
    FirebaseApp.init();  // Line 41
    if (typeof firebase === 'undefined' || !firebase.auth) {
        // Line 45: sets bypass, auth stays null
        setBypass(true);
        return true;
    }
    auth = firebase.auth();  // Line 49: only reached if SDK loaded
}
```

**The cascade:**
1. User visits settings.html → `FirebaseAuth.init()` runs
2. If `blockflow_bypass_auth` is `true` in localStorage → returns early → `auth` never set
3. User clicks "Sign in with Google" → `signIn()` → `!auth` → "no auth available" → forces bypass again
4. User is stuck in bypass mode permanently

### Why bypass is stuck

Once `skipSignIn()` is called (or SDK fails to load), `localStorage.blockflow_bypass_auth = 'true'`. On every subsequent page load, `init()` returns early and never initializes `auth`. The only escape is:
- Call `FirebaseAuth.signOut()` (clears the bypass flag)
- Or manually clear `localStorage.removeItem('blockflow_bypass_auth')`

---

## Bug 3: Firebase Authorized Domains (Configuration)

### Current Config

**firebase-init.js lines 3-11:**
```javascript
const config = {
    apiKey: "AIzaSyA5fBcpGbR90FzBja5elSq9wMMG3GZBQ7Q",
    authDomain: "blockflow-28d39.firebaseapp.com",  // ← Firebase Hosting domain
    projectId: "blockflow-28d39",
    // ...
};
```

### Required Configuration

For Google Sign-In to work on GitHub Pages, TWO domains must be authorized:

| Where | Domain to Add |
|-------|---------------|
| Firebase Console → Authentication → Settings → **Authorized domains** | `brianbcyang27-prog.github.io` |
| Google Cloud Console → Credentials → OAuth 2.0 → **Authorized JavaScript origins** | `https://brianbcyang27-prog.github.io` |

### Note on `authDomain`

The `authDomain` in `firebase-init.js` does NOT need to change for popup-based sign-in. Firebase validates the **origin** (browser URL) against authorized domains, not the `authDomain` config value. The `authDomain` is only used for redirect-based auth flows.

---

## Files Involved

| File | Role |
|------|------|
| `js/firebase-auth.js` | Auth module — missing `isBypassMode` export, bypass cascade |
| `js/firebase-init.js` | Firebase config — authDomain points to Firebase Hosting |
| `settings.html:1009` | Calls non-existent `FirebaseAuth.isBypassMode()` |
| `firebase.json` | Only contains Firestore rules (hosting removed) |

---

## Exact Fix

### Fix 1: Expose `isBypassActive` as public method

In `js/firebase-auth.js`, add to the return object (after line 154):

```javascript
isBypassMode: function() { return isBypassActive(); },
```

### Fix 2: Fix the bypass cascade in `signIn()`

In `js/firebase-auth.js`, when `!auth` at line 96, instead of silently enabling bypass, **clear the bypass flag and reinitialize**:

```javascript
if (!auth) {
    console.log('[FirebaseAuth] SignIn: auth not initialized, reinitializing');
    localStorage.removeItem(BYPASS_KEY);
    this.init();
    if (!auth) {
        console.error('[FirebaseAuth] SignIn: Firebase SDK still unavailable');
        return { success: false, error: 'Firebase SDK not loaded' };
    }
}
```

### Fix 3: Add GitHub Pages domain to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/) → `blockflow-28d39`
2. Authentication → Settings → **Authorized domains** → Add `brianbcyang27-prog.github.io`
3. Save

### Fix 4: Add GitHub Pages origin to Google Cloud OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Edit the OAuth 2.0 Client ID
3. **Authorized JavaScript origins** → Add `https://brianbcyang27-prog.github.io`
4. Save

---

## Verification Steps

After applying fixes:

1. Open `https://brianbcyang27-prog.github.io/blockflow/` in incognito
2. Open DevTools → Console
3. Verify: `[FirebaseAuth] Initializing with Firebase SDK` (not "bypass mode")
4. Click "Sign in with Google"
5. Verify: Google OAuth popup appears (not "no auth available")
6. Complete sign-in → verify user info shows in settings
