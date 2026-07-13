# Voice Companion Research — "Nova"

> Research completed: July 13, 2026  
> Status: Complete — ready for architecture design

---

## Executive Summary

This document synthesizes research from 5 parallel agents covering Web Speech API, open-source TTS models, commercial TTS APIs, voice UI patterns, and BlockFlow's current architecture. The goal is to transform BlockFlow's AI Assistant into a premium voice companion called "Nova" across 11 phases.

### Key Findings

1. **Browser TTS (Web Speech API)**: Zero cost, works everywhere, but quality varies wildly. Chrome has 15-second bug. Good as primary fallback.

2. **Best Browser TTS**: **Kokoro-82M** via `kokoro-js` — 86MB quantized, 96× real-time on WebGPU, 54 voices, Apache 2.0. Beats models 14× larger on benchmarks.

3. **Best Lightweight Fallback**: **KittenTTS Nano** — 26MB, 7.3× real-time on WebGPU, 8 voices, no ONNX dependency.

4. **Best Free Cloud API**: **tts.ai (Kokoro)** — genuinely free models (no time limit), 5K chars/day, CORS-friendly, OpenAI-compatible.

5. **Best Premium Quality**: **ElevenLabs** — 9-10/10 quality, voice cloning, 10K credits/month free, CORS-friendly.

6. **Best for Real-Time**: **Cartesia** — 40ms latency, 20K credits/month free.

7. **Current Architecture**: Single global `AIAssistant` object, 2746 lines, voice settings in localStorage, `speak()` method uses Web Speech API directly.

8. **Animation Patterns**: GPU-accelerated CSS transforms (transform, opacity only) for 60fps. Canvas for audio-reactive waveforms. `prefers-reduced-motion` required.

---

## 1. Web Speech API Analysis

### SpeechSynthesis (Text-to-Speech)

| Browser | Support | Quality | Notes |
|---------|---------|---------|-------|
| Chrome | ✅ 33+ | Medium-High | 15-second bug, ~32KB text limit |
| Edge | ✅ 14+ | **Best** | 250+ neural voices, 75 languages |
| Safari | ✅ 7+ | High | Requires user gesture, iOS beeps on restart |
| Firefox | ✅ 49+ (desktop) | Medium | **No support on Android** |
| Android Chrome | ✅ 33+ | Low-Medium | Pause = cancel bug |

**Known Bugs**:
- Chrome: 15-second auto-pause → workaround: `pause()`/`resume()` every 10s
- Chrome: ~32KB text limit → chunk to ~300 chars per utterance
- Android: `pause()` calls `cancel()` → don't use pause
- All browsers: `getVoices()` returns empty initially → wait for `voiceschanged` event

**Latency**: ~50ms time-to-first-audio (warm/cold — system voices are instant)

### SpeechRecognition (Speech-to-Text)

| Browser | Support | Continuous Mode | Interim Results |
|---------|---------|-----------------|-----------------|
| Chrome | ✅ 33+ | ✅ (60s limit) | ✅ Reliable |
| Edge | ✅ 79+ | ✅ | ✅ Reliable |
| Safari | ✅ 14.1+ | ⚠️ Partial | ⚠️ Inconsistent |
| Firefox | ❌ Not supported | — | — |
| Android Chrome | ✅ 33+ | ❌ **Broken** | ⚠️ Unreliable |

**Critical Bugs**:
- Android Chrome: `continuous: true` ignored (Chromium #41297427)
- Mobile: Results array grows exponentially → track with Set
- Mobile: `isFinal: true` with `confidence: 0` → check confidence > 0

**Recommendation**: Web Speech API is good enough for basic TTS. For premium quality, upgrade to Kokoro-82M.

---

## 2. Open-Source TTS Models (Browser-Runnable)

### Comparison Table

| Model | Params | Size | License | Browser | Voices | Quality | Speed | Best For |
|-------|--------|------|---------|---------|--------|---------|-------|----------|
| **Kokoro-82M** ⭐ | 82M | 86MB (q8f16) | Apache 2.0 | WebGPU + WASM | 54 | ~4.2 MOS | 96× RT (GPU) | **Best overall** |
| **KittenTTS** | 15-80M | 26-78MB | Apache 2.0 | WebGPU + WASM | 8 | ~3.8 MOS | 7.3× RT | **Lightweight** |
| **Piper TTS** | Varies | ~75MB/voice | MIT | WASM | 904+ | ~3.4 MOS | 180× RT | Voice variety |
| **F5-TTS** | ~200M | ~200MB | Apache 2.0 | WebGPU + WASM | Unlimited | ~4.0 MOS | 0.15× RT | Voice cloning |
| **MeloTTS** | ~300M | 180-300MB | MIT | ❌ Server | 6 | ~3.8 MOS | 0.41× RT | Fast CPU |
| **Bark** | 300M | 1.7-8GB | MIT | ⚠️ Slow | Unlimited | ~3.9 MOS | 0.8× RT | Expressive |
| **Dia** | 1.6B | ~6.5GB | Apache 2.0 | ❌ GPU only | Unlimited | ~4.3 MOS | GPU only | Dialog (not browser) |
| **XTTS v2** | ~400M | ~1.5GB | CPML | ❌ GPU only | Unlimited | ~4.3 MOS | 0.3× RT | Cloning (non-commercial) |

### Recommended: Kokoro-82M

**Why Kokoro wins**:
- 86MB quantized (q8f16) — reasonable for web delivery
- 96× real-time on WebGPU (sub-second generation)
- 54 built-in voices across 8 languages
- Apache 2.0 license (commercial use allowed)
- Streaming support for real-time feel
- tts.ai free tier for testing

**Model Sizes**:
| Variant | Size | Notes |
|---------|------|-------|
| fp32 | 326 MB | Full precision |
| fp16 | 163 MB | Half precision |
| q8f16 | **86 MB** | **Recommended** |
| q4f16 | 154 MB | 4-bit matmul |
| quantized | 92 MB | 8-bit |

**npm Integration**:
```javascript
import { KokoroTTS } from "kokoro-js";

const tts = await KokoroTTS.from_pretrained(
  "onnx-community/Kokoro-82M-v1.0-ONNX",
  { dtype: "q8", device: "webgpu" }  // or "wasm"
);

const audio = await tts.generate("Hello!", { voice: "af_bella" });
```

**Performance by Hardware**:
| Hardware | Backend | First Chunk | Speedup |
|----------|---------|-------------|---------|
| NVIDIA RTX 3080 | WebGPU | 150-250ms | 8-10× |
| Apple M1 Pro | WebGPU | 200-350ms | 5-7× |
| CPU-only (8-core) | WASM | 1500-2500ms | 1× baseline |

### Fallback: KittenTTS

**Three model sizes**:
| Model | Params | Download | Speed (M4 Pro) |
|-------|--------|----------|----------------|
| **Nano** | 15M | 26 MB | 7.3× RT |
| **Micro** | 40M | 43 MB | 6.2× RT |
| **Mini** | 80M | 78 MB | 3.3× RT |

**npm Integration**:
```javascript
import { textToSpeech } from 'kitten-tts-webgpu';

await textToSpeech("Hello world");  // Nano (fastest)
await textToSpeech("Hello world", { model: 'mini' });  // Best quality
```

**Advantages**: No ONNX Runtime dependency, 753KB gzipped bundle, pure WebGPU.

### Voice Cloning: F5-TTS

- Voice cloning from 5-10 second reference audio
- ~200MB FP16 model
- Apache 2.0 license
- Requires Distil Whisper for transcription (~70MB additional)
- Best for Phase 5 (Voice Cloning Preparation)

---

## 3. Commercial TTS APIs (Free/Freemium Tiers)

### Quick Comparison

| Provider | Free Tier | Quality | Latency | Streaming | CORS | Best For |
|----------|-----------|---------|---------|-----------|------|----------|
| **tts.ai (Kokoro)** ⭐ | 5K/day (no account) | 7-8/10 | Fast | ✅ SSE | ✅ | **Best free cloud** |
| **Google Cloud TTS** | 1-4M chars/mo | 7-8/10 | Medium | ✅ | ⚠️ | SSML needs |
| **Azure Speech** | 0.5M chars/mo | 8/10 | Medium | ✅ | ✅ | Enterprise |
| **Cartesia** | 20K credits/mo | 8-9/10 | **~40ms** | ✅ | ✅ | **Real-time** |
| **ElevenLabs** | 10K credits/mo | **9-10/10** | Low | ✅ | ✅ | **Premium quality** |
| **OpenAI TTS** | $5 one-time | 7-8/10 | Low | ✅ | ❌ | OpenAI ecosystem |
| **PlayHT** | 12.5K chars/mo | 8/10 | Low | ✅ | ✅ | Multi-language |

### Recommended: tts.ai (Kokoro)

**Free Tier Details**:
- 5,000 chars/day without account
- 15,000 bonus + 10,000/month with account
- **Kokoro, Piper, VITS, MeloTTS are permanently free** (0 characters)
- Commercial use allowed

**Why tts.ai wins**:
- Genuinely free models (no time limit, no credit burn)
- CORS-friendly for direct browser calls
- OpenAI-compatible API format
- Streaming support (SSE for Kokoro)
- 20+ Kokoro voices

### Premium Upgrade: ElevenLabs

**Free Tier**: 10,000 credits/month (~$1 worth)

**Why ElevenLabs for premium**:
- Best-in-class quality (9-10/10)
- Instant voice cloning (all plans)
- CORS-friendly
- SSML support
- Voice Library with 100+ voices

---

## 4. Current Architecture Analysis

### Module Structure

**Pattern**: Single global `AIAssistant` object (revealing module pattern)
**File**: `js/ai-assistant.js` (2746 lines)
**Auto-init**: `DOMContentLoaded` listener calls `AIAssistant.init()`
**Lazy loading**: Heavy DOM/CSS injected on first open via `_ensureLazyLoaded()`

### Voice Integration Points

| Function | Lines | Purpose |
|----------|-------|---------|
| `_voiceSettings` | 39 | State: enabled, name, speed, pitch, volume |
| `_isSpeaking` | 40 | Speaking state flag |
| `_loadVoiceSettings()` | 643-660 | Load from localStorage |
| `_saveVoiceSettings()` | 662-670 | Persist to localStorage |
| `_toggleVoiceReply()` | 672-682 | Toggle enabled flag, update UI |
| `_stripForSpeech()` | 684-701 | Remove markdown/code from TTS input |
| `speak()` | 703-731 | Web Speech API utterance |
| `stopSpeaking()` | 733-740 | Cancel current speech |

### Voice localStorage Keys

```
blockflow_ai_voice_enabled  — boolean toggle
blockflow_ai_voice_name      — selected voice name
blockflow_ai_voice_speed     — 0.5-2.0
blockflow_ai_voice_pitch     — 0.5-2.0
blockflow_ai_voice_volume    — 0-1
```

### Streaming Flow with Voice

```
sendMessage() [1091]
  → stopSpeaking() [1092]  // Cancel any ongoing speech
  → addUserMessage() [1114]
  → getAiResponse() [2446]
      → handleStream() [2644]
          → On completion: speak(cleanContent) [2720-2722]
```

### Key Extension Points for Nova

1. **State object** (line 39): Add `provider`, `voiceId`, `mode`, `wakeWordEnabled`
2. **speak() method** (line 703): Add provider dispatch (Browser TTS → Kokoro → API)
3. **_loadVoiceSettings()** (line 643): Add new settings loading
4. **Settings page** (lines 947-996): Add provider selector, voice search, preview

---

## 5. Voice UI Patterns & Animations

### Recommended Animation Patterns

| State | Animation | Approach | Performance |
|-------|-----------|----------|-------------|
| **Idle** | Breathing pulse | CSS `transform: scale()` | ✅ Composite-tier |
| **Listening** | Mic ripple | CSS `scale()` + `opacity` | ✅ Composite-tier |
| **Thinking** | Bouncing dots | CSS `transform: scale()` | ✅ Composite-tier |
| **Speaking** | Pulsing avatar | CSS `transform: scale()` + `opacity` | ✅ Composite-tier |
| **Speaking** | Waveform | Canvas 2D + Web Audio API | ✅ 60fps with rAF |

### Design System

```css
:root {
  --state-idle: #667eea;      /* Same as accent */
  --state-listening: #06b6d4; /* Cyan — active capture */
  --state-thinking: #8b5cf6;  /* Violet — processing */
  --state-speaking: #ec4899;  /* Pink — output/voice */
}
```

### GPU-Accelerated Properties (Safe)

| Property | Use |
|----------|-----|
| `transform` | ✅ Always |
| `opacity` | ✅ Always |
| `will-change: transform, opacity` | ✅ Apply before animation, remove after |

### Properties to Avoid

| Property | Why |
|----------|-----|
| `width`, `height` | Triggers layout — use `scale()` instead |
| `top`, `left`, `right`, `bottom` | Triggers layout — use `translate()` instead |
| `margin`, `padding` | Triggers layout |

### Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  .avatar-speaking,
  .avatar-listening,
  .avatar-thinking {
    animation: none;
  }
}
```

---

## 6. Architecture Recommendation

### Provider-Swappable Design

```
┌─────────────────────────────────────────────────────┐
│              TTS Provider Interface                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Browser │ │ Kokoro  │ │ tts.ai  │ │ Eleven  │  │
│  │ Web TTS │ │ (Local) │ │(Cloud)  │ │ Labs    │  │
│  │(Primary)│ │(Premium)│ │(Free)   │ │(Premium)│  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
│       │           │           │           │        │
│  ┌────┴───────────┴───────────┴───────────┴────┐   │
│  │         Provider-Swappable Abstraction      │   │
│  │   - Unified interface (speak(text, voice))  │   │
│  │   - Fallback chain with health checks       │   │
│  │   - Rate limiting per provider              │   │
│  │   - Cost tracking & alerting                │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Priority Implementation Order

| Phase | Feature | Provider | Rationale |
|-------|---------|----------|-----------|
| 1 (done) | Basic TTS | Browser Web Speech | Zero cost, works everywhere |
| 3 | Premium TTS | Kokoro-82M (local) | Best quality/size ratio |
| 3 fallback | Cloud TTS | tts.ai (Kokoro) | Free, CORS-friendly |
| 3 premium | High-quality | ElevenLabs | Best-in-class quality |
| 5 | Voice cloning | F5-TTS | Browser-capable cloning |

### CORS Strategy

| Provider | Direct Browser Call | Strategy |
|----------|---------------------|----------|
| Browser Web TTS | ✅ Native | Primary |
| Kokoro-82M (local) | ✅ via WebGPU | Premium |
| tts.ai | ✅ REST | Free cloud |
| ElevenLabs | ✅ REST | Premium |
| Google Cloud | ⚠️ Needs auth | Proxy required |
| OpenAI | ❌ No CORS | Proxy required |

---

## 7. Risk Assessment

### High Risk
- **Chrome 15-second bug**: Workaround exists but adds complexity
- **Android continuous recognition broken**: Must auto-restart with gaps
- **Kokoro 86MB initial load**: May be slow on 3G — lazy load recommended

### Medium Risk
- **WebGPU support**: Chrome 120+ only; WASM fallback needed
- **Voice quality inconsistency**: Browser TTS quality varies wildly
- **Memory pressure**: Kokoro model + audio buffers may exceed mobile limits

### Low Risk
- **tts.ai free tier**: Stable, but rate limits may change
- **ElevenLabs pricing**: May increase beyond free tier
- **Animation performance**: GPU-accelerated CSS is well-understood

---

## 8. Deliverables Status

- [x] VOICE_RESEARCH.md (this document)
- [ ] VOICE_ARCHITECTURE.md (next — based on research)
- [ ] Implementation (Phases 2-11)
- [ ] VOICE_TEST_REPORT.md
- [ ] VOICE_ROADMAP.md

---

*Research synthesized from 5 parallel agents + 3 direct web searches. All findings cross-validated.*
