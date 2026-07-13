# Voice Assistant

Full duplex voice conversation for BlockFlow's AI Assistant.

## Architecture

The voice system uses the browser's built-in **SpeechSynthesis API** — no external TTS services required.

### Flow

```
User presses mic → Speech Recognition → Text → AI Pipeline → Streaming Response → speak(finalText)
```

### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `speak(text)` | ai-assistant.js | Strips markdown, speaks plain text |
| `stopSpeaking()` | ai-assistant.js | Cancels speech immediately |
| `_stripForSpeech(text)` | ai-assistant.js | Removes markdown, code, tool calls |
| `_loadVoiceSettings()` | ai-assistant.js | Loads voice config from localStorage |
| `_toggleVoiceReply()` | ai-assistant.js | Mute/unmute toggle |
| 🔊 button | ai-assistant.js (DOM) | Visual mute control |
| Voice Settings | settings.html | Voice, speed, pitch, volume controls |

### Storage Keys

| Key | Default | Description |
|-----|---------|-------------|
| `blockflow_ai_voice_enabled` | `true` | Voice replies on/off |
| `blockflow_ai_voice_name` | `""` | Selected voice name |
| `blockflow_ai_voice_speed` | `1.0` | Speech rate (0.5-2.0) |
| `blockflow_ai_voice_pitch` | `1.0` | Voice pitch (0.5-2.0) |
| `blockflow_ai_voice_volume` | `1.0` | Volume (0-1) |

## Settings

Access via **Settings → Voice**:

- **Enable Voice Replies** — Toggle voice output on/off
- **Voice** — Select from available browser voices (English only)
- **Speed** — 0.5x to 2.0x (default: 1.0x)
- **Pitch** — 0.5 to 2.0 (default: 1.0)
- **Volume** — 0% to 100% (default: 100%)

All settings persist in localStorage automatically.

## Interruptions

Speech is cancelled immediately when:
- User sends a new message
- User starts voice input (mic button)
- User clicks the 🔊 mute button
- An error occurs during speech

## Text Cleaning

The `_stripForSpeech()` function removes:
- Code blocks (```...```)
- Inline code (`...`)
- Markdown links [text](url)
- Images ![alt](url)
- Headers (#, ##, ###)
- Bold/italic markers
- Blockquotes (>)
- Horizontal rules (---)
- List markers (-, *, 1.)
- Tool call JSON blocks
- Excess whitespace

## Supported Browsers

| Browser | SpeechSynthesis | Speech Recognition | Notes |
|---------|-----------------|-------------------|-------|
| Chrome | ✅ | ✅ | Best support, most voices |
| Edge | ✅ | ✅ | Good support |
| Safari | ✅ | ✅ | Limited voice selection |
| Firefox | ✅ | ⚠️ | May require flags |

## Limitations

- Voice quality depends on browser/OS — not comparable to cloud TTS
- No custom voice selection beyond browser-provided voices
- English voices only (filtered from available voices)
- Speech may be interrupted by browser tab focus changes
- Some browsers limit speech duration

## Future Improvements

- [ ] Conversation mode (continuous listening)
- [ ] Wake word detection
- [ ] Custom voice packs
- [ ] Multi-language support
- [ ] Speed/pitch presets
- [ ] Voice cloning integration
- [ ] Offline TTS via WebAssembly
