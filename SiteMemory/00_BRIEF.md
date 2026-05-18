# BeyondSite — Project Brief

**One-line:** A no-code generator that builds professional business websites in 13 industries, with India-specific regulatory templates as the commercial moat. Pick template → fill schema-driven form (with AI ✨ fill assist) → preview → pay $9 → download a ZIP of self-contained HTML/CSS/JS.

## What it does

The user picks one of 13 templates, fills a schema-driven form (every field has hints + an AI button), previews the rendered website (with hover-preview before commitment, plus a built-in chatbot for help), pays a one-time fee, and downloads a self-contained ZIP they can host anywhere — Vercel, Netlify, even a USB stick.

## Who it's for

Two distinct customer cohorts:

1. **Indian regulated SMBs** — small NBFCs, insurance brokers, BFSI firms, restaurants, freelancers. The differentiation: the regulated templates (BFSI, Insurance, NBFC, Insurance Market) include real Indian regulatory disclosures — RBI registration formats, IRDAI licence numbers, Fair Practice Code, full Grievance Redressal escalation matrix, RBI Sachet portal links, IRDAI broker/agent disclosures. No global builder ships these correctly.

2. **Global / dev-savvy SMBs** — design studios, agencies, restaurants, dev studios, solo freelancers, Web3 protocols, B2B InsurTech APIs, SaaS startups. The differentiation here is style breadth and AI-assisted filling — 11 visually distinct templates each tuned for one industry's content shape.

## What it isn't

- **Not Wix / Squarespace.** No drag-drop editor, no in-browser editing of the rendered site. Output is a static ZIP, not a hosted SaaS site.
- **Not a CMS.** The generator is the entire UX. After download, the customer's site is plain HTML — they edit it as files or come back to regenerate.
- **Not a marketplace.** Intern-built, single-developer codebase. Every line shipped by one person.

## Status (as of 2026-05-15)

- 13 templates fully shipped and rendering clean (`node preview-test.js` reports 13/13 ✓)
- Schema-driven form rendering with side-gutter hints + section mockup thumbnails + required-field validation
- Per-section ✨ AI button with **Gemini → Groq** fallback chain
- Scope-locked help chatbot with **client-side intent matching** to save Groq credits on greetings/social
- Hover (1.5s desktop) / long-press (600ms touch) **template preview modal** with live device toggle (Desktop / Tablet / Mobile). Device bar lifted above the simulated browser chrome so the previewed site's nav stays visible.
- Compliance-review banner appears on regulated templates (BFSI, Insurance, NBFC, Insurance Market)
- **Account shell shipped** — `/profile` (avatar, plan badge, editable fields, download history) and `/plans` (Free / Pro / Studio tiers), both green-themed with a dark/light toggle persisted to localStorage
- **Two dummy accounts** via strict whitelist — `admin@beyondsite.com` / `admin123` and `customer@beyondsite.com` / `customer123`. Login page exposes click-to-fill chips for both. The old "any email works" backdoor is closed.
- **BeyondSure parent-company footer** on every main page (corporate office, legal nav, disclaimer band)
- **Production scaffolding landed** — Dockerised (multi-stage, non-root, HEALTHCHECK), Prisma schema with six models, Auth0 JWT middleware with jwks-rsa key cache, Winston structured logging, Jest tests (86 passing), GitHub Actions CI
- README rewritten for handoff / reviewers

## Status (what's NOT done)

- Auth0 middleware is wired but the live demo still uses the dummy whitelist — flip env vars to switch over
- Prisma schema is shape-only; runtime state is still in-memory until the wiring sprint
- No real payment gateway (Stripe / Razorpay) — Prisma `Payment` model is ready
- No deployment — localhost / docker-compose only
- No real customer story yet
- Template 1 (Editorial) still on the legacy non-safe-locals pattern
- Custom cursor logic still inline in `index.html` (not extracted to `public/cursor.js`)

## Built by

Solo, by Kunal — intern at BeyondSure / Shrigoda TechLabs Pvt Ltd, Mumbai. Brief from manager: "build something business-scalable." Currently in active development on free-tier APIs; prepared for tech-team handoff.

## Key business decisions made

- **Free-tier APIs only during testing.** Paid Gemini is the FINAL pre-launch step. → [[ADR#ADR-004 — Free-tier APIs only during testing; paid Gemini is the LAST step before launch|ADR-004]]
- **Quality over quantity.** 13 well-designed templates beats 100 mediocre ones.
- **Indian regulatory differentiation is the moat.** Don't compete with Wix on global aesthetics — compete on RBI / IRDAI accuracy. → [[ADR#ADR-011 — Indian regulatory differentiation as the moat|ADR-011]]
- **Chatbot is scope-locked + intent-matched.** Won't burn credits on social chitchat or off-topic questions. → [[ADR#ADR-007 — Two-layer chatbot client intent matcher + Groq scope-locked AI|ADR-007]] · [[03_chatbot]]

## Where to next

For the current state of every feature, see [[01_CURRENT_STATE]]. For what we're building next, see [[ROADMAP]]. For the catalog of all 13 templates, see [[_registry|Templates registry]]. For the rules of the codebase, see [[02_CONVENTIONS]].
