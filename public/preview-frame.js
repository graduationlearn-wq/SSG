// ─────────────────────────────────────────────────────────────────
// preview-frame.js — Device toggle for step-2 preview iframe
//
//   • Injects Desktop / Tablet / Mobile buttons into the existing
//     browser-chrome header inside .preview-container
//   • Wraps the iframe in a stage div for scaling
//   • Runs only when step2 is visible — does NOT move the container
//   • Uses MutationObserver so it activates when step2 becomes active
// ─────────────────────────────────────────────────────────────────
(function () {
  const VP_DIMS = {
    desktop: { w: 1280, h: 720 },
    tablet:  { w:  820, h: 1100 },
    mobile:  { w:  420, h:  900 }
  };
  const VP_LABELS = { desktop: 'Desktop', tablet: 'Tablet', mobile: 'Mobile' };

  let activeDevice = 'desktop';
  let frameEl, stageEl, wrapEl, buttons, chromeEl, deviceBarEl;
  let initialized = false;

  // Total height of the fixed header rows (device bar + chrome) inside the
  // preview container. The stage is offset by this much so the iframe
  // renders BELOW the header — otherwise the website's own nav gets hidden
  // behind the chrome.
  function headerOffset() {
    const b = deviceBarEl ? deviceBarEl.offsetHeight : 0;
    const c = chromeEl    ? chromeEl.offsetHeight    : 0;
    return b + c;
  }

  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (Array.isArray(kids) ? kids : [kids]).forEach(c => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function setDevice(device) {
    activeDevice = device;
    buttons.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-device') === device);
    });
    layoutFrame();
  }

  function layoutFrame() {
    if (!frameEl || !stageEl) return;
    const dims = VP_DIMS[activeDevice];
    if (!dims) return;

    // Push the stage down past the header rows so the iframe's own nav is
    // never hidden behind the device bar / chrome.
    const offsetTop = headerOffset();
    stageEl.style.top = offsetTop + 'px';

    const availW = wrapEl.clientWidth;
    const availH = wrapEl.clientHeight - offsetTop;
    if (availW <= 0 || availH <= 0) return;

    const scale = Math.min(availW / dims.w, availH / dims.h, 1);

    stageEl.style.width  = (dims.w * scale) + 'px';
    stageEl.style.height = (dims.h * scale) + 'px';
    stageEl.dataset.device = activeDevice;

    frameEl.style.width  = dims.w + 'px';
    frameEl.style.height = dims.h + 'px';
    frameEl.style.transform = `scale(${scale})`;
    frameEl.style.transformOrigin = 'top left';
  }

  function init() {
    if (initialized) return;

    const container = document.querySelector('#step2 .preview-container');
    const chrome    = document.querySelector('#step2 .preview-browser-chrome');
    frameEl = document.getElementById('previewFrame');

    if (!container || !chrome || !frameEl) return;

    initialized = true;

    const stage = document.createElement('div');
    stage.className = 'pf-frame-stage';
    frameEl.parentNode.insertBefore(stage, frameEl);
    stage.appendChild(frameEl);
    stageEl  = stage;
    wrapEl   = container;
    chromeEl = chrome;

    const bar = el('div', { class: 'pf-device-bar' }, [
      el('span', { class: 'pf-device-label' }, 'View'),
      ...['desktop', 'tablet', 'mobile'].map(d =>
        el('button', {
          class: 'tpv-device' + (d === 'desktop' ? ' active' : ''),
          type: 'button',
          'data-device': d,
          onclick: () => setDevice(d)
        }, VP_LABELS[d])
      )
    ]);
    buttons = bar.querySelectorAll('.tpv-device');

    // Insert the device bar ABOVE the chrome as the first row of the
    // preview container. This way:
    //   1. The buttons no longer compete with the iframe's own nav.
    //   2. Combined with the headerOffset() applied to .pf-frame-stage,
    //      the iframe content starts cleanly below both rows.
    container.insertBefore(bar, chrome);
    deviceBarEl = bar;

    layoutFrame();
    window.addEventListener('resize', layoutFrame);
  }

  const step2 = document.getElementById('step2');
  if (step2) {
    const obs = new MutationObserver(() => {
      if (step2.style.display !== 'none') {
        obs.disconnect();
        init();
      }
    });
    obs.observe(step2, { attributes: true, attributeFilter: ['style'] });
  }

  if (step2 && step2.style.display !== 'none') {
    init();
  }
})();