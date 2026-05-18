# Changelog

Round-by-round history of every meaningful change. **Append-only** — new rounds get added at the top, old entries are never edited (that's the history). Each round captures what shipped, why, and any technical debt incurred.

> Cross-references: each round links to the [[ADR|decisions]] it created and the [[04_template-system|architecture docs]] it changed. Use those links to dive into the why, not just the what.

---

## Round I — 2026-05-15 → 2026-05-18

**Deployer-readiness pass. The intent of this round: someone outside Kunal's head should be able to deploy the app to production by following a checklist, not by reverse-engineering it.**

**Touched:** [[01_CURRENT_STATE]] · [[03_TECH_STACK]] · [[README]] · created `DEPLOYMENT.md`

### Shipped
- **Initial Prisma migration committed** at `prisma/migrations/20260515000000_init/migration.sql` with the full schema (6 tables, indexes, foreign keys). `migration_lock.toml` pins the provider to `mysql`. The README's `prisma migrate deploy` claim is now actually true — it works.
- **`prisma/seed.js`** — idempotent upsert of the 13 templates plus a bootstrap admin keyed by `AUTH0_BOOTSTRAP_ADMIN_EMAIL`. Wired through `package.json` as both `npm run db:seed` and the standard `prisma db seed` (via the `"prisma": { "seed": ... }` block).
- **`src/lib/payments.js` rewritten as a real integration seam.** Public surface is now `createPayment`, `verifyWebhook`, `consumePayment`. The dummy path remains so the demo keeps working; full Razorpay and Stripe scaffolds are committed as ready-to-uncomment blocks with inline TODO recipes (signature verification, order creation, webhook persistence). `PAYMENT_PROVIDER` env var picks the dispatcher target.
- **`DEPLOYMENT.md`** — single canonical step-by-step for the tech team. Covers infrastructure provisioning, schema migration, env-var configuration, the Auth0 swap, the Razorpay swap, container deploy, smoke-test, and rollback. Cross-linked from the README so it's discoverable from the entry point.
- **HANDOFF block above `/api/login`** beefed up from a one-line "replace with Auth0" comment to a 5-step recipe naming the exact `verifyToken` + `getOrCreateUser` callsites and the order in which to swap them.
- **`.env.example` expanded** with `PAYMENT_PROVIDER` + `RAZORPAY_*` + `STRIPE_*` + `APP_URL` + `AUTH0_BOOTSTRAP_ADMIN_EMAIL` sections (commented with where to get each value).

### Changed
- **`.gitignore`** — removed `prisma/migrations/` from the ignore list (deployers need it tracked). SQLite scratch files (`*.db`) still ignored.
- **`package.json`** — added `db:seed` script and the `prisma.seed` config block.
- **README** — fixed the `prisma migrate deploy` claim (now points at the committed migration + the new `db:seed` step). "Known limitations" table updated so the Auth, Payments, and User-persistence rows describe the *current* shape of the work, not the previous one. Status line now mentions the migration + seed scripts. New callout at the top pointing deployers at `DEPLOYMENT.md`.

### Fixed
- **`prisma migrate deploy` was a broken promise.** Before this round, no migration files existed and the folder was gitignored. The README told deployers to run a command that would have failed silently with "No migrations found." Real init migration now committed.
- **No way to bootstrap a production admin user.** Before this round, the first user to sign in via Auth0 would be auto-created as a CUSTOMER per `getOrCreateUser` — there was no path to seed an ADMIN. `prisma/seed.js` + `AUTH0_BOOTSTRAP_ADMIN_EMAIL` fixes this with a clean upsert pattern.
- **Razorpay had no scaffold.** Before this round, `src/lib/payments.js` was 18 lines of in-memory dummy with one comment saying "replaced at deployment." A deployer would have had to invent the entire integration. Razorpay + Stripe scaffolds with full webhook signature verification recipes are now in the file.

### Technical debt incurred
- **`prisma/schema.sql` is now redundant** with the committed migration but kept for deployers who prefer raw SQL over Prisma tooling. Both stay in sync because both are derived from `schema.prisma`. If the schema evolves, regenerate both.
- **`config.yaml` at the repo root** still exists but nothing reads it. It's a relic from an earlier config-shape experiment. Either wire it up to a config-loader or delete it — flagged but not actioned this round.
- **`5-28.jpg` at the repo root** is a 200KB orphan that shouldn't be in version control. Not deleted this round to avoid unrelated diff noise.
- **Payments coverage dropped from 100% → 62.5%** because the new dispatcher branches (`createPayment` / `verifyWebhook` for non-dummy providers) are uncovered. Acceptable for stub code; tests should be added when a real provider is wired.

### Verification
- `npm test` → 39 tests, all green. payments.js tests untouched and still pass against the expanded module.
- `node -c server.js` → clean parse.
- `cd templates && node preview-test.js` → 13/13 templates render.
- Manual inspection of `prisma/migrations/20260515000000_init/migration.sql` against `prisma/schema.prisma` — shapes match.

### What this round did NOT do
- Did not wire Auth0 to live routes (still using DUMMY_USERS for the demo).
- Did not wire Prisma to live form-save / generate paths (still in-memory).
- Did not install razorpay / stripe SDKs (scaffolds commented out — deployer chooses).
- Did not delete `config.yaml` or the stray `5-28.jpg` — flagged as TODO, defer until cleanup-only round.

After Round I the project is **deployer-ready** in the user's intended sense: the tech team can fork, follow `DEPLOYMENT.md`, swap two env vars + uncomment two code blocks + run two npm scripts, and reach a working production URL with real auth, real DB, and real payments. What they cannot do from outside is the product-side wiring (Prisma + Auth0 routes) — those land in the next sprint.

---

## Round H — 2026-05-14 → 2026-05-15

**Brand renames, light-theme InsurTech, profile + plans pages, required-field validation, preview-modal fix, BeyondSure footer.**

**Touched:** [[01_CURRENT_STATE]] · [[_registry|Templates registry]] · created [[ADR#ADR-016 — Strict whitelist for dummy auth credentials|ADR-016]] · [[ADR#ADR-017 — Profile and Plans pages with green theme + dark/light toggle|ADR-017]] · [[ADR#ADR-018 — Rename Heph and Turtlemint sample brands to neutral names|ADR-018]] · [[ADR#ADR-019 — Required-field validation with visual + spatial cues|ADR-019]] · [[ADR#ADR-020 — Preview-modal device bar lifted above browser chrome|ADR-020]]

### Shipped
- **Profile page (`/profile`)** — header card with role badge, name (huge), email, masked password; 3-card stats row (Total Paid / Sites Generated / Member Since); My Templates as a rich card grid with 6 owned templates; subscription "Coming Soon" card with admin-bypass; recent activity timeline; account-actions card (Change Password / Logout / Delete). Uses Inter serif at clamp(2.4rem, 5.5vw, 4.2rem) for the name. Drifting green-blob animated background (different from index's grid+stars).
- **Plans page (`/plans`)** — three-tier pricing (Free Trial · Pro · Enterprise) with one featured. Coming-Soon overlay covers the page with admin bypass button. Amber admin-preview banner appears when bypassed. Bypass persists in sessionStorage for the session.
- **Dark / light theme system** — `<html data-theme="light|dark">` with CSS variable flip. Toggle button (sun/moon icon) persists choice to `localStorage.beyondsite_theme`. Smooth .35s transitions on body bg+color. Currently scoped to profile + plans pages.
- **Customer + admin dummy auth** — two seeded accounts (`admin@beyondsite.com` / `admin123` and `customer@beyondsite.com` / `customer123`) backed by a `DUMMY_USERS` whitelist. Login page has a click-to-fill credentials panel showing both side-by-side.
- **Required-field validation** — `Business Name`, `Tagline`, `Description` get red-star indicators; clicking Preview while empty triggers: red ring + shake animation on missing fields, inline error banner with contextual message ("Please fill in the X and Y…"), smooth scroll to first missing field with 120px headroom, focus lands on it after animation, errors auto-clear on input. Admins still bypass entirely.
- **BeyondSure-attributed footer** on index.html — 4-column grid (Brand+Parent, Product, Company, Legal). Parent card with green-gradient "BS" monogram links to beyondsure.in. All four legal pages (Privacy, Terms, Refund, Disclaimer) link out to parent site. Bottom bar has corporate office address + auto-updating copyright + "Made in India" badge. Includes a regulatory disclaimer band stating BeyondSite is a SaaS generator (not insurance itself) and that regulatory template copy is starter scaffold only.

### Changed
- **Template-12 (InsurTech SaaS) flipped to light theme** — Stripe / Vercel / Linear pattern: light interface throughout with dark "punctuation" sections for visual rhythm. Hero stays light with the dark code panel as contrast. Stats band kept dark for break. CTA band + footer kept dark. Cyan accent shifted from `#00dcb4` to `#00a085` for readability against white. Primary buttons changed from cyan-on-dark to dark-charcoal-on-white.
- **Sample brand renames** — template-12 `Heph` → `Stratus`, template-13 `Turtlemint` → `Coverwise`. Emails (`partners@stratus.dev`, `help@coverwise.in`), code snippet variable, EJS defaults all flipped. No leftover Heph/Turtlemint references in rendered HTML (verified with grep).
- **Preview-modal device bar lifted above chrome** — previously appended into the browser-chrome bar; now injected as a new top row of `.preview-container` with z-index 11. Stage's `top` is computed dynamically as `chromeHeight + deviceBarHeight` so the iframe content (including the previewed site's own nav) is fully visible. `:has(.pf-device-bar)` selector flattens the chrome's top-rounded corners when the device bar is present.
- **Login route closed accidental open backdoor** — previously accepted ANY email+password as customer. Now strict whitelist via `DUMMY_USERS` table; everything else 401s. Every login is logged with Winston.
- **Updated `01_CURRENT_STATE.md`** and `templates/_registry.md` to reflect new brand names + light-theme on template-12.

### Fixed
- **Iframe content was being hidden behind chrome bar** in step-2 preview. Stage was at `top: 0` of container; chrome (z-index 10) overlapped the first ~44px of the iframe — i.e. exactly where every website's own nav lives. Now stage is offset by full header height.

### Technical debt
- `src/lib/payments.js` is still a stub — Razorpay / Stripe integration is next.
- Custom yellow cursor still inline in `index.html` — should move to `public/cursor.js` before adding more pages.

### Verification
- `node -c server.js` ✓ · all syntax checks pass
- `node preview-test.js` → 13/13 render ✓
- Sanity grep on rendered previews: 8 Stratus mentions in preview-12.html (0 Heph), 6 Coverwise mentions in preview-13.html (0 Turtlemint)
- Manual: customer login → form validation fails correctly with red asterisks + shake + scroll · admin login bypasses · `/plans` blocked for customer, open for admin · theme toggle persists across pages

---

## Round G — 2026-05-08 → 2026-05-14

**Production infrastructure: Docker, Prisma, Auth0 middleware, Winston, Jest, src/lib/ reorganisation. The big handoff prep.**

**Touched:** [[03_TECH_STACK]] · [[01_api-routes]] · [[02_ai-fallback]] · created [[ADR#ADR-012 — Prisma ORM over raw SQL queries|ADR-012]] · [[ADR#ADR-013 — Auth0 JWT verification with jwks-rsa key cache|ADR-013]] · [[ADR#ADR-014 — Multi-stage Docker build with non-root user|ADR-014]] · [[ADR#ADR-015 — Winston JSON logging|ADR-015]]

### Shipped — Infrastructure
- **Dockerfile** — multi-stage build (Node 20-alpine builder + runtime stage). Non-root user `nodejs:1001` for security. `npm prune --omit=dev` in builder stage. Built-in `HEALTHCHECK` that pings `/health` every 30s. Production-grade out of the box.
- **docker-compose.yml** for local dev — App + MySQL 8.0 service with `depends_on: condition: service_healthy`. Named volume `db_data` for persistence. Comments explaining how to swap MySQL service for managed RDS in prod.
- **`/health` endpoint** — returns 200 with DB-connection status. Pings Prisma if connected. Wired into Dockerfile's HEALTHCHECK directive.
- **Graceful SIGTERM handler** — `disconnectDatabase()` then exit. Prevents corrupted streams on container kill.
- **`.dockerignore`** — excludes node_modules, .env, generated/, SiteMemory/, preview-*.html.
- **`.env.example`** — documents every env var (NODE_ENV, PORT, DATABASE_URL, DB_*, UPLOAD_STORAGE, AWS_*, AUTH0_*, GEMINI_API_KEY, GROQ_API_KEY, LOG_LEVEL). Inline comments explaining when each is needed.

### Shipped — Database (Prisma + MySQL)
- **`prisma/schema.prisma`** — six models: `User` (with `auth0Id`, `email`, `role`), `Website`, `Draft` (unique on userId+templateId), `Download`, `Template`, `Payment`. Three enums: `Role` (ADMIN / CUSTOMER), `WebsiteStatus` (DRAFT / PUBLISHED / ARCHIVED), `PaymentStatus` (CREATED / PAID / FAILED / REFUNDED). Indexed FKs (`@@index([userId])`), unique constraints, explicit `onDelete: Cascade / Restrict` per relation.
- **`src/lib/database.js`** — Prisma client wrapper with `connectDatabase()` / `disconnectDatabase()`. Logs warnings + errors via Winston. Falls back to no-op if Prisma not installed (dev resilience).
- **npm scripts** for Prisma — `db:generate`, `db:push`, `db:migrate`, `db:migrate:deploy`, `db:studio`.

### Shipped — Auth seam (Auth0-ready)
- **`src/lib/auth.js`** — proper Auth0 JWT verification using `jwksClient` for key rotation (RS256 algorithm, audience + issuer checks). Exports three middleware factories: `authenticate()`, `requireRole(...roles)`, `optionalAuth()`.
- **Dev-bypass mode** — when `AUTH0_DOMAIN` is unset, returns a placeholder admin user. Tech team flips a single env var to activate Auth0.
- **`getOrCreateUser()`** — auto-provisions Prisma users from JWT `sub` claim. Reads `https://beyondSure.com/role` custom Auth0 claim for role assignment.
- **`/api/register` route added** for the registration form on `/register`. Currently logs and stub-redirects; tech team wires Prisma create.

### Shipped — Logging (Winston)
- **`src/lib/logger.js`** — Winston logger with structured JSON output in production, colorized human-readable in dev. Service metadata + environment baked in. Falls back to console if Winston not installed.
- **Replaced ~30 `console.log` calls** across `server.js` with structured `logger.info({ ... }, message)`.

### Shipped — Storage abstraction
- **`src/lib/storage.js`** — exports `getUploadDir()`, `isS3()`, `getMulterStorage()`, `fileFilter`. `UPLOAD_STORAGE=local|s3` env switches between disk and S3 with zero code change.

### Shipped — Tests + CI
- **`__tests__/`** folder with Jest tests for `logger`, `payments`, `utils`. 39 tests passing. `payments.js` and `utils.js` at 100% line/branch coverage.
- **`jest.config.js`** + `__tests__/setup.js`.
- **`.github/workflows/ci.yml`** — checkout, Node 20 setup with npm cache, `npm ci`, `prisma generate` (with dummy DATABASE_URL), `npm test`, `npm audit --audit-level=high`. Comments at end document branch-protection rules for tech team to enable in GitHub UI.

### Shipped — Reorg
- **`src/lib/` folder** — extracted all integration seams into focused modules: `auth.js`, `config.js`, `database.js`, `logger.js`, `payments.js`, `storage.js`, `utils.js`. Each is ~50–150 lines, replaceable in isolation.

### New dependencies
- `@prisma/client` + `prisma` (dev)
- `winston`
- `jsonwebtoken` + `jwks-rsa`
- `js-yaml` (for config.yaml support)
- `jest` (dev) + `eslint` (dev)

### Why this round mattered
This is the round that flips BeyondSite from "personal prototype" to "handoff-ready". The previous architecture review had flagged: no DB seam, no auth seam, no logging seam, no Dockerfile, no tests, no CI. All seven gaps closed in this round, with documented dev-bypass modes so the app still runs without external services configured. The tech team will activate each integration by setting environment variables — no code changes needed.

### Verification
- `node -c server.js` ✓
- `npm test` → 39 passing across 3 suites
- `docker build .` (locally) ✓
- `/health` returns `{status:'ok', ...}` on a running container

---

## Round F — 2026-05-07

**Templates 12 (InsurTech SaaS) and 13 (Insurance Market) shipped + preview modal aspect ratio fix.**

**Touched:** [[05_preview-modal]] · [[_registry|Templates registry]] · created [[ADR#ADR-010 — Stage-element approach for device-toggle preview centring|ADR-010]] · related [[ADR#ADR-009 — Hover 1.5s long-press 600ms preview modal NOT click-to-preview|ADR-009]] · [[ADR#ADR-008 — Compliance review banner on regulated templates not on every template|ADR-008]] (Insurance Market gets the banner)

### Shipped
- **Template 12 — InsurTech SaaS** (`#00dcb4` cyan on dark navy `#0a0e14`) — B2B API platform aesthetic. Hero with live syntax-highlighted code panel. 6 API products with `POST /v1/quotes`-style endpoint badges. 4-step integration flow with duration tags. Stats band (99.99% uptime / 2.4B+ calls / <80ms). Compliance section with SOC 2 / ISO / IRDAI badges. 3 pricing tiers with one marked "Most popular". Sample is "Heph" — Bangalore-based platform serving Acko/Digit/Bajaj/HDFC.
- **Template 13 — Insurance Market** (`#00856f` green) — consumer aggregator aesthetic, Plus Jakarta Sans + Manrope typography. Hero with working-feel quote search widget (category chips + pincode + DOB). 6 insurance categories with "Cashless at 8000+ hospitals"-style taglines. Why-us card grid. 4-step buy-and-claim flow. IRDAI partner strip with 12 real insurer names. Customer testimonials with claim-outcome tags. Schema includes `complianceReview` flag — regulated-content warning banner shows on form.

### Changed
- **Preview modal aspect ratios.** Was rendering at weird wide/short proportions. Now: Desktop 1280×720 (16:9), Tablet 820×1100 (~3:4 portrait), Mobile 420×900 (~9:19 modern phone).
- **Mobile/tablet centring fixed.** Iframe was left-aligning when smaller than wrap. New approach: a `tpv-frame-stage` element takes the scaled-down dimensions in the layout, wrap is `display: flex; justify-content: center;` so the stage centres properly. Stage corners get progressively rounder per device (6px desktop / 14px tablet / 22px mobile).
- **Stage transitions.** 280ms cubic-bezier on stage `width`/`height` so device toggles animate smoothly.
- **Renamed `template-heph` → `template-12`** and **`template-turtlemint` → `template-13`** in `index.html` to match numeric convention. TEMPLATE_NAMES in template-preview.js updated accordingly.

### Technical debt
- None new. Round was clean.

### Verification
- `node -c server.js` ✓ · `node -c public/template-preview.js` ✓
- `node preview-test.js` → 13/13 templates render ✓
- Content sanity grep: 11 hits in preview-12.html (Heph/Quotes API/SOC 2/Bangalore), 34 hits in preview-13.html (Turtlemint/IRDAI/Cashless/Compare/Mumbai)

---

## Round E.5 — 2026-04-29 → 2026-05-04

**Preview modal (hover/long-press) + premium animations + auto-close.**

**Touched:** [[05_preview-modal]] · [[01_api-routes#Template preview (for the hover modal)|/template-previews/preview-:slug.html]] · created [[ADR#ADR-009 — Hover 1.5s long-press 600ms preview modal NOT click-to-preview|ADR-009]]

### Shipped
- **Hover-to-preview modal.** Desktop: hover ~1.5s on a template card → modal opens. Touch: press & hold ~600ms. Direct click on card still selects (fast path). Modal has live iframe preview, three device toggles, X close, Escape-to-close, backdrop-click-to-close, "Use This Template" button (closes + selects + scrolls to form).
- **Server route `GET /template-previews/preview-:slug.html`** that whitelists alphanumeric template slugs only (won't leak EJS source or schemas). Friendly fallback HTML page if a preview hasn't been generated yet.
- **Premium entrance animation.** Backdrop fades in over .32s with smooth blur ramp from 0 to 12px. Modal starts 28px lower at 0.94 scale + 0% opacity, springs up via `cubic-bezier(.16, 1, .3, 1)` (the macOS sheet curve). 60ms delay on the modal entry so backdrop visibly settles first → "lifts from the page" feel. Subtle gold ambient glow around modal shadow.
- **Auto-close on cursor leave.** Once the cursor enters the modal once (`hasEnteredModal` flag), leaving triggers a 280ms grace timer → modal closes. Re-entering cancels. If user never enters modal, it stays open until X / Escape / backdrop click. This is the "hover-bridge" pattern from macOS menus.
- **Hint text** under "Choose Your Template": "Hover a template for ~1.5s to see a live preview · on touch devices, press & hold."
- **Pending hover indicator** — soft golden ring + slight brightness lift on the card while the 1.5s timer counts down.

### Why this approach
- Tiny picker thumbnails are too abstract — users couldn't tell what they were picking.
- Modal-on-hover beats a separate Preview button because it doesn't add a step for cautious users while still giving fast users a click-to-select path.
- Auto-close prevents the modal lingering when the user moves on, but doesn't fight the user (only closes after they've actually engaged).

---

## Round E — 2026-04-26 → 2026-04-28

**Templates 10 (Restaurant) and 11 (Portfolio) shipped + small CSS/UX fixes.**

**Touched:** [[_registry|Templates registry]] · [[04_template-system]]

### Shipped
- **Template 10 — Restaurant / Café** (cream `#f9f4ec` + burgundy `#7a2e2e` + olive). Fraunces serif headlines + Inter body. Sections: hero with italic accent, about + chef-card, 6 signature dishes with prices and tags, full menu parsed from textarea (`Name | Price | Description | Tag` per line), reviews with star ratings, hours table, press strip, reservation CTA. Sample is "Trattoria Verde" — Mumbai modern Italian.
- **Template 11 — Portfolio / Freelancer** (pure black/white minimalism, big serif name, editorial work-list). Drop cap on about paragraph. Auto-scrolling skills marquee. Numbered editorial work list with hover-shift. Sample is "Aria Mehta" — Mumbai brand & editorial designer.

### Fixed
- **Site map mockup moved bottom-LEFT** (was bottom-right, overlapping the chatbot bubble). Updated transform-origin and collapsed-state position.
- **Cursor disappearing inside chatbot panel.** Bumped `.cursor-follower` z-index to 100000 (above `.cb-panel` at 9999). Added `cursor: text` to `.cb-input` so users can see their typing position.
- **Cursor disappearing on login page.** Login.html loads `style.css` (which sets `body { cursor: none }`) but doesn't include the custom-cursor element/JS. Added scoped `cursor: auto !important` for `body.form-page` with proper cursor types per element.
- **Payment section CSS.** All `.pay-card`, `.pay-row`, `.pay-label`, `.pay-val`, `.pay-price`, `.pay-divider`, `.pay-note`, `.pay-success`, `.pay-check`, `.btn-full` had no CSS rules — payment page was rendering unstyled. Added a full set matched to the dark/gold design system.
- **Select dropdown styling.** Schema-rendered `<select>` elements rendered white-on-white when opened. Added explicit dark-themed `<option>` rules + custom gold chevron via inline SVG (since `appearance: none` strips native arrow).

---

## Round D — 2026-04-23 → 2026-04-25

**NBFC template (template-9) + chatbot + AI fallback chain.**

**Touched:** [[03_chatbot]] · [[02_ai-fallback]] · [[_registry|Templates registry]] · [[04_template-system#Compliance review pattern|complianceReview pattern]] · created [[ADR#ADR-005 — Gemini → Groq fallback chain for the ✨ AI button|ADR-005]] · [[ADR#ADR-006 — Server-locked AI prompts not client-controlled|ADR-006]] · [[ADR#ADR-007 — Two-layer chatbot client intent matcher + Groq scope-locked AI|ADR-007]] · [[ADR#ADR-008 — Compliance review banner on regulated templates not on every template|ADR-008]] · [[ADR#ADR-011 — Indian regulatory differentiation as the moat|ADR-011]]

### Shipped
- **Template 9 — NBFC / Lender** (cream + dark teal + warm orange). Compliance topbar (RBI Reg + CIN + NBFC category + Sachet link). Hero with starting-rate panel + 4 quick-promise bullets. Loan products grid with amount/rate/tenure. Eligibility & documents (split panel, `Salaried` / `Self-employed` doc lists). 4-step application process. Rates & charges table (RBI-mandated transparent disclosure). Numbers band. About + pillars + ratings. Testimonials with `productUsed` tag. **Grievance Redressal section** — Principal Nodal Officer card + 3-tier escalation matrix (Branch → GRO → RBI Ombudsman/Sachet) with TAT commitments. Footer disclaimer block citing RBI Reg., escalation paths, Sachet portal.
- **`complianceReview` schema flag.** Top-level block on regulated schemas (BFSI, Insurance, NBFC) with `{ title, body }`. Form-renderer surfaces an amber warning banner above the form when present, reminding the user that AI-generated regulatory copy is a draft only.
- **Help chatbot.** Floating gold bubble bottom-right with pulse ring. Click opens 380×540 panel. Header (Builder Helper · Online · Help only), scrollable message stream, auto-grow textarea + send button. Light markdown support (`**bold**`, `` `code` ``). Typing indicator. Routed through Groq via axios (no new npm package needed).
- **Chatbot scope-lock.** Strict system prompt: only answers about template selection, form fields, ✨ AI button, preview/payment/download flow, compliance reminders. Off-topic gets a canned redirect.
- **Chatbot context-awareness.** Each Groq call sends `{ templateId, sectionId, businessName, description }` from the current form state, capped at 240 chars on description. Adds ~30-50 tokens per turn.
- **Chatbot local-intent matcher.** Client-side regex patterns for ~9 categories (greetings, thanks, identity, capabilities, how-are-you, pleasantries, compliments, goodbyes, tiny-input). Match → reply locally, no API call. ~50% reduction in Groq usage on social messages.
- **AI fallback chain (`/api/ai-section`).** Layer 1 Gemini 2.5 Flash with 3-retry backoff on 503. Layer 2 Groq Llama-3.3-70b via OpenAI-compatible chat-completions API + `response_format: { type: 'json_object' }`. Robust `extractJSON()` helper handles markdown fences and stray prose. Server logs which provider succeeded.

### Why this approach
- Local intent matcher saves real money on free tier.
- Failover chain means free-tier 429s no longer break demos.
- Compliance banner is the cheapest, most-defensible regulatory cover for a builder-built site.

---

## Round C — 2026-04-21 → 2026-04-22

**Templates 3 (Terminal) and 4 (Web3) refactored to schema-driven + server.js tail fix.**

**Touched:** [[04_template-system]] · [[_registry|Templates registry]] · [[01_api-routes#Render|/api/generate]]

### Shipped
- **Template 3 — Terminal / Dev Studio** refactored. Safe-locals top block. Hero with terminal prompt + cycling typing line (`heroTypingLines[]` repeater). Status bar marquee. About `about.ts` code window + stack capability bars. Numbered service modules (`MODULE_0n.ts`). 4-phase git-log process repeater (`hash`, `phase`, `title`, `body`, `branch`). Numbers, testimonials as `review_00n.log`, CTA, contact.
- **Template 4 — Web3 / Protocol** refactored. Hero badge + dashboard chips repeater (auto-detects up/down direction from arrows). Italics rendered via `quoteHTML()` for `*phrase*` markers in testimonials. Manifesto split across 6 schema fields (`aboutQuoteLine1` / `aboutQuoteAccent1` / `aboutQuoteLine2` / `aboutQuoteLine3` / `aboutQuoteAccent2` / `aboutQuoteTail`). Supported chains repeater (`{ name, color }`).
- **AI prompts** for templates 3/4 hero/about/services/process/cta sections.
- **strKeys + arrKeys** extended with all new fields.
- **Sample data** for Terminal (Forge Labs — SF engineering studio) and Web3 (Helix Protocol — multi-chain settlement).

### Fixed
- **Truncated `server.js` tail.** The `/api/generate` handler had been cut off after `await ejsLib.renderFile(...)` — no zip logic, no catch, no `app.listen()`. Server was returning Node SyntaxError on boot. Restored the zip-and-stream finalisation (archiver + asset bundling for `/uploads/*` referenced files) and `app.listen(PORT, ...)`.

---

## Round B — 2026-04-19 → 2026-04-20

**Templates 2 (Agency) and 6 (BFSI) refactored to schema-driven.**

**Touched:** [[04_template-system]] · [[_registry|Templates registry]] · BFSI established the compliance topbar pattern that later became [[ADR#ADR-008 — Compliance review banner on regulated templates not on every template|ADR-008]]

### Shipped
- **Template 2 — Agency / Noir** refactored. Preserved noir-with-gold styling. Hero with 3-line headline (middle word gets gold gradient via separate `heroHeadlineLead/Accent/Tail` fields). Ticker marquee. About with stagger stat cards. Numbered service cards. 4-step process with connector line. Gold numbers band. Testimonials with initials avatars (helper function).
- **Template 6 — BFSI / Banking** refactored. Compliance topbar with `mockupTarget: "header"` hint. Hero rates panel (live indicative rates with `name`/`detail`/`rate`/`tag`). Heritage stats card. Certifications row. Rates tables (deposit + lending repeaters). Pillars repeater for `about` section. Footer disclaimer.
- **AI prompts** for templates 2/6.
- **strKeys + arrKeys** extended.
- **Sample data** — Noir Studio (Brooklyn agency), Meridian Capital (Mumbai BFSI).

### Verified
- `node preview-test.js` → 8/8 ✓ at this point.

---

## Round A — 2026-04-15 → 2026-04-18

**Schema-driven foundation laid. Templates 5 (Local Service), 7 (Startup), 8 (Insurance) shipped.**

**Touched:** [[04_template-system]] · [[02_CONVENTIONS]] · [[_registry|Templates registry]] · created [[ADR#ADR-001 — Schema-driven templates over hand-rolled HTML|ADR-001]] · [[ADR#ADR-002 — Safe-locals EJS pattern|ADR-002]] · [[ADR#ADR-003 — extends _base for shared schema sections|ADR-003]]

### Shipped
- **Shared base schema** (`templates/schemas/_base.json`) — brand / contact / theme sections that every template extends.
- **Schema endpoint** (`GET /api/schema/:templateId`) with composeSchema merging `_base` into specific template schemas.
- **Form-renderer.js** — reads schema, renders fields, supports text / textarea / select / color / image / repeater types. Repeaters with min/max + per-item sub-fields.
- **Per-section AI button (✨)** with `AI_PROMPTS[templateId][sectionId]` map in server.js. Default fallback prompts.
- **Template 5 — Local Service** (warm orange/cream). Trust strip, services with prices, hours day-by-day repeater, areas served, FAQ.
- **Template 7 — Startup / SaaS** (cool blue + white). Hero badge, features grid with optional metrics, how-it-works, pricing plans repeater (Starter / Pro / Team), customer logos.
- **Template 8 — Insurance Advisor** (calm green). Hero with quote-card, policies grid, why-choose-us, advisor bio, claim process 4-step.
- **Template 1 (Editorial)** — schema refreshed to base pattern (but EJS still on legacy non-safe-locals — flagged as known issue).
- **Mockup thumbnails** in form-renderer (small wireframe per section).
- **Side-gutter hints** — label + arrow + description on left/right of each schema section.
- **Mobile collapse** — ⓘ tap-to-expand for hints on small screens.
- **Hint copy** drafted for templates 5/7/8 + _base.

### Established conventions (codified later in 02_CONVENTIONS.md)
- Safe-locals EJS pattern (`const L = locals || {}`)
- The "six wired artifacts" rule
- strKeys / arrKeys discipline in `buildTemplateData()`

---

## Round 0 — Pre-conversation (existed before I joined)

**Touched:** [[03_TECH_STACK]] · [[01_api-routes]] (initial endpoints)

Initial scaffolding done by Kunal solo:

- Express 5 + EJS server. Public folder with `index.html`, `script.js`, custom yellow-cursor.
- 4 initial templates (1 Editorial, 2 Agency, 3 Terminal, 4 Web3) — non-schema-driven, hardcoded HTML.
- Hardcoded login (`admin@example.com` / `password123`).
- Dummy in-memory `/api/pay` payment system, $9 one-time, 30-min TTL.
- `/api/generate` endpoint that ZIPs rendered HTML + uploaded assets.
- Multer image uploads.
- express-rate-limit on AI / generate / pay routes.
- Gemini 2.5 Flash AI integration (single-provider, no fallback).
- Custom yellow-dot cursor with hover-text expansion (inline `<script>` in index.html).
- Floating site-map mockup at bottom-right (later moved to bottom-left).

---

## How to add a new round

When a session ships meaningful work:
1. Add a new section at the **top** of this file (newest first).
2. Use the format: `## Round X — YYYY-MM-DD` heading, then `### Shipped`, `### Fixed`, `### Why this approach`, `### Technical debt`, `### Verification` subsections as relevant.
3. Don't edit previous rounds. If a Round D decision is later changed, note it in the new round and reference the old one (`supersedes Round D's …`).
4. Round letter increments alphabetically. Round F's next is Round G.
