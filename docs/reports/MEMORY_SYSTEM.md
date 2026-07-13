# BlockFlow Memory System

## Overview

The Memory System automatically extracts and stores important information from conversations, allowing the AI assistant to remember user preferences, goals, and context across sessions.

## Architecture

```
User Message
    │
    ▼
┌─────────────────┐
│   AI Assistant  │ ← Main conversation
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Memory Extractor│ ← Second AI call (non-blocking)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  localStorage   │ ← Persistent storage
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ System Prompt   │ ← Memory injection
└─────────────────┘
```

## Storage Format

**localStorage key:** `blockflow_ai_memory`

**Data structure:**
```json
[
  {
    "id": "1752323421000",
    "content": "User's name is Brian.",
    "category": "profile",
    "importance": "high",
    "createdAt": "2026-07-12T10:30:41.000Z",
    "updatedAt": "2026-07-12T10:30:41.000Z"
  }
]
```

**Fields:**
- `id`: Unique identifier (timestamp-based)
- `content`: The memory text
- `category`: Classification (profile, preferences, projects, interests, goals, work, education, productivity, other)
- `importance`: Priority level (high, medium, low)
- `createdAt`: ISO 8601 timestamp
- `updatedAt`: ISO 8601 timestamp

## Extraction Flow

1. **User sends message** → AI responds normally
2. **After response completes** → `extractMemoryFromConversation()` is called
3. **Second AI call** analyzes conversation with extraction prompt
4. **JSON response** determines if memory should be saved
5. **If save: true** → `addAutomaticMemory()` processes and stores

**Extraction prompt** instructs the AI to:
- Identify long-term useful information (name, interests, goals, etc.)
- Ignore temporary events, greetings, casual conversation
- Avoid duplicates of existing memories
- Return structured JSON with category and importance

## Duplicate Detection

`findSimilarMemory()` checks for existing memories:
- Exact match (case-insensitive)
- Substring containment (existing contains new or vice versa)

If duplicate found, existing memory is updated with new content and timestamp.

## Retrieval Flow

**`getMemoryContext()`** formats memories for system prompt injection:
1. Sort by importance (high → medium → low)
2. Sort by recency (most recently updated first)
3. Limit to top 10 memories
4. Format as numbered list with category tags

**Injection point:** Appended to system prompt before sending to AI.

## UI Components

### AI Assistant Modal
- **Memory button** (🧠) in chat header
- **Modal** with list, input, and save button
- **Edit button** (✎) for each memory
- **Delete button** (×) for each memory
- **Category badge** showing memory type
- **Importance indicator** (colored dot)

### Settings Page
- Memory Points section in AI Settings
- Add/remove functionality
- Same storage backend

## Categories

| Category | Examples |
|----------|----------|
| profile | Name, age, location, occupation |
| preferences | Communication style, language, timezone |
| projects | Current work, ongoing tasks |
| interests | Hobbies, topics of interest |
| goals | Short-term and long-term objectives |
| work | Job details, work habits |
| education | School, courses, learning |
| productivity | Work patterns, focus preferences |
| other | Anything that doesn't fit above |

## Importance Levels

| Level | Description | Examples |
|-------|-------------|----------|
| high | Critical user info | Name, occupation, major goals |
| medium | Useful context | Preferences, current projects |
| low | Minor details | Casual mentions, temporary info |

## Silent Failure

Memory extraction is non-critical. If extraction fails:
- Error logged to console
- Main conversation unaffected
- User can still add memories manually

## Future Improvements

- [ ] Relevance-based retrieval (match memories to conversation topic)
- [ ] Memory expiration (auto-remove old, low-importance memories)
- [ ] Memory consolidation (merge similar memories)
- [ ] Firebase sync for cross-device memory access
- [ ] Memory export/import
- [ ] Conversation history for memory audit trail
