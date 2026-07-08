# BlockFlow Firebase Setup Guide

## Overview

BlockFlow uses Firebase for authentication and a Cloud Function to bridge Google Sign-In to Google Calendar API.

## Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud account
- Firebase project

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "blockflow" (or your choice)
4. Disable Google Analytics (optional) → Create project

---

## Step 2: Enable Authentication

1. In Firebase Console → **Authentication** → **Get started**
2. Click "Sign-in method" tab
3. Enable **Google**
4. Select a project support email
5. Click **Save**

---

## Step 3: Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Search for and enable **Google Calendar API**
4. Go to **APIs & Services** → **Credentials**
5. Create **OAuth 2.0 Client ID** (Web application)
6. Note the **Client ID** and **Client Secret**

---

## Step 4: Configure Firebase Web App

1. In Firebase Console → **Project Settings** (gear icon)
2. Scroll to "Your apps" → Click **Web** icon `</>`
3. Register app with nickname "BlockFlow Web"
4. Copy the `firebaseConfig` object

---

## Step 5: Update Web App Config

Edit `BlockFlow/js/firebase.js` and replace the placeholder config:

```javascript
config: {
apiKey: "YOUR_ACTUAL_API_KEY",
authDomain: "your-project.firebaseapp.com",
projectId: "your-project-id",
storageBucket: "your-project.appspot.com",
messagingSenderId: "123456789",
appId: "1:123456789:web:abcdef"
}
```

---

## Step 6: Deploy Cloud Functions

1. Open terminal in `BlockFlow/functions/`
2. Run:
```bash
npm install
cd ..
firebase login
firebase functions:config:set google.client_id="YOUR_CLIENT_ID" google.client_secret="YOUR_CLIENT_SECRET"
firebase deploy --only functions
```

---

## Step 7: Configure Hosting (GitHub Pages alternative)

If using Firebase Hosting instead of GitHub Pages:

```bash
firebase init hosting
# Select BlockFlow as public directory
# Configure as single-page app: Yes
firebase deploy --only hosting
```

---

## Step 8: Update Authorized Domains

1. Firebase Console → **Authentication** → **Sign-in method**
2. Scroll to "Authorized domains"
3. Add your domain (e.g., `blockflow.web.app` or `localhost` for testing)

---

## Local Development

To test with Firebase emulators:

```bash
firebase emulators:start
```

Then open `http://localhost:5000` (hosting) or directly access the function at `http://localhost:5001`.

---

## Testing Google Sign-In Flow

1. Open the app
2. Go to **Calendar** page
3. Click "Sign in with Google"
4. Grant calendar permissions
5. Your events should load!

---

## Troubleshooting

### "Token expired" errors
- User needs to sign out and sign back in
- The Cloud Function attempts to auto-refresh, but OAuth refresh tokens may need re-authorization

### "Not authorized" errors
- Check that Google Calendar API is enabled
- Verify the Cloud Function deployed successfully
- Check Firebase Console → Functions logs for errors

### CORS errors
- Ensure Cloud Function URL is correct
- Check Firebase Authentication authorized domains

---

## Firebase Pricing

- **Authentication**: Free tier (10,000 sign-ins/month)
- **Cloud Functions**: Pay-as-you-go (free tier: 125,000 invocations/month)
- **Hosting**: Free (360MB storage, 10GB transfer/month)

For a personal productivity app, you likely won't exceed free tiers.

---

## Alternative: Use Firebase Extensions

If you prefer not to write Cloud Functions, Firebase has a **Google Calendar Sync** extension, but it works differently (one-way sync, not real-time).

---

## Support

If you hit issues, check:
1. Firebase Console logs (Functions → Logs)
2. Browser console for auth errors
3. Network tab for failed API calls