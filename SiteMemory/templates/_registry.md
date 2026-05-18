# Template Registry

Master index of all 13 templates. One row per template — quick scan to know what we have. For implementation details, read the schema (`templates/schemas/template-N.json`) and EJS (`templates/website-template-N.ejs`) directly.

| #  | Display Name              | Aesthetic / Palette                       | Sample brand            | Industry / Use case                                    | Schema-driven? | Compliance |
|----|---                        |---                                         |---                      |---                                                       |---             |---         |
| 1  | **Editorial**              | Newspaper / magazine, serif                | Apex Studio             | Generic creative / publishing                            | Partial *      | —          |
| 2  | **Agency / Noir**          | Black + gold, premium creative studio      | Noir Studio             | Brand / design studios, creative agencies                | ✓              | —          |
| 3  | **Terminal / Dev Studio**  | CRT green + monospace, IDE feel            | Forge Labs              | Engineering studios, dev consultancies                   | ✓              | —          |
| 4  | **Web3 / Protocol**        | Dark + cyan, dashboard hero                | Helix Protocol          | Web3 protocols, on-chain infrastructure                  | ✓              | —          |
| 5  | **Local Service**          | Warm orange + cream                        | Riverbend Plumbing      | Plumbers, electricians, local trades                     | ✓              | —          |
| 6  | **BFSI / Banking**         | Navy + gold, institutional                 | Meridian Capital (Bank) | Banks, NBFC-Ds with deposits, large BFSI                 | ✓              | RBI · DICGC |
| 7  | **Startup / SaaS**         | Cool blue + white, modern fintech feel     | Voltline                | B2B SaaS, AI products, startups                          | ✓              | —          |
| 8  | **Insurance Advisor**      | Calm green                                 | Ananya Sharma & Assoc.  | Independent IRDAI advisors, brokers, agents              | ✓              | IRDAI      |
| 9  | **NBFC / Lender**          | Cream + dark teal + warm orange            | Meridian Capital (NBFC) | Lending NBFCs (personal/business/home/gold loans)        | ✓              | RBI · NBFC-ICC |
| 10 | **Restaurant / Café**      | Cream + burgundy + Fraunces serif          | Trattoria Verde         | Restaurants, cafés, bistros                              | ✓              | —          |
| 11 | **Portfolio / Freelancer** | Pure black/white, big serif                | Aria Mehta              | Solo designers, writers, photographers, freelancers      | ✓              | —          |
| 12 | **InsurTech SaaS**         | Light · Stripe-pattern · dark code panel  | Stratus                 | B2B InsurTech APIs, embedded-insurance platforms         | ✓              | SOC 2 · IRDAI-aligned |
| 13 | **Insurance Market**       | Bright green + gold, consumer aggregator   | Coverwise               | IRDAI-licensed insurance brokers, comparison platforms   | ✓              | IRDAI      |

\* Template-1 (Editorial) still on legacy non-safe-locals pattern. Refactor on roadmap.

## Sample-brand notes

Templates 12 and 13 originally shipped under codenames "Heph" and "Turtlemint". Both have been renamed in sample data and copy to neutral, demo-safe names — **Stratus** and **Coverwise** — to avoid surfacing real third-party brand names in the picker preview. The thumbnail CSS classes (`template-heph-prev` / `template-turtlemint-prev`) still carry the old codenames and are slated for a low-priority rename. → [[ADR#ADR-018|ADR-018]]

## Compliance flag templates

Four templates carry the `complianceReview` block at the top of their schema. The form-renderer surfaces an amber warning banner above the form when these are selected, reminding users that AI-generated regulatory copy must be reviewed before publishing:

- **Template 6** (BFSI / Banking) — RBI registration, DICGC deposit insurance disclosures
- **Template 8** (Insurance Advisor) — IRDAI licence, claim-process descriptions
- **Template 9** (NBFC / Lender) — RBI registration, NBFC category, Fair Practice Code, Grievance Redressal escalation
- **Template 13** (Insurance Market) — IRDAI broker licence, partner insurer disclosures

## Aesthetic differentiation matrix

No two templates share an accent colour. Quick scan:

| Aesthetic axis            | Templates                                                    |
|---                         |---                                                            |
| Dark + neon (1 of)         | Terminal (green), Web3 (cyan)                                 |
| Dark + warm (1 of)         | Agency Noir (gold), BFSI (gold)                              |
| Light + warm               | Local Service (orange), Restaurant (burgundy), NBFC (orange)  |
| Light + cool               | Startup (blue), Insurance (green), Insurance Market (green)   |
| Light + dark code panel    | InsurTech (Stripe-pattern, dark hero panel)                   |
| Pure mono                  | Editorial (newspaper), Portfolio (B&W)                        |

## Catalogue gaps

Currently missing templates that would round out the catalogue (per ROADMAP):

- **Healthcare / Clinic** — services list, doctor profile, appointment CTA, insurance-accepted strip
- **Education / Coaching Institute** — courses, faculty, batch timings, results
- **Real Estate Agency** — listings grid, neighbourhoods, agent profile
- **Fitness / Gym / Yoga** — class schedule, trainer profiles, membership tiers

After 15 total, refactor schemas to support **template families** (`extends: ["_base", "_restaurant"]`) before adding aesthetic variants per topic.

## How to add to this registry

When a new template ships:
1. Add a row to the table above with display name, aesthetic, sample brand, use case, and compliance flag.
2. Update the "Aesthetic differentiation matrix" if it adds a new axis or if its colour collides with an existing one (which shouldn't happen — see [[02_CONVENTIONS]]).
3. Remove the entry from "Catalogue gaps" if applicable.
4. Update the count in [[01_CURRENT_STATE]] and [[00_BRIEF]].
5. Append a new round to [[CHANGELOG]] documenting what shipped.

## Related

- [[02_CONVENTIONS]] — the six-wired-artifacts rule that governs adding templates
- [[04_template-system]] — the schema → EJS pipeline templates flow through
- [[ROADMAP#Pillar 4 — Catalogue expansion (when there's customer demand)|ROADMAP Pillar 4]] — the next batch of templates planned
- [[ADR#ADR-008 — Compliance review banner on regulated templates not on every template|ADR-008]] — origin of the `complianceReview` flag pattern
- [[ADR#ADR-011 — Indian regulatory differentiation as the moat|ADR-011]] — why we lean into regulatory templates
