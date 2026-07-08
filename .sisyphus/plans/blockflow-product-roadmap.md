# BlockFlow — Comprehensive Product Roadmap & Development Plan

> Created: 2026-07-01
> Based on research across AI APIs, health data integration, monetization, and codebase audit

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Phase 1 — Polish & Bug Fix (Current)](#2-phase-1--polish--bug-fix-current)
3. [Phase 2 — New AI Feature Integration](#3-phase-2--new-ai-feature-integration)
4. [Phase 3 — Health & Wearable Data](#4-phase-3--health--wearable-data)
5. [Phase 4 — Monetization & Deployment](#5-phase-4--monetization--deployment)
6. [AI API Research: Complete Provider Comparison](#6-ai-api-research-complete-provider-comparison)
7. [Health Data API Research](#7-health-data-api-research)
8. [Monetization Strategy Research](#8-monetization-strategy-research)
9. [Codebase Audit: Known Issues](#9-codebase-audit-known-issues)
10. [Appendix: Implementation Notes](#10-appendix-implementation-notes)

---

## 1. Executive Summary

BlockFlow is a productivity PWA (3-block day planner + focus timer + calendar). The instructor's direction is two-fold:

1. **Broad AI application** — Use multiple AI APIs (vision/OCR, voice, LLM) beyond just code generation, to build job-market-relevant skills.
2. **Real-world value** — Make the project useful for school, self, and market. Ship a usable product.

### Guiding Principles

- **Don't implement yet** — This document is the research and plan. Implementation starts after review.
- **No backend server** — Everything must work from the browser/client-side (CORS proxies or WASM).
- **Free tiers only** — No credit card required for development and prototyping.
- **User-pays model** — For Puter.js integration, users cover their own AI costs.

---

## 2. Phase 1 — Polish & Bug Fix (Current)

### Goal
Make BlockFlow a production-ready, polished PWA that people would actually use.

### Priority Order

#### P1: Commit all uncommitted file restructuring
- **What**: The root→`web/` directory restructuring is unstaged. ~20 files shown as deleted + untracked.
- **Action**: `git add` the correct state, clean up `.gitignore`, commit.
- **Effort**: 30 min

#### P2: Playwright end-to-end testing
- **What**: Create automated tests for every page and feature flow using Playwright MCP.
- **Test scenarios**:
  1. Dashboard: All 3 blocks render, timer starts/pauses/resets, distraction tracking works, sleep log works
  2. Calendar: Month navigation, add/edit/delete events, AI analysis modal shows
  3. Settings: API key management, Google Calendar import button, data export
  4. AI Assistant: Chat bubble opens/closes, message send, voice button exists
  5. Responsive: Mobile viewport (375px width) — no broken layout
  6. PWA: manifest loads, service worker registers
- **Effort**: 2-3h (run tests on each fix iteration)

#### P3: Fix all known bugs
1. **Calendar AI analysis: close button** — Dismiss button added (recent fix, verify it works)
2. **Distraction tracking button** — Wired up (recent fix, verify)
3. **Console.log cleanup** — Keep `console.log('[BlockFlow] v' + APP_VERSION)` (intentional), verify no others
4. **NVIDIA API CORS fallback** — The fallback to `corsproxy.io` has rate limits. Consider adding a second proxy or switching to Puter.js
5. **`no-scroll` body class** — Currently removed for scrollable dashboard. Verify no regression on settings/calendar pages
6. **Null element safety** — All `ui.js` methods already have null guards. Verify `app.js` event listeners are also guarded

#### P4: UI/UX Polish
| Area | Issue | Fix |
|------|-------|-----|
| Loading states | No loading skeleton on dashboard init | Add brief skeleton while data loads |
| Empty states | History section shows "No history yet" | Already done — good |
| Error states | AI fails silently in some paths | Add user-visible toast/banner |
| Mobile nav | Bottom tabs at 375px might overlap | Test with Playwright, add safe area |
| Accessibility | No `aria-label` on timer buttons | Add labels |
| Color contrast | Some text on gradient backgrounds | Check WCAG AA compliance |
| Transition | Page transitions are instant | Add CSS fade between pages |

#### P5: Monetization Prep (Structure)
- Add free/pro account model to data layer
- Add feature flags tied to account tier
- Prepare Stripe/Lemon Squeezy integration point

---

## 3. Phase 2 — New AI Feature Integration

### 3.1 OCR / Visual Recognition — Document Text Extraction

#### Recommended Approach: Tesseract.js (Client-Side, Free)

| Aspect | Detail |
|--------|--------|
| **Library** | [Tesseract.js](https://github.com/naptha/tesseract.js) v7 |
| **License** | Apache 2.0 — completely free |
| **How it works** | WebAssembly port of Tesseract OCR engine. Runs 100% in browser. |
| **Languages** | 100+ languages including Chinese (important for school context) |
| **Model size** | ~4MB core + ~4MB per language (cached after first use) |
| **Privacy** | Images never leave the device |
| **Offline** | Works offline once WASM + language data cached |
| **CORS** | N/A — runs locally, no API calls |

**Implementation: Document Scanner Feature**

```
┌─────────────────────────────────────────────┐
│  New Feature: "AI Document Scanner"          │
│                                              │
│  [Upload Image] [Take Photo] [Paste URL]     │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Image Preview Area                  │   │
│  │                                      │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  [Extract Text] → runs Tesseract.js locally  │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │  Extracted Text:                     │   │
│  │  ┌────────────────────────────┐      │   │
│  │  │ "This is extracted text..." │      │   │
│  │  └────────────────────────────┘      │   │
│  │  [Copy] [Add to Notes]              │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Use cases:**
- Upload student ID card → extract name/ID number
- Take photo of assignment sheet → extract task list
- Scan handwritten notes → digitize
- Receipt scanning for expense tracking

**Alternative APIs (if client-side isn't enough):**

| Provider | Free Tier | Browser? | Notes |
|----------|-----------|----------|-------|
| [Puter.js img2txt](https://developer.puter.com/tutorials/free-unlimited-ocr-api/) | Unlimited (user-pays) | ✅ Direct | No API key, user signs in to Puter |
| [OCR.space](https://ocr.space/ocrapi) | 500 req/day | ✅ With CORS | API key needed, JS example provided |
| [Optiic.dev](https://optiic.dev/) | Free tier | ✅ | No credit card required |
| Google Cloud Vision | 1000 units/month free | ✅ | Needs Google Cloud account |

#### Recommended: Start with Tesseract.js (truly free, private, offline). Add Puter.js as fallback for complex documents.

### 3.2 Voice Recognition — Voice Commands

#### Current State
- Web Speech API (`SpeechRecognition`) is already used for AI assistant voice input
- Limitations: Chrome/Edge only, English only, no server-side fallback, accuracy can be poor

#### Enhanced Voice Feature: Voice Command System

**What it does:** User speaks commands like "Start focus timer", "Log 30 minutes focus", "Mark recovery block done", "I got distracted", "Add event: Math exam tomorrow at 9am" — the system parses the command and executes it.

**Architecture:**

```
User speaks → Web Speech API → Text transcript
                                    ↓
                            NLP Parsing (Client-side)
                                    ↓
                            Match command pattern
                                    ↓
                            Execute action in app
```

**Backend options for better accuracy:**

| Solution | Free Tier | Browser | Notes |
|----------|-----------|---------|-------|
| **Web Speech API** (already have) | Free | Chrome/Edge only | Limited language support, no punctuation |
| **OpenAI Whisper** | 3 RPM, 200 RPD | Via API + CORS proxy | $0 for prototyping, needs API key |
| **Groq Whisper** | ~30 RPM, free | Via API + CORS proxy | Faster than OpenAI, same model |
| **Puter.js speech2txt** | Unlimited (user-pays) | ✅ Direct | No API key needed |

**Recommended:**
1. Keep Web Speech API as primary (free, instant, no API call)
2. Add **Puter.js speech2txt** as enhanced fallback for:
   - Better accuracy on complex commands
   - Non-English languages
   - Punctuation support
   - When the user clicks "Enhanced" voice button

### 3.3 Additional LLM API Integration

#### Current State
- Using NVIDIA Llama 3.1 (API key hardcoded, CORS proxy fallback)
- Single model, no fallback if NVIDIA is down

#### Enhanced Strategy: Multi-Provider LLM with Fallback

**Goal:** If one provider fails, seamlessly fallback to another. Users can see which model is responding.

**Provider comparison for free tier:**

| Provider | Free Tier | CORS-friendly | OpenAI Compatible | Best For |
|----------|-----------|---------------|-------------------|----------|
| **Google Gemini** | 1,500 req/day Flash, 100 req/day Pro | ✅ Via fetch | Partial | Primary LLM — best free tier overall |
| **Groq** | 30 RPM, 1,000 req/day, 100K tokens/day | ✅ Via fetch | ✅ Yes | Speed-critical responses (320 TPS) |
| **OpenRouter** | 20 RPM, 50 req/day free models | ✅ Via fetch | ✅ Yes | Model variety, fallback routing |
| **Cerebras** | ~1M tokens/day | ✅ Via fetch | ✅ Yes | High throughput, Llama 3.3 70B |
| **Mistral** | ~1B tokens/month (experiment tier) | ✅ Via fetch | ✅ Yes | Large catalog, coding models |
| **NVIDIA** (current) | Free tier exists | ❌ CORS issues | ✅ Yes | Already integrated, keep as fallback |
| **Puter.js** | Unlimited (user-pays) | ✅ Direct | No (SDK) | Universal fallback, no API keys |

**Recommended Architecture:**

```
App → Try Gemini (primary, 1500 req/day)
    → Fallback to Groq (fast, 30 RPM)
    → Fallback to current NVIDIA (existing integration)
    → Fallback to Puter.js (unlimited, user pays)
```

**New feature: Model Selector** in settings — user can pick preferred provider or let the system auto-fallback.

---

## 4. Phase 3 — Health & Wearable Data

### 4.1 Sign in with Apple

| Aspect | Detail |
|--------|--------|
| **Feasibility** | ✅ Fully supported on web via [Sign in with Apple JS](https://developer.apple.com/documentation/signinwithapplejs) |
| **Integration** | Add Apple JS SDK `<script>` tag, configure with Service ID |
| **Auth flow** | Use `usePopup: true` to avoid redirect issues in PWA |
| **Data returned** | Email, name, unique user ID |
| **Requirements** | Apple Developer Program membership ($99/year) for production |
| **Complexity** | Low — similar to Google Sign-In already implemented |
| **Alternative** | Use [Supabase Apple auth](https://supabase.com/docs/guides/auth/social-login/auth-apple?platform=web) — handles token verification |

**Recommendation:** Use Supabase's Apple OAuth integration (they handle token verification). This is the simplest path.

### 4.2 Google Fit — Sleep & Health Data

**What's possible from a web app:**

| Data Type | Google Fit REST API | Free Tier |
|-----------|-------------------|-----------|
| Sleep sessions | ✅ `activityType=72` | ✅ Free |
| Sleep stages (light/deep/REM) | ✅ `com.google.sleep.segment` | ✅ Free |
| Step count | ✅ `com.google.step_count.delta` | ✅ Free |
| Heart rate | ✅ `com.google.heart_rate.bpm` | ✅ Free |
| Activity/Workouts | ✅ Sessions API | ✅ Free |
| Weight/Body metrics | ✅ Data sources API | ✅ Free |

**Architecture:**
```
User → Google OAuth (already have pattern from Google Calendar)
    → Authorize Fitness scopes
    → REST API call to Google Fit
    → Store normalized health data in Storage
    → Display in BlockFlow dashboard

Data flow:
  googleapis.com/fitness/v1/users/me/sessions?activityType=72
    → Sleep start/end times
  googleapis.com/fitness/v1/users/me/dataset:aggregate
    → Sleep stages, steps, heart rate
```

**Implementation complexity:** Medium — OAuth flow already exists (Google Calendar import uses same pattern).

**Scopes needed:**
```
https://www.googleapis.com/auth/fitness.sleep.read
https://www.googleapis.com/auth/fitness.activity.read
https://www.googleapis.com/auth/fitness.heart_rate.read
```

### 4.3 Apple HealthKit (Future)

**Important constraint:** HealthKit has NO web API. It requires an iOS native app component.

**Options to bridge web ↔ HealthKit:**

| Solution | Description | Effort | Cost |
|----------|-------------|--------|------|
| **PWAKit** | Wraps PWA in native iOS shell with JS bridge to HealthKit | High (requires iOS build) | Free (open source) |
| **Open Wearables SDK** | iOS SDK that reads HealthKit and pushes to your backend | High (iOS native dev) | Free (MIT license) |
| **Terra API** | Middleware: iOS SDK → Terra → your webhook | Medium | Free tier available |
| **HealthSync** | Open-source iOS app that syncs HealthKit to your API | Medium (deploy the bridge app) | Free |

**Recommendation:** This is a high-effort feature for a student project. **Defer until the web app is monetized and you have an Apple Developer account.**

If you want it anyway: **PWAKit** is the most interesting option — it wraps your existing PWA in an iOS native shell with a JavaScript bridge. Your web code stays 100% the same, you just add calls like `ios.healthKit.querySleep()` through the JS bridge.

### 4.4 Oura Ring / Fitbit / Other Wearables

| Platform | Web API? | Free Tier | Effort |
|----------|---------|-----------|--------|
| **Fitbit Web API** | ✅ REST API with OAuth | 150 req/day per user | Medium |
| **Oura Ring API** | ✅ REST API with OAuth | Free tier (rate limited) | Medium |
| **Garmin Health API** | ❌ Requires enterprise partnership | N/A | Very High |
| **Whoop API** | ✅ OAuth 2.0 | Free for developers | Medium |

**Recommendation:** Google Fit gives the most data for zero cost and works with any Android phone. Start there. Fitbit/Oura can be added later.

### 4.5 Health Dashboard Integration

The vision: Show users a daily "Health Energy" score based on:

```
Morning:   Sleep duration + Sleep quality (from Google Fit / manual)
All day:   Step count + Heart rate (from Google Fit)
Evening:   Focus time ratio + Distractions (from BlockFlow)
           ↓
    "Energy Level" score (calculated client-side)
```

This directly ties to the instructor's goal of analyzing "user's health energy flow."

---

## 5. Phase 4 — Monetization & Deployment

### 5.1 Recommended Model: Freemium + Hard Paywall

Based on research (RevenueCat 2026 data):
- **Productivity apps perform better with hard paywalls** than freemium
- Direct buyers in Productivity have **13.7% higher LTV** than trial users
- **Weekly subscriptions** generate 55.5% of all app subscription revenue
- Recommended: **7-day free trial → $4.99/week or $14.99/month**

### 5.2 Feature Tiers

| Feature | Free | Pro ($4.99/week) |
|---------|------|-------------------|
| 3-block dashboard | ✅ | ✅ |
| Focus timer | ✅ | ✅ |
| Manual distraction tracking | ✅ | ✅ |
| Sleep logging (manual) | ✅ | ✅ |
| 7-day history | ✅ | ✅ |
| **Calendar + events** | ✅ | ✅ |
| **AI Assistant** | 10 msg/day | Unlimited |
| **AI Calendar Analysis** | ✅ | ✅ |
| **OCR Document Scanner** | ❌ | ✅ Unlimited |
| **Voice Commands** | Basic (Web Speech) | Enhanced (Whisper) |
| **Health Data Sync** | ❌ | ✅ Google Fit + Apple |
| **Multiple LLM providers** | ❌ | ✅ Choose your model |
| **Weekly AI Report** | ❌ | ✅ Auto-generated |
| **Data Export** | ✅ JSON | ✅ JSON + CSV + PDF |
| **Ads** | ❌ (never) | ❌ (never) |

### 5.3 Payment Processor Options

| Provider | PWA Support | Fee | Backend Needed? |
|----------|------------|-----|----------------|
| **Lemon Squeezy** | ✅ Payment Links, Checkout | 5% + $0.50 | No (hosted checkout) |
| **Stripe** | ✅ Payment Links, Checkout | 2.9% + $0.30 | No (hosted checkout) |
| **Paddle** | ✅ Checkout Overlay | 5% + $0.50 | No (hosted checkout) |
| **RevenueCat** | ✅ (needs Stripe) | Free tier | No (wraps Stripe) |

**Recommendation:** **Lemon Squeezy** — it handles tax compliance globally (including Taiwan), has no monthly fee, requires no backend, and offers hosted checkout pages you can link to from the PWA.

### 5.4 Implementation Flow

```
User clicks "Upgrade to Pro"
    → Lemon Squeezy hosted checkout
    → User pays (card, Apple Pay, Google Pay)
    → Lemon Squeezy webhook → unlocks pro features
    → Store license key in localStorage
    → Feature flags checked on every page load
```

For MVP, you can even start with a **manual "Pro" toggle** (honor system) while testing the payment flow.

### 5.5 Deployment

**Firebase Hosting** is already configured:
```
firebase deploy
```

Custom domain via Firebase Hosting. This gives you HTTPS (required for PWA service worker).

---

## 6. AI API Research: Complete Provider Comparison

### 6.1 LLM APIs — Free Tier Comparison (June 2026)

| Provider | Best Free Model | RPM | Daily Limit | Context | CORS? | OpenAI Compatible? | Card? | Notes |
|----------|----------------|-----|-------------|---------|-------|-------------------|-------|-------|
| **Google Gemini** | Gemini 2.5 Flash | 10 | 1,500 req | 1M tokens | ✅ Yes | Partial | No | Best all-around free tier |
| **Groq** | Llama 3.3 70B | 30 | 1,000 req, 100K tokens | 128K | ✅ Yes | ✅ Full | No | Fastest inference (320 TPS) |
| **Cerebras** | Llama 3.3 70B | 30 | ~1M tokens/day | Up to 1M | ✅ Yes | ✅ Full | No | High throughput |
| **OpenRouter** | 20+ free models | 20 | 50 req (1000 with $10) | Varies | ✅ Yes | ✅ Full | No | Best for model variety |
| **Mistral** | open-mixtral-8x7b | 60 | ~1B tokens/month | 32K | ✅ Yes | ✅ Full | No | Large catalog |
| **NVIDIA** (current) | Llama 3.1 Nemotron | Unknown | Unknown | 128K | ❌ CORS issues | ✅ Full | No | Keep as fallback |
| **Cloudflare Workers AI** | 20+ models | High | 10K neurons/day | 2-8K | ✅ Yes | Partial | No | Edge deployment |
| **Puter.js** | 400+ models | Unlimited | Unlimited (user-pays) | Varies | ✅ Direct (SDK) | No (SDK) | No | No API keys at all |

### 6.2 OCR APIs

| Provider | Free Tier | Works in Browser? | Languages | Privacy | Notes |
|----------|-----------|------------------|-----------|---------|-------|
| **Tesseract.js** | ✅ Free forever | ✅ WASM (client-side) | 100+ | ✅ 100% local | Recommended — offline, private, free |
| **Puter.js img2txt** | ✅ Unlimited | ✅ SDK | Many | ⚠️ User's Puter account | No API key needed |
| **OCR.space** | 500 req/day | ✅ CORS supported | 30+ | ⚠️ Server-side | JS example provided |
| **Optiic.dev** | Free tier | ✅ REST API | Many | ⚠️ Server-side | No credit card |
| **Google Cloud Vision** | 1000 units/month | ✅ REST API | Many | ⚠️ Server-side | $300 free credits |

### 6.3 Speech-to-Text APIs

| Provider | Free Tier | Browser? | Languages | Real-time? | Notes |
|----------|-----------|---------|-----------|------------|-------|
| **Web Speech API** | ✅ Free | ✅ Chrome/Edge | ~40 | ✅ Yes | Already integrated |
| **Puter.js speech2txt** | ✅ Unlimited | ✅ SDK | Many | ❌ File-based | No API key |
| **OpenAI Whisper** | 3 RPM, 200 RPD | ✅ Via API | 100+ | ❌ File-based | Needs API key |
| **Groq Whisper** | ~30 RPM | ✅ Via API | 100+ | ❌ File-based | Faster, free |

---

## 7. Health Data API Research

| Platform | Web API? | Data Available | Auth | Effort | Priority |
|----------|---------|---------------|------|--------|----------|
| **Google Fit** | ✅ REST API | Sleep stages, steps, heart rate, activity, weight | OAuth 2.0 (exists already) | Medium | ⭐ High |
| **Sign in with Apple** | ✅ JS SDK | User identity (name, email) | OAuth 2.0 | Low | ⭐ High |
| **Apple HealthKit** | ❌ iOS only | All Health data (sleep, HR, etc.) | Native app required | Very High | Low (defer) |
| **Fitbit Web API** | ✅ REST | Sleep, steps, HR, activity | OAuth 2.0 | Medium | Medium (future) |
| **Oura Ring API** | ✅ REST | Sleep, HRV, temperature, activity | OAuth 2.0 | Medium | Low (future) |

### Key Finding: Google Fit is the single most valuable integration for a web app
- Sleep data (duration + stages: light/deep/REM)
- Step count (activity level)
- Heart rate (stress/recovery)
- All accessible via REST with OAuth (pattern already exists in the codebase from Google Calendar import)
- Free tier with no rate limits that would affect a single user

---

## 8. Monetization Strategy Research

### Market Benchmarks (Productivity Apps)

| App | Price | Model | Target |
|-----|-------|-------|--------|
| **Todoist Pro** | $5/month, $48/year | Freemium + Subscription | Task management |
| **Forest** | $1.99 one-time | Paid app | Focus timer |
| **Focusmate** | $9.99/month | Freemium + Subscription | Virtual coworking |
| **Strides** | $4.99/month | Freemium + Subscription | Habit tracking |
| **Endel** | $9.99/month | Subscription | Focus sounds |
| **Structured** | $4.99/month or $24.99 lifetime | Freemium + IAP | Day planning |

### Recommended Pricing for BlockFlow

```
Pro Weekly:    $4.99/week  (≈ $260/year — anchors the value)
Pro Monthly:   $9.99/month (saves 50% vs weekly)
Pro Yearly:    $49.99/year (saves 58% vs monthly, best deal)
Lifetime:      $99.99      (for power users who hate subscriptions)
```

> For a student project in Taiwan, consider regional pricing: NT$150/month, NT$790/year

### Key Insights from 2026 Data

1. **Weekly plans** generate 55.5% of subscription revenue. Start with weekly as primary offer.
2. **Hard paywalls** convert 5x better than freemium (10.7% vs 2.1%) in productivity apps.
3. **Direct buyers** in productivity have 13.7% higher LTV than trial users.
4. **90% of trial starts** happen on Day 0. Your onboarding is your entire monetization strategy.
5. **Translation** of paywall text delivers more LTV uplift than repricing.

### Recommended Approach for MVP Monetization

Phase 1: **Donation / Buy Me a Coffee** (low effort, gauges willingness to pay)
- Add Ko-fi or Buy Me a Coffee link
- No feature restrictions, purely voluntary

Phase 2: **Lemon Squeezy license key** (after product-market fit validated)
- Block AI features behind Pro tier
- $4.99/week or $49.99/year

Phase 3: **Full subscription system**
- Stripe/Lemon Squeezy webhooks
- Tiered feature access
- RevenueCat for analytics

---

## 9. Codebase Audit: Known Issues

### Critical (Must Fix Before Launch)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | **Uncommitted file restructuring** | Root vs `web/` | `git add` correct state |
| 2 | **NVIDIA API direct call may fail CORS** | `calendar.js:457`, `ai-assistant.js:239` | The `corsproxy.io` fallback works but is rate-limited. Add Puter.js as secondary fallback |
| 3 | **AI Assistant timeout too short** | `ai-assistant.js:282` — 15s timeout | Increase to 30s, show retry button |

### Major (Should Fix)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 4 | **AI message history not persisted** | `ai-assistant.js:160` — empty `loadMessageHistory()` | Save to localStorage |
| 5 | **No loading state on dashboard** | `app.js:7` — synchronous init | Add skeleton CSS + brief timeout |
| 6 | **Google Calendar import has no cancel** | `google-calendar.js:63-83` | Add abort controller + cancel button |
| 7 | **Mobile nav may overlap at 375px** | `index.html` navbar | Test with Playwright, add `@media` fix |

### Minor (Polish)

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 8 | `console.log('[BlockFlow] v1.2.0')` is intentional | `app.js:8` | Keep — useful for debugging |
| 9 | `console.warn` in firebase files are intentional graceful degradation | Multiple | Keep |
| 10 | No ESLint config | Root | Add `.eslintrc.js` |
| 11 | Mixed indentation (2-space in some files, 4-space in others) | All JS | Normalize to 2-space |
| 12 | Sleep popover close gesture not obvious | `ui.js:212` | Add click-outside-to-close |

### Security

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 13 | Firebase API key exposed in client-side code | `firebase-init.js:3` | Acceptable for Firebase (security is via rules, not key) |
| 14 | NVIDIA API key hardcoded in source | `calendar.js:9`, `ai-assistant.js:215` | Should only use key from localStorage. The hardcoded default should be removed before deployment. |
| 15 | XSS possible in calendar event rendering | `calendar.js:179` — `escapeHtml()` exists but verify all paths | Check `showViewModal`, `showDayEvents` |

---

## 10. Appendix: Implementation Notes

### 10.1 Tesseract.js Integration Pattern

```html
<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
```

```javascript
// One-time worker creation
const worker = await Tesseract.createWorker('eng');
// Reuse for multiple images
const { data: { text } } = await worker.recognize(imageFile);
await worker.terminate();

// Chinese support:
// const worker = await Tesseract.createWorker('chi_sim');
```

### 10.2 Puter.js Integration Pattern

```html
<script src="https://js.puter.com/v2/"></script>
```

```javascript
// OCR
const text = await puter.ai.img2txt(imageUrl);

// Speech to text
const transcript = await puter.ai.speech2txt(audioBlob);

// Chat (any model)
const reply = await puter.ai.chat("Hello!", { model: "gpt-4o" });

// Text to speech
const audio = await puter.ai.txt2speech("Hello world");
audio.play();
```

### 10.3 Gemini Integration Pattern

```javascript
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + API_KEY, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }]
  })
});
```

### 10.4 Google Fit OAuth Flow

Same pattern as Google Calendar import (`google-calendar.js`):
1. `google.accounts.oauth2.initTokenClient()` → request access token
2. Add Fitness scopes to scope string
3. Call REST API with Bearer token
4. Parse sleep/activity data
5. Store in BlockFlow's data model

### 10.5 Playwright Test Strategy

```
test/
├── dashboard.spec.js   — Load index.html, verify blocks render, timer works
├── calendar.spec.js    — Navigate month, CRUD events
├── settings.spec.js    — Load settings page, verify form fields
├── mobile.spec.js      — 375px viewport, verify no breakage
├── offline.spec.js     — Service worker caches pages
└── pwa.spec.js         — Manifest loads, SW registers
```

### 10.6 Recommended Development Order

```
Week 1:  Commit restructuring + Playwright test setup
Week 2:  Bug fixes from audit (NVIDIA CORS, AI history, loading states)
Week 3:  Tesseract.js OCR integration (Document Scanner feature)
Week 4:  Voice command system (Web Speech + Puter.js fallback)
Week 5:  Multi-LLM provider integration (Gemini as primary)
Week 6:  Google Fit OAuth + Sleep data display
Week 7:  Sign in with Apple + account system
Week 8:  Monetization (Lemon Squeezy) + Firebase deploy
Week 9:  Playwright regression testing + Polish
Week 10: Launch + Teacher demo
```

---

*End of Plan Document*
