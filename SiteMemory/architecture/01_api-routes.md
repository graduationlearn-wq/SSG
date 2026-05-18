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

## Payment (Razorpay · test credentials active)

| Method | Path                       | Body                                                                               | Returns                                                                        |
|---     |---                         |---                                                                                 |---                                                                              |
| POST   | `/api/pay`                 | `{ templateId }`                                                                   | `{ paymentId, orderId, providerData: { provider, keyId, amount, currency } }`  |
| POST   | `/api/payments/verify`     | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`                   | `{ ok: true, paymentId }` or `400 { error }`                                   |
| POST   | `/api/payments/webhook`    | Razorpay raw webhook body (requires `x-razorpay-signature` header)                 | `{ ok: true }` or `400 { error }`                                              |

Rate limit: `payLimiter` — 20 attempts per hour per IP (shared across all three routes).

**Flow (Razorpay):**
1. Frontend calls `/api/pay` → server creates Razorpay order via `rzp.orders.create()` → stores entry in in-memory `payments` Map with `status: CREATED` → returns `providerData` with `keyId`, `amount`, `currency`.
2. Frontend opens `new window.Razorpay(options)` checkout widget using `providerData`.
3. On checkout success, Razorpay returns `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`.
4. Frontend calls `/api/payments/verify` → server verifies HMAC-SHA256 → marks payment `status: PAID` in Map → returns `{ ok: true, paymentId: orderId }`.
5. Frontend calls `/api/generate` with the verified `paymentId` → `consumePayment()` checks `status === PAID` → ZIP download.

**Admin bypass:** `paymentId = 'admin_bypass_' + Date.now()` skips `consumePayment()` entirely. No Razorpay call made.

**Fallback (dummy mode):** set `PAYMENT_PROVIDER=dummy` to skip Razorpay entirely — `/api/pay` returns a synthetic paymentId with `status: PAID` immediately. Useful for local dev without credentials.

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

| Limiter        | Routes                                                          | Window  | Max  |
|---             |---                                                              |---      |---   |
| `aiLimiter`    | `/api/ai-section`                                               | 1 hour  | 15   |
| `chatLimiter`  | `/api/chat`                                                     | 10 min  | 30   |
| `genLimiter`   | `/api/generate`                                                 | 1 hour  | 10   |
| `payLimiter`   | `/api/pay`, `/api/payments/verify`, `/api/payments/webhook`     | 1 hour  | 20   |

## Related

- [[02_ai-fallback]] — what `/api/ai-section` does internally
- [[03_chatbot]] — what `/api/chat` does internally
- [[04_template-system]] — what `/api/schema/:id`, `/api/preview`, `/api/generate` consume
- [[05_preview-modal]] — what `/template-previews/preview-N.html` serves
- [[03_TECH_STACK]] — overall stack and file layout
- [[ADR#ADR-006 — Server-locked AI prompts not client-controlled|ADR-006]] — why prompts live server-side
