# BeyondSite

> **A no-code generator for professional business websites.** Pick a template → fill a form (with AI help) → preview → pay $9 → download a self-contained ZIP. Built by [BeyondSure](https://www.beyondsure.in/) (Shrigoda TechLabs Pvt Ltd) as an intern handoff. The website-output is plain HTML/CSS/JS the customer hosts anywhere.

**Status:** Prototype handoff · 13 production-quality templates · Auth0 / MySQL / payment-gateway seams ready for the tech team to wire · Docker + Jest + GitHub Actions all set up · Prisma migration + seed scripts committed · Full architectural docs in [`SiteMemory/`](./SiteMemory/README.md).

**Deploying this?** Follow [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the step-by-step. The guide below is for reviewers running the demo locally.

---

## Quick start — running locally in under 2 minutes

```bash
git clone <repo>
cd StaticWebsiteGenerator
cp .env.example .env          # then add GEMINI_API_KEY (Groq optional)
npm install
npx prisma generate            # generates Prisma client (DB not required to boot)
node server.js
```

Open **http://localhost:3000** → you'll land on the build page. Click **Sign In** in the nav and pick one of the demo accounts below.

> **No database needed** to test the UI. The app boots without MySQL and falls back to dummy data. Drafts and payments live in memory (lost on restart).

---

## Demo accounts — both seeded, click to fill on the login page

| Role         | Email                          | Password       | What they see                                                                       |
|---           |---                             |---             |---                                                                                  |
| **Admin**    | `admin@beyondsite.com`         | `admin123`     | Can skip form validation · "View Plans" button enabled · Bypasses subscription gate |
| **Customer** | `customer@beyondsite.com`      | `customer123`  | Must fill required fields · Subscription page locked behind "Coming Soon" overlay   |

These are hard-coded in `server.js` for the demo. **All other email/password combos are rejected** — there's no open backdoor.

---

## What to test (the actual reviewer's checklist)

### Customer flow (sign in as customer)

1. **Try clicking "Preview Website" without filling anything** — you should be smooth-scrolled to the first empty field, three red asterisks appear next to the required labels, the fields shake and ring red, and an inline banner explains what's missing.
2. **Fill Business Name, Tagline, Description** (≥20 chars) → hover any template card for ~1.5 seconds → a premium modal previews the template with Desktop / Tablet / Mobile toggles.
3. **Pick a template → click ✨ AI on any section** → form fields auto-populate from Gemini (or Groq if Gemini's quota is hit).
4. **Click Preview Website** → see your site rendered in an iframe, with device toggles above the preview chrome.
5. **Click Pay** → dummy $9 charge → **Download ZIP** → unzip → open `index.html` in a browser. That's the deliverable.
6. **Visit `/profile`** → real-feeling profile page with the 6 sample templates you "own", $126 total paid, recent-activity timeline. **The "View Plans →" button is hidden.**
7. **Visit `/plans` directly in the URL bar** → blocked by a Coming-Soon overlay. Only "Back to Profile" button is available.
8. **Try the chatbot** (gold bubble bottom-right) → say *"hi"* (handled locally, zero API cost) → ask *"what's the NBFC template for?"* (goes to Groq with scope-locked prompt) → ask *"write me a python script"* → it should politely redirect you to a general assistant.

### Admin flow (sign in as admin)

1. Same flow as customer, **except**: form validation is bypassed (admins can preview with empty fields and sample defaults appear instead).
2. `/profile` shows a gold **"Admin · Bypass Enabled"** badge + the **"View Plans →"** button.
3. `/plans` opens with a Coming-Soon overlay, but admin sees a **"Preview Plans (Admin)"** button on it — click → overlay dismisses → all three pricing tiers visible (Free Trial · Pro · Enterprise) with an amber "Admin preview" banner at the top.

### Theme test (any account)

On `/profile` or `/plans`, click the moon/sun icon in the top-right → entire page flips between **light** and **dark** themes. Choice persists across pages and refreshes (`localStorage.beyondsite_theme`).

### Edge cases worth a glance

- **Gemini 429s during heavy demo?** Auto-falls back to Groq. Watch `logger.info` / `warn` output in the terminal — you'll see `[ai-section] template-X/hero ✓ Groq (fallback)`.
- **Logout from profile** → clears localStorage, redirects to `/login`.
- **Refresh the build page mid-fill** → form state is lost (no persistence yet — that's a known stub).

---

## How the thing actually works

```
User picks template + fills form
        │
        ▼
form-renderer.js reads templates/schemas/template-N.json from GET /api/schema/:id
        │
        ▼
✨ button on a section → POST /api/ai-section
   ├── Layer 1: Gemini 2.5 Flash (with 3-retry on 503)
   └── Layer 2: Groq Llama-3.3-70b fallback (if Gemini fails)
        │
        ▼
Preview button → POST /api/preview with form data
   └── server-side ejsLib.renderFile() returns HTML
        │
        ▼
Pay button → POST /api/pay (dummy, in-memory)
        │
        ▼
Download button → POST /api/generate with paymentId
   └── archiver zips rendered index.html + uploaded assets → streams as .zip
```

**The schema-driven core.** Every template is three coordinated files: a JSON schema (`templates/schemas/template-N.json`) describing the form sections and fields, an EJS file (`templates/website-template-N.ejs`) rendering the actual output, and an `AI_PROMPTS` entry in `server.js` for the ✨ button. Adding a new template = adding these three files plus sample data in `templates/preview-test.js` and a picker card in `public/index.html`. Convention is enforced by [`SiteMemory/02_CONVENTIONS.md`](./SiteMemory/02_CONVENTIONS.md).

**The chatbot is two-layer** for cost efficiency: `public/chatbot.js` matches social messages (greetings, thanks, identity, etc.) against regexes and replies locally with zero API cost. Only substantive questions hit Groq via `/api/chat` with a strict scope-lock system prompt.

**The preview modal** (hover any picker card for 1.5s) loads `templates/preview-N.html` files into an iframe and scales them to Desktop (16:9) / Tablet (3:4) / Mobile (9:19) via CSS `transform`.

---

## Deployment — what the tech team needs

> **For a step-by-step walkthrough**, read [`DEPLOYMENT.md`](./DEPLOYMENT.md). This section is a quick summary; that doc is the full guide.

The project ships with everything needed for a clean container deploy:

```bash
# Build the image
docker build -t beyondsite .

# Run with the included docker-compose (boots MySQL too)
docker-compose up -d

# Or stand-alone, pointing at managed MySQL (AWS RDS, etc.)
docker run -d -p 3000:3000 \
  -e DATABASE_URL=mysql://user:pass@host:3306/beyondsite \
  -e GEMINI_API_KEY=... \
  -e GROQ_API_KEY=... \
  -e AUTH0_DOMAIN=your-tenant.auth0.com \
  -e AUTH0_AUDIENCE=https://api.beyondsite.com \
  beyondsite
```

**Health-check endpoint:** `GET /health` returns 200 with DB-connection status. Already wired into the Dockerfile's `HEALTHCHECK` directive. Container runs as non-root user `nodejs:1001`.

**CI/CD already configured:** `.github/workflows/ci.yml` runs install + `prisma generate` + `npm test` + `npm audit` on every PR. Branch-protection rules to enable in GitHub Settings:

- Require PR reviews before merging (1–2 reviewers)
- Require status checks to pass — add `ci` as required
- No direct pushes to `main`

**Logging:** Winston with JSON output in production (`NODE_ENV=production`), colorized human-readable in development. Centralized — no local file logging. Pipes straight to whatever log aggregator the team prefers (Datadog / ELK / CloudWatch).

**Database migration:** `npm run db:migrate:deploy` applies the committed migration in `prisma/migrations/20260515000000_init/`. Tables created: `users`, `websites`, `drafts`, `payments`, `downloads`, `templates` with proper FKs and enums (`Role`, `WebsiteStatus`, `PaymentStatus`). Then `npm run db:seed` populates the 13 templates and upserts the bootstrap admin defined by `AUTH0_BOOTSTRAP_ADMIN_EMAIL`. Idempotent — safe to re-run.

---

## Environment variables

Copy `.env.example` → `.env` and fill in. All variables are documented in the example file with inline comments. Summary:

| Variable                | Required?     | Purpose                                                                    |
|---                      |---             |---                                                                          |
| `GEMINI_API_KEY`        | **Required**   | Primary AI provider. Free tier works for testing.                          |
| `GROQ_API_KEY`          | Recommended    | Fallback AI when Gemini 503s / 429s. Also powers the chatbot.              |
| `DATABASE_URL`          | Prod required  | MySQL connection string. App boots without it for UI-only testing.         |
| `AUTH0_DOMAIN`          | Prod required  | Activates Auth0 JWT verification. **Unset = dev-bypass mode (all admin).** |
| `AUTH0_AUDIENCE`        | With Auth0     | Token audience for `jwt.verify()`.                                         |
| `AUTH0_CLIENT_ID`       | With Auth0     | For the Auth0 SDK client init.                                              |
| `AUTH0_CLIENT_SECRET`   | With Auth0     | Server-side secret.                                                         |
| `AUTH0_BOOTSTRAP_ADMIN_EMAIL` | Prod recommended | Email upserted as ADMIN by `npm run db:seed` so somebody can sign in as admin on first deploy. |
| `PAYMENT_PROVIDER`      | Optional       | `dummy` (default) / `razorpay` / `stripe`. Activates the matching scaffold in `src/lib/payments.js`. |
| `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` | With Razorpay | Credentials + webhook signing key from Razorpay dashboard.       |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | With Stripe | Credentials + webhook secret from Stripe dashboard.            |
| `UPLOAD_STORAGE`        | Optional       | `local` (default, disk) or `s3` (requires AWS_* vars).                     |
| `AWS_REGION`, `AWS_*`   | If S3          | S3 bucket region + credentials.                                            |
| `LOG_LEVEL`             | Optional       | `debug` / `info` / `warn` / `error`. Default `info`.                       |
| `NODE_ENV`              | Optional       | `production` enables JSON-formatted logs. Default `development`.           |
| `PORT`                  | Optional       | Default `3000`.                                                             |

---

## Tech stack

| Layer       | Choice                                  | Why                                                            |
|---          |---                                      |---                                                              |
| Runtime     | Node.js 18+ · Express 5                 | Familiar, low-ceremony, async-first                            |
| Templates   | EJS (server-rendered)                   | Output is static HTML — no SPA needed                          |
| Database    | MySQL via Prisma ORM                    | Tech team's pick. Prisma gives type-safe queries + migrations  |
| Auth        | Auth0 (JWT + JWKS)                      | Tech team's pick. Industry-standard, free tier covers years    |
| AI          | Gemini 2.5 Flash → Groq Llama-3.3-70b   | Cheap primary + always-on fallback                             |
| Logging     | Winston (JSON)                          | Pipes cleanly into any aggregator                              |
| Tests       | Jest                                    | Tech team's pick. 39 tests passing                              |
| CI          | GitHub Actions                          | Lockfile install, `prisma generate`, test, `npm audit`         |
| Container   | Docker multi-stage, non-root user       | Production-ready out of the box                                |

---

## Project structure

```
StaticWebsiteGenerator/
├── server.js                          Express app · all routes · 577 lines
├── Dockerfile                          Multi-stage, non-root, healthcheck
├── docker-compose.yml                  App + MySQL for local dev
├── .env.example                        Documented env-var template
├── prisma/
│   ├── schema.prisma                   Models: User, Website, Draft, Payment, Download
│   └── schema.sql                       Generated SQL (reference)
├── src/lib/                            Isolated integration seams — tech team swaps these
│   ├── auth.js                          Auth0 JWT verification + RBAC middleware
│   ├── database.js                      Prisma client + connect / disconnect
│   ├── storage.js                       Local-disk uploads (S3 swappable via env)
│   ├── logger.js                        Winston JSON logger
│   ├── payments.js                      Dummy payments — replace with Razorpay/Stripe
│   ├── config.js                        Centralised env-var loading
│   └── utils.js                         Pure helpers
├── public/
│   ├── index.html                       Main build page (custom cursor lives here)
│   ├── profile.html                     User profile (dark/light theme)
│   ├── plans.html                       Subscription plans (admin-gated)
│   ├── login.html                       Demo-credentials login
│   ├── register.html
│   ├── style.css                        Global styles
│   ├── form-renderer.js                 Schema → form
│   ├── chatbot.js                       Floating help bot (two-layer)
│   ├── template-preview.js              Hover-to-preview modal
│   └── preview-frame.js                 Step-2 iframe + device toggles
├── templates/
│   ├── schemas/
│   │   ├── _base.json                   Shared brand / contact / theme
│   │   └── template-N.json              13 template schemas
│   ├── website-template-N.ejs           13 template renderers
│   ├── preview-test.js                  Renders all templates with sample data
│   └── preview-N.html                   Generated previews (regenerate with above)
├── __tests__/                          Jest unit tests
├── SiteMemory/                         Full architectural docs vault (Obsidian-friendly)
└── .github/workflows/ci.yml             Lint + test + audit
```

---

## Known limitations — what the tech team needs to finish

The prototype intentionally leaves clean integration seams where production-only concerns live. Everything below is **scaffolded with dev fallbacks** so the app runs without them:

| Stub                  | Where                              | What to do                                                                 |
|---                    |---                                 |---                                                                          |
| Auth                  | `src/lib/auth.js` + `server.js::/api/login` | Set `AUTH0_DOMAIN` + `AUTH0_AUDIENCE` → middleware activates automatically. Then follow the HANDOFF block above `/api/login` to swap the `DUMMY_USERS` route for a real Auth0-callback handler. Dev bypass returns admin role. |
| Payments              | `src/lib/payments.js` + `server.js::/api/pay` | Razorpay AND Stripe scaffolds are committed (commented). Set `PAYMENT_PROVIDER=razorpay`, fill `RAZORPAY_*` env vars, uncomment the block, `npm i razorpay`, add a webhook route. Full recipe in [`DEPLOYMENT.md`](./DEPLOYMENT.md#5-swap-the-dummy-payment-for-razorpay-or-stripe). |
| User persistence      | `server.js::/api/login`             | `getOrCreateUser()` in `src/lib/auth.js` already upserts users via Prisma — call it from the new Auth0 handler, then remove `DUMMY_USERS`. |
| Uploads               | `src/lib/storage.js`                | Set `UPLOAD_STORAGE=s3` + AWS_* vars → switches to S3. Local-disk is default. |
| 4th-layer AI fallback | `/api/ai-section`                   | If both Gemini and Groq fail, returns 503. Could add canned defaults. ~2hr. |
| Template-1 (Editorial)| `templates/website-template-1.ejs`  | Only template not on the safe-locals pattern. Renders fine but flagged for refactor. |
| Custom cursor         | Inline `<script>` in `index.html`   | Should be extracted to `public/cursor.js` before adding new pages.         |

Every stub has a `// HANDOFF:` or `// TODO:` comment in code pointing at the replacement.

---

## Testing

```bash
npm test               # Run Jest with coverage
npm run test:watch     # Watch mode
npm run lint           # ESLint
npm run audit          # npm audit --audit-level=high
```

39 tests pass. Coverage is concentrated on the integration-seam modules (`utils.js`, `payments.js` at 100%). Server routes are intentionally not unit-tested — they're better covered by integration tests once the tech team wires Auth0 and the DB.

**For testing as a reviewer with no Node experience:** just run `node server.js` after `npm install` and open the browser. You don't need to run any test suite — the manual flows in [What to Test](#what-to-test-the-actual-reviewers-checklist) cover everything customer-facing.

---

## Where to dig deeper

[`SiteMemory/`](./SiteMemory/) is the project's full architectural brain — written as an Obsidian-friendly vault with cross-linked Markdown files. **Read in this order:**

1. [`SiteMemory/README.md`](./SiteMemory/README.md) — vault index
2. [`SiteMemory/00_BRIEF.md`](./SiteMemory/00_BRIEF.md) — what BeyondSite is and isn't
3. [`SiteMemory/01_CURRENT_STATE.md`](./SiteMemory/01_CURRENT_STATE.md) — what works / what's broken / next steps
4. [`SiteMemory/02_CONVENTIONS.md`](./SiteMemory/02_CONVENTIONS.md) — the "six wired artifacts" rule for adding templates
5. [`SiteMemory/architecture/`](./SiteMemory/architecture/) — deep dives on AI fallback, chatbot, template system, preview modal, API routes
6. [`SiteMemory/decisions/ADR.md`](./SiteMemory/decisions/ADR.md) — 20 architectural decisions with rationale
7. [`SiteMemory/changelog/CHANGELOG.md`](./SiteMemory/changelog/CHANGELOG.md) — every shipped change, round-by-round
8. [`SiteMemory/roadmap/ROADMAP.md`](./SiteMemory/roadmap/ROADMAP.md) — the post-handoff backlog

This vault is the single source of truth for the *why* behind everything. Code answers *what*, the vault answers *why*.

---

## Troubleshooting

| Symptom                                                      | Fix                                                                                                 |
|---                                                           |---                                                                                                  |
| Server won't boot                                            | `GEMINI_API_KEY` is required even locally. Check `.env` exists and has it.                          |
| `Database not configured` warning at startup                 | Expected — the app falls back to in-memory mode if `DATABASE_URL` isn't set. Safe for UI testing.   |
| AI button returns 503 immediately                            | Gemini quota hit AND Groq key not set. Add `GROQ_API_KEY` to `.env`, restart.                       |
| `/preview` iframe blank                                      | Open browser console → check `/api/preview` response. Usually means a schema field broke EJS render. |
| ZIP download "Payment required"                              | Click Pay button first, or sign in as admin to bypass.                                              |
| `npm test` fails on Windows                                  | The `NODE_ENV=test` prefix breaks cmd.exe. Run `npx jest --coverage` instead.                       |
| Preview cards out of date after editing a template            | Regenerate previews: `cd templates && node preview-test.js`. (Sample brands for template-12 / 13 are now **Stratus** and **Coverwise** — older preview HTML may still show the old codenames.) |
| Logged-in but `/profile` redirects to `/login`               | LocalStorage cleared. Sign in again — the redirect-on-empty is intentional.                         |

---

## Contributing & handoff

This project will hand off to the BeyondSure tech team for production wiring. Conventions to keep when extending:

- **Six wired artifacts rule** for new templates (see [`02_CONVENTIONS.md`](./SiteMemory/02_CONVENTIONS.md))
- **Append to** `SiteMemory/changelog/CHANGELOG.md` after every meaningful session — never edit past rounds
- **Add an ADR** to `SiteMemory/decisions/ADR.md` for non-trivial architectural changes
- **Run `node templates/preview-test.js`** before committing template changes — all 13 must render clean

For questions about specific decisions, the ADR file has the *why*. For specific code, check the relevant `architecture/0N_*.md` doc.

---

**Built by an intern at [BeyondSure](https://www.beyondsure.in/) · Shrigoda TechLabs Pvt Ltd · Mumbai, India**
