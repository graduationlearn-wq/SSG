# Template System

How a schema becomes a rendered website. The pipeline from `template-N.json` → form → EJS → HTML.

## The four moving parts

```
templates/schemas/_base.json        ┐
templates/schemas/template-N.json   ┘──► composeSchema() ──► /api/schema/:id ─► public/form-renderer.js renders form
                                                                                          │
                                                                                          ▼
                                                                                user fills form
                                                                                          │
                                                                                          ▼
                                                              POST /api/preview { template, data }
                                                                                          │
                                                                                          ▼
                                                              templatePath(id) ──► templates/website-template-N.ejs
                                                                                          │
                                                              buildTemplateData(data) ──► safe defaults
                                                                                          │
                                                                                          ▼
                                                                          ejs.renderFile() ──► HTML response
```

## Step 1 — Schema composition (`composeSchema()`)

Schemas are JSON files. Each template's schema can `extends: "_base"` to inherit shared sections (brand, contact, theme).

```javascript
function composeSchema(template) {
  if (!template) return null;
  if (!template.extends) return template;
  const base = readSchema(template.extends);
  if (!base) return template;
  const baseById = Object.fromEntries((base.sections || []).map(s => [s.id, s]));
  const tplIds = new Set((template.sections || []).map(s => s.id));
  // If template redefines a base section, template wins
  const leading  = ['brand'].filter(id => baseById[id] && !tplIds.has(id)).map(id => baseById[id]);
  const trailing = ['contact','theme'].filter(id => baseById[id] && !tplIds.has(id)).map(id => baseById[id]);
  return { ...template, sections: [...leading, ...(template.sections || []), ...trailing] };
}
```

**Order:** brand → all template sections → contact + theme.

If the template defines its own `brand`/`contact`/`theme` section (very rare), it overrides the base.

## Step 2 — Form rendering (`public/form-renderer.js`)

Reads schema from `/api/schema/:id`. For each section, renders:

- **Section header** with title + optional ⓘ tooltip on mobile
- **Side-gutter hints** (left + right of the section card) showing label + arrow + description
- **Mockup thumbnail** of the section (small wireframe) on the right
- **Field inputs** based on `type`: text / textarea / select / color / image / repeater
- **AI button (✨)** if `aiable: true` on the section

Public API:
```javascript
window.FormRenderer = {
  render(schema, mountEl),               // render fresh
  collect(),                              // get current values as JSON
  setData(obj, {silent}),                 // merge values (re-renders by default)
  replaceData(obj),                       // wipe and set
  mergeForSchema(oldData, newSchema),     // keep only values whose ids exist in new schema
  setContext({templateId, getBusinessName, getDescription, getTone}),
  getActiveSection()                      // for chatbot context
};
```

`getActiveSection()` is tracked via IntersectionObserver — knows which section the user is currently scrolled to.

## Step 3 — Server-side data normalisation (`buildTemplateData()`)

Form payload arrives at `/api/preview` or `/api/generate` as raw JSON. `buildTemplateData()` normalises it:

1. **Top-form meta** — businessName, tagline, _description trimmed.
2. **Brand/theme defaults** — primaryColor (`#c0392b`), tone (`professional`), foundedYear (`''`).
3. **Year** — `new Date().getFullYear()` — used in footers.
4. **Legacy fields** — `about` ← `aboutBody`, `products` ← split CSV — for templates that still read these.
5. **Contact defaults** — email/phone/address/hours coalesce from variant field names.
6. **strKeys → ''** — every optional string field across all templates gets a default empty string (prevents EJS `ReferenceError`).
7. **arrKeys → []** — every repeater field gets a default empty array.

This is what makes the safe-locals EJS pattern work without crashes.

## Step 4 — EJS rendering

Each template's EJS file (`templates/website-template-N.ejs`) starts with the **safe-locals top block**:

```ejs
<%
  const L = locals || {};
  const esc = (s) => (s == null ? '' : String(s));
  const def = (v, d) => (v && String(v).trim() ? v : d);
  const bn = esc(L.businessName) || 'Default';
  const heroV = def(L.hero, 'fallback headline');
  const dishesList = (Array.isArray(L.dishes) && L.dishes.length) ? L.dishes : [/* defaults */];
  function initialsOf(name) { /*…*/ }
%>
```

Then the body renders with `<%= esc(...) %>` for safe output, never raw `<%= L.field %>`.

EJS gives us:
- Conditionals: `<% if (cond) { %>…<% } %>`
- Loops: `<% array.forEach(item => { %>…<% }); %>`
- Includes: not used (each template is self-contained)

## Step 5 — Sample data (`templates/preview-test.js`)

Local development harness. Renders every template with `templateNameSample()` data and writes `templates/preview-N.html` files. Used by:
- Manual visual review (`templates/preview-all.html` side-by-side viewer)
- The hover-preview modal (loads via `/template-previews/preview-N.html` route)

Each new template needs a sample function and a `sampleFor()` dispatch entry.

## The "six wired artifacts" rule (codified)

For every new template, six artifacts must be created/updated in lock-step:

1. **Schema:** `templates/schemas/template-N.json`
2. **EJS:** `templates/website-template-N.ejs`
3. **Server-side:**
   - `AI_PROMPTS['template-N']` entry per aiable section in `server.js`
   - New field names appended to `strKeys` / `arrKeys` in `buildTemplateData()`
4. **Sample data:**
   - `templateNameSample()` function in `preview-test.js`
   - Dispatch in `sampleFor()`
   - Addition to `TEMPLATES` and `NAMES`
   - Schema-driven filter array
   - SAME `strKeys` / `arrKeys` additions as in server.js
5. **Picker card:** `<label class="template-box">` block in `public/index.html`
6. **Thumbnail CSS:** `.template-{slug}` and `.tp-{slug}-*` rules in `public/style.css`

Skipping any one of these breaks rendering, the picker, the AI button, or the preview test.

## Compliance review pattern

Regulated templates (BFSI, Insurance, NBFC, Insurance Market) carry a `complianceReview` block at the top of their schema:

```json
{
  "id": "template-9",
  "name": "NBFC / Lender",
  "extends": "_base",
  "complianceReview": {
    "title": "Regulatory content — please have your compliance team review before publishing.",
    "body": "This template includes RBI registration, NBFC category, Fair Practice Code, and Grievance Redressal disclosures. AI-suggested copy in these sections is a starting draft only — the final wording must match your actual RBI registration, your Principal Nodal Officer's real contact details, and the latest RBI guidelines applicable to your NBFC category. Publishing inaccurate regulatory copy can be a compliance violation."
  },
  "sections": [/* … */]
}
```

`form-renderer.js` checks for this block in `render()` and surfaces an amber warning banner above the form sections via `renderComplianceBanner(cr)`. The banner has icon (⚠), title in heading style, body in paragraph style.

CSS: `.compliance-banner` with amber gradient, gold border, brown text. See `public/style.css`.

## Future: template families

Currently each template's schema is standalone. When we add aesthetic variants per topic (e.g. 3 restaurant styles), we'll refactor:

```json
{
  "id": "template-10a",
  "name": "Restaurant — Modern Minimal",
  "extends": ["_base", "_restaurant"]
}
```

Where `_restaurant.json` contains the menu/hours/reservation sections shared across all restaurant variants. AI prompts similarly: `AI_PROMPTS['_restaurant']` for shared section prompts.

This is on [[ROADMAP#Pillar 4 — Catalogue expansion (when there's customer demand)|ROADMAP Pillar 4]] for after we hit 15 total templates.

## Related

- [[ADR#ADR-001 — Schema-driven templates over hand-rolled HTML|ADR-001]] — why schema-driven
- [[ADR#ADR-002 — Safe-locals EJS pattern|ADR-002]] — why the `const L = locals || {}` pattern
- [[ADR#ADR-003 — extends _base for shared schema sections|ADR-003]] — why `_base.json` exists
- [[ADR#ADR-008 — Compliance review banner on regulated templates not on every template|ADR-008]] — origin of the `complianceReview` block
- [[02_CONVENTIONS]] — the six-wired-artifacts rule and naming
- [[_registry|Templates registry]] — every template that uses this pipeline
- [[01_api-routes#Schema endpoint|GET /api/schema/:templateId]] — the route that serves composed schemas
