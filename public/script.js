// ==========================================================
//  WebSiteBuilder — public/script.js
// ==========================================================

// Check login status from localStorage
function getLoginState() {
  const stored = localStorage.getItem('beyondsite_login');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function isLoggedIn() {
  return getLoginState() !== null;
}

function isAdmin() {
  const state = getLoginState();
  return state && state.isAdmin === true;
}

// Require login - redirect to login if not logged in
function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = '/login';
    return false;
  }
  return true;
}

const isFormPage = document.getElementById('inputForm') !== null;

if (isFormPage) {
  let currentSchema = null;
  let paymentId = null;

  const inputForm      = document.getElementById('inputForm');
  const step1          = document.getElementById('step1');
  const step2          = document.getElementById('step2');
  const step3          = document.getElementById('step3');
  const successStep    = document.getElementById('successStep');
  const previewFrame   = document.getElementById('previewFrame');
  const businessNameEl = document.getElementById('businessName');
  const taglineEl      = document.getElementById('tagline');
  const descriptionEl  = document.getElementById('description');
  const schemaMount    = document.getElementById('schemaForm');

  function updateStepIndicator(step) {
    document.querySelectorAll('.step-indicator').forEach((el, i) => {
      el.classList.toggle('active', i + 1 === step);
    });
  }

  function showNotification(message, type = 'info') {
    const n = document.createElement('div');
    n.className = `notification notification-${type}`;
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => { n.style.opacity = '1'; n.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => { n.style.opacity = '0'; n.style.transform = 'translateY(-20px)'; setTimeout(() => n.remove(), 300); }, 4000);
  }

  function showLoadingOverlay(show) {
    let o = document.getElementById('loadingOverlay');
    if (!o) {
      o = document.createElement('div');
      o.id = 'loadingOverlay'; o.className = 'loading-overlay';
      o.innerHTML = `<div class="loading-spinner"><div class="spinner-ring"></div><p>Processing...</p></div>`;
      document.body.appendChild(o);
    }
    o.style.display = show ? 'flex' : 'none';
  }

  function selectedTemplate() {
    const el = document.querySelector('input[name="template"]:checked');
    return el ? el.value : 'template-1';
  }

  // Build the full payload = top form + schema form
  function collectAll() {
    const data = FormRenderer.collect();
    data.businessName = businessNameEl.value.trim();
    data.tagline      = taglineEl.value.trim();
    data._description = descriptionEl.value.trim();
    return data;
  }

  // ── Schema loader (runs on page load + on template change) ──
  async function loadSchemaForCurrentTemplate() {
    const template = selectedTemplate();
    schemaMount.style.opacity = '.4';
    try {
      const res = await fetch(`/api/schema/${template}`);
      if (!res.ok) {
        schemaMount.innerHTML = `<div class="schema-notice">This template doesn't have a detailed form yet — basic info only.</div>`;
        currentSchema = null;
        return;
      }
      const newSchema = await res.json();
      const prev = FormRenderer.collect();
      const merged = FormRenderer.mergeForSchema(prev, newSchema);
      // preserve top-form meta
      merged.businessName = businessNameEl.value.trim();
      merged.tagline      = taglineEl.value.trim();
      merged._description = descriptionEl.value.trim();
      if (!merged.tone) merged.tone = 'professional';
      if (!merged.primaryColor) merged.primaryColor = '#c0392b';
      if (!merged.foundedYear) merged.foundedYear = String(new Date().getFullYear());

      FormRenderer.replaceData(merged);
      FormRenderer.setContext({
        templateId: template,
        getBusinessName: () => businessNameEl.value.trim(),
        getDescription:  () => descriptionEl.value.trim(),
        getTone:         () => (FormRenderer.collect().tone || 'professional')
      });
      FormRenderer.render(newSchema, schemaMount);
      currentSchema = newSchema;
    } catch (e) {
      console.error(e);
      schemaMount.innerHTML = `<div class="schema-notice error">Could not load form: ${e.message}</div>`;
    } finally {
      schemaMount.style.opacity = '1';
    }
  }

  // Listen for template switches (real-time rebuild)
  document.querySelectorAll('input[name="template"]').forEach(radio => {
    radio.addEventListener('change', loadSchemaForCurrentTemplate);
  });

  // Keep FormRenderer state in sync with top form (silent — no re-render on keystroke)
  [businessNameEl, taglineEl, descriptionEl].forEach(el => {
    el.addEventListener('input', () => {
      FormRenderer.setData({
        businessName: businessNameEl.value.trim(),
        tagline:      taglineEl.value.trim(),
        _description: descriptionEl.value.trim()
      }, { silent: true });
    });
  });

  // Initial load
  loadSchemaForCurrentTemplate();

  // ── Required-field validation helpers ─────────────────────────
  // Three fields that customers MUST fill before preview. Admin bypasses
  // these and gets sample defaults injected instead (see else branch below).
  const REQUIRED_FIELD_IDS = ['businessName', 'tagline', 'description'];

  function clearFieldError(el) {
    if (el && el.classList) el.classList.remove('field-error');
  }
  function clearAllFieldErrors() {
    REQUIRED_FIELD_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('field-error');
    });
    const banner = document.getElementById('formBannerError');
    if (banner) banner.hidden = true;
  }
  function attachClearOnInput() {
    // Once attached, this listener auto-clears the red ring the moment the
    // user starts typing in a previously-invalid field. Idempotent — safe
    // to call multiple times because we tag the input with a data flag.
    REQUIRED_FIELD_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.dataset.clearWired === '1') return;
      el.addEventListener('input', () => clearFieldError(el));
      el.dataset.clearWired = '1';
    });
  }
  attachClearOnInput();

  function showRequiredError(missing) {
    // Mark each missing field with the red ring + shake
    const missingEls = missing.map(id => document.getElementById(id)).filter(Boolean);
    missingEls.forEach(el => {
      el.classList.remove('field-error');     // restart the shake animation
      // force a reflow so re-adding the class triggers the animation again
      void el.offsetWidth;                     // eslint-disable-line no-unused-expressions
      el.classList.add('field-error');
    });

    // Populate + reveal the inline banner
    const banner = document.getElementById('formBannerError');
    const detail = document.getElementById('formBannerDetail');
    if (banner && detail) {
      if (missing.length === 1) {
        const el = document.getElementById(missing[0]);
        detail.textContent = (el && el.dataset.requiredMsg) || 'This field is required.';
      } else {
        const names = missing.map(id => ({
          businessName: 'business name',
          tagline:      'tagline',
          description:  'description'
        }[id] || id));
        // "X, Y, and Z" formatting
        const list = names.length === 2
          ? `${names[0]} and ${names[1]}`
          : `${names.slice(0,-1).join(', ')}, and ${names.slice(-1)}`;
        detail.textContent = `Please fill in the ${list} before previewing.`;
      }
      banner.hidden = false;
    }

    // Smooth-scroll to the FIRST missing field (with some headroom for the nav)
    const first = missingEls[0];
    if (first) {
      const rect = first.getBoundingClientRect();
      const targetY = window.pageYOffset + rect.top - 120; // 120px headroom for sticky nav
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      setTimeout(() => first.focus({ preventScroll: true }), 380);
    }
  }

  // ── Step 1 → Step 2 (Preview) ──
  window.showPreview = async function () {
    // Require login (admin bypasses form requirement)
    if (!requireLogin()) return;

    const data = collectAll();
    // Admin can skip form validation
    if (!isAdmin()) {
      // Figure out which required fields are missing (in DOM order so we
      // scroll to the topmost one).
      const missing = REQUIRED_FIELD_IDS.filter(id => {
        const key = id === 'description' ? '_description' : id;
        return !data[key] || !String(data[key]).trim();
      });
      if (missing.length > 0) {
        return showRequiredError(missing);
      }
      // Specific min-length rule for description
      if (data._description.length < 20) {
        const el = document.getElementById('description');
        if (el) {
          void el.offsetWidth;
          el.classList.add('field-error');
        }
        const banner = document.getElementById('formBannerError');
        const detail = document.getElementById('formBannerDetail');
        if (banner && detail) {
          detail.textContent = 'Description is too short — please add more detail (at least 20 characters). The longer it is, the better the AI suggestions will be.';
          banner.hidden = false;
        }
        if (el) {
          const rect = el.getBoundingClientRect();
          window.scrollTo({ top: window.pageYOffset + rect.top - 120, behavior: 'smooth' });
          setTimeout(() => el.focus({ preventScroll: true }), 380);
        }
        return;
      }
      // All good — clear any leftover errors
      clearAllFieldErrors();
    } else {
      // For admin with empty form, use defaults
      if (!data.businessName) data.businessName = 'Your Business Name';
      if (!data.tagline) data.tagline = 'Your Tagline Here';
      if (!data._description) data._description = 'Professional services tailored to your needs. We help businesses grow with quality solutions.';
    }

    showLoadingOverlay(true);
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selectedTemplate(), data })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Preview failed');
      }
      const html = await res.text();

      previewFrame.srcdoc = html;
      await new Promise(r => setTimeout(r, 300));
      showLoadingOverlay(false);

      step1.style.display = 'none';
      step2.style.display = 'block';
      updateStepIndicator(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      showLoadingOverlay(false);
      showNotification('Preview error: ' + err.message, 'error');
    }
  };

  // ── Back to edit ──
  window.backToBuild = function () {
    step2.style.display = 'none';
    step1.style.display = 'block';
    updateStepIndicator(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.backToPreview = function () {
    step3.style.display = 'none';
    step2.style.display = 'block';
    updateStepIndicator(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Step 2 → Step 3 (Payment) ──
  window.goToPayment = function () {
    step2.style.display = 'none';
    step3.style.display = 'block';
    updateStepIndicator(3);
    // Reset payment state if user came back
    paymentId = null;
    document.getElementById('payUnpaid').style.display = 'block';
    document.getElementById('payPaid').style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Payment (Razorpay or dummy depending on PAYMENT_PROVIDER) ──
  window.initPayment = async function () {
    // Admin bypass — skip checkout entirely, DB not required
    if (isAdmin()) {
      paymentId = 'admin_bypass_' + Date.now();
      document.getElementById('payUnpaid').style.display = 'none';
      document.getElementById('payPaid').style.display = 'block';
      document.getElementById('payReceipt').textContent = 'Admin bypass — no charge';
      showNotification('Admin bypass — payment skipped', 'success');
      return;
    }

    showLoadingOverlay(true);
    try {
      const template = selectedTemplate();
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template })
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Payment setup failed');
      showLoadingOverlay(false);

      if (out.providerData.provider === 'dummy') {
        // Dev / test mode with no real gateway
        paymentId = out.paymentId;
        document.getElementById('payUnpaid').style.display = 'none';
        document.getElementById('payPaid').style.display = 'block';
        document.getElementById('payReceipt').textContent = `Receipt: ${paymentId}`;
        showNotification('Payment successful (test mode)', 'success');
        return;
      }

      // Razorpay checkout
      const { keyId, amount, currency } = out.providerData;
      const rzpOptions = {
        key:         keyId,
        amount:      amount,
        currency:    currency,
        order_id:    out.orderId,
        name:        'BeyondSite',
        description: 'Website Package · One-time',
        theme:       { color: '#2ec97b' },
        handler: async function (response) {
          showLoadingOverlay(true);
          try {
            const vRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature
              })
            });
            const vOut = await vRes.json();
            if (!vRes.ok || !vOut.ok) throw new Error(vOut.error || 'Verification failed');
            paymentId = vOut.paymentId;
            document.getElementById('payUnpaid').style.display = 'none';
            document.getElementById('payPaid').style.display = 'block';
            document.getElementById('payReceipt').textContent = `Order: ${paymentId}`;
            showNotification('Payment successful 🎉', 'success');
          } catch (err) {
            showNotification('Payment verification failed: ' + err.message, 'error');
          } finally {
            showLoadingOverlay(false);
          }
        },
        modal: {
          ondismiss: function () {
            showNotification('Payment cancelled', 'error');
          }
        }
      };
      const rzp = new window.Razorpay(rzpOptions);
      rzp.open();
    } catch (err) {
      showLoadingOverlay(false);
      showNotification('Payment error: ' + err.message, 'error');
    }
  };

  // ── Download (requires paymentId, admin bypasses) ──
  window.downloadWebsite = async function () {
    // Admin bypasses payment
    if (isAdmin()) {
      paymentId = 'admin_bypass_' + Date.now();
    } else if (!paymentId) {
      return showNotification('Please complete payment first', 'error');
    }

    const data = collectAll();
    showLoadingOverlay(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selectedTemplate(), data, paymentId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Generate failed');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `${(data.businessName || 'website').replace(/\s+/g, '-')}-website.zip`
      });
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);

      showLoadingOverlay(false);

      step3.style.display = 'none';
      successStep.style.display = 'block';
      showNotification('Website downloaded! 🎉', 'success');
    } catch (err) {
      showLoadingOverlay(false);
      showNotification('Error: ' + err.message, 'error');
    }
  };

  // ── Reset ──
  window.resetForm = function () {
    step1.style.display       = 'block';
    step2.style.display       = 'none';
    step3.style.display       = 'none';
    successStep.style.display = 'none';
    inputForm.reset();
    FormRenderer.replaceData({});
    paymentId = null;
    updateStepIndicator(1);
    loadSchemaForCurrentTemplate();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Toast / overlay styles (inject once) ──
  const style = document.createElement('style');
  style.textContent = `
    .notification { position: fixed; top: 20px; right: 20px; padding: 14px 20px; border-radius: 8px; color: #fff; font-weight: 600; font-size: .95em; box-shadow: 0 8px 20px rgba(0,0,0,.15); opacity: 0; transform: translateY(-20px); transition: all .3s ease; z-index: 9999; max-width: 320px; }
    .notification-success { background: linear-gradient(135deg,#10b981,#059669); }
    .notification-error   { background: linear-gradient(135deg,#ef4444,#dc2626); }
    .notification-info    { background: linear-gradient(135deg,#0ea5e9,#0284c7); }
    .loading-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: none; align-items: center; justify-content: center; z-index: 9998; backdrop-filter: blur(2px); }
    .loading-spinner { text-align: center; background: #fff; padding: 40px; border-radius: 16px; }
    .spinner-ring { width: 50px; height: 50px; margin: 0 auto 15px; border: 4px solid rgba(99,102,241,.1); border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite; }
    .loading-spinner p { color: #64748b; font-weight: 600; margin: 0; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 480px) { .notification { right: 10px; left: 10px; max-width: none; } }
  `;
  document.head.appendChild(style);

} else {
  // =====================================================
  //  GENERATED WEBSITE RUNTIME (ships inside the ZIP)
  // =====================================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const t = document.querySelector(this.getAttribute('href'));
      if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const msg = document.createElement('div');
      msg.style.cssText = `background:#10b981;color:#fff;padding:15px 20px;border-radius:8px;margin-bottom:15px;font-weight:600;animation:slideDown .4s ease-out;`;
      msg.textContent = '✓ Thank you! We will get back to you soon.';
      this.parentNode.insertBefore(msg, this);
      this.reset();
      setTimeout(() => { msg.style.animation = 'slideUp .4s ease-out forwards'; setTimeout(() => msg.remove(), 400); }, 4000);
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeInUp .6s ease-out forwards';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });
  document.querySelectorAll('.service-card, .modern-service-item, .about-section').forEach(el => observer.observe(el));

  const genStyle = document.createElement('style');
  genStyle.textContent = `
    @keyframes fadeInUp { from { opacity:0; transform: translateY(30px); } to { opacity:1; transform: translateY(0); } }
    @keyframes slideDown { from { opacity:0; transform: translateY(-20px); } to { opacity:1; transform: translateY(0); } }
    @keyframes slideUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
    .service-card, .modern-service-item, .about-section { opacity: 0; }
  `;
  document.head.appendChild(genStyle);
}