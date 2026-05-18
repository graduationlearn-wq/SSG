# API Routes

Every Express route in `server.js`, what it does, what it expects, what it returns. Routes grouped by purpose.

## Static / page

| Method | Path             | Purpose                                                                |
|---     |---               |---                                                                      |
| GET    | `/`              | Serves `public/index.html` (the main app)                              |
| GET    | `/login`         | Serves `public/login.html`                                              |
| GET    | `/uploads/*`     | Static-served user-uploaded images (multer destination)                |
| GET    | `/*` (assets)    | `express.static('public')` for `style.css`, `*.js`, etc.                |

## Authentication (placeholder)

| Method | Path           | Body                                | Returns                                    |
|---     |---             |---                                   |---                                          |
| POST   | `/api/login`   | `{ email, password }`                | `200 { success: true, redirect: '/' }` if `admin@example.com` / `password123`, else `401 { error }` |

**Note:** hardcoded — no DB, no sessions. ROADMAP item.

## Schema endpoint

| Method | Path                          | Purpose                                                              |
|---     |---                            |---                                                                    |
| GET    | `/api/schema/:templateId`     | Returns merged schema (template-N.json + _base.json) as JSON          |

`composeSchema()` server-side merges `_base` (brand prepended, contact + theme appended) into the template's section list. Returns 404 if template-N.json doesn't exist.

## Image upload

| Method | Path                      | Body                                  | Returns                                              |
|---     |---                        |---                                     |---                                                    |
| POST   | `/api/upload-image`       | multipart, `file` field                | `{ url, filename, size }` — saves to `/uploads/images/` |
| POST   | `/api/upload-logo`        | multipart, `logo` field (back-compat)  | Same as above                                        |

Limits: 3MB max, PNG/JPG/SVG/WEBP only. Filename is `${Date.now()}-${random}-${sanitizedName}`.

## AI: per-section ✨ button

| Method | Path                | Body                                                              | Returns                  |
|---     |---                  |---                                                                |---                       |
| POST   | `/api/ai-section`   | `{ templateId, sectionId, businessName, description, tone }`     | Section field JSON        |

Rate limit: `aiLimiter` — 15 requests per hour per IP.

**Failover chain (see `architecture/02_ai-fallback.md`):**
1. `callGeminiAI(prompt)` — Gemini 2.5 Flash, 3 retries on 503
2. If Gemini fails → `callGroqAI(prompt)` — Groq Llama-3.3-70b
3. If both fail → `503 { error }`

Server-side prompt construction from `AI_PROMPTS[templateId][sectionId](ctx)`. Client never sees the prompt itself.

## AI: chatbot

| Method | Path           | Body                                                                          | Returns           |
|---     |---             |---                                                                            |---                |
| POST   | `/api/chat`    | `{ messages: [{role, content}], context: {templateId, sectionId, businessName, description} }` | `{ reply }` |

Rate limit: `chatLimiter` — 30 messages per 10 min per IP.

System prompt is strict scope-lock built from `buildChatSystemPrompt(context)`. Off-topic questions get a canned redirect. Routed through Groq Llama-3.3-70b.

**Note:** most social messages (greetings, thanks, identity, etc.) are caught client-side by the local intent matcher in `chatbot.js` and never hit this endpoint.

## Payment (dummy)

| Method | Path           | Body                          | Returns                                                |
|---     |---             |---                             |---                                                      |
| POST   | `/api/pay`     | `{ amount?, currency? }`       | `{ paymentId, amount, currency, status: 'succeeded' }` |

Rate limit: `payLimiter` — 20 attempts per hour per IP.

**Implementation:** in-memory `Map`, 30-min TTL. Resets on server restart. Replace with Stripe/Razorpay (ROADMAP).

## Render

| Method | Path                  | Body                                              | Returns                  |
|---     |---                    |---                                                |---                       |
| POST   | `/api/preview`        | `{ template, data }`                              | Rendered HTML            |
| POST   | `/api/generate`       | `{ template, data, paymentId }`                   | ZIP download stream      |

Rate limit on generate: `genLimiter` — 10 downloads per hour per IP.

**`/api/generate` flow:**
1. Validate `paymentId` via `consumePayment()` — marks the ID as used.
2. Render EJS via `ejsLib.renderFile()` with `buildTemplateData(data)`.
3. Open `archiver` zip stream.
4. Append the rendered HTML as `index.html`.
5. For each `/uploads/*` URL referenced in `data` (logo, hero shot, advisor photo): include the file as `assets/<filename>`.
6. Stream as `attachment(slug + '.zip')`.

## Template preview (for the hover modal)

| Method | Path                                            | Returns                                          |
|---     |---                                              |---                                                |
| GET    | `/template-previews/preview-:slug.html`         | Pre-generated preview HTML, or friendly 404 page  |

Whitelist regex: `^\/template-previews\/preview-([a-z0-9-]+)\.html$` — won't leak EJS source, schemas, or other files.

If the file doesn't exist (e.g. new template hasn't been regenerated), serves a styled placeholder explaining how to generate. Refresh: `cd templates && node preview-test.js`.

## Boot

```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`▶ Server running on http://localhost:${PORT}`));
```

## Rate-limit summary

| Limiter        | Routes                | Window  | Max  |
|---             |---                    |---      |---   |
| `aiLimiter`    | `/api/ai-section`     | 1 hour  | 15   |
| `chatLimiter`  | `/api/chat`           | 10 min  | 30   |
| `genLimiter`   | `/api/generate`       | 1 hour  | 10   |
| `payLimiter`   | `/api/pay`            | 1 hour  | 20   |

## Related

- [[02_ai-fallback]] — what `/api/ai-section` does internally
- [[03_chatbot]] — what `/api/chat` does internally
- [[04_template-system]] — what `/api/schema/:id`, `/api/preview`, `/api/generate` consume
- [[05_preview-modal]] — what `/template-previews/preview-N.html` serves
- [[03_TECH_STACK]] — overall stack and file layout
- [[ADR#ADR-006 — Server-locked AI prompts not client-controlled|ADR-006]] — why prompts live server-side
