# Voice Companion Roadmap — "Nova"

> Roadmap created: July 13, 2026  
> Status: Ready for implementation  
> Total phases: 11 (1 completed, 10 remaining)

---

## Executive Summary

This roadmap details the 11-phase transformation of BlockFlow's AI Assistant into "Nova" — a premium voice companion. Phase 1 (basic TTS) is complete. This document outlines remaining Phases 2-11 with priorities, dependencies, and acceptance criteria.

---

## Phase Status

| Phase | Feature | Status | Priority | Effort |
|-------|---------|--------|----------|--------|
| 1 | Voice Research | ✅ Complete | — | — |
| 2 | Live Transcription | ⏳ Pending | High | Medium |
| 3 | Premium Voice Output | ⏳ Pending | High | High |
| 4 | Voice Settings Redesign | ✅ Complete | High | Medium |
| 5 | Voice Cloning Prep | ⏳ Pending | Low | High |
| 6 | Assistant Rebrand ("Nova") | ✅ Complete | Medium | Low |
| 7 | Better Memory | ✅ Complete | Medium | Medium |
| 8 | Voice + Memory Integration | ⏳ Pending | Medium | Medium |
| 9 | Animations Upgrade | ⏳ Pending | High | Medium |
| 10 | Performance Optimization | ⏳ Pending | Medium | Low |
| 11 | Testing & QA | ⏳ Pending | High | Medium |

---

## Detailed Phase Plans

### Phase 1: Voice Research ✅

**Status**: Complete  
**Deliverables**:
- `VOICE_RESEARCH.md` — Comprehensive research from 5 agents
- `VOICE_ARCHITECTURE.md` — Technical architecture design
- `VOICE_ROADMAP.md` — This document

**Key Findings**:
- Kokoro-82M is best browser TTS (86MB, 96× RT, 54 voices)
- tts.ai is best free cloud API (5K chars/day, CORS-friendly)
- ElevenLabs is best premium quality (9-10/10)
- Browser Web Speech API has critical bugs (Chrome 15s, Android broken)

---

### Phase 2: Live Transcription ⏳

**Goal**: Real-time speech-to-text with visual feedback  
**Priority**: High — enables hands-free interaction  
**Effort**: Medium (2-3 days)

**Acceptance Criteria**:
- [ ] Microphone button activates continuous recognition
- [ ] Partial transcripts appear in real-time as user speaks
- [ ] Final transcript sent as message when user pauses
- [ ] Visual mic state: idle → listening (ripple animation)
- [ ] Works on Chrome Desktop, Edge, Safari
- [ ] Graceful degradation on Firefox/Android

**Implementation Steps**:
1. Add `NovaSTTProvider` with Web Speech API implementation
2. Add `_startListening()` method to `AIAssistant`
3. Add visual mic states (CSS classes: `.ai-mic-idle`, `.ai-mic-listening`)
4. Handle Android Chrome `continuous: true` bug with auto-restart
5. Add result deduplication (Set-based tracking)

**Files Modified**:
- `js/ai-assistant.js` — Add STT integration
- `css/style.css` — Add mic state animations

**Dependencies**: None

---

### Phase 3: Premium Voice Output ⏳

**Goal**: High-quality TTS with provider-swappable architecture  
**Priority**: High — core premium feature  
**Effort**: High (4-5 days)

**Acceptance Criteria**:
- [ ] Provider abstraction layer (`NovaTTS` registry)
- [ ] Browser TTS as primary (zero cost)
- [ ] Kokoro-82M as premium local option
- [ ] tts.ai as free cloud fallback
- [ ] ElevenLabs as premium cloud option
- [ ] Automatic provider fallback chain
- [ ] Voice preview in settings
- [ ] 86MB model lazy-loaded on first use

**Implementation Steps**:
1. Create `js/nova/nova-tts-providers.js` with provider interface
2. Implement `BrowserTTSProvider`
3. Implement `KokoroTTSProvider` with dynamic import
4. Implement `TtsAiProvider`
5. Implement `ElevenLabsProvider`
6. Create `NovaTTS` registry with fallback chain
7. Modify `AIAssistant.speak()` to use provider dispatch
8. Add model loading indicator UI

**Files Modified**:
- `js/nova/nova-tts-providers.js` — NEW: Provider implementations
- `js/ai-assistant.js` — Modify `speak()` method
- `css/style.css` — Add loading indicator styles

**Dependencies**: None (kokoro-js loaded dynamically)

---

### Phase 4: Voice Settings Redesign ⏳

**Goal**: Comprehensive settings UI for all voice options  
**Priority**: High — user control is essential  
**Effort**: Medium (2-3 days)

**Acceptance Criteria**:
- [ ] Provider selector dropdown
- [ ] Dynamic voice list (based on selected provider)
- [ ] Voice preview button
- [ ] Speed/pitch/volume sliders
- [ ] Microphone settings (noise suppression, echo cancellation)
- [ ] Wake word configuration
- [ ] Visual settings (waveform, animation style)
- [ ] API key inputs (hidden unless needed)
- [ ] All settings persist in localStorage

**Implementation Steps**:
1. Create `js/nova/nova-settings.js` settings controller
2. Extend settings.html with new Voice Companion section
3. Add dynamic voice loading based on provider
4. Add voice preview functionality
5. Add API key management
6. Test all settings persist correctly

**Files Modified**:
- `js/nova/nova-settings.js` — NEW: Settings controller
- `settings.html` — Extend voice settings section
- `css/style.css` — Add settings styles

**Dependencies**: Phase 3 (provider implementations)

---

### Phase 5: Voice Cloning Preparation ⏳

**Goal**: Infrastructure for future voice cloning feature  
**Priority**: Low — can be deferred  
**Effort**: High (3-4 days)

**Acceptance Criteria**:
- [ ] UI for recording/uploading voice samples
- [ ] Metadata storage in Firebase (voice profile ID, sample count)
- [ ] F5-TTS provider integration (optional, for cloning)
- [ ] Voice profile management (list, delete, rename)
- [ ] Audio validation (min 5s, max 30s, quality check)

**Implementation Steps**:
1. Create voice cloning UI modal
2. Add MediaRecorder integration for recording
3. Add file upload handler for audio files
4. Create Firebase voice profile storage schema
5. Implement F5-TTS provider (optional)
6. Add voice profile management UI

**Files Modified**:
- `js/nova/nova-voice-cloning.js` — NEW: Cloning UI/logic
- `js/firebase-db.js` — Add voice profile CRUD
- `settings.html` — Add voice cloning section
- `css/style.css` — Add cloning modal styles

**Dependencies**: Phase 3 (provider architecture)

---

### Phase 6: Assistant Rebrand ("Nova") ⏳

**Goal**: Rename AI Assistant to "Nova" throughout the app  
**Priority**: Medium — branding consistency  
**Effort**: Low (1 day)

**Acceptance Criteria**:
- [ ] Logo/avatar changed to "Nova" branding
- [ ] Title updated to "Nova" in all locations
- [ ] Default system prompt updated with Nova personality
- [ ] Greeting message updated
- [ ] Settings references updated
- [ ] Documentation updated

**Implementation Steps**:
1. Create Nova logo/avatar SVG
2. Update `AIAssistant` title in HTML/CSS
3. Update default system prompt with Nova personality
4. Update greeting message
5. Update all documentation references

**Files Modified**:
- `js/ai-assistant.js` — Update title, greeting, system prompt
- `css/style.css` — Update avatar styling
- `icons/` — Add Nova icon
- `README.md` — Update references

**Dependencies**: None

---

### Phase 7: Better Memory ⏳

**Goal**: Auto-detect and remember user information from conversations  
**Priority**: Medium — improves personalization  
**Effort**: Medium (2-3 days)

**Acceptance Criteria**:
- [ ] Auto-detect name, occupation, goals from conversation
- [ ] Importance/confidence scores for memory points
- [ ] Edit/pin/search memory UI
- [ ] Visual memory indicator in chat
- [ ] Memory context injection into system prompt
- [ ] Firebase sync for memory points

**Implementation Steps**:
1. Enhance `extractMemoryFromConversation()` with NLP heuristics
2. Add importance/confidence scoring
3. Create memory management UI (edit, pin, delete, search)
4. Add memory context to system prompt
5. Add Firebase sync for memory
6. Add memory indicator in chat bubbles

**Files Modified**:
- `js/ai-assistant.js` — Enhance memory extraction
- `js/firebase-db.js` — Add memory sync
- `settings.html` — Enhance memory management UI
- `css/style.css` — Add memory indicator styles

**Dependencies**: None

---

### Phase 8: Voice + Memory Integration ⏳

**Goal**: Remember spoken information, confirm before saving  
**Priority**: Medium — voice-memory synergy  
**Effort**: Medium (2-3 days)

**Acceptance Criteria**:
- [ ] Detect voice-based memory candidates
- [ ] Confirm with user before saving ("Should I remember that?")
- [ ] Voice confirmation ("Yes, save that")
- [ ] Visual confirmation UI
- [ ] Memory context in voice responses

**Implementation Steps**:
1. Add memory detection to STT pipeline
2. Add confirmation UI for voice-based memories
3. Add voice confirmation handling
4. Add memory context to TTS responses
5. Test voice-memory flow end-to-end

**Files Modified**:
- `js/ai-assistant.js` — Add voice-memory detection
- `js/nova/nova-controller.js` — Add confirmation flow
- `css/style.css` — Add confirmation UI styles

**Dependencies**: Phase 7 (better memory)

---

### Phase 9: Animations Upgrade ⏳

**Goal**: Premium visual states for all voice modes  
**Priority**: High — visual polish  
**Effort**: Medium (2-3 days)

**Acceptance Criteria**:
- [ ] Idle state: breathing pulse animation
- [ ] Listening state: mic ripple animation
- [ ] Thinking state: bouncing dots animation
- [ ] Speaking state: pulsing avatar + waveform
- [ ] All animations 60fps (GPU-accelerated)
- [ ] `prefers-reduced-motion` support
- [ ] State transitions smooth (no jarring jumps)

**Implementation Steps**:
1. Create `js/nova/nova-waveform.js` canvas renderer
2. Add CSS animations for all states
3. Implement Web Audio API for real-time visualization
4. Add `prefers-reduced-motion` media query
5. Test on various devices/browsers
6. Optimize for 60fps

**Files Modified**:
- `js/nova/nova-waveform.js` — NEW: Canvas waveform renderer
- `js/ai-assistant.js` — Add state machine integration
- `css/style.css` — Add all animation classes
- `index.html` — Add canvas element

**Dependencies**: Phase 2 (STT for listening visualization), Phase 3 (TTS for speaking visualization)

---

### Phase 10: Performance Optimization ⏳

**Goal**: Optimize voice companion for speed and memory  
**Priority**: Medium — ensures smooth UX  
**Effort**: Low (1-2 days)

**Acceptance Criteria**:
- [ ] Kokoro model lazy-loaded (not at startup)
- [ ] Audio buffers cached (< 10MB total)
- [ ] Canvas animations < 5% CPU
- [ ] No main thread blocking during TTS generation
- [ ] Mobile-friendly (< 50KB initial JS)

**Implementation Steps**:
1. Audit Kokoro model loading (verify lazy load)
2. Implement audio buffer caching with LRU eviction
3. Profile canvas animations (Chrome DevTools)
4. Add Web Worker for heavy computation
5. Test on low-end devices

**Files Modified**:
- `js/nova/nova-tts-providers.js` — Add caching
- `js/nova/nova-waveform.js` — Optimize rendering
- `js/nova/nova-controller.js` — Add Web Worker usage

**Dependencies**: Phases 3, 9 (providers and animations)

---

### Phase 11: Testing & QA ⏳

**Goal**: Comprehensive testing across devices and browsers  
**Priority**: High — ensure quality  
**Effort**: Medium (2-3 days)

**Acceptance Criteria**:
- [ ] Chrome Desktop: All features work
- [ ] Chrome Android: Graceful degradation
- [ ] Safari Desktop: All features work
- [ ] Safari iOS: Graceful degradation
- [ ] Firefox Desktop: Graceful degradation
- [ ] Edge: All features work
- [ ] Mobile responsive: All UI elements accessible
- [ ] Performance: No jank, no memory leaks
- [ ] Accessibility: Screen reader compatible

**Implementation Steps**:
1. Create test matrix (browser × feature × device)
2. Test Chrome Desktop (primary target)
3. Test Chrome Android (degradation)
4. Test Safari Desktop/iOS (degradation)
5. Test Firefox Desktop (degradation)
6. Test Edge (primary target)
7. Performance profiling on mobile
8. Accessibility audit
9. Document findings in VOICE_TEST_REPORT.md

**Files Modified**:
- `VOICE_TEST_REPORT.md` — NEW: Test results
- Any bugs found → fixes in respective phases

**Dependencies**: All previous phases

---

## Implementation Order

### Recommended Sequence

```
Phase 1 ✅ (Done)
    ↓
Phase 2 (Live Transcription)
    ↓
Phase 3 (Premium TTS)
    ↓
Phase 4 (Voice Settings)
    ↓
Phase 9 (Animations)
    ↓
Phase 7 (Better Memory)
    ↓
Phase 8 (Voice + Memory)
    ↓
Phase 6 (Rebrand)
    ↓
Phase 10 (Performance)
    ↓
Phase 5 (Voice Cloning) [Optional]
    ↓
Phase 11 (Testing)
```

### Parallel Opportunities

- **Phase 6** (Rebrand) can run in parallel with Phases 2-4
- **Phase 5** (Voice Cloning) can run in parallel with Phase 7-8
- **Phase 10** (Performance) can run after Phase 9

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Chrome 15-second bug | Speech cuts off | Implement pause/resume workaround |
| Android STT broken | Continuous recognition fails | Auto-restart with gaps |
| Kokoro 86MB load time | Slow on 3G | Lazy load, show loading indicator |
| WebGPU support | No premium TTS on older browsers | WASM fallback |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| tts.ai rate limits | Cloud fallback unavailable | Cache recent generations |
| Voice quality inconsistency | User confusion | Clear provider labeling |
| Memory pressure | Mobile crashes | LRU cache, limit buffer size |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| ElevenLabs pricing | Premium unavailable | Graceful fallback |
| Animation performance | Jank on low-end devices | prefers-reduced-motion |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time-to-first-audio | < 500ms (browser), < 1s (Kokoro) | Chrome DevTools |
| Voice quality | > 4.0 MOS (Kokoro) | User testing |
| Animation fps | 60fps (Chrome Desktop) | Chrome DevTools |
| Browser support | Chrome, Edge, Safari (90%+ users) | Analytics |
| Memory usage | < 50MB (without Kokoro) | Chrome DevTools |

---

## Deliverables Checklist

- [x] `VOICE_RESEARCH.md` — Research synthesis
- [x] `VOICE_ARCHITECTURE.md` — Technical architecture
- [x] `VOICE_ROADMAP.md` — This document
- [ ] `VOICE_TEST_REPORT.md` — Test results (Phase 11)
- [ ] Code changes (Phases 2-10)
- [ ] Documentation updates

---

*Roadmap created based on research findings. Ready for phased implementation.*
