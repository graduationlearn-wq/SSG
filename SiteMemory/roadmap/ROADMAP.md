# Roadmap

What's next, organised by horizon. Updated as priorities shift, but generally the order should be respected — completing earlier items before later ones is what turns the project from "polished demo" into "real product."

## Now (this week)

- **Refresh `01_CURRENT_STATE.md`** at the end of every session. The state decays fast.
- **Refactor `templates/website-template-1.ejs` (Editorial)** to the safe-locals pattern used by templates 2–13. Currently the only template still on legacy.
- **Wire Prisma into the form-save and generate paths.** Schema exists, models exist, client is generated — the runtime still uses in-memory state. One sprint of glue code.
- **Rename `template-heph-prev` / `template-turtlemint-prev` CSS classes** to match the new sample-brand names (`template-stratus-prev` / `template-coverwise-prev`). Cosmetic but tidies the codebase. → [[ADR#ADR-018|ADR-018]]
- **Extract custom-cursor logic** from inline `<script>` in `index.html` to `public/cursor.js`. Pre-requisite for `/profile` and `/plans` to ever adopt the yellow-dot cursor cleanly.

## Pillar 1 — Foundations (status: scaffolded, not yet finished)

The non-negotiable work that makes the product actually usable by anyone other than Kunal. Big chunks landed in Round G; the wiring-in is what's left.

- [x] **Auth seam.** Auth0 JWT middleware with `jwks-rsa` key cache shipped in `src/lib/auth.js` with a `DEV_AUTH_BYPASS` flag for local dev. → [[ADR#ADR-013|ADR-013]] · the dummy whitelist bridge → [[ADR#ADR-016|ADR-016]]
- [ ] **Wire Auth0 to production routes.** Middleware exists but the live demo still defers to the `DUMMY_USERS` whitelist. Flip env vars, point at an Auth0 tenant, replace the dummy `/api/login` callsites. Enable **Google OAuth** in Auth0 dashboard (Authentication → Connections → Social → Google) and add `/auth/google` + callback routes in `server.js`.
- [x] **Persistence schema.** Prisma + MySQL — six models (`User`, `Website`, `Draft`, `Download`, `Template`, `Payment`) + enums shipped in `prisma/schema.prisma`. → [[ADR#ADR-012|ADR-012]]
- [ ] **Wire Prisma to routes.** Schema is shape-only; in-memory state still backs the live demo. Next sprint: thread `prisma.draft.upsert(...)` etc. into the form-save / generate / payment paths.
- [ ] **Real payment.** Replace the dummy `/api/pay` (see [[01_api-routes#Payment (dummy)|current dummy implementation]]). **Razorpay** for India (free integration, INR-native, takes UPI/cards/netbanking). **Stripe** for global. The Prisma `Payment` model is ready; the gateway integration isn't.
- [x] **Containerisation.** Multi-stage Dockerfile + docker-compose for app + MySQL + `/health` endpoint + SIGTERM drain. → [[ADR#ADR-014|ADR-014]]
- [x] **Structured logging.** Winston JSON logger in `src/lib/logger.js`. → [[ADR#ADR-015|ADR-015]]
- [x] **CI.** GitHub Actions: `npm ci` → `prisma generate` → `npm test` → `npm audit` on push.
- [x] **Unit tests.** Jest, 86 passing covering core business logic.
- [ ] **Deployment.** Stop being localhost-only. Deploy to Render (free tier works), Railway, or a small DigitalOcean droplet. Get a `.com` or `.in` domain (₹400/year). Docker image is ready — just needs a target. When manager asks "show me the URL", you have one.

After Auth0-wiring + Prisma-wiring + payment-gateway + deployment, the demo flips from "polished prototype" to "real product."

## Pillar 2 — Customer evidence (next 2–4 weeks after foundations)

You don't need 100 users. You need ONE real customer story.

- [ ] Walk a real customer through the product end-to-end. Options:
  - A friend's parents' restaurant (use Restaurant template)
  - A coaching institute near your college (build Education template first — 1 day)
  - A local NBFC contact through your company's network (use NBFC template — your moat)
- [ ] Document the entire experience in a 5-page write-up: what they did, where they got confused, what you'd change, what they'd pay.
- [ ] **This single document is worth more to your manager than any feature you could build.**

## Pillar 3 — Technical polish (after foundations + one real customer)

In rough priority:

- [ ] **SEO baked into output.** Generated HTML should include `<meta name="description">`, OpenGraph tags, schema.org JSON-LD (`LocalBusiness` for restaurants, `FinancialService` for NBFCs, `MedicalBusiness` for healthcare). When customer sites show up on Google with rich previews, you've added enormous value. ~4 hours.
- [ ] **Deterministic 4th-layer fallback in `/api/ai-section`.** Hardcoded sensible defaults per section so users never see a raw AI failure. ~2 hours. → see [[02_ai-fallback#Pending follow-up (ROADMAP)|context]]
- [ ] **Per-template usage logging.** See which templates customers actually pick — drives later prioritisation.
- [ ] **Custom domain support.** Let customers connect their own domain. Probably 1–2 days with Cloudflare or Vercel handling DNS.
- [ ] **Privacy-friendly analytics on generated sites.** Auto-inject Plausible or Umami snippet. Differentiator over Wix.

## Pillar 4 — Catalogue expansion (when there's customer demand)

Build the next batch of templates only when validated by Pillar 2 customer interest. In rough demand order:

- [ ] **Healthcare / Clinic** — services list, doctor profile, appointment booking CTA, insurance-accepted strip. Universal demand.
- [ ] **Education / Coaching Institute** — courses, faculty, batch timings, results. Huge in India.
- [ ] **Real Estate Agency** — listings grid, neighbourhoods served, agent profile. Universal.
- [ ] **Fitness / Gym / Yoga** — class schedule, trainer profiles, membership tiers. Growing category.

After 4 more (15 total), refactor schemas to support **template families** (`extends: ["_base", "_restaurant"]` for shared industry sections + `AI_PROMPTS['_restaurant']`). Required before adding aesthetic variants per topic. → see [[04_template-system#Future template families|template families plan]]

After family scaffolding is in:

- [ ] 2-3 aesthetic variants for high-traffic categories (e.g. Restaurant Modern Minimal / Warm Rustic / Fine Dining)

## Pillar 5 — Scale plays (months from now)

When the product has real users and real revenue:

- [ ] **Category filter in the picker.** Currently a flat grid of 13 cards. Will get crowded at 18+. Add filter chips: Food / Health / Finance / Tech / Service / Creative.
- [ ] **Multi-language support** for India (Hindi, Marathi, Tamil) — niche but matches the regulatory-Indian positioning.
- [ ] **Dynamic sites** (instead of static). Basic CMS for editing content post-download without re-running the generator. Significant scope expansion.
- [ ] **Marketplace** — let third-party designers contribute templates and earn revenue share.
- [ ] **Workspace / team accounts** — agencies managing multiple client websites.
- [ ] **Templates for non-Indian regulatory markets** — US (SEC for fintech, FDA for healthcare), EU (GDPR + MiFID II for fintech).

## Pillar 6 — Don't-do (deliberate non-goals)

Things that look like good ideas but won't move the business needle:

- ❌ **Self-host an LLM on your server.** Cost math doesn't work until you're at 100k+ generations/day. See [[ADR#ADR-004 — Free-tier APIs only during testing; paid Gemini is the LAST step before launch|ADR-004]] reasoning.
- ❌ **Drag-and-drop editor.** That's Wix's product. Compete on regulatory accuracy and AI fill, not on editor surface area.
- ❌ **More than 20 templates** before refactoring template families. Mediocre 30-template catalogue is worse than excellent 15-template catalogue.
- ❌ **Dark/light mode for the builder UI.** Polish item, not a foundation. (`/profile` and `/plans` shipped a per-page toggle in Round H — that's where it stops; the builder shell stays dark.) → [[ADR#ADR-017|ADR-017]]
- ❌ **Mobile app.** Browser is fine. Building a mobile app for a website builder is overcommitment.
- ❌ **Translating the builder UI itself to other languages.** Useful only after you have multi-language templates and Indian regional adoption.

## How to update this roadmap

- Tick items off as completed (move them to [[CHANGELOG]]).
- If priority shifts (e.g. a customer asks for X), move items between pillars.
- New ideas → add to the appropriate pillar with a clear rationale.
- Pillar order should generally be respected. Exception: if a pillar-5 idea unblocks pillar-1 (rare), do it.

## Related

- [[01_CURRENT_STATE]] — what's done that this roadmap builds on
- [[CHANGELOG]] — what we've already shipped
- [[ADR|Decisions]] — the design rationale behind the foundations being chosen first
