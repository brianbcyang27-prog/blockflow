# BlockFlow — GitHub Pages Deployment Guide

This guide explains how to deploy BlockFlow to GitHub Pages while keeping Firebase Auth and Firestore.

---

## Architecture

```
GitHub Pages (static hosting)
    │
    ├── Firebase Authentication (Google Sign-In)
    ├── Firestore (cloud backup)
    └── Cloudflare Worker (NVIDIA API proxy)
```

**What moved:**
- Static file hosting → GitHub Pages

**What stays:**
- Firebase Auth (Google Sign-In popup)
- Firestore (events, history, settings sync)
- Cloudflare Worker proxy (`blockflow-proxy.jarvis-cf.workers.dev`)

---

## Step 1: Enable GitHub Pages

1. Go to your GitHub repo: `https://github.com/brianbcyang27-prog/blockflow`
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - **Deploy from a branch**
   - Branch: `main`
   - Folder: `/web` (this is important — the `web/` directory contains the app)
4. Click **Save**

Your site will be available at:
```
https://brianbcyang27-prog.github.io/blockflow/
```

---

## Step 2: Update Firebase Auth Domains

Firebase Auth requires your hosting domain to be authorized.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project `blockflow-28d39`
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add: `brianbcyang27-prog.github.io`
6. Click **Add**

---

## Step 3: Update Google OAuth Redirect URIs

If you use Google Calendar import, update the OAuth client:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project `blockflow-28d39`
3. Go to **APIs & Services** → **Credentials**
4. Edit your OAuth 2.0 Client ID
5. Under **Authorized JavaScript origins**, add:
   ```
   https://brianbcyang27-prog.github.io
   ```
6. Click **Save**

---

## Step 4: Verify Deployment

1. Open `https://brianbcyang27-prog.github.io/blockflow/`
2. Check:
   - [ ] Page loads correctly
   - [ ] CSS styles apply
   - [ ] Service worker registers
   - [ ] PWA install prompt appears
   - [ ] Firebase Auth (Google Sign-In) works
   - [ ] AI assistant responds (via Cloudflare Worker proxy)
   - [ ] Calendar events save to Firestore

---

## Troubleshooting

### AI Assistant not working

The AI assistant uses the Cloudflare Worker proxy at:
```
https://blockflow-proxy.jarvis-cf.workers.dev
```

If it's not working:
1. Check if the Cloudflare Worker is deployed
2. Open browser DevTools → Network tab
3. Look for requests to `blockflow-proxy.jarvis-cf.workers.dev`
4. Check for CORS errors

### Firebase Auth fails

1. Verify `brianbcyang27-prog.github.io` is in Firebase authorized domains
2. Check browser console for Firebase errors
3. Ensure the Firebase config in `firebase-init.js` matches your project

### Google Calendar import fails

1. Verify `https://brianbcyang27-prog.github.io` is in Google OAuth authorized origins
2. Check browser console for OAuth errors
3. Ensure the client ID in `google-calendar.js` matches your Google Cloud project

### PWA not installing

1. Check `manifest.json` `start_url` is `"./"`
2. Verify service worker registers (check DevTools → Application → Service Workers)
3. Ensure all cached assets exist in `web/` directory

---

## Files Changed for GitHub Pages

| File | Change | Reason |
|------|--------|--------|
| `web/manifest.json` | `start_url: "./"` | Relative path works on any host |
| `web/js/calendar.js` | Removed `/api/chat` fallback | Dead code, Firebase Functions no longer used |
| `firebase.json` | Removed `hosting` section | No longer using Firebase Hosting |

---

## What Stays the Same

- `firebase-init.js` — Firebase config (works from any host)
- `firebase-auth.js` — Google Sign-In (popup mode)
- `firebase-db.js` — Firestore CRUD operations
- `storage.js` — localStorage + Firebase sync
- `nvidia-config.js` — Already uses Cloudflare Worker
- All HTML files — Paths are already relative
- Service worker — Paths are already relative

---

## Optional: Custom Domain

If you have a custom domain:

1. Add a `CNAME` file to `web/` with your domain
2. Update DNS to point to GitHub Pages
3. Update Firebase authorized domains with your custom domain
4. Update Google OAuth authorized origins with your custom domain

---

## Optional: Remove Firebase Hosting

If you no longer need Firebase Hosting:

```bash
# Login to Firebase
firebase login

# Remove hosting site
firebase hosting:sites:delete blockflow-28d39
```

**Note:** This only removes the hosting site. Firebase Auth and Firestore remain active.
