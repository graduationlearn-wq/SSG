# Coding Conventions

The rules of the codebase. Following these prevents 90% of breakage. They exist because earlier attempts that ignored them broke production.

> **Origin:** these rules emerged from [[ADR#ADR-001 — Schema-driven templates over hand-rolled HTML|ADR-001]] (schema-driven), [[ADR#ADR-002 — Safe-locals EJS pattern|ADR-002]] (safe-locals), [[ADR#ADR-003 — extends _base for shared schema sections|ADR-003]] (`_base` extends), and [[ADR#ADR-006 — Server-locked AI prompts not client-controlled|ADR-006]] (server-locked AI prompts). The pipeline they govern is documented in [[04_template-system]].

## The single most important rule

**Every new template requires SIX wired artifacts in lock-step. Skip any one and rendering, the picker, the AI button, or the preview test will break.**

1. `templates/schemas/template-N.json` — schema with sections, fields, hints
2. `templates/website-template-N.ejs` — EJS rendering, safe-locals pattern
3. `server.js` — `AI_PROMPTS['template-N']` entry for each `aiable` section + new field names appended to `strKeys` / `arrKeys` in `buildTemplateData()`
4. `templates/preview-test.js` — `templateNameSample()` function, `sampleFor()` dispatch, addition to `TEMPLATES` and `NAMES`, schema-driven filter array, plus the SAME `strKeys` / `arrKeys` additions as in `server.js`
5. `public/index.html` — `<label class="template-box">` block with radio input value `template-N` and a thumbnail markup using `.tp-{name}-*` classes
6. `public/style.css` — corresponding `.template-{name}` and `.tp-{name}-*` rules for the picker thumbnail

When in doubt, copy a recent template (template-12 InsurTech or template-13 Insurance Market) end-to-end as a starting point.

## Schema conventions (JSON)

```jsonc
{
  "id": "template-9",
  "name": "NBFC / Lender",          // human-friendly name shown in UI
  "extends": "_base",                // pulls brand/contact/theme from _base.json
  "complianceReview": {              // optional — only for regulated templates
    "title": "Regulatory content — please have your compliance team review before publishing.",
    "body":  "..."
  },
  "sections": [
    {
      "id": "hero",                  // camelCase, used as anchor + AI_PROMPTS key
      "title": "Hero",               // sentence case, shown as section heading
      "aiable": true,                // optional — adds the ✨ AI button
      "hint": {                      // optional — renders side-gutter hint
        "label": "Short header for the hint",
        "description": "Longer explanation of what goes in this section.",
        "mockupTarget": "header"     // optional — highlights this part in the mockup
      },
      "fields": [
        { "id": "heroEyebrow", "label": "Eyebrow", "type": "text", "max": 80, "aiable": true },
        { "id": "heroSub",     "label": "Sub-headline", "type": "textarea", "rows": 3, "max": 240 },
        {
          "id": "heroBenefits", "type": "repeater", "min": 0, "max": 4, "itemLabel": "Benefit",
          "item": [
            { "id": "icon", "label": "Icon (single emoji)", "type": "text", "max": 4 },
            { "id": "text", "label": "Benefit text", "type": "text", "max": 60 }
          ]
        }
      ]
    }
  ]
}
```

**Field types:** `text`, `textarea`, `select` (with `options: [...]`), `color`, `image`, `repeater`.

**Naming:** field IDs are camelCase. Labels are sentence case. Placeholders use the literal example, not generic "enter text here".

**Hints** should describe *why* the section exists and *what* good copy looks like — not just what the field is for. Read like advice from a designer.

## EJS template conventions

Every template (except legacy template-1) starts with this safe-locals block before `<!DOCTYPE html>`:

```ejs
<%
  const L = locals || {};
  const esc = (s) => (s == null ? '' : String(s));
  const def = (v, d) => (v && String(v).trim() ? v : d);
  const bn      = esc(L.businessName) || 'Default Business Name';
  const tagln   = esc(L.tagline)      || 'Default tagline.';
  const accent  = L.primaryColor      || '#defaultcolor';
  const year    = L.year              || new Date().getFullYear();

  // Per-section defaults — every string read is wrapped in def()
  const heroHeadlineV = def(L.heroHeadline, 'A sensible default headline');

  // Every array read uses this exact pattern with safe fallback samples
  const dishesList = (Array.isArray(L.signatureDishes) && L.signatureDishes.length)
    ? L.signatureDishes
    : [ /* 3–6 sensible defaults */ ];

  // Helpers (only when needed)
  function initialsOf(name) { /* … */ }
  function parseMenuItems(raw) { /* … */ }
%>
```

**Rules:**
- Every field read goes through `esc()` or `def()`. **Never** raw `<%= L.fieldName %>`.
- Every array has a non-empty default fallback so the section never collapses visually.
- Visual style (palette, fonts, layout) is fixed in CSS variables at the top of `<style>`.
- **No external resources** except Google Fonts. No Unsplash, no third-party CDNs.
- **No two templates share the same accent colour.** Pick distinct palettes deliberately.
- Mobile breakpoints at 980px (tablet) and 640px (phone) consistently.

## AI prompt conventions

In `server.js`, the `AI_PROMPTS` object maps `templateId → sectionId → fn(ctx)`:

```javascript
'template-9': { // NBFC / Lender
  hero: ({biz, desc, tone}) =>
    `For RBI-registered NBFC / lender "${biz}" (${tone} tone): "${desc}". Return ONLY JSON: { "heroEyebrow":"<trust phrase, max 10 words>", "heroHeadlineLead":"<2-3 word line 1>", "heroHeadlineEmph":"<1-2 word italic>", "heroSub":"<30-45 word sub>" }`,
  // … one entry per aiable section
}
```

**Prompt rules:**
- Always end with `Return ONLY JSON: { ... }` and an explicit shape.
- Inside the JSON shape, use angle-bracket placeholders that include word/length constraints: `"<8-12 word headline>"`, `"<20-30 word description>"`.
- For repeaters, specify count: `"with 5-6 items"`, `"with EXACTLY 4 items"`.
- Include domain examples in placeholders: `e.g. RBI Registered NBFC since 2012`.
- Keep prompts tight — long prompts cost tokens and the AI ignores them.
- Same prompt must work on **Gemini AND Groq** (since either may handle the request via the failover chain). Don't write Gemini-specific tricks.

Sections marked `aiable: true` in the schema should have a corresponding prompt entry. If absent, the section falls through to `AI_PROMPTS.default[sectionId]`, which is generic but works for hero/about/services/process/cta.

## strKeys / arrKeys discipline

In `server.js::buildTemplateData()` and the matching block in `templates/preview-test.js`, two arrays prevent EJS `ReferenceError`:

```javascript
const strKeys = [ /* every optional string field name across all templates */ ];
const arrKeys = [ /* every repeater field name across all templates */ ];

for (const k of strKeys) if (data[k] === undefined) data[k] = '';
for (const k of arrKeys) if (!Array.isArray(data[k])) data[k] = [];
```

**Rule:** when adding a new field to any schema, append the field name to the appropriate array in **BOTH** files. The two files must stay in sync. Group additions under a comment like `// Round F — InsurTech SaaS (template-12)` for traceability.

## Sample data conventions (preview-test.js)

Each template gets a sample function:

```javascript
function nbfcSample() {
  return {
    ...commonSample,                  // pulls in shared defaults
    businessName: 'Meridian Capital',
    tagline: 'Honest lending. Transparent rates. Fast decisions.',
    _description: '...',              // used for AI prompts
    primaryColor: '#e85d2c',
    foundedYear: '2012',
    // Every schema field gets a realistic value
    heroEyebrow: '...',
    products: [ { ... }, ... ],       // realistic content, not Lorem ipsum
    // ...
  };
}
```

Then dispatched in `sampleFor()`:

```javascript
function sampleFor(templateId) {
  if (templateId === 'template-9') return nbfcSample();
  // …
  return commonSample;
}
```

**Sample-data rules:**
- Use realistic content — real-sounding business names, real prices, real city names. **NOT Lorem ipsum.**
- Indian context preferred for BFSI/Insurance/NBFC (RBI numbers, ₹ prices, Mumbai/Bangalore addresses); other templates can be global.
- Sample data IS the demo. If a customer's manager looks at the preview, the sample should look like a real business website.

## Picker thumbnail conventions

Each template's picker card lives in `public/index.html`:

```html
<label class="template-box">
  <input type="radio" name="template" value="template-9" hidden>
  <div class="template-content">
    <div class="template-preview template-nbfc">
      <!-- abstract markup, not real content. tp-nbfc-* classes -->
      <div class="tp-nbfc-topbar"></div>
      <div class="tp-nbfc-hero">…</div>
      <div class="tp-nbfc-products">…</div>
    </div>
    <div class="template-label">
      <h4>NBFC</h4>
      <p>RBI-regulated Lender</p>
    </div>
    <span class="checkmark">✓</span>
  </div>
</label>
```

Matching CSS in `public/style.css`:

```css
.template-nbfc { background: #fbf7f0; padding: 0; display: flex; flex-direction: column; }
.tp-nbfc-topbar { /* … */ }
.tp-nbfc-hero { /* … */ }
.tp-nbfc-products { /* … */ }
```

**Rules:**
- Thumbnail uses **abstract markup** (coloured rectangles, monogram letters) — not screenshots, not real text.
- Class prefix is `template-{slug}` for parent, `tp-{slug}-*` for children.
- Thumbnail must visually capture the template's identity (e.g. NBFC's compliance topbar, Restaurant's centred italic title, Portfolio's three big editorial rows).

## Naming conventions

| Thing                    | Convention                           | Example                          |
|---                       |---                                   |---                               |
| Template ID              | `template-N` (sequential)            | `template-13`                    |
| Schema file              | `template-N.json`                    | `template-13.json`               |
| EJS file                 | `website-template-N.ejs`             | `website-template-13.ejs`        |
| Sample function          | `{topic}Sample()`                     | `insuranceMarketSample()`        |
| Picker thumbnail class   | `.template-{slug}` + `.tp-{slug}-*`  | `.template-nbfc` `.tp-nbfc-rate` |
| Field IDs                | camelCase                            | `heroHeadlineLead`               |
| CSS classes              | kebab-case                           | `compliance-banner`              |
| Server constants         | UPPER_SNAKE_CASE                     | `APP_NAME`, `PAYMENT_TTL_MS`     |
| Section IDs              | camelCase, semantic                  | `hero`, `services`, `grievance`  |
| Repeater inner field IDs | camelCase, short                     | `name`, `body`, `price`, `tag`   |

## Workflow conventions

Before any commit:

```bash
node -c server.js                      # syntax-check the server
cd templates && node preview-test.js   # render all templates with sample data
```

The preview-test must report **N/N templates rendered cleanly**. Fix any failures before continuing.

For new templates, run a content sanity grep:

```bash
grep -c -E 'YourBrandName|key1|key2' preview-N.html
```

If the count is zero, your sample data isn't surfacing through the template — usually means a missing default in the EJS or a typo in the field name.

## What NOT to do

- **Don't fetch external assets in templates.** No Unsplash, no Pinterest images, no third-party CDNs except Google Fonts. The output is meant to be a self-contained ZIP.
- **Don't add the same accent colour to two templates.** Each template's identity should be visually obvious from the picker thumbnail.
- **Don't use bare `<%= L.fieldName %>` in EJS.** Always go through `esc()` or `def()`.
- **Don't skip the strKeys / arrKeys updates.** First time a customer fills in a new field with empty data, you'll get a render error from undefined.
- **Don't write Gemini-specific prompt tricks.** Same prompt must work on Groq Llama-3.3-70b.
- **Don't burn paid Gemini credits during development.** Free tier or Groq for testing; paid Gemini only after launch.
- **Don't add new authenticated pages without the custom-cursor element + script** (or scope `cursor: auto` for that page in CSS) — otherwise users get an invisible cursor like login.html had until it was patched.
- **Don't commit `node_modules/`, `generated/`, or `preview-*.html`.** Those are runtime outputs.
- **Don't break the [[01_CURRENT_STATE]] ↔ [[CHANGELOG]] distinction.** State decays; changelog is permanent.

## Related

- [[04_template-system]] — the full schema → form → EJS → HTML pipeline these rules govern
- [[_registry|Templates registry]] — what templates currently exist
- [[ADR|Decisions]] — origin stories for these rules
- [[03_TECH_STACK]] — what's in the stack and what's deliberately not
