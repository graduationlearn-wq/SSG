# Tech Stack & File Layout

## Stack

- **Runtime:** Node.js 18+ / Express 5
- **Templating:** EJS, server-rendered (no React, no build step, no bundler)
- **Frontend:** Vanilla JavaScript modules (`form-renderer.js`, `chatbot.js`, `template-preview.js`, `preview-frame.js`, `script.js`)
- **Persistence:** **Prisma ORM** with **MySQL** target. Schema landed (six models); runtime still falls back to an in-memory `Map` for the dummy payment / draft flows until the wiring sprint. → [[ADR#ADR-012|ADR-012]]
- **Auth:** **Auth0 JWT** middleware (`jsonwebtoken` + `jwks-rsa`) in `src/lib/auth.js`. Dev bypass via `DEV_AUTH_BYPASS=true`. Demo path uses a strict dummy whitelist (`DUMMY_USERS`). → [[ADR#ADR-013|ADR-013]] · [[ADR#ADR-016|ADR-016]]
- **Logging:** **Winston** structured JSON in prod, human-readable in dev. → [[ADR#ADR-015|ADR-015]]
- **Tests:** **Jest** — 86 unit tests covering core business logic and infrastructure modules.
- **CI:** **GitHub Actions** — `npm ci` → `prisma generate` → `npm test` → `npm audit` on push.
- **Container:** **Multi-stage Dockerfile** + `docker-compose.yml` (app + MySQL sidecar). Non-root `nodejs:1001`. HEALTHCHECK against `/health`. → [[ADR#ADR-014|ADR-014]]

## Dependencies (`package.json`)

| Package                    | Why we use it                                                                           |
|---                         |---                                                                                       |
| `express`                  | HTTP framework (Express 5)                                                               |
| `ejs`                      | Server-side template rendering                                                           |
| `archiver`                 | Streaming ZIP creation for `/api/generate` downloads                                      |
| `multer`                   | Multipart file uploads (logos, hero shots) → `/uploads/images/`                           |
| `express-rate-limit`       | Per-route rate limiting (AI / generate / pay / chat)                                     |
| `dotenv`                   | Load `.env`                                                                              |
| `@google/generative-ai`    | Gemini 2.5 Flash SDK — primary AI provider                                                |
| `axios`                    | HTTP client for Groq fallback API + chatbot                                              |
| `@prisma/client` + `prisma`| ORM + migrations — persistence layer (see ADR-012)                                       |
| `jsonwebtoken`             | JWT decode + verify for the Auth0 middleware                                             |
| `jwks-rsa`                 | Fetches + caches Auth0's signing keys with rotation                                      |
| `winston`                  | Structured logger                                                                        |
| `js-yaml`                  | YAML parsing (for any future YAML-shaped schemas / configs)                              |

**Dev-only:**

| Package                    | Why                                                                                       |
|---                         |---                                                                                        |
| `jest`                     | Unit test runner                                                                          |
| `eslint`                   | Lint baseline (CI enforces on push)                                                       |

## Environment variables (`.env` — see `.env.example` for the canonical list)

```
# AI providers
GEMINI_API_KEY=AIzaSy...
GROQ_API_KEY=gsk_...

# Database (Prisma)
DATABASE_URL=mysql://user:pass@localhost:3306/beyondsite

# Auth0 (when wiring goes live)
AUTH0_DOMAIN=tenant.eu.auth0.com
AUTH0_AUDIENCE=https://api.beyondsite.com
DEV_AUTH_BYPASS=true        # short-circuits JWT verification in dev

# Runtime
PORT=3000
NODE_ENV=development
```

## File layout

```
StaticWebsiteGenerator/
├── server.js                            — Express app, routes, AI routing, payment, generate
├── package.json
├── .env                                 — secrets (gitignored)
├── .env.example                         — canonical env var documentation
├── .gitignore
├── .dockerignore
├── Dockerfile                           — multi-stage, non-root, HEALTHCHECK → /health
├── docker-compose.yml                   — app + MySQL sidecar
├── README.md                            — reviewer / handoff entry point
│
├── src/lib/                             — Backend modules (Round G refactor)
│   ├── auth.js                           — Auth0 JWT middleware + jwks-rsa key cache + dev bypass
│   ├── database.js                       — Prisma client singleton
│   ├── logger.js                         — Winston logger (JSON prod / pretty dev)
│   ├── storage.js                        — Storage abstraction (local FS now, S3-ready)
│   ├── payments.js                       — Dummy payment helpers (100% test coverage)
│   ├── config.js                         — Centralised config reader
│   └── utils.js                          — Shared helpers (100% test coverage)
│
├── prisma/
│   └── schema.prisma                     — User, Website, Draft, Download, Template, Payment + enums
│
├── tests/                               — Jest unit tests (86 passing)
│
├── .github/workflows/
│   └── ci.yml                            — npm ci → prisma generate → npm test → npm audit
│
├── public/                              — Served by express.static
│   ├── index.html                        — Main builder app + 13 picker cards
│   ├── login.html                        — Login (click-to-fill chips for the two dummy accounts)
│   ├── profile.html                      — Account shell (green theme, dark/light toggle)
│   ├── plans.html                        — Pricing tiers (Free / Pro / Studio)
│   ├── style.css                         — Global styles + thumbnails + chatbot + preview modal
│   ├── script.js                         — Page-flow logic (step transitions, AI wiring)
│   ├── form-renderer.js                  — Schema → form, mockup, hints, AI button, validation
│   ├── chatbot.js                        — Floating help-bot with local-intent matcher
│   ├── template-preview.js               — Hover/long-press picker preview modal
│   ├── preview-frame.js                  — Step-2 device toggle (Desktop / Tablet / Mobile)
│   └── uploads/                          — User-uploaded logos / images (multer dest)
│
├── templates/
│   ├── schemas/
│   │   ├── _base.json                    — Shared brand / contact / theme sections
│   │   └── template-N.json               — Per-template schemas (1–13)
│   ├── website-template-N.ejs            — Per-template renderers (1–13)
│   ├── preview-test.js                   — Local rendering harness with sample data
│   ├── preview-N.html                    — Generated previews (run preview-test.js to refresh)
│   └── preview-all.html                  — Side-by-side viewer (column / viewport / filter chips)
│
├── generated/                           — Runtime output from /api/generate (gitignored)
│
└── SiteMemory/                           — THIS BRAIN
    ├── README.md                          — Vault index
    ├── 00_BRIEF.md
    ├── 01_CURRENT_STATE.md
    ├── 02_CONVENTIONS.md
    ├── 03_TECH_STACK.md                   — (this file)
    ├── architecture/                      — Feature-area deep dives
    ├── templates/_registry.md             — Master template index
    ├── decisions/ADR.md                   — Architecture decisions
    ├── changelog/CHANGELOG.md             — Append-only history
    └── roadmap/ROADMAP.md                 — Short / medium / long-term plan
```

## Where things connect

- The **picker** in `public/index.html` is a flat grid of 13 `<label class="template-box">` elements with hidden radio inputs. Direct click selects. Hover/long-press opens preview modal.
- The **schema endpoint** is `GET /api/schema/:templateId`. Reads `templates/schemas/template-N.json`, merges `_base` if `extends: "_base"` is set, returns combined JSON.
- The **form** is rendered client-side by `public/form-renderer.js` from the schema response. It fetches the schema on radio change. Each section gets a `<div class="schema-section">` with hint gutters, mockup thumbnail, and (optionally) a ✨ AI button. Required-field validation runs before preview submission (ADR-019).
- The **AI button** posts to `/api/ai-section` with `{ templateId, sectionId, businessName, description, tone }`. Server picks the prompt from `AI_PROMPTS[templateId][sectionId]`, calls Gemini with retries, falls back to Groq if Gemini fails.
- The **chatbot** is rendered by `public/chatbot.js`. User messages first hit `LOCAL_INTENTS` regex matchers; if nothing matches, they're sent to `/api/chat` which calls Groq with a strict scope-locked system prompt + form context.
- The **preview button (step 1 → step 2)** posts to `/api/preview` with the current form data. Server renders the EJS, returns HTML, frontend displays in an iframe inside a device-toggle stage (`preview-frame.js`, see ADR-020).
- The **generate button (step 3)** requires a paymentId from `/api/pay`. Server consumes the payment, renders EJS, zips the HTML + uploaded images, streams as a ZIP.
- The **template preview modal** loads `/template-previews/preview-N.html` in an iframe. That route is a server-side whitelist that only serves pre-generated files (won't leak EJS source).
- The **`/profile` and `/plans` pages** read `localStorage.role` (set on login from the `DUMMY_USERS` response) to decide whether to show admin-only cards. Both pages own their own theme palette and persist the dark/light toggle to `localStorage`.
- The **`/health` endpoint** returns `{ status: "ok" }` and is what the Docker HEALTHCHECK / future orchestrator pings.
- The **SIGTERM handler** in `server.js` drains active requests before exiting so rolling deploys don't drop in-progress generations.

## Not in stack (deliberate choices)

- **No React / Vue / Svelte.** Vanilla JS keeps the app small and the build instant.
- **No CSS framework (no Tailwind / Bootstrap).** Hand-rolled CSS lets each template have its own true visual identity instead of looking like every other Tailwind site.
- **No TypeScript.** JSDoc comments suffice for an intern-scale codebase.
- **No bundler.** ES modules served raw to the browser via `<script>` tags.
- **No queue / worker.** AI calls are inline within the request lifecycle. Will need rethinking at scale.
- **No payment gateway yet.** Stripe / Razorpay integration is on the roadmap; Prisma `Payment` model is ready.

## Related

- [[01_api-routes]] — every Express endpoint documented
- [[04_template-system]] — how schemas become rendered HTML
- [[02_CONVENTIONS]] — coding rules and the six-wired-artifacts contract
- [[ROADMAP]] — what's next for the stack (Auth0 wiring, Prisma wiring, payment gateway, deployment)
- [[ADR#ADR-012|ADR-012]] — Prisma decision
- [[ADR#ADR-013|ADR-013]] — Auth0 decision
- [[ADR#ADR-014|ADR-014]] — Docker decision
- [[ADR#ADR-015|ADR-015]] — Winston decision
