# Nova Voice Companion — Test Report

**Version**: 2.2.0
**Date**: 2026-07-13
**Status**: Pre-release QA

---

## Browser Compatibility Matrix

### Speech-to-Text (Web Speech API)

| Browser | Desktop | Mobile | Continuous | Interim | Notes |
|---------|---------|--------|------------|---------|-------|
| Chrome 90+ | ✅ | ✅ | ✅ | ✅ | Best support. Auto-detects language. |
| Edge 90+ | ✅ | ✅ | ✅ | ✅ | Chromium-based, same engine as Chrome. |
| Safari 14.1+ | ✅ | ⚠️ | ❌ | ✅ | Non-continuous only. Resets after each result. |
| Firefox 90+ | ❌ | ❌ | — | — | Web Speech API not supported. |
| Samsung Internet | ✅ | ✅ | ✅ | ✅ | Chromium-based. Same as Chrome. |

**Android Chrome Workaround**: Auto-detected and enabled for Chrome on Android due to a known bug where `start()` hangs if called before user gesture. Uses a 300ms delayed re-start.

### Text-to-Speech (NovaTTS)

| Provider | Browser | Quality | Latency | Offline | Cost |
|----------|---------|---------|---------|---------|------|
| Browser TTS | All modern | 6/10 | <100ms | ✅ | Free |
| Kokoro-82M | Chrome 113+ (WebGPU) | 9/10 | 2-5s first, <500ms cached | ✅ | Free (local) |
| tts.ai | All (CORS-friendly) | 8/10 | 500ms-2s | ❌ | Free (5K chars/day) |
| ElevenLabs | All modern | 9-10/10 | 300ms-1s | ❌ | Free tier (10K credits/mo) |

**Fallback Chain**: Browser → Kokoro → tts.ai → ElevenLabs

### Voice Input Detection

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| Microphone access | ✅ | ✅ | ✅ | ✅ |
| Continuous recognition | ✅ | ✅ | ❌ | ❌ |
| Interim results | ✅ | ✅ | ✅ | ❌ |
| Silence auto-send (1.5s) | ✅ | ✅ | ⚠️ | ❌ |
| Interrupt Nova speech | ✅ | ✅ | ❌ | ❌ |

### Canvas Waveform Visualizer

| Browser | Canvas 2D | requestAnimationFrame | DevicePixelRatio | roundRect |
|---------|-----------|----------------------|------------------|-----------|
| Chrome 90+ | ✅ | ✅ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ | ✅ |
| Safari 15+ | ✅ | ✅ | ✅ | ✅ (15.4+) |
| Firefox 90+ | ✅ | ✅ | ✅ | ✅ (112+) |

**Fallback**: If `roundRect` is unavailable, the visualizer uses `rect` + `fillRect`.

---

## Test Checklist

### Phase 1 — Voice Basics ✅
- [ ] Click 🎤 button → browser mic permission prompt
- [ ] Speak → text appears in input field
- [ ] Stop speaking → text auto-submits after 1.5s silence
- [ ] Click ⏹ to manually stop recording
- [ ] Type text → click 🔊 → Nova speaks response
- [ ] Click 🔊 again → mute toggle (🔇)
- [ ] During Nova speech → click 🎤 → speech interrupted

### Phase 2 — Live Transcription ✅
- [ ] While speaking, text appears in real-time in the input field
- [ ] Interim results shown in lighter color, final results in normal color
- [ ] On Android Chrome, recognition starts without hanging
- [ ] Continuous mode: recognition restarts after each result

### Phase 3 — Premium TTS ✅
- [ ] Settings → Voice Companion → Provider dropdown shows available providers
- [ ] Select "Browser" → TTS works with system voices
- [ ] Select "tts.ai" → TTS works (requires internet, no API key)
- [ ] Select "ElevenLabs" → Enter API key → TTS works with premium voice
- [ ] Voice speed slider (0.5x - 2.0x) affects speech rate
- [ ] Voice pitch slider (0.5 - 2.0) affects pitch
- [ ] Volume slider (0 - 1.0) affects volume
- [ ] Preview button plays sample audio

### Phase 4 — Voice Settings ✅
- [ ] Settings page shows Voice Companion section with provider selector
- [ ] Changing provider dynamically loads voice list
- [ ] Voice dropdown populated with correct voices per provider
- [ ] API key inputs appear conditionally (tts.ai key, ElevenLabs key)
- [ ] API keys saved to localStorage and restored on page load
- [ ] Preview button works for each provider

### Phase 5 — Voice Cloning Prep ⬜
- [ ] `NovaVoiceClone.record()` prompts mic permission
- [ ] Recording overlay appears with red dot and duration counter
- [ ] Click overlay to stop recording
- [ ] Auto-stop at 30 seconds
- [ ] `validate()` rejects recordings < 3 seconds
- [ ] `validate()` rejects recordings > 30 seconds
- [ ] `validate()` rejects files > 10MB
- [ ] Permission denied shows graceful error message

### Phase 6 — Rebrand to Nova ✅
- [ ] Header shows "✦ Nova" instead of "BlockFlow Assistant"
- [ ] Sidebar shows "✦ Nova" instead of "🤖 AI Assistant"
- [ ] System prompt starts with "You are Nova, a voice-first productivity companion"
- [ ] Settings page shows "✦ Nova" heading
- [ ] FAB aria-label says "Open Nova"

### Phase 7 — Better Memory ✅
- [ ] Memory list shows 📌 pinned items at top
- [ ] Pin/unpin toggle works and persists
- [ ] Search input filters memories by content or category
- [ ] Click memory text → inline edit field appears
- [ ] Save/cancel edit with Enter/Escape
- [ ] Chat shows "🧠 N memories loaded" indicator
- [ ] Memory context injected into system prompt

### Phase 8 — Voice + Memory ⬜
- [ ] Voice input → Nova responds → memory extracted → toast appears
- [ ] Toast shows "🧠 Remember this?" with Yes/No buttons
- [ ] Click Yes → toast dismissed, memory kept
- [ ] Click No → toast dismissed, memory removed
- [ ] Auto-dismiss after 8 seconds → memory kept (default yes)
- [ ] Non-voice input → no confirmation toast (silent extraction)
- [ ] Dark mode: toast styled correctly

### Phase 9 — Animations ✅
- [ ] Idle: subtle breathing circle animation on waveform canvas
- [ ] Listening: red audio bars animate on waveform
- [ ] Thinking: three dots bounce on waveform
- [ ] Speaking: blue waveform bars animate (real audio or simulated)
- [ ] Message entrance: slide-in animation for new messages
- [ ] Avatar: pulse glow during speech
- [ ] prefers-reduced-motion: all animations disabled, waveform hidden

### Phase 10 — Performance ✅
- [ ] LRU audio cache: repeat TTS calls reuse cached audio (<50ms vs 1-3s)
- [ ] Cache evicts oldest when > 20 entries
- [ ] Cache evicts oldest when total > 10MB
- [ ] Memory extraction debounced (2s delay, no duplicate calls)
- [ ] No memory leaks from stale intervals/timeouts

### Phase 11 — Testing & Verification ⬜
- [ ] `lsp_diagnostics` clean on all JS files (0 errors)
- [ ] No `console.log` in production code
- [ ] No `alert()` calls
- [ ] All script tags present in index.html, settings.html, calendar.html
- [ ] Service worker cache list includes all nova-* files
- [ ] Version consistent across all HTML files

---

## Known Limitations

1. **Safari**: No continuous speech recognition. Each recognition session captures one utterance.
2. **Firefox**: Web Speech API not supported. Voice input disabled. TTS falls back to browser built-in.
3. **Kokoro TTS**: Requires WebGPU (Chrome 113+). Falls back to tts.ai on unsupported browsers.
4. **Voice cloning**: Recording stub only. Actual cloning requires backend integration (not in scope for v2.2.0).
5. **tts.ai free tier**: 5,000 characters/day. No account required but rate-limited.

---

## Regression Checks

After each phase merge, verify:
1. Open `index.html` → AI assistant opens and greets
2. Type a message → response streams in
3. Voice input works (Chrome) → text appears, auto-sends
4. TTS speaks response (click 🔊)
5. Settings page loads → voice settings functional
6. Calendar page loads → AI assistant accessible
7. Dark mode toggle → all elements styled correctly
8. Mobile responsive → AI assistant usable on small screens
9. Service worker registers → offline fallback works
10. No console errors in DevTools

---

## Files Changed (v2.2.0 Voice Companion)

| File | Change | Phase |
|------|--------|-------|
| `js/nova/nova-stt-providers.js` | NEW — STT provider with Android workaround | 2 |
| `js/nova/nova-tts-providers.js` | NEW — TTS registry + 4 providers + LRU cache | 3, 10 |
| `js/nova/nova-settings.js` | NEW — Voice settings controller | 4 |
| `js/nova/nova-waveform.js` | NEW — Canvas waveform visualizer | 9 |
| `js/nova/nova-voice-clone.js` | NEW — Recording stub + validation | 5 |
| `js/ai-assistant.js` | Voice, memory, rebrand, waveform integration | 1-10 |
| `js/sidebar.js` | Rebrand to Nova | 6 |
| `settings.html` | Voice Companion UI, Nova branding | 4, 6 |
| `index.html` | Script tags for nova modules | 2-5 |
| `calendar.html` | Script tags for nova modules | 2-5 |
| `css/style.css` | Voice settings styles, memory UI, reduced-motion | 4, 7, 9 |
| `sw.js` | Cache nova module files | 9 |
