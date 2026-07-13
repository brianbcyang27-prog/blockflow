# AI Settings Audit Report

**Date:** 2026-07-13  
**Status:** Investigation Complete  
**Priority:** High

---

## Executive Summary

The AI Assistant settings page has **two critical bugs** that break the data flow between the UI and the actual AI system:

1. **Memory Display Bug**: Shows `[object Object]` instead of memory text
2. **System Prompt Bug**: Shows empty textarea instead of default prompt

These bugs exist because the Settings page and AI Assistant module use **different data formats** for the same localStorage keys.

---

## Issue #1: Memory Display Shows [object Object]

### Symptom
Settings → 🧠 AI Assistant → Memory Points shows:
```
[object Object]
[object Object]
[object Object]
```

### Root Cause

**Data Format Mismatch:**

| Component | Storage Format | Example |
|-----------|----------------|---------|
| `ai-assistant.js` | Object array | `[{id: "123", content: "my name is Brian", createdAt: "...", importance: "medium"}]` |
| `settings.html` | String array | `["my name is Brian", "I love sports"]` |

**The Problem Code:**

```javascript
// settings.html line 1480
item.innerHTML = '<span class="text">' + this.escapeHtml(point) + '</span>'
```

When `point` is an object (from ai-assistant.js), `escapeHtml(point)` converts it to `[object Object]`.

### Data Flow Analysis

```
User adds memory in AI Assistant chatbot
    ↓
ai-assistant.js: addMemoryPoint()
    ↓
Creates object: { id, content, createdAt, importance, category }
    ↓
Saves to localStorage: blockflow_ai_memory = [{id: "123", content: "...", ...}]
    ↓
User opens Settings page
    ↓
settings.html: getAiMemory()
    ↓
Returns raw array of objects
    ↓
renderAiMemory() treats each item as string
    ↓
escapeHtml(point) → "[object Object]"
```

### Fix Required

**Option A (Recommended):** Update `settings.html` to handle both formats

```javascript
renderAiMemory() {
    const memory = this.getAiMemory();
    // ...
    memory.forEach((point, index) => {
        const text = typeof point === 'string' ? point : (point.content || String(point));
        // ...
    });
}
```

**Option B:** Standardize data format across both files

Change `ai-assistant.js` to store plain strings (breaking change for existing users).

---

## Issue #2: System Prompt Textarea Empty

### Symptom
Settings → 🧠 AI Assistant → Custom System Prompt shows:
```
[Empty textarea with placeholder: "Enter custom instructions for the AI assistant..."]
```

Should show the default BlockFlow system prompt.

### Root Cause

**Missing Default Prompt Loading:**

```javascript
// settings.html lines 1510-1516
loadAiPrompt() {
    const saved = localStorage.getItem('blockflow_ai_system_prompt');
    if (saved) {
        this.elements.aiPrompt.value = saved;
    } else {
        this.elements.aiPrompt.value = '';  // ← BUG: Shows empty
    }
}
```

The Settings page only loads the **custom** prompt. When no custom prompt exists, it shows empty instead of the **default** prompt.

### The Default Prompt Location

```javascript
// ai-assistant.js lines 1455-1570
getDefaultSystemPrompt() {
    return `You are BlockFlow, a productivity calendar assistant.
    
    Your only job: help the user manage their schedule...
    [~120 lines of detailed prompt]
    `;
}
```

### Data Flow Analysis

```
User opens Settings page
    ↓
settings.html: loadAiPrompt()
    ↓
Checks localStorage: blockflow_ai_system_prompt
    ↓
If empty → shows empty textarea
    ↓
User sees: "Enter custom instructions..."
    ↓
User saves empty → deletes custom override
    ↓
AI Assistant uses default prompt (but Settings doesn't show it)
```

### Fix Required

**Update `settings.html` to load default prompt when no custom exists:**

```javascript
loadAiPrompt() {
    const saved = localStorage.getItem('blockflow_ai_system_prompt');
    if (saved) {
        this.elements.aiPrompt.value = saved;
    } else {
        // Load default prompt from AIAssistant
        this.elements.aiPrompt.value = AIAssistant.getDefaultSystemPrompt();
    }
}
```

**Also update `aiResetPrompt()` to show default after reset:**

```javascript
aiResetPrompt() {
    // ...
    localStorage.removeItem('blockflow_ai_system_prompt');
    this.elements.aiPrompt.value = AIAssistant.getDefaultSystemPrompt();  // Show default
    // ...
}
```

---

## Issue #3: Account Data Sync Verification

### Current Status

| Metric | Local Mode | Signed In |
|--------|------------|-----------|
| Events | ✅ Works | ✅ Syncs to Firestore |
| AI Messages | ⚠️ localStorage only | ⚠️ Not synced |
| Memories | ⚠️ localStorage only | ✅ Syncs via migration |

### AI Messages Sync Gap

**Problem:** AI conversation history (`blockflow_ai_history`) is NOT synced to Firebase via `Storage.syncFromFirestore()`.

```javascript
// storage.js line 242-257
syncFromFirestore: async function() {
    // Syncs: events, history, settings
    // Does NOT sync: AI history, AI memory
}
```

**Migration handles AI data**, but only on first sign-in:
```javascript
// migration.js
migrateToFirestore() {
    // Migrates: aiHistory, aiMemory, calendar, history
}
```

**After migration**, AI messages are only saved to localStorage, not Firebase.

### Recommendation

Add AI history sync to `Storage.syncFromFirestore()` or create a separate sync function.

---

## Data Storage Map

### localStorage Keys

| Key | Format | Used By |
|-----|--------|---------|
| `blockflow_ai_memory` | Object array (ai-assistant) OR String array (settings) | Both |
| `blockflow_ai_system_prompt` | String | ai-assistant.js |
| `blockflow_ai_history` | Object array | ai-assistant.js |
| `blockflow_ai_model` | String | ai-assistant.js |
| `blockflow_ai_pos` | Object | ai-assistant.js |

### Firebase Paths (when signed in)

| Path | Document | Contents |
|------|----------|----------|
| `users/{uid}/data/aiMemory` | `aiMemory` | `{ memoryPoints: [...] }` |
| `users/{uid}/data/aiHistory` | `aiHistory` | `{ messages: [...] }` |
| `users/{uid}/data/settings` | `settings` | App settings |

---

## Recommendations

### Priority 1: Fix Memory Display
- Update `settings.html` `renderAiMemory()` to handle object format
- Extract `.content` from objects, fallback to string

### Priority 2: Fix System Prompt Display
- Update `settings.html` `loadAiPrompt()` to show default when empty
- Update `aiResetPrompt()` to show default after reset

### Priority 3: Add AI History Sync
- Add `blockflow_ai_history` sync to Firebase
- Ensure conversation history persists across devices

### Priority 4: Data Format Standardization
- Choose one format (objects recommended for extensibility)
- Update all code to use consistent format
- Add migration for existing string-format data

---

## Testing Checklist

### Memory System
- [ ] Add memory in AI chatbot → appears in Settings
- [ ] Add memory in Settings → appears in AI chatbot
- [ ] Delete memory in Settings → removed from AI chatbot
- [ ] Memory shows text, not `[object Object]`
- [ ] Memory persists after page refresh
- [ ] Memory syncs to Firebase when signed in

### System Prompt
- [ ] Settings shows default prompt when no custom exists
- [ ] Custom prompt saves correctly
- [ ] Reset returns to showing default prompt
- [ ] AI uses custom prompt when saved
- [ ] AI uses default prompt when custom is empty

### Account Sync
- [ ] Events sync to Firebase
- [ ] AI messages sync to Firebase (if implemented)
- [ ] Memories sync to Firebase
- [ ] Data persists after sign out/in

---

## Files to Modify

| File | Changes |
|------|---------|
| `settings.html` | Fix `renderAiMemory()`, fix `loadAiPrompt()`, fix `aiResetPrompt()` |
| `js/ai-assistant.js` | Potentially export `getDefaultSystemPrompt()` for Settings |
| `js/storage.js` | Add AI history sync (optional enhancement) |

---

**Status:** Ready for implementation
