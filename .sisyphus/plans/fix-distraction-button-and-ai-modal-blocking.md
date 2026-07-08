# Fix: Distraction Button + AI Modal Blocking

## TL;DR
> **Summary**: Fix 2 bugs found during Playwright testing: (1) "I got distracted" button has no event listener, (2) AI analysis skeleton overlay blocks modal buttons during analysis.
> **Deliverables**: Working distraction tracking + dismissable AI analysis modal
> **Effort**: Quick
> **Parallel**: YES — tasks 1 & 2 are independent
> **Critical Path**: Task 1 → verify, Task 2 → verify

## Context
### Original Request
Test the BlockFlow app and fix broken features found during testing.

### Testing Results
- **Bug 1**: `#logDistraction` button exists in HTML, `Storage.incrementDistraction()` exists, but no `addEventListener` wired in `app.js` `setupEventListeners()`. Also missing from `UI.cacheElements()`.
- **Bug 2**: AI analysis overlay (`#aiSkeleton`, `display:flex`) pushes form buttons below visible modal area. Close/Cancel buttons exist in DOM but are not visible/clickable until the 15s timeout fires.

### Edge Cases Covered
- Multiple rapid clicks on distraction button (all increments count)
- Distraction count should render immediately after increment
- AI analysis abort works from skeleton dismiss button
- Timer pause <1min edge case (no focus time recorded — existing behavior, intentional)

## Work Objectives
### Core Objective
Make distraction tracking functional and modal dismissable during AI analysis.

### Must Have
- Clicking "I got distracted" increments counter immediately
- Distraction counter display updates in real-time
- AI analysis skeleton can be dismissed by user without waiting for timeout
- No new console errors introduced

### Must NOT Have
- No changes to timer logic or focus time tracking
- No changes to calendar event saving flow
- No breaking changes to existing working features

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed via Playwright.
- Test decision: tests-after (manual Playwright verification)
- QA policy: Each task verified by Playwright screenshot + console check + DOM inspection

## Execution Strategy
### Parallel Execution Waves
Wave 1: Task 1 (distraction fix), Task 2 (AI skeleton fix) — PARALLEL
Wave 2: Full verification via Playwright

### Dependency Matrix
| Task | Depends On | Blocks |
|------|------------|--------|
| 1. Fix distraction button | — | Final verification |
| 2. Fix AI modal blocking | — | Final verification |
| F1. Final verification | 1, 2 | — |

## TODOs

- [x] 1. Wire up "I got distracted" button

  **What to do**:
  1. In `web/js/ui.js` `cacheElements()`, add: `distractionCount: document.getElementById('distractionCount')` after line 37 (after `eventCount`)
  2. In `web/js/ui.js` `cacheElements()`, add: `logDistraction: document.getElementById('logDistraction')` after the new distractionCount line
  3. In `web/js/app.js` `setupEventListeners()`, add after line 97 (after skipBreak block):
     ```js
     if (UI.elements.logDistraction) {
         UI.elements.logDistraction.addEventListener('click', () => {
             this.currentData = Storage.incrementDistraction();
             UI.updateFocusTime(this.currentData.focusTime);
             if (UI.elements.distractionCount) {
                 UI.elements.distractionCount.textContent = this.currentData.distractions;
             }
         });
     }
     ```

  **Pattern reference**: Follow existing patterns in `setupEventListeners()` — guard with `if (UI.elements.xxx)`, use `this.currentData = Storage.method()` to refresh, call `UI.method()` to update display.

  **Recommended Agent Profile**:
  - Category: `quick` — two small additions, well-defined
  - Skills: `[]`

  **Parallelization**: Wave 1 | Blocks: nothing | Blocked By: nothing

  **Acceptance Criteria** (ALL PASS):
  - [x] Playwright: Click "I got distracted" button 3 times → `distractionCount` element shows "3"
  - [x] Playwright: Console errors unchanged (still 3-7 Firestore + CORS, no new errors)
  - [x] Playwright: Reload page, distraction count persists

  **QA Scenarios**:
  ```
  Scenario: Distraction increments on click
    Tool: Playwright
    Steps: Navigate to http://localhost:8000 → click 'I got distracted' button 3 times → read #distractionCount text
    Expected: textContent === "3"
    Evidence: .sisyphus/evidence/task-1-distraction-count.txt

  Scenario: Distraction count persists on reload
    Tool: Playwright
    Steps: After incrementing to 3, reload page → read #distractionCount text
    Expected: textContent === "3"
    Evidence: .sisyphus/evidence/task-1-distraction-persist.txt

  Scenario: Zero state shows 0
    Tool: Playwright
    Steps: Clear data → read #distractionCount text
    Expected: textContent === "0"
    Evidence: .sisyphus/evidence/task-1-distraction-zero.txt
  ```

  **Commit**: YES | Message: `fix: wire up distraction tracking button` | Files: `web/js/ui.js`, `web/js/app.js`

- [x] 2. Fix AI analysis skeleton blocking modal buttons

  **What to do**:
  In `web/js/calendar.js`, modify `showAiSkeleton(show)` method (line 526-530):
  1. After setting `el.style.display`, add a dismiss button inside the skeleton when showing:
     ```js
     var existingDismiss = el.querySelector('.ai-skeleton-dismiss');
     if (show && !existingDismiss) {
         var dismissBtn = document.createElement('button');
         dismissBtn.className = 'ai-skeleton-dismiss';
         dismissBtn.textContent = '×';
         dismissBtn.style.cssText = 'position:absolute;top:8px;right:12px;background:none;border:none;font-size:1.5rem;cursor:pointer;color:#9ca3af;line-height:1;z-index:10;';
         dismissBtn.addEventListener('click', (e) => {
             e.stopPropagation();
             // Trigger the same unlock logic as the Cancel button
             if (this.elements.cancelEvent && this.elements.cancelEvent._aiUnlock) {
                 this.elements.cancelEvent._aiUnlock();
             }
         });
         el.style.position = 'relative';
         el.appendChild(dismissBtn);
     }
     ```
  2. After `el.style.display = show ? 'flex' : 'none';` add:
     ```js
     if (!show) {
         var dismiss = el.querySelector('.ai-skeleton-dismiss');
         if (dismiss) dismiss.remove();
     }
     ```

  **Why**: The AI skeleton is in the document flow between form fields and action buttons. When it shows as flex, it pushes buttons below the visible modal area. Adding a dismiss button inside the skeleton lets users close it without waiting for timeout.

  **Pattern reference**: The cancel/close modal pattern already exists (lines 427-452). The `_aiUnlock` function calls `controller.abort()` and `noAi(false)` to cleanly stop analysis and hide the skeleton.

  **Recommended Agent Profile**:
  - Category: `quick` — single file, small change
  - Skills: `[]`

  **Parallelization**: Wave 1 | Blocks: nothing | Blocked By: nothing

  **Acceptance Criteria** (ALL PASS):
  - [x] Playwright: Click "Add Event" → fill form → click "Add Event" → AI skeleton shows with dismiss × button → click × → skeleton disappears, modal closes normally
  - [x] Playwright: No console errors beyond the expected Firestore + CORS

  **QA Scenarios**:
  ```
  Scenario: AI skeleton has dismiss button and works
    Tool: Playwright (browser_evaluate)
    Steps: Navigate to calendar → click +Add Event → fill title "test" → click save → wait for skeleton → check if .ai-skeleton-dismiss exists → click it
    Expected: Skeleton dismissed, modal returns to normal state
    Evidence: .sisyphus/evidence/task-2-ai-dismiss.txt

  Scenario: Skeleton cleanup on close
    Tool: Playwright
    Steps: After dismissing, reopen add event modal
    Expected: No orphaned dismiss button visible
    Evidence: .sisyphus/evidence/task-2-ai-cleanup.txt
  ```

  **Commit**: YES | Message: `fix: add dismiss button to AI analysis overlay` | Files: `web/js/calendar.js`

## Final Verification Wave
- [x] F1. Plan Compliance Audit — verify both changes match spec
- [x] F2. Distraction test: click 3× → confirm "3" — Playwright
- [x] F3. AI modal test: add event → dismiss → confirm modal responsive — Playwright
- [x] F4. Full regression: dashboard, calendar, settings all load without new errors — Playwright

## Commit Strategy
- Commit 1: `fix: wire up distraction tracking button` (task 1)
- Commit 2: `fix: add dismiss button to AI analysis overlay` (task 2)

## Success Criteria
- [x] "I got distracted" button increments counter and displays updated count
- [x] AI skeleton has visible × dismiss button that closes it
- [x] 0 new console errors introduced
- [x] All existing features continue working
