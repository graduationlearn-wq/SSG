# AI Fallback Chain

How the ✨ AI button decides between Gemini and Groq, and what happens when both fail.

## The chain

```
User clicks ✨ on a form section
         │
         ▼
POST /api/ai-section { templateId, sectionId, businessName, description, tone }
         │
         ▼
pickPrompt(templateId, sectionId, ctx) → prompt string
         │
         ▼
   ┌──── callGeminiAI(prompt) ◄─────────┐
   │           │                         │
   │   Success │ Failure                  │
   │           │                         │
   │           ▼                         │
   │     Throw error                     │
   │           │                         │
   │           ▼                         │
   │     callGroqAI(prompt)              │
   │           │                         │
   │   Success │ Failure                  │
   │           │                         │
   │           ▼                         │
   │     Throw error                     │
   │           │                         │
   │           ▼                         │
   │   Return 503 to client               │
   │                                     │
   └─────────────────────────────────────┘
```

## Layer 1 — Gemini (primary)

```javascript
async function callGeminiAI(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  let retries = 3;
  while (retries > 0) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return extractJSON(text);
    } catch (err) {
      if (err.status === 503 && retries > 1) {
        retries--;
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Gemini exhausted retries');
}
```

**Behaviour:**
- 503 (service overloaded) → retry up to 3 times with 1.5s backoff
- Any other error (429 rate limit, 401 auth, 5xx, network, JSON parse) → bubble up immediately
- On success → return parsed JSON

## Layer 2 — Groq (fallback)

```javascript
async function callGroqAI(prompt) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY not configured');
  const ax = require('axios');
  const resp = await ax.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a professional website content writer. You always respond with VALID JSON ONLY — no markdown fences, no explanation, no prose around the JSON. The user will tell you the exact JSON structure to produce.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 700,
      response_format: { type: 'json_object' }
    },
    { headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' }, timeout: 25000 }
  );
  const text = resp.data?.choices?.[0]?.message?.content;
  return extractJSON(text);
}
```

**Why these choices:**
- `llama-3.3-70b-versatile` — strongest general model on Groq's free tier with `response_format: json_object` support
- System message reinforces "valid JSON only" so even if a per-template prompt is loose, output stays parseable
- `response_format: json_object` is Groq's native JSON mode — guarantees structurally-valid JSON
- 25s timeout — Groq is fast (~2-3s typical) but allows for cold-start

## Robust JSON extractor

Both providers occasionally return JSON wrapped in markdown fences or trailing prose. `extractJSON()` handles both:

```javascript
function extractJSON(text) {
  if (!text) throw new Error('Empty response from AI');
  let t = String(text).replace(/```json/gi, '').replace(/```/g, '').trim();
  // If it doesn't start with { or [, find the first balanced object/array
  if (!/^[\[{]/.test(t)) {
    const m = t.match(/[{[][\s\S]*[}\]]/);
    if (m) t = m[0];
  }
  return JSON.parse(t);
}
```

**Handles:**
- ```` ```json {...} ``` ```` → strip fences
- `"Sure, here's your JSON: {...}"` → find first `{...}` block
- Pure JSON → parse directly
- Trailing trailing text → also OK due to `[\s\S]*` greedy match

## Server-side prompt construction (security)

The client only sends `{ templateId, sectionId, businessName, description, tone }`. The server builds the entire prompt from `AI_PROMPTS[templateId][sectionId](ctx)`. Client never sees or controls the prompt.

This means the AI button **cannot** be jailbroken into general-purpose AI use. Even if someone reverse-engineers the endpoint and crafts arbitrary `description` text, the prompt structure forces the output into a specific JSON shape for that template's section.

## Logging

Every AI call logs which provider succeeded:
```
[ai-section] template-9/hero ✓ Gemini
[ai-section] template-9/hero ✓ Groq (fallback)
[ai-section] template-9/hero ✗ Gemini failed (HTTP 429) — trying Groq
[ai-section] template-9/hero ✗ Groq also failed: <message>
```

Tail your terminal during demos to see the failover in real time.

## Caveats

- **Same prompt must work on both providers.** Don't write Gemini-specific tricks. Output style may differ slightly when Groq handles a section (different word choice, slightly different rhythm) but JSON shape is identical.
- **Gemini's free tier hits 429 first**, before 503. Free tier 429 is treated as a non-retryable error and falls straight through to Groq. This is intentional — saving Gemini calls for when there's actual quota.
- **Prompts are calibrated to Gemini's output style** (since they were originally written for it). Groq sometimes phrases things slightly differently. If quality regresses on a specific Groq-routed section, tighten that prompt.

## Pending follow-up (ROADMAP)

**4th-layer canned-response fallback.** Currently if both providers fail, the form sees a 503 error. Better: have a deterministic hardcoded sensible default per `(templateId, sectionId)` so users never see a raw failure. ~2 hours of work. → tracked in [[ROADMAP#Pillar 3 — Technical polish (after foundations + one real customer)|ROADMAP Pillar 3]]

## Related

- [[ADR#ADR-004 — Free-tier APIs only during testing; paid Gemini is the LAST step before launch|ADR-004]] — why we stay on free tier during dev
- [[ADR#ADR-005 — Gemini → Groq fallback chain for the ✨ AI button|ADR-005]] — the failover decision rationale
- [[ADR#ADR-006 — Server-locked AI prompts not client-controlled|ADR-006]] — why prompts live server-side
- [[01_api-routes#AI per-section ✨ button|API route /api/ai-section]] — the endpoint that uses this chain
- [[03_chatbot]] — separate Groq path for the chatbot (different system prompt, different rate limit)
