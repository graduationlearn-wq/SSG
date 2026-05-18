# BeyondSite — Project Memory

The brain. Everything we've built, why we built it that way, and what's next.

**Read this first → then 00_BRIEF.md → then whatever's relevant to the task.**

## Layout

```
SiteMemory/
├── 00_BRIEF.md                — Elevator pitch · 1 page
├── 01_CURRENT_STATE.md        — Snapshot of right now (refresh after each session)
├── 02_CONVENTIONS.md          — Coding rules · the "six wired artifacts" rule
├── 03_TECH_STACK.md           — Dependencies + file layout
│
├── architecture/              — Deep dives by feature area
│   ├── 01_api-routes.md
│   ├── 02_ai-fallback.md
│   ├── 03_chatbot.md
│   ├── 04_template-system.md
│   └── 05_preview-modal.md
│
├── templates/_registry.md     — Master index of all 13 templates
├── decisions/ADR.md           — Append-only log of architecture decisions
├── changelog/CHANGELOG.md     — Round-by-round history (Round 0 → Round F)
└── roadmap/ROADMAP.md         — Short / medium / long-term
└── _Context/                  — ARCHIVE: the original three root docs (stale)
```

## How to use this brain

| Want to know…                              | Read…                                             |
|---                                         |---                                                |
| What is this project?                       | [[00_BRIEF]]                                      |
| What works right now / what's broken?       | [[01_CURRENT_STATE]]                              |
| How do I add a new template without breaking things? | [[02_CONVENTIONS]] (the "six wired artifacts" rule) |
| What dependencies / packages are used?      | [[03_TECH_STACK]]                                 |
| How does the AI button decide between Gemini and Groq? | [[02_ai-fallback]]                       |
| How does the chatbot avoid burning credits on greetings? | [[03_chatbot]]                         |
| How does a schema become a rendered website? | [[04_template-system]]                           |
| How does the hover-preview modal work?       | [[05_preview-modal]]                             |
| Every Express endpoint in one place         | [[01_api-routes]]                                 |
| What templates do we have?                   | [[_registry\|Templates registry]]                |
| Why did we pick X over Y?                    | [[ADR\|Decisions]]                                |
| What did we ship in each session?            | [[CHANGELOG]]                                     |
| What's the next 2 weeks / 2 months?          | [[ROADMAP]]                                       |

## Knowledge graph

Every doc in this brain is interlinked via Obsidian wikilinks. Open the **Graph View** (Ctrl/Cmd+G) to see the structure visually. Hub nodes are [[README]] and [[ADR]] (every architecture decision references its implementation file and vice versa).

## Maintenance rules

- **`01_CURRENT_STATE.md` decays the fastest.** Refresh after every meaningful work session.
- **`changelog/CHANGELOG.md` is APPEND-ONLY.** Every session adds a new round at the top. Never edit previous rounds — that's the history.
- **`decisions/ADR.md` is APPEND-ONLY.** Add a new decision when a non-trivial architectural choice is made. Never delete or rewrite past entries — note as superseded if a decision changes.
- **`02_CONVENTIONS.md` and `03_TECH_STACK.md` change rarely.** Only when actual stack or rules change.
- **`templates/_registry.md` updates when a template is added, removed, or renamed.**

## For Claude / Claude Code in fresh sessions

Read these in order: `00_BRIEF.md` → `01_CURRENT_STATE.md` → `02_CONVENTIONS.md` → `templates/_registry.md`. That's enough context for ~90% of asks. Reach into `architecture/` only when working in that specific area. `changelog/` and `decisions/` are reference, not required reading.

The `_Context/` folder is the original three docs from 2026-04-26. Treat as historical / superseded.
