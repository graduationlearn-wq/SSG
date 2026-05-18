# Current State — 2026-05-18

**Refresh this file at the end of every meaningful work session.** Don't preserve old state — that's what `changelog/CHANGELOG.md` is for. This file is always "right now."

## Catalogue

**13 templates · all rendering clean** (`node preview-test.js` reports 13/13 ✓):

| #  | Slug                       | Display name           | Aesthetic                                  |
|----|---                         |---                     |---                                         |
| 1  | Editorial                   | Editorial               | newspaper / magazine, serif                |
| 2  | Agency                      | Agency                  | noir + gold, premium creative studio       |
| 3  | Terminal                    | Terminal / Dev Studio   | CRT green monospace, IDE feel              |
| 4  | Web3                        | Web3 / Protocol         | dark + cyan, dashboard hero                |
| 5  | Local                       | Local Service           | warm orange / cream                        |
| 6  | BFSI                        | BFSI / Banking          | navy + gold, institutional                 |
| 7  | Startup                     | Startup / SaaS          | cool blue + white, modern fintech feel     |
| 8  | Insurance                   | Insurance Advisor       | calm green                                 |
| 9  | NBFC                        | NBFC / Lender           | cream + dark teal + warm orange            |
| 10 | Restaurant                  | Restaurant / Café       | cream + burgundy + Fraunces serif          |
| 11 | Portfolio                   | Portfolio / Freelancer  | pure black/white minimalism, big serif     |
| 12 | InsurTech                   | InsurTech SaaS          | **light · Stripe-pattern · dark code panel** |
| 13 | Insurance Market            | Insurance Market        | bright green + gold, consumer aggregator   |

See [[_registry|Templates registry]] for one-line descriptions per template.

## What works

### Core product
- **All 13 templates render clean** end-to-end via `node preview-test.js` with realistic sample data. → [[04_template-system]] · [[_registry|Templates registry]]
- **Schema-driven form** with side-gutter hints (label + arrow + description on left/right of each section), mockup thumbnails per section, ⓘ tap-to-expand on mobile. → [[04_template-system]]
- **Per-section AI button (✨)** with **Gemini → Groq → friendly error** failover chain. → [[02_ai-fallback]] · [[ADR#ADR-005|ADR-005]]
- **Help chatbot** — floating gold bubble bottom-right. Two-layer: client-side intent matcher catches ~9 social categories locally (zero API cost); substantive questions go to Groq via `/api/chat`. → [[03_chatbot]] · [[ADR#ADR-007|ADR-007]]
- **Compliance review banner** appears on regulated templates (BFSI, Insurance, NBFC, Insurance Market). → [[ADR#ADR-008|ADR-008]]
- **Hover-preview modal** — desktop hover ~1.5s or touch long-press ~600ms. Three device toggles (Desktop / Tablet / Mobile) with live iframe scaling. → [[05_preview-modal]] · [[ADR#ADR-009|ADR-009]] · [[ADR#ADR-020|ADR-020]]

### UX shell
- **`/profile` page** — green-themed profile shell with avatar, plan badge, edit-in-place fields, download history, and a dark/light theme toggle persisted to localStorage. Admin sees an extra "Admin Tools" panel. → [[ADR#ADR-017|ADR-017]]
- **`/plans` page** — three pricing tiers (Free / Pro / Studio) styled in the same green theme with the same dark/light toggle. Admin gets a bypass-to-upgrade flow that avoids the dummy paywall. → [[ADR#ADR-017|ADR-017]]
- **BeyondSite ↔ BeyondSure brand footer** — four-column footer on every main page with parent-company card (logo + tagline + link to https://www.beyondsure.in/), product nav, legal nav, Mumbai corporate-office block, plus a disclaimer band. → [[CHANGELOG#Round H|Round H notes]]
- **Required-field validation** — Business Name, Tagline, Description marked with red asterisks. Trying to preview without them triggers an inline red banner + shake animation + smooth scroll to the first empty field. Banner auto-dismisses on input. → [[ADR#ADR-019|ADR-019]]
- **Preview-modal device bar** lifted above the browser-chrome row so the iframe's own nav is no longer hidden behind the toggle buttons. Stage gets offset by `headerOffset()` of bar + chrome. → [[ADR#ADR-020|ADR-020]] · `public/preview-frame.js`

### Auth & accounts (dummy but strict)
- **Two dummy accounts** wired through `/api/login` against a strict whitelist `DUMMY_USERS` table in `server.js`:
  - `admin@beyondsite.com` / `admin123` → `role: "admin"` (sees Admin Tools panel, plan-bypass on /plans)
  - `customer@beyondsite.com` / `customer123` → `role: "customer"` (standard view)
- Login page exposes both via click-to-fill chips so reviewers don't have to remember credentials.
- The previous "any email/password works" backdoor is closed. → [[ADR#ADR-016|ADR-016]]

### Deployer-readiness (shipped Round I)
- **Initial Prisma migration committed** at `prisma/migrations/20260515000000_init/migration.sql` — `npm run db:migrate:deploy` works against any fresh MySQL 8.
- **Seed script** at `prisma/seed.js` — upserts 13 templates + the bootstrap admin keyed by `AUTH0_BOOTSTRAP_ADMIN_EMAIL`. Runs via `npm run db:seed` (also wired as `prisma db seed`).
- **Razorpay + Stripe scaffolds** committed in `src/lib/payments.js` as ready-to-uncomment blocks with full webhook signature recipes. `PAYMENT_PROVIDER` env var picks the dispatcher target.
- **`DEPLOYMENT.md`** — step-by-step deployer guide covering provisioning, migration, env vars, the two manual swaps, container deploy, smoke-test, rollback.
- **HANDOFF block above `/api/login`** expanded to a 5-step Auth0 recipe naming the exact `verifyToken` / `getOrCreateUser` callsites.

### Production-grade scaffolding (shipped Round G)
- **Dockerised** — multi-stage `Dockerfile` runs as non-root `nodejs:1001` user, exposes 3000, has `HEALTHCHECK` against `/health`. `docker-compose.yml` boots app + MySQL. → [[ADR#ADR-014|ADR-014]]
- **Prisma schema** with six models — `User`, `Website`, `Draft`, `Download`, `Template`, `Payment` — plus `Role`, `WebsiteStatus`, and `PaymentStatus` enums. Client is generated via `prisma generate`. → [[ADR#ADR-012|ADR-012]] · `prisma/schema.prisma`
- **Auth0 JWT middleware** in `src/lib/auth.js` using `jsonwebtoken` + `jwks-rsa` with key rotation cache. Dev-bypass mode honours `DEV_AUTH_BYPASS=true` so local work doesn't need a real Auth0 tenant. → [[ADR#ADR-013|ADR-013]]
- **Winston structured logging** in `src/lib/logger.js` — JSON output in prod, human-readable in dev. → [[ADR#ADR-015|ADR-015]]
- **Storage abstraction** in `src/lib/storage.js` (local FS now, S3-ready later).
- **Config + utils + payments helpers** in `src/lib/{config,utils,payments}.js`.
- **Jest unit tests** — 86 passing. Covers template rendering (4 published templates), payments, utils, auth middleware, storage, database, config, health, and logger.
- **GitHub Actions CI** — `.github/workflows/ci.yml` runs `npm ci` → `prisma generate` → `npm test` → `npm audit` on push.
- **`/health` endpoint** for orchestrators; **SIGTERM handler** drains active requests before exit.
- **`.env.example`** documents every required env var. **`.dockerignore`** keeps the image lean.

### Generation & payment
- **Generate endpoint** zips rendered HTML as `index.html` plus referenced `/uploads/*` images into `assets/`. Streams as a downloadable ZIP with a slugified business name.
- **Razorpay payment wired** — `PAYMENT_PROVIDER=razorpay` (test credentials in `.env`). `/api/pay` creates a real Razorpay order (₹4,999); `/api/payments/verify` validates HMAC signature and marks PAID; `/api/generate` gates on PAID status. Admin bypass (`admin_bypass_*`) skips payment entirely — no DB required. Fallback: set `PAYMENT_PROVIDER=dummy` for local dev without credentials.
- **Step-wise registration form** — `/register` now uses a 3-step wizard: Step 1 (Email + Password), Step 2 (Name), Step 3 (Summary + Terms). Same `/api/register` POST on submit.

### Polish
- **Custom yellow-dot cursor** on main app pages (z-index 100000). Native cursor on login.html / profile.html / plans.html.
- **Side-map mockup at bottom-LEFT**, chatbot at bottom-right.
- **Side-by-side preview viewer** at `templates/preview-all.html` with column / viewport / schema-only filter chips.
- **Payment section CSS** fully styled — gold gradient top accent, dashed dividers, big gold price, glowing-check success state.
- **Select dropdowns** explicitly themed for the dark UI with custom gold chevron and dark `<option>` popup.

## What's broken / incomplete

- **Template 1 (Editorial) is still on the legacy non-safe-locals pattern.** It works because `buildTemplateData` injects defaults for the legacy fields, but it's not as defensive as templates 2–13. Refactor is on the roadmap.
- **Razorpay running on test credentials** — real charges won't happen until test keys are swapped for live keys. `RAZORPAY_WEBHOOK_SECRET` is blank until a webhook is configured in the Razorpay dashboard. `npm install razorpay` must be run once after pulling this branch.
- **Auth is dummy** — Auth0 middleware is wired, but production routes still defer to the `DUMMY_USERS` whitelist for the review demo. Flip the env vars + `DEV_AUTH_BYPASS=false` to switch over.
- **No persistent user data in the running app.** Prisma is scaffolded but the live demo still uses in-memory state — drafts and form state are lost on refresh until we wire the Draft + Website models to the routes.
- **Custom cursor logic is still inline in `index.html`.** Not yet extracted to `public/cursor.js`.
- **No deterministic canned-response fallback below AI.** If both Gemini and Groq fail, the form gets a 503 error rather than a sensible default.
- **No deployment.** Localhost / docker-compose only. No public URL.
- **No real customer story yet.** All sample data is fictional.
- **No category filter in the template picker.** Currently a flat grid of 13 cards. Will get crowded at 18+.
- **No template-family inheritance.** Schemas and AI prompts are still duplicated per template.

## Right now / Open questions

- Sample brands have been renamed for neutrality and clearer demos: **template-12 uses "Stratus"** (previously "Heph") and **template-13 uses "Coverwise"** (previously "Turtlemint"). Thumbnail CSS class names (`template-heph-prev` / `template-turtlemint-prev`) still carry the old codenames — visual rename is on the low-priority pile.
- Two Prisma migration files exist but no migration has been applied to a real database — the schema is shape-only until we point at MySQL in earnest.

## Verification commands

Always run before commit:

```bash
# Syntax-check the server
node -c server.js

# Render every template with sample data
cd templates && node preview-test.js
# Should print: "13/13 templates rendered cleanly"

# Unit tests
npm test
# Should print: "Tests: 86 passed, 86 total"

# Container smoke test (optional but recommended pre-handoff)
docker compose up --build
# Then hit http://localhost:3000/health → expect {"status":"ok"}
```

If any template fails to render, fix BEFORE shipping. The preview is what the customer sees.

## Related

- [[CHANGELOG]] — every round we shipped, with details (Round H + G are the most recent)
- [[02_CONVENTIONS]] — the rules to follow when fixing or adding things
- [[ROADMAP]] — what comes after the current state
- [[ADR|Decisions]] — the why behind each architectural choice
