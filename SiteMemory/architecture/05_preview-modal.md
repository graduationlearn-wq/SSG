# Template Preview Modal

The hover/long-press preview that appears when a user investigates a template card. Lives in `public/template-preview.js` + corresponding CSS in `public/style.css`.

## Triggers

| Device   | Trigger                  | Delay  |
|---       |---                       |---     |
| Desktop  | Hover on a `.template-box` | ~1.5s  |
| Touch    | Press & hold              | ~600ms |
| Either   | Direct click on card     | 0 — selects template directly, modal NOT opened (fast path) |

While the desktop hover timer is counting down, the card gets a soft golden ring + slight brightness lift (`tpv-pending` class). Cancels if cursor leaves the card before the timer fires.

For touch, the synthetic click that would normally fire after a long-press is suppressed via `dataset.tpvSuppressClick = '1'` so the user doesn't accidentally select the template after just trying to preview it.

## Modal contents

```
┌─────────────────────────────────────────────────────┐
│  Template Name      [Desktop][Tablet][Mobile]   ×   │  ← header
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐        │
│  │                                         │        │
│  │   tpv-frame-stage  (centred)            │        │
│  │   ┌───────────────────────────────┐     │        │
│  │   │  iframe at natural viewport   │     │        │
│  │   │  scaled with transform        │     │        │
│  │   │                               │     │        │
│  │   │  loads /template-previews/    │     │        │
│  │   │       preview-N.html          │     │        │
│  │   └───────────────────────────────┘     │        │
│  └─────────────────────────────────────────┘        │
├─────────────────────────────────────────────────────┤
│            [Use This Template →]                     │  ← footer
└─────────────────────────────────────────────────────┘
```

## Device dimensions

Defined in `VP_DIMS` constant:

```javascript
const VP_DIMS = {
  desktop: { w: 1280, h:  720 },   // 16:9
  tablet:  { w:  820, h: 1100 },   // ~3:4 portrait
  mobile:  { w:  420, h:  900 }    // ~9:19 modern phone
};
```

These are the **natural viewport widths** the iframe renders at. The site's CSS responds to these widths as if it were a real device that size, then `transform: scale()` shrinks the visual to fit the modal.

## The "stage" pattern (centring fix)

Naive approach: scale the iframe directly. **Problem:** the iframe still occupies its full unscaled width in layout, so when the device is Tablet (820px) inside a 1180px wrap, it left-aligns instead of centring.

Solution: wrap the iframe in a `tpv-frame-stage` div that takes the actual scaled-down dimensions in the layout. Iframe inside renders at natural viewport width with `transform-origin: top left`. Wrap is `display: flex; justify-content: center;` so the stage centres properly.

```javascript
function layoutFrame() {
  const cs = window.getComputedStyle(wrap);
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  const padY = parseFloat(cs.paddingTop)  + parseFloat(cs.paddingBottom);
  const availW = wrap.clientWidth  - padX;
  const availH = wrap.clientHeight - padY;
  
  // Uniform scale — fits both width and height
  const scale = Math.min(availW / dims.w, availH / dims.h, 1);
  
  // Stage: visible scaled-down dimensions (drives flex centring)
  stage.style.width  = (dims.w * scale) + 'px';
  stage.style.height = (dims.h * scale) + 'px';
  
  // Iframe: natural size + scale transform
  frame.style.width  = dims.w + 'px';
  frame.style.height = dims.h + 'px';
  frame.style.transform = `scale(${scale})`;
  frame.style.transformOrigin = 'top left';
  
  // Mark device on stage for CSS styling
  stage.dataset.device = activeDevice;
}
```

Stage corners get progressively rounder per device (6px desktop / 14px tablet / 22px mobile) so it visually feels like the chosen device.

Stage has a 280ms cubic-bezier transition on `width`/`height` so device toggles animate smoothly.

## Animation (premium feel)

Backdrop fades in over .32s with smooth `backdrop-filter: blur(0 → 12px)` ramp.

Modal entrance:
- Initial: `opacity: 0; transform: translateY(28px) scale(.94);`
- Settled: `opacity: 1; transform: translateY(0) scale(1);`
- Easing: `cubic-bezier(.16, 1, .3, 1)` (the macOS sheet curve)
- 60ms delay on modal entry so backdrop visibly settles first → "lifts from the page" feel

Modal exit reverses with shorter timings (.2s) so dismissal feels crisp.

Subtle gold ambient glow around the modal's box-shadow:
```css
box-shadow: 0 40px 100px -24px rgba(0,0,0,.7),
            0 0 0 1px rgba(232,160,48,.08),
            0 0 80px -20px rgba(232,160,48,.18);
```

## Auto-close on cursor-leave

Implements a "hover-bridge" pattern (same as macOS menus):

```javascript
modal.addEventListener('mouseenter', () => {
  hasEnteredModal = true;
  clearTimeout(autoCloseTimer);
});
modal.addEventListener('mouseleave', () => {
  if (!hasEnteredModal || !isOpen || isClosing) return;
  clearTimeout(autoCloseTimer);
  autoCloseTimer = setTimeout(() => closePreview(), AUTOCLOSE_DELAY_MS);  // 280ms
});
```

**Behaviour:**
- Modal opens. `hasEnteredModal = false`.
- User moves cursor into modal. `mouseenter` fires → flag flips to `true`, timer cancelled.
- User moves cursor out of modal. `mouseleave` fires → 280ms grace timer starts.
- Re-enter within grace period → cancelled.
- Otherwise → modal closes after 280ms with the exit animation.

If user never enters the modal at all (e.g. opened via long-press on touch, never tapped in), it stays open until X / Escape / backdrop click.

## Close paths

- X button (top right)
- Escape key
- Click on backdrop (outside modal)
- "Use This Template" button (closes + selects radio + scrolls to form)
- Auto-close on cursor leave (after first enter)

## Iframe content source

The iframe's `src` is `/template-previews/preview-{slug}.html` where slug is `templateId.replace(/^template-/, '')`. The server route in `server.js`:

```javascript
app.get(/^\/template-previews\/preview-([a-z0-9-]+)\.html$/, (req, res) => {
  const slug = String(req.params[0] || '').replace(/[^a-z0-9-]/g, '');
  if (!slug) return res.status(404).send('Not found');
  const file = path.join(__dirname, 'templates', `preview-${slug}.html`);
  if (!fs.existsSync(file)) {
    // Friendly placeholder page styled in the brand palette
    return res.status(404).type('html').send(/* … */);
  }
  res.sendFile(file);
});
```

**Whitelist:** only matches alphanumeric slugs. Won't leak EJS source, schemas, or any other file in `templates/`.

**Refresh:** preview-N.html files are generated by `cd templates && node preview-test.js`. Run after any schema or EJS change.

If a preview file doesn't exist (new template added but not yet regenerated), the route returns a styled placeholder page — gold accent, dark background, explains how to regenerate.

## Template registry (in `template-preview.js`)

```javascript
const TEMPLATE_NAMES = {
  'template-1':  'Editorial',
  'template-2':  'Agency',
  'template-3':  'Terminal / Dev Studio',
  'template-4':  'Web3 / Protocol',
  'template-5':  'Local Service',
  'template-6':  'BFSI / Banking',
  'template-7':  'Startup / SaaS',
  'template-8':  'Insurance Advisor',
  'template-9':  'NBFC / Lender',
  'template-10': 'Restaurant / Café',
  'template-11': 'Portfolio / Freelancer',
  'template-12': 'InsurTech SaaS',
  'template-13': 'Insurance Market'
};
```

When a new template is added, add an entry here. Falls back to a Title-Cased version of the slug if missing.

## "Use This Template" — selection flow

```javascript
function confirmSelection() {
  if (!activeTemplateId) return closePreview();
  const radio = document.querySelector(`input[name="template"][value="${activeTemplateId}"]`);
  if (radio && !radio.checked) {
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  }
  closePreview();
  const formWrap = document.querySelector('.schema-form-wrap') || document.getElementById('schemaForm');
  if (formWrap) {
    setTimeout(() => formWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }), 340);
  }
}
```

1. Find the matching radio input by `value`.
2. Check it programmatically.
3. Dispatch a `change` event so `form-renderer.js` (listening on the radio) picks up the new template and rebuilds the form.
4. Close modal.
5. Smooth-scroll to the form section after the close animation completes (340ms).

## CSS class reference

| Class                  | Purpose                                                            |
|---                      |---                                                                  |
| `.tpv-backdrop`         | Full-screen backdrop with blur                                     |
| `.tpv-backdrop.open`    | Active state (opacity + blur transitions in)                       |
| `.tpv-modal`            | Modal card                                                          |
| `.tpv-header`           | Header with title + toolbar + close                                |
| `.tpv-title`            | Template name in header                                             |
| `.tpv-toolbar`          | Device toggle pills                                                 |
| `.tpv-device`           | Single device toggle button                                        |
| `.tpv-device.active`    | Selected device                                                     |
| `.tpv-close`            | X close button                                                       |
| `.tpv-frame-wrap`       | Outer wrap with flex centring                                       |
| `.tpv-frame-stage`      | Inner stage that takes scaled dimensions (drives centring)          |
| `.tpv-frame`            | The actual iframe, transformed                                      |
| `.tpv-footer`           | Bottom bar with Use This Template button                           |
| `.tpv-confirm`          | The CTA button itself                                                |
| `.template-box.tpv-pending` | Card while hover timer is counting down                       |

## Hint text

Below the "Choose Your Template" label in `index.html`:

```html
<p class="template-hint">
  <kbd>Hover</kbd> a template for ~1.5s to see a live preview · on touch devices, <kbd>press &amp; hold</kbd>
</p>
```

`.template-hint` styled with subtle muted color and `<kbd>` elements styled as tiny pill chips so the trigger is discoverable without being shouty.

## Related

- [[ADR#ADR-009 — Hover 1.5s long-press 600ms preview modal NOT click-to-preview|ADR-009]] — why hover-to-preview vs click-to-preview
- [[ADR#ADR-010 — Stage-element approach for device-toggle preview centring|ADR-010]] — origin of the `tpv-frame-stage` pattern
- [[01_api-routes#Template preview (for the hover modal)|GET /template-previews/preview-:slug.html]] — the iframe source
- [[04_template-system]] — what generates the preview-N.html files (`node preview-test.js`)
- [[_registry|Templates registry]] — every template the modal can show
