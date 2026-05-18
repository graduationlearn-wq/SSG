# Architecture Decision Records

Append-only log of non-trivial architectural choices made on this project. Each ADR has: **Context** (what problem), **Decision** (what we chose), **Consequences** (what follows), **Status** (Accepted / Superseded).

When a decision is later changed, write a new ADR that supersedes the old one. Don't edit history.

---

## ADR-001 — Schema-driven templates over hand-rolled HTML
**Date:** 2026-04-15 · **Status:** Accepted

**Context.** Initial templates 1–4 had hardcoded HTML with a few `<%= businessName %>` injection points. Adding a new field to all four meant editing four files. Adding a new template meant authoring everything from scratch.

**Decision.** Every template ships with a schema (`templates/schemas/template-N.json`) describing its sections and fields. EJS reads from `locals` populated by `buildTemplateData()` in server.js. Form-renderer.js renders the form dynamically from the schema endpoint.

**Consequences.**
- Adding a new field is a one-file schema edit (instead of three: schema + EJS + form HTML).
- The "six wired artifacts" rule emerged to govern the necessary lock-step updates.
- We can pre-render preview HTML files for the picker modal because the schema describes everything.

**Implementation:** [[04_template-system]] · [[02_CONVENTIONS#The single most important rule|the six-wired-artifacts rule]]

---

## ADR-002 — Safe-locals EJS pattern
**Date:** 2026-04-16 · **Status:** Accepted

**Context.** Early EJS templates threw `ReferenceError` when fields were undefined. Customers leaving optional fields blank crashed the render.

**Decision.** Every template starts with a top block:
```ejs
<%
  const L = locals || {};
  const esc = (s) => (s == null ? '' : String(s));
  const def = (v, d) => (v && String(v).trim() ? v : d);
  // Per-field defaults: const heroV = def(L.hero, 'fallback');
  // Per-array defaults: const list = (Array.isArray(L.x) && L.x.length) ? L.x : [/*default*/];
%>
```

**Consequences.**
- Templates never throw at render time, even with empty data.
- Each new field needs adding to `strKeys` / `arrKeys` in `buildTemplateData()` to avoid undefined references in older browsers.
- Template-1 was created before this rule and is still on the legacy pattern. Listed on roadmap to refactor.

**Implementation:** [[04_template-system#Step 4 — EJS rendering|EJS rendering]] · [[02_CONVENTIONS#EJS template conventions|EJS conventions]]

---

## ADR-003 — `extends: "_base"` for shared schema sections
**Date:** 2026-04-16 · **Status:** Accepted

**Context.** Brand (logo, founded year), Contact (email, phone, address, hours), and Theme (primary colour, tone) sections appear in every template. Duplicating them across 13 schemas would mean a global change requires 13 edits.

**Decision.** Create `_base.json` with brand + contact + theme. Templates set `"extends": "_base"`. Server-side `composeSchema()` merges base sections into the template's section list (brand prepended, contact + theme appended).

**Consequences.**
- Adding a new global field (e.g. social links) is one edit to `_base.json`.
- Field IDs must be unique across base + template (no collisions).
- Future: when introducing template families, this pattern extends to `extends: ["_base", "_restaurant"]` for shared industry sections.

**Implementation:** [[04_template-system#Step 1 — Schema composition (composeSchema())|composeSchema()]]

---

## ADR-004 — Free-tier APIs only during testing; paid Gemini is the LAST step before launch
**Date:** 2026-04-22 · **Status:** Accepted

**Context.** Manager asked for a "business-scalable" project. Tempting to splurge on paid APIs to hide rate limits, but that burns credit on iteration.

**Decision.** Stay on free tiers (Gemini free + Groq free) throughout development. Add paid Gemini as the absolute final pre-launch step, at the same time as deployment. Save Groq paid as a contingency if Gemini paid still doesn't suffice.

**Consequences.**
- 429s are a fact of life during demos. Mitigated by AI fallback chain (ADR-005) and chatbot intent matching (ADR-007).
- Real cost projection: at current scale, paid Gemini Flash is ~$1–20/month — trivial.
- When paid tier turns on, monitor for 7 days, then make Groq paid the fallback.

**Implementation:** [[ROADMAP#Pillar 1 — Foundations|ROADMAP Pillar 1]] (paid tier is the final foundation step)

---

## ADR-005 — Gemini → Groq fallback chain for the ✨ AI button
**Date:** 2026-04-25 · **Status:** Accepted

**Context.** Free-tier Gemini hits 429/503 during demos. Customers see a broken AI button.

**Decision.** Layered failover in `/api/ai-section`:
1. Gemini 2.5 Flash with 3-retry backoff on 503
2. If Gemini fails, fall through to Groq Llama-3.3-70b via OpenAI-compatible chat API with `response_format: { type: 'json_object' }`
3. If both fail, return a friendly 503 to the form

**Consequences.**
- Demos stop breaking on Gemini hiccups.
- Same prompt must work on both providers (no Gemini-specific tricks).
- Output style may diverge slightly when Groq handles a section — JSON shape is forced but phrasing differs. Acceptable for MVP.
- Robust `extractJSON()` handles markdown fences and stray prose, since Groq sometimes wraps JSON in unnecessary formatting.

**Pending follow-up.** Add a deterministic 4th-layer canned-response fallback so users never see a raw API failure.

**Implementation:** [[02_ai-fallback]] · [[01_api-routes#AI per-section ✨ button|/api/ai-section]]

---

## ADR-006 — Server-locked AI prompts, not client-controlled
**Date:** 2026-04-22 · **Status:** Accepted

**Context.** Wanted ✨ AI button to be useful but not abusable as a free ChatGPT proxy.

**Decision.** Client only sends `{ templateId, sectionId, businessName, description, tone }` to `/api/ai-section`. Server constructs the entire prompt from `AI_PROMPTS[templateId][sectionId](ctx)`. Client never sees or sends the prompt itself.

**Consequences.**
- Cannot be jailbroken into general-purpose AI use.
- Adding a new aiable section requires adding a prompt entry on the server.
- Sections without an entry fall through to `AI_PROMPTS.default[sectionId]` (generic but works).

**Implementation:** [[02_ai-fallback]] · [[03_chatbot]] · [[01_api-routes]]

---

## ADR-007 — Two-layer chatbot: client intent matcher + Groq scope-locked AI
**Date:** 2026-04-25 · **Status:** Accepted

**Context.** Wanted a help chatbot, but worried about (a) credit burn on greetings, (b) jailbreak attempts.

**Decision.**
1. **Client-side regex intent matcher** in `chatbot.js` covers ~9 categories: greetings, thanks, identity, capabilities, how-are-you, pleasantries, compliments, goodbyes, tiny inputs. Match → reply locally with hand-written friendly response. **Zero API call.**
2. **Server-side `/api/chat`** routes substantive questions to Groq Llama-3.3-70b with a strict scope-lock system prompt. Off-topic questions get a canned redirect: *"I can only help with questions about WebSite Builder. For anything else please use a general-purpose assistant like ChatGPT or Gemini."*

**Consequences.**
- ~50% of messages never hit the API (social chitchat).
- Form context (current template, section, business name, description) is included in the system prompt, adding ~30-50 tokens per turn — negligible.
- Determined users can still try jailbreaks but the system prompt + rate-limiter (30 messages / 10 min / IP) makes it costly.

**Implementation:** [[03_chatbot]] · [[01_api-routes#AI chatbot|/api/chat]]

---

## ADR-008 — Compliance review banner on regulated templates (not on every template)
**Date:** 2026-04-24 · **Status:** Accepted

**Context.** AI-generated copy on regulated templates (BFSI, Insurance, NBFC, Insurance Market) is a real liability — wrong RBI scheme name, wrong licence format, etc. Could the customer claim against us?

**Decision.** Add a `complianceReview: { title, body }` block at the top of regulated schemas. Form-renderer surfaces an amber warning banner above the form when present. The banner explicitly says AI copy is a draft and the customer's compliance team must review before publishing.

**Consequences.**
- We have plausible written disclaimer in the UX, beyond just ToS.
- Customers can't claim ignorance.
- Banner doesn't appear on non-regulated templates so it doesn't dilute its meaning.

**Implementation:** [[04_template-system#Compliance review pattern|the complianceReview pattern]] · applied on templates 6, 8, 9, 13 — see [[_registry|Templates registry]]

---

## ADR-009 — Hover (1.5s) / long-press (600ms) preview modal, NOT click-to-preview
**Date:** 2026-04-29 · **Status:** Accepted

**Context.** Tiny picker thumbnails were too abstract — users couldn't tell what they were picking. Two options: (a) click card → opens preview modal, OR (b) add separate Preview button per card.

**Decision.** Hover-to-preview on desktop with 1.5s delay. Long-press on touch with 600ms delay. Direct click on card still selects (fast path). The modal has its own "Use This Template" button for users who want to commit from inside the preview.

**Consequences.**
- Cautious users get rich preview without an extra tap.
- Fast users (already know what they want) aren't slowed by an extra modal step.
- The 1.5s delay prevents preview from popping on accidental hover-passing.
- Auto-close on cursor-leave (after first enter) means it doesn't linger.
- The preview iframes load `/template-previews/preview-N.html` — the pre-generated files. New templates need `node preview-test.js` to be regenerated before they preview.

**Implementation:** [[05_preview-modal]] · [[01_api-routes#Template preview (for the hover modal)|GET /template-previews/preview-:slug.html]]

---

## ADR-010 — Stage-element approach for device-toggle preview centring
**Date:** 2026-05-07 · **Status:** Accepted

**Context.** Earlier preview modal scaled the iframe with `transform: scale()` but the iframe still occupied its full unscaled width in layout, so when the device was Tablet (820px) inside a 1180px wrap, the iframe left-aligned instead of centring.

**Decision.** Wrap the iframe in a `tpv-frame-stage` div. Stage has the actual scaled-down dimensions (so flex centring works), iframe inside renders at natural viewport width with `transform-origin: top left`. Wrap is `display: flex; justify-content: center;`.

**Consequences.**
- Tablet/mobile previews centre properly.
- Stage transitions on `width`/`height` give a smooth animation when toggling devices.
- Stage gets progressively rounded corners per device (6px desktop → 14px tablet → 22px mobile) so it visually feels like the chosen device.

**Implementation:** [[05_preview-modal#The "stage" pattern (centring fix)|the stage pattern]]

---

## ADR-011 — Indian regulatory differentiation as the moat
**Date:** 2026-04-23 · **Status:** Accepted

**Context.** Why would anyone use BeyondSite over Wix or Squarespace? Wix has 800+ templates and a billion-dollar build budget. Competing on aesthetics is a losing game.

**Decision.** Lean hard into India-specific regulatory accuracy. NBFC template includes RBI registration formats, Fair Practice Code, full Grievance Redressal escalation matrix, RBI Sachet portal links — content that requires actual research to write correctly. BFSI and Insurance templates similarly. Insurance Market template includes IRDAI broker licence formats.

**Consequences.**
- Not competitive globally — irrelevant for US/EU customers.
- HIGHLY competitive in India — no global builder ships these correctly.
- Customer acquisition story is "we know your regulator" not "we have nice fonts."
- Eventually: build similar regulatory templates for other markets (US — SEC for fintech, FDA for healthcare; EU — GDPR + MiFID II for fintech).

**Implementation:** templates 6 (BFSI), 8 (Insurance), 9 (NBFC), 13 (Insurance Market) — see [[_registry#Compliance flag templates|the compliance flag templates section]] · ADR-008 codified the banner pattern

---

## ADR-012 — Prisma ORM over raw SQL
**Date:** 2026-05-08 · **Status:** Accepted

**Context.** Persistence layer was an in-memory `Map`. Needed to land a real DB seam before the handoff review. Options: raw SQL with `mysql2`, query builder (Knex), or an ORM (Prisma / TypeORM / Sequelize).

**Decision.** Prisma. The schema-first model (`prisma/schema.prisma`) doubles as living documentation, the migration tooling is the cleanest of the bunch, and `prisma generate` produces a typed client that matches the rest of the schema-driven philosophy of this codebase (ADR-001).

**Consequences.**
- Six models defined day one: `User`, `Website`, `Draft`, `Download`, `Template`, `Payment` plus `Role` / `WebsiteStatus` / `PaymentStatus` enums.
- `src/lib/database.js` wraps a single `PrismaClient` singleton — no connection leaks.
- Schema is shape-only for now (no migration applied) — production routes still read in-memory state until the next sprint wires the models in.
- Adds ~50MB to `node_modules` and a `prisma generate` step to CI.

**Implementation:** `prisma/schema.prisma` · `src/lib/database.js` · `.github/workflows/ci.yml` (runs `prisma generate`)

---

## ADR-013 — Auth0 JWT verification with jwks-rsa key cache
**Date:** 2026-05-09 · **Status:** Accepted

**Context.** Hardcoded login is fine for a demo but not for handoff. Building auth from scratch was on the table but the time budget said "use a managed provider." Clerk vs Auth0 vs Cognito — Auth0 wins on JWT ergonomics and Indian-region availability.

**Decision.** Middleware in `src/lib/auth.js` validates incoming JWTs using `jsonwebtoken` against keys fetched from Auth0's JWKS endpoint via `jwks-rsa`. Keys are cached with rotation so we don't hammer Auth0 on every request. A `DEV_AUTH_BYPASS=true` env flag short-circuits validation in dev so local work doesn't need a real Auth0 tenant.

**Consequences.**
- Tokens validated locally — zero network round-trip per request after the first key fetch.
- `req.user` populated with the decoded JWT claims for downstream handlers.
- The review demo still uses the dummy whitelist (ADR-016) — Auth0 path is wired but inert until env vars are set.
- Rotation cache TTL is 10 minutes (Auth0 default key rotation cadence).

**Implementation:** `src/lib/auth.js` · `.env.example` documents `AUTH0_DOMAIN` / `AUTH0_AUDIENCE` / `DEV_AUTH_BYPASS`

---

## ADR-014 — Multi-stage Docker build with non-root user
**Date:** 2026-05-10 · **Status:** Accepted

**Context.** Handoff needs to be one command. "Clone repo and run `node server.js`" works on Kunal's laptop but not on a reviewer's. Docker fixes this and also forces sane prod posture.

**Decision.** Multi-stage `Dockerfile`: build stage installs deps + runs `prisma generate`; runtime stage copies only the runtime closure and switches to a non-root `nodejs:1001` user. `HEALTHCHECK` hits `/health` every 30s. `docker-compose.yml` adds a MySQL sidecar so the full stack boots with `docker compose up --build`.

**Consequences.**
- Image size: ~180MB (alpine base + node + prisma).
- Non-root user prevents the most common container-escape footguns.
- `/health` endpoint pairs with the HEALTHCHECK and gives orchestrators (Render, Railway, ECS) a wire-up target.
- SIGTERM handler drains active requests before exit so rolling deploys don't drop user-in-progress generations.

**Implementation:** `Dockerfile` · `docker-compose.yml` · `.dockerignore` · `server.js` (SIGTERM handler + `/health` route)

---

## ADR-015 — Winston structured JSON logging
**Date:** 2026-05-11 · **Status:** Accepted

**Context.** `console.log` is fine until a reviewer asks "what happened at 14:32 yesterday." Need structured logs that an aggregator (Datadog, CloudWatch, Loki) can parse.

**Decision.** Winston in `src/lib/logger.js`. JSON output in production (`NODE_ENV=production`), human-readable colourised output in development. Levels: `error` / `warn` / `info` / `debug`. Every request gets a `requestId` correlation ID.

**Consequences.**
- Logs are grep-friendly locally and ingestion-friendly in prod, with one switch.
- Adds ~3MB to deps but no perf cost worth measuring.
- Existing `console.log` calls in `server.js` are gradually being migrated — not all routes use the new logger yet.

**Implementation:** `src/lib/logger.js`

---

## ADR-016 — Strict whitelist for dummy auth credentials
**Date:** 2026-05-13 · **Status:** Accepted

**Context.** Audit of `/api/login` revealed a backdoor: any non-empty email + password combo authenticated successfully as a customer. Pre-handoff this is unacceptable even for a "dummy" auth flow because anyone running the review demo could log in as anything.

**Decision.** Replace the open path with a strict `DUMMY_USERS` whitelist table in `server.js`. Two entries only:
- `admin@beyondsite.com` / `admin123` → `role: "admin"`
- `customer@beyondsite.com` / `customer123` → `role: "customer"`

Anything else rejects with 401.

**Consequences.**
- The dummy auth is now demonstrably scoped to two known accounts — safe to ship to reviewers.
- Login page exposes both via click-to-fill chips so reviewers don't memorise credentials.
- Production path (Auth0, ADR-013) remains the long-term plan; this is the bridge.

**Implementation:** `server.js` (`DUMMY_USERS` constant + `/api/login` handler) · `public/login.html` (click-to-fill chips)

---

## ADR-017 — `/profile` and `/plans` pages with green theme + dark/light toggle
**Date:** 2026-05-14 · **Status:** Accepted

**Context.** Reviewers asked "what does the logged-in surface look like?" Until now there were no real account-shell pages. Also wanted to demonstrate the difference between admin and customer views.

**Decision.** Two new pages — `public/profile.html` (account shell with avatar, plan badge, editable fields, download history) and `public/plans.html` (three pricing tiers: Free / Pro / Studio). Both styled in a green theme distinct from the dark builder UI so the role-switch is visually obvious. Each page carries a dark/light toggle pinned to the top-right; choice persists in `localStorage` via `<html data-theme="light|dark">`. Admin users see an extra "Admin Tools" card on `/profile` and a bypass-to-upgrade flow on `/plans` (no dummy paywall for admins).

**Consequences.**
- Two more demo surfaces — easier to tell the customer story end-to-end.
- Theme system is page-scoped (each page brings its own CSS-variable palette); not yet a global design-system primitive.
- Admin/customer divergence is enforced client-side from `localStorage.role` written at login — fine for the dummy flow, will move server-side when Auth0 takes over.

**Implementation:** `public/profile.html` · `public/plans.html` · `server.js` (routes + role echo on `/api/login`)

---

## ADR-018 — Rename Heph and Turtlemint sample brands to neutral names
**Date:** 2026-05-14 · **Status:** Accepted

**Context.** Two of the InsurTech / Insurance Market templates carried sample-brand names borrowed from real third parties — "Heph" and "Turtlemint". Reviewers noticed the names surfacing in the picker preview and the generated demo sites, which is brand-confusing at best and trademark-risky at worst.

**Decision.** Rename across all sample data, EJS defaults, and preview HTML:
- Template 12 (InsurTech SaaS) → **Stratus**
- Template 13 (Insurance Market) → **Coverwise**

CSS class names (`template-heph-prev` / `template-turtlemint-prev`) are left alone for now to avoid churning the picker stylesheet; they'll get renamed in the next sweep.

**Consequences.**
- Demos no longer surface third-party brand names.
- Search-and-replace touched `templates/preview-test.js`, schema sample blocks, EJS defaults, and the static `preview-N.html` files.
- A reviewer noticing the dangling `template-heph-prev` class won't see it surfaced anywhere user-facing.

**Implementation:** `templates/preview-test.js` (`insurtechSample()`, `insuranceMarketSample()`) · `templates/website-template-12.ejs` · `templates/website-template-13.ejs` · regenerated `templates/preview-12.html` and `preview-13.html`

---

## ADR-019 — Required-field validation with visual + spatial cues
**Date:** 2026-05-14 · **Status:** Accepted

**Context.** Reviewer flow: customer clicks "Preview" without filling Business Name / Tagline / Description → server renders an empty skeleton → looks broken. The form had no client-side enforcement of "you must fill these three."

**Decision.** Three-cue validation pattern, all client-side:
1. **Visual** — red asterisk next to each of the three labels.
2. **Spatial** — clicking Preview without them scrolls smoothly to the first empty field.
3. **Affective** — an inline red banner appears above the form ("Please fill the highlighted fields before previewing") plus a shake animation on the offending input.

Banner auto-dismisses on the next `input` event so users aren't punished while typing.

**Consequences.**
- "Looks broken" preview path is closed.
- Cues are layered so users with reduced motion, low colour-vision, or screen readers still get at least one signal.
- Pattern is generic — adding a fourth required field is one schema flag.

**Implementation:** `public/form-renderer.js` (validation pass) · `public/index.html` (banner markup) · `public/style.css` (shake keyframes, asterisk styling)

---

## ADR-020 — Preview-modal device bar lifted above browser chrome
**Date:** 2026-05-15 · **Status:** Accepted

**Context.** The preview modal's Desktop / Tablet / Mobile toggle buttons originally lived *inside* the simulated browser chrome row. The chrome already has ~52px of vertical real estate (URL bar + traffic-light dots) and the buttons pushed the iframe content down, but the **iframe content's own navbar** (which sits at the top of the previewed website) was getting visually clipped behind the device-toggle buttons.

**Decision.** Lift the device toggle into its own `pf-device-bar` row *above* the browser chrome. The iframe stage is offset by `headerOffset() = deviceBar.height + chrome.height` so the previewed site's own nav renders cleanly below both rows. Stage scaling math (`Math.min(availW / dims.w, availH / dims.h, 1)`) accounts for the reduced vertical space.

**Consequences.**
- Customer's nav is never hidden behind our chrome — the preview is honest.
- Modal is ~36px taller; still fits standard laptop viewports.
- `preview-frame.js` now owns the device bar's DOM injection (previously the chrome did it).

**Implementation:** `public/preview-frame.js` (`init()` injects bar before chrome; `layoutFrame()` uses `headerOffset()`) · supersedes the earlier in-chrome placement from Round F

---

## How to add a new ADR

When making a non-trivial architectural choice:
1. Append to this file with a new heading: `## ADR-NNN — <one-line decision>`
2. Date stamp + status (`Accepted` for new, `Superseded by ADR-XXX` for old).
3. Four sections: **Context** (problem), **Decision** (choice), **Consequences** (effects), and **Implementation** (link to the architecture doc / file that realises it).
4. Don't edit existing ADRs. If a decision changes, add a new ADR that supersedes the old one.

## Related

- [[CHANGELOG]] — every round links to the ADRs created in it
- [[02_CONVENTIONS]] — the coding rules that emerged from ADR-001/002/003
- [[04_template-system]] — implements ADR-001/002/003/008
- [[02_ai-fallback]] — implements ADR-005/006
- [[03_chatbot]] — implements ADR-006/007
- [[05_preview-modal]] — implements ADR-009/010/020
- [[ROADMAP]] — pillar ordering grounded in ADR-004 and ADR-011
- `prisma/schema.prisma` — realises ADR-012
- `src/lib/auth.js` — realises ADR-013 (and ADR-016 for the dummy bridge)
- `Dockerfile` / `docker-compose.yml` — realise ADR-014
- `src/lib/logger.js` — realises ADR-015
- `public/profile.html` / `public/plans.html` — realise ADR-017
