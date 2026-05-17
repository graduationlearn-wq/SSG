// ────────────────────────────────────────────────────────────────
// preview-test.js
// Renders every template with realistic sample data and builds a
// side-by-side comparison page: templates/preview-all.html
//
// Usage:  cd templates && node preview-test.js
//         then open preview-all.html in your browser
// ────────────────────────────────────────────────────────────────
const ejs = require('ejs');
const fs  = require('fs');
const path = require('path');

// ── Normalization (mirrors server.js::buildTemplateData) ───────
function buildTemplateData(payload = {}) {
  const data = { ...payload };
  data.businessName = (data.businessName || '').trim();
  data.tagline      = (data.tagline || '').trim();
  data._description = (data._description || '').trim();
  data.primaryColor = data.primaryColor || '#c0392b';
  data.tone         = data.tone || 'professional';
  data.foundedYear  = data.foundedYear || '';
  data.logo         = data.logo || '';
  data.year         = new Date().getFullYear();
  data.about        = data.about || data.aboutBody || '';
  data.products     = Array.isArray(data.products)
    ? data.products
    : (data.products || '').split(',').map(s => s.trim()).filter(Boolean);
  data.email   = data.email   || data.primaryEmail || '';
  data.phone   = data.phone   || data.primaryPhone || '';
  data.address = data.address || data.addressBlock || '';
  data.hours   = data.hours   || data.hoursText    || '';

  const strKeys = [
    'heroEyebrow','heroDeck','heroPullQuote','aboutHeadline','aboutBody',
    'ctaHeadline','ctaBody','ctaButton','accent','currency',
    'heroEyebrowV','heroHeadlineV','heroSubV','heroCtaPrimaryV','heroCtaSecondaryV',
    'heroQuoteCardTitleV','heroQuoteCardBodyV','heroTagV','heroBadgeV','heroShotV',
    'aboutHeadlineV','aboutBodyV','emergencyLineV','ctaHeadlineV','ctaBodyV','ctaButtonV',
    'advisorNameV','advisorBioV','advisorPhotoV','whyHeadlineV','licenseNumberV','regulatorV',
    'logoV','primaryEmail','primaryPhone','addressBlock','hoursText',
    'bn','tag',
    // Round B — Agency (template-2)
    'heroHeadlineLead','heroHeadlineAccent','heroHeadlineTail','heroSub',
    'heroCtaPrimary','heroCtaSecondary',
    'aboutHeadlineLead','aboutHeadlineTail',
    'servicesLabel','servicesHeadline','servicesMeta',
    'processLabel','processHeadline',
    // Round B — BFSI (template-6)
    'regulatorLine','insuranceLine','pmlaLinkLabel','grievanceLinkLabel',
    'heroHeadlineBody','heroHeadlineEmph',
    'ratesPanelTitle','ratesPanelFooter',
    'servicesBody',
    'aboutLabel','aboutHeadlineEmph',
    'ratesLabel','ratesHeadlineLead','ratesHeadlineEmph',
    'depositPanelTitle','lendingPanelTitle','ratesDisclaimer',
    // Round C — Terminal (template-3)
    'heroPromptCmd','heroMetaStatus','heroMetaModules','heroMetaBuild',
    'aboutFileName','aboutMeta',
    'servicesHeadlineLead','servicesHeadlineTail',
    'processHeadlineLead','processHeadlineTail',
    'ctaHeadlineLead','ctaHeadlineTail',
    // Round C — Web3 (template-4)
    'heroBadge','heroPanelTitle',
    'servicesHeadline1','servicesHeadline2',
    'aboutQuoteLine1','aboutQuoteAccent1','aboutQuoteLine2','aboutQuoteLine3','aboutQuoteAccent2','aboutQuoteTail','aboutCtaText',
    'chainsLabel',
    'testimonialsLabel','testimonialsRating',
    'ctaEyebrow','ctaHeadlineAccent','ctaNote',
    // Round D — NBFC (template-9)
    'rbiRegNumber','cin','nbfcCategory',
    'mitcLinkLabel','fairPracticeLinkLabel','sachetLinkLabel',
    'heroRatePanelTitle','heroRatePanelProduct','heroRateValue','heroRateUnit',
    'productsLabel','productsHeadline','productsBody',
    'eligibilityLabel','eligibilityHeadline',
    'chargesLabel','chargesHeadline','chargesBody','chargesNote',
    'grievanceLabel','grievanceHeadline','grievanceBody',
    'groName','groRole','groEmail','groPhone','groAddress','groTimings',
    // Round E — Restaurant (template-10)
    'heroOpenStatus','chefName','chefRole','chefBio',
    'signaturesLabel','signaturesHeadline','menuLabel','menuHeadline','menuIntro','ctaPhone',
    // Round E — Portfolio (template-11)
    'heroNameLead','heroNameTail','heroRole','aboutLocationLine','workLabel','workHeadline',
    // Round F — InsurTech SaaS (template-12)
    'codeLanguage','codeSnippet','howLabel','howHeadline',
    'complianceLabel','complianceHeadline','complianceBody',
    'pricingLabel','pricingHeadline',
    // Round F — Insurance Market (template-13)
    'quoteCardTitle','quoteCardNote',
    'categoriesLabel','categoriesHeadline','categoriesBody',
    'whyLabel','partnersLabel'
  ];
  for (const k of strKeys) if (data[k] === undefined) data[k] = '';

  const arrKeys = ['services','processSteps','values','testimonials','trustItems','stats','hoursList',
                   'faqs','areasServed','logos','features','howItWorks','plans','policies','whyPoints',
                   'statBoxes','credentials','claimSteps',
                   // Round B
                   'tickerItems','aboutTags','aboutStats','numberStats',
                   'heroTrustBadges','heroRates','marqueeItems','pillars',
                   'heritageStats','certifications','depositRates','lendingRates','contactPerks',
                   // Round C
                   'heroTypingLines','statusItems','stackItems',
                   'heroPortfolioChips','tickerTokens','dataRows','chains',
                   // Round D — NBFC
                   'heroRateBenefits','trustBadges','products',
                   'eligibilityCriteria','documentsList','rateRows','aboutPillars',
                   'ratings','escalationLevels',
                   // Round E — Restaurant
                   'signatureDishes','menuCategories','reviews','pressItems',
                   // Round E — Portfolio
                   'skillsItems','workItems','clientList',
                   // Round F — InsurTech SaaS + Insurance Market
                   'customerLogos','howSteps','platformStats','complianceBadges','pricingPlans',
                   'categories','whyPoints','marketStats','insurerPartners','marketReviews'];
  for (const k of arrKeys) if (!Array.isArray(data[k])) data[k] = [];
  return data;
}

// ── Shared sample data (covers most templates) ────────────────
const commonSample = {
  businessName: 'Apex Studio',
  tagline: 'Crafting experiences that endure.',
  _description: 'We help companies design clearer products, build trusted brands, and ship experiences that customers actually love.',
  tone: 'professional',
  primaryColor: '#c0392b',
  foundedYear: '2015',
  email: 'hello@apexstudio.co',
  phone: '+1 (555) 123-4567',
  address: '88 Market Street, Suite 400\nSan Francisco, CA 94103',
  hours: 'Mon–Fri · 9am–6pm PT',
  about: 'We are a small team of designers, engineers, and strategists who believe great products come from deeply understanding the people using them. Since 2015 we have partnered with over 200 brands to ship work we are proud of.',
  products: ['Brand Strategy','Web Design','Digital Marketing','Consulting'],
  testimonials: [
    { quote: 'Apex transformed our brand from the ground up. Work is worth every penny.', name: 'Sarah Chen', role: 'CEO · Helix Health' },
    { quote: 'The team is sharp, responsive, and genuinely invested in the outcome.',      name: 'Marcus Lee',  role: 'Founder · Northbeam' },
    { quote: 'Best creative partner we have ever worked with. Would hire again in a heartbeat.', name: 'Priya Raman', role: 'VP Marketing · Orbit' }
  ],
  services: [
    { icon: '🎨', name: 'Brand & Identity',  body: 'Logos, systems, and visual languages that scale from a business card to a billboard.', price: 'From $8,000' },
    { icon: '💻', name: 'Web Design',        body: 'Custom marketing sites and product UI that convert visitors into customers.',          price: 'From $12,000' },
    { icon: '📈', name: 'Digital Marketing', body: 'Organic growth, paid acquisition, and lifecycle programs that compound over time.',    price: 'From $5,000/mo' },
    { icon: '🧭', name: 'Consulting',        body: 'Strategic sprints for founders who need a second opinion they can actually trust.',    price: 'From $2,500/day' }
  ],
  trustItems: [
    { label: 'BBB Accredited' }, { label: '200+ Clients' }, { label: 'Fully Insured' }, { label: '5-Star Rated' }
  ],
  stats: [
    { value: '200+', label: 'Happy Clients' },
    { value: '15',   label: 'Years Experience' },
    { value: '50+',  label: 'Awards Won' },
    { value: '24/7', label: 'Emergency Support' }
  ],
  faqs: [
    { q: 'How long does a typical project take?', a: 'Brand projects run 6–8 weeks. Web design typically 8–12 weeks depending on scope.' },
    { q: 'Do you offer ongoing support?',          a: 'Yes — most clients stay on a monthly retainer for iterations, analytics, and campaigns.' },
    { q: 'What is your pricing model?',            a: 'Fixed-price per project for defined scope, or hourly for ongoing work. We share ballpark costs on the intro call.' }
  ]
};

// ── Per-template variants (override the shared sample) ────────
function localSample() {
  return {
    ...commonSample,
    businessName: 'Riverbend Plumbing',
    tagline: 'Licensed. Insured. Neighborhood-trusted.',
    _description: 'Family-run plumbing and drain service in Denver. 24/7 emergency dispatch, flat-rate pricing, and no surprises on the invoice.',
    primaryColor: '#c4622d',
    heroEyebrow: 'Trusted in Denver since 2010',
    heroHeadline: 'Fast, honest plumbing when you need it most.',
    heroSub: 'Clogged drain at 2am? Leaky water heater? We dispatch within 60 minutes — flat-rate pricing, no surprises.',
    heroCtaPrimary: 'Get a Free Quote',
    heroCtaSecondary: 'Call (555) 123-4567',
    heroQuoteCardTitle: 'Licensed · Insured · Local',
    heroQuoteCardBody: '15 years serving the Denver metro with same-day service and written guarantees on every job.',
    aboutHeadline: 'Three generations of plumbers serving Denver',
    aboutBody: 'Started in 1998 by Hank Riverbend, now run by his sons Cole and Jake. We treat every home like our grandmother lives there — boots off at the door, clean-up always, and we will not leave until you are satisfied.',
    emergencyLine: '24/7 Emergency Service — call anytime',
    areasServed: [
      { name: 'Downtown Denver' }, { name: 'Highlands' }, { name: 'Cherry Creek' },
      { name: 'Capitol Hill' }, { name: 'Washington Park' }, { name: 'Five Points' }
    ],
    hoursList: [
      { day: 'Monday',    open: '7:00 AM', close: '7:00 PM', closed: 'No' },
      { day: 'Tuesday',   open: '7:00 AM', close: '7:00 PM', closed: 'No' },
      { day: 'Wednesday', open: '7:00 AM', close: '7:00 PM', closed: 'No' },
      { day: 'Thursday',  open: '7:00 AM', close: '7:00 PM', closed: 'No' },
      { day: 'Friday',    open: '7:00 AM', close: '7:00 PM', closed: 'No' },
      { day: 'Saturday',  open: '8:00 AM', close: '4:00 PM', closed: 'No' },
      { day: 'Sunday',    open: '',        close: '',        closed: 'Yes' }
    ],
    services: [
      { icon: '🚿', name: 'Drain Cleaning',     body: 'Clogs, backups, and slow drains — hydro-jetting available.', price: 'From $99' },
      { icon: '🔧', name: 'Water Heater Service', body: 'Repair, replacement, and tankless conversions. Same-day in most cases.', price: 'From $149' },
      { icon: '💧', name: 'Leak Detection',      body: 'Thermal imaging to find leaks without tearing up your walls.',             price: 'From $185' },
      { icon: '🚽', name: 'Toilet & Fixture',    body: 'Installs, repairs, and upgrades. Low-flow, bidet, comfort-height — all handled.', price: 'From $125' }
    ]
  };
}

function startupSample() {
  return {
    ...commonSample,
    businessName: 'Voltline',
    tagline: 'The inbox that runs itself.',
    _description: 'Voltline is an AI inbox that drafts replies, files attachments, and books meetings automatically. Used by over 12,000 founders to reclaim 8 hours a week.',
    primaryColor: '#2560e8',
    heroBadge: 'NEW · Series A raised',
    heroHeadline: 'Your inbox, answered. Automatically.',
    heroSub: 'Voltline reads every email, drafts the reply, files attachments, and books meetings — so you focus on work that matters, not the inbox.',
    heroCtaPrimary: 'Start free',
    heroCtaSecondary: 'Book a demo',
    logos: [
      { name: 'Stripe' },{ name: 'Linear' },{ name: 'Notion' },{ name: 'Ramp' },{ name: 'Figma' }
    ],
    features: [
      { title: 'Smart reply drafting',  body: 'Trained on your writing style — every draft sounds like you wrote it yourself.',   metric: '2.4× faster' },
      { title: 'Meeting scheduler',     body: 'Shares your real-time calendar, holds tentative blocks, and books without back-and-forth.', metric: 'Zero emails' },
      { title: 'Auto-file attachments', body: 'Invoices, contracts, receipts — filed in the right Drive folder automatically.',  metric: '100% coverage' },
      { title: 'Priority scoring',      body: 'Ranks every new message by urgency so you only open the ones that matter.',         metric: 'Top 12% only' },
      { title: 'Team inbox',            body: 'Shared queues, assignments, and status — built for small teams.',                   metric: '' },
      { title: 'Privacy-first',         body: 'SOC 2 Type II. On-device models for the sensitive stuff.',                          metric: 'SOC 2 certified' }
    ],
    howItWorks: [
      { title: 'Connect your inbox', body: 'Gmail or Outlook, takes 30 seconds. We never store message contents.' },
      { title: 'Voltline learns',    body: 'We analyze how you write and respond — tone, sign-off, length, quirks.' },
      { title: 'Drafts appear',      body: 'Every new email comes with a draft reply you just review and send.' },
      { title: 'You reclaim hours',  body: 'Typical user saves 8 hours a week on inbox management.' }
    ],
    currencySymbol: '$',
    plans: [
      { name: 'Starter', tagline: 'For solo operators', monthly: '19', annual: '190', popular: 'No', cta: 'Start free',
        features: [{ text: 'Up to 500 emails/mo' }, { text: 'Smart drafts' }, { text: 'Community support' }] },
      { name: 'Pro', tagline: 'For founders who live in email', monthly: '49', annual: '490', popular: 'Yes', cta: 'Start free',
        features: [{ text: 'Unlimited emails' }, { text: 'Meeting scheduler' }, { text: 'Auto-file attachments' }, { text: 'Priority support' }] },
      { name: 'Team', tagline: 'For small teams', monthly: '149', annual: '1490', popular: 'No', cta: 'Contact sales',
        features: [{ text: 'Everything in Pro' }, { text: 'Shared inboxes' }, { text: 'Team analytics' }, { text: 'Dedicated success manager' }] }
    ],
    testimonials: [
      { quote: 'Voltline saved me 10 hours a week. I cannot imagine email without it.', name: 'Sarah Chen', role: 'Founder · Helix', metricLabel: '10 hrs saved/wk' },
      { quote: 'Our support team triages 4× faster now. Game-changer for small teams.',  name: 'Marcus Lee', role: 'Head of CX · Northbeam', metricLabel: '+312% throughput' }
    ],
    ctaHeadline: 'Reclaim your inbox today',
    ctaBody: 'Free for 14 days. No credit card. Cancel anytime.',
    ctaButton: 'Start free trial'
  };
}

function insuranceSample() {
  return {
    ...commonSample,
    businessName: 'Ananya Sharma & Associates',
    tagline: 'Honest advice. Policies that actually pay.',
    _description: 'Independent IRDAI-licensed insurance advisory serving families and small businesses in Mumbai since 2010. Specializes in life, health, and motor policies with a 96% claim-settlement track record.',
    primaryColor: '#15513a',
    heroTag: 'Licensed Insurance Professional',
    heroEyebrow: 'Protecting families since 2010',
    heroHeadline: 'Insurance made simple, honest, and actually useful.',
    heroSub: 'Independent IRDAI-licensed advisor. I help families pick the right policy — not the one that pays me the biggest commission.',
    heroCtaPrimary: 'Get Free Quote',
    heroCtaSecondary: 'Call Advisor',
    heroQuoteCardTitle: 'Get a personalized quote in 60 seconds',
    heroQuoteCardBody: 'No obligation. No spam. Just honest numbers from someone who does this for a living.',
    trustItems: [
      { label: 'IRDAI Licensed' }, { label: '96% Claim Settlement' }, { label: '15 Years Experience' }, { label: '24/7 Claim Support' }
    ],
    policies: [
      { icon: '🛡', name: 'Term Life',    body: 'High-coverage protection for your family at the lowest premium possible.' },
      { icon: '🏥', name: 'Health',       body: 'Cashless hospitalization across 8,000+ network hospitals with no sub-limits.' },
      { icon: '🚗', name: 'Motor',        body: 'Comprehensive car and bike insurance with zero-depreciation add-on included.' },
      { icon: '🏠', name: 'Home',         body: 'Protects your home, contents, and valuables against fire, theft, and natural disasters.' }
    ],
    whyHeadline: 'Why clients stay for decades',
    whyPoints: [
      { text: 'Independent advice — I work for you, not any one insurance company' },
      { text: 'Claim assistance included — I handle the paperwork when you need to claim' },
      { text: 'Annual review at no cost — policies change, families change, coverage should too' },
      { text: 'One advisor for life — you will never be passed off to a call center' },
      { text: 'Transparent commission disclosure — you see exactly what I earn on every policy' }
    ],
    statBoxes: [
      { value: '₹480Cr', label: 'Claims Settled' },
      { value: '12,000+', label: 'Families Covered' },
      { value: '96%',    label: 'Settlement Rate' },
      { value: '15+',    label: 'Years Experience' }
    ],
    advisorName: 'Ananya Sharma',
    advisorBio: 'Ananya has spent 15 years helping families in Mumbai pick insurance that actually pays out when it matters. IRDAI-licensed since 2010, she specializes in complex family situations — blended households, business owners, and NRIs.',
    credentials: [
      { text: 'IRDAI Licensed · Since 2010' },
      { text: 'Certified Financial Planner (CFP)' },
      { text: 'MDRT Member · 2018, 2019, 2020, 2021, 2022, 2023' },
      { text: 'MA Economics · Delhi University' }
    ],
    claimSteps: [
      { title: 'Call me first', body: 'Before filing anything — one call and I walk you through what to do next.' },
      { title: 'Document check', body: 'I review every form before submission so nothing gets rejected on technicalities.' },
      { title: 'Submission & follow-up', body: 'I submit the claim and follow up with the insurer directly, daily if needed.' },
      { title: 'Payout confirmation', body: 'I confirm the transfer and only close the case once money is in your account.' }
    ],
    testimonials: [
      { quote: 'Got my hospitalization claim settled in 9 days. Ananya handled everything — I did not chase the insurer once.', name: 'Rohit Kapoor', role: 'Health policy · claim 2024' },
      { quote: '15 years with Ananya. My kids now use her too. Could not recommend higher.', name: 'Dr. Meera Iyer', role: 'Term + Health policies' }
    ],
    licenseNumber: 'IRDAI/LI/2010/44821',
    regulator: 'IRDAI'
  };
}

function agencySample() {
  return {
    ...commonSample,
    businessName: 'Noir Studio',
    tagline: 'Bold ideas, beautifully crafted.',
    _description: 'Independent creative studio in Brooklyn making brand identity, web design, and film for premium consumer brands. Founded 2015 by two ex-Pentagram designers.',
    primaryColor: '#c9a84c',
    // Hero (3-line headline; middle word gets the gold gradient)
    heroEyebrow: 'Creative Excellence Since 2015',
    heroHeadlineLead: 'Crafting',
    heroHeadlineAccent: 'Bold',
    heroHeadlineTail: 'Stories.',
    heroSub: 'A Brooklyn-based studio building enduring brands and the digital products that bring them to life. Trusted by 200+ companies, from venture-backed startups to legacy houses.',
    heroCtaPrimary: 'Explore Services',
    heroCtaSecondary: 'See Our Work',
    // Ticker
    tickerItems: [
      { text: 'Brand Systems' }, { text: 'Digital Products' }, { text: 'Film & Motion' },
      { text: 'Strategy' }, { text: 'Editorial' }, { text: 'Packaging' }, { text: 'Type Design' }
    ],
    // About
    aboutHeadlineLead: 'Built on trust,',
    aboutHeadlineTail: 'driven by results.',
    aboutBody: 'Noir was founded in 2015 by Mira Chen and Daniel Park, both alumni of Pentagram. We started small — a single brand identity for a Brooklyn coffee roaster — and grew by referral. Today the studio is fifteen designers, three strategists, and a film team. We work in close partnership: small senior teams, no juniors learning on your dime, no handoffs to anyone you have not met. Every project starts with a week of listening before we draw a line.',
    aboutTags: [
      { text: 'Brand Systems' }, { text: 'Digital Products' }, { text: 'Film' },
      { text: 'Strategy' }, { text: 'Type' }, { text: 'Packaging' }
    ],
    aboutStats: [
      { value: '150', suffix: '+', label: 'Brands Shaped' },
      { value: '98',  suffix: '%',  label: 'Client Retention' },
      { value: '12',  suffix: 'x',  label: 'Awards Won' },
      { value: '24',  suffix: 'hr', label: 'Avg. Response Time' }
    ],
    // Services
    servicesLabel: 'What We Offer',
    servicesHeadline: 'Premium services for premium results.',
    servicesMeta: 'Boutique by design. We take on twelve clients a year and build deep relationships with each.',
    services: [
      { name: 'Brand Identity',     body: 'Logos, typography, color, voice — complete systems built to scale from a tweet to a billboard.' },
      { name: 'Web & Product',      body: 'Custom marketing sites and product UI shipped with engineering, not just thrown over the wall.' },
      { name: 'Strategy',           body: 'Naming, positioning, narrative — the structural work that makes great visuals possible.' },
      { name: 'Film & Motion',      body: 'Brand films, product launches, and motion design for the moments that matter most.' },
      { name: 'Packaging',          body: 'Premium consumer packaging that earns its place on the shelf — and stays there.' },
      { name: 'Editorial',          body: 'Books, reports, and editorial systems for brands that have something worth saying.' }
    ],
    // Process
    processLabel: 'How We Work',
    processHeadline: 'A process built for precision.',
    processSteps: [
      { title: 'Discover',  body: 'We start with a week of listening — stakeholder interviews, brand audits, market mapping.' },
      { title: 'Strategy',  body: 'We sharpen the brief, name the audience, decide what the work needs to do — before drawing.' },
      { title: 'Execute',   body: 'Senior teams of two-to-four designers ship the work in tight, high-bandwidth sprints.' },
      { title: 'Grow',      body: 'We stay on as a creative partner — refining, extending, and scaling the system over years.' }
    ],
    // Numbers band
    numberStats: [
      { value: '500', suffix: '+',  label: 'Projects Shipped' },
      { value: '99',  suffix: '%',  label: 'Client Retention' },
      { value: '24',  suffix: 'hr', label: 'Response SLA' },
      { value: '15',  suffix: '+',  label: 'Years Together' }
    ],
    // Testimonials
    testimonials: [
      { quote: 'Noir built us a brand we still grow into a decade later. Easily the best money we ever spent.', name: 'Sarah Lin',     role: 'CEO · Helix Coffee' },
      { quote: 'Their strategy work changed how we talk about ourselves internally. The visuals were the bonus.', name: 'Marcus Webb',  role: 'Founder · Northbeam' },
      { quote: 'A genuine creative partnership — they care about our outcomes more than their portfolio.',         name: 'Priya Raman',  role: 'VP Brand · Orbit Skincare' }
    ],
    // CTA
    ctaHeadline: 'Ready to work with the best?',
    ctaBody: 'We take on twelve clients a year. If you have something worth doing properly, let us talk.',
    ctaButton: 'Start a Conversation'
  };
}

function bfsiSample() {
  return {
    ...commonSample,
    businessName: 'Meridian Capital',
    tagline: 'Banking · Investments · Loans',
    _description: 'Meridian Capital is a regulated NBFC offering deposits, home and business loans, and wealth advisory across India. RBI-licensed since 2008 with ₹2,400 Cr AUM and over 4 lakh customers served.',
    primaryColor: '#c8a957',
    // Compliance bar
    regulatorLine: 'Regulated Entity · RBI Registered NBFC · CIN: U65923MH2008PLC012345',
    insuranceLine: 'All eligible deposits insured up to ₹5L by DICGC',
    pmlaLinkLabel: 'PMLA Policy',
    grievanceLinkLabel: 'Grievance Redressal',
    // Hero
    heroEyebrow: 'Trusted Financial Partner Since 2008',
    heroHeadlineLead: 'Grow Your',
    heroHeadlineBody: 'Wealth with',
    heroHeadlineEmph: 'Confidence.',
    heroSub: 'Deposits, loans, and wealth advisory built for Indian families. RBI-regulated, transparent fees, and a relationship manager you can actually reach by phone.',
    heroCtaPrimary: 'Open Account',
    heroCtaSecondary: 'Explore Services',
    heroTrustBadges: [
      { icon: '🏛', label: 'RBI Regulated' },
      { icon: '🛡', label: 'DICGC Insured' },
      { icon: '⭐', label: 'CRISIL AA+' },
      { icon: '🔒', label: 'ISO 27001' }
    ],
    ratesPanelTitle: 'Live Indicative Rates',
    ratesPanelFooter: '* Rates are indicative as of today. Subject to change without notice. T&C apply.',
    heroRates: [
      { name: 'Fixed Deposit',  detail: '12–24 months', rate: '7.85%', tag: 'p.a. compounding' },
      { name: 'Recurring Dep.', detail: '36 months',    rate: '7.50%', tag: 'p.a.' },
      { name: 'Home Loan',      detail: 'Up to 30 yr',  rate: '8.45%', tag: 'Floating · RLLR' },
      { name: 'Gold Loan',      detail: 'Up to ₹50L',   rate: '9.25%', tag: 'p.a.' }
    ],
    // Marquee
    marqueeItems: [
      { text: 'Fixed Deposits' }, { text: 'Recurring Deposits' }, { text: 'Home Loans' },
      { text: 'Business Loans' }, { text: 'Gold Loans' }, { text: 'Wealth Management' },
      { text: 'Mutual Funds' }, { text: 'Insurance' }, { text: 'NRI Banking' }
    ],
    // Services
    servicesLabel: 'Our Services',
    servicesHeadline: 'Financial solutions for every life stage.',
    servicesBody: 'From your first salary account to retirement planning — comprehensive financial services backed by a relationship manager who knows your name.',
    services: [
      { icon: '🏦', name: 'Deposits',         body: 'FD, RD, and savings products with competitive rates and DICGC insurance up to ₹5L.' },
      { icon: '🏠', name: 'Home Loans',       body: 'Floating-rate home loans up to ₹5 Cr with 30-year tenure and zero pre-payment penalty.' },
      { icon: '💼', name: 'Business Loans',   body: 'Working-capital and term loans for SMEs from ₹10L to ₹10 Cr — disbursal in 7 days.' },
      { icon: '📈', name: 'Wealth Advisory',  body: 'Goal-based portfolio construction with mutual funds, bonds, and structured products.' },
      { icon: '🪙', name: 'Gold Loans',       body: 'Same-day disbursal up to ₹50L against gold ornaments. Lowest rates in the market.' },
      { icon: '🛡', name: 'Insurance',        body: 'Life, health, and motor insurance from top regulated insurers — no captive products.' }
    ],
    // Numbers
    numberStats: [
      { value: '2,400', suffix: 'Cr', label: 'Assets Under Management' },
      { value: '4',     suffix: 'L+', label: 'Customers Served' },
      { value: '17',    suffix: 'yr', label: 'In Operation' },
      { value: '98',    suffix: '%',  label: 'Renewal Rate' }
    ],
    // About
    aboutLabel: 'Our Heritage',
    aboutHeadlineLead: 'Stability you can',
    aboutHeadlineEmph: 'bank on.',
    aboutBody: 'Meridian Capital was founded in 2008 in Mumbai with a simple idea: serve Indian families and small businesses the way private banks once did, with senior people on the phone and decisions taken by humans, not algorithms. Seventeen years and four lakh customers later, that idea has held up. We are RBI-regulated, CRISIL AA+ rated, and have never missed a payout. Most of our customers came by referral from someone we already serve.',
    pillars: [
      { title: 'Regulatory Compliance', body: 'RBI-regulated NBFC since 2008. Audited annually by Big Four firms. Quarterly disclosures filed publicly.' },
      { title: 'Customer First',         body: 'Dedicated RM for every customer above ₹10L AUM. No call-tree maze, no off-shore support, no surprises.' },
      { title: 'Transparent Pricing',    body: 'Every fee published on our site. No hidden charges, no foreclosure penalties, no commission-driven sales.' }
    ],
    heritageStats: [
      { value: '17', suffix: 'Yr', label: 'In Operation' },
      { value: 'AA+', suffix: '',  label: 'CRISIL Rating' },
      { value: '24',  suffix: 'hr', label: 'Loan Decision' },
      { value: '4.8', suffix: '★',  label: 'Customer Rating' }
    ],
    certifications: [
      { label: 'RBI Licensed' }, { label: 'CRISIL AA+' }, { label: 'ISO 27001' },
      { label: 'DICGC Member' }, { label: 'IRDAI Corporate Agent' }, { label: 'AMFI Registered' }
    ],
    // Rates
    ratesLabel: 'Indicative Rates',
    ratesHeadlineLead: 'Competitive rates,',
    ratesHeadlineEmph: 'every single day.',
    depositPanelTitle: 'Deposit Rates',
    lendingPanelTitle: 'Lending Rates',
    depositRates: [
      { name: 'Fixed Deposit · 1 yr',   detail: 'Non-callable',  rate: '7.50%', tag: '' },
      { name: 'Fixed Deposit · 2 yr',   detail: 'Non-callable',  rate: '7.85%', tag: 'Best Rate' },
      { name: 'Fixed Deposit · 3 yr',   detail: 'Cumulative',    rate: '7.65%', tag: '' },
      { name: 'Recurring Deposit',      detail: '36 months',     rate: '7.50%', tag: '' },
      { name: 'Senior Citizen FD',      detail: '+0.50% bonus',  rate: '8.35%', tag: 'Senior+' },
      { name: 'Tax-Saver FD',           detail: '5 yr · 80C',    rate: '7.40%', tag: '' }
    ],
    lendingRates: [
      { name: 'Home Loan',         detail: 'Floating · RLLR linked', rate: '8.45%', tag: 'Popular' },
      { name: 'Loan Against Prop.', detail: 'Up to ₹5 Cr · 15 yr',   rate: '9.10%', tag: '' },
      { name: 'Business Loan',     detail: 'Term · up to 7 yr',      rate: '11.50%', tag: '' },
      { name: 'Working Capital',   detail: 'Cash credit · 1 yr',     rate: '10.75%', tag: '' },
      { name: 'Gold Loan',         detail: 'Up to ₹50L · 1 yr',      rate: '9.25%', tag: 'Same-day' },
      { name: 'Personal Loan',     detail: 'Up to ₹25L · 5 yr',      rate: '12.50%', tag: '' }
    ],
    ratesDisclaimer: 'Rates are indicative and may change basis market conditions and individual customer profile. Final rate will be communicated post credit underwriting. Subject to T&C and applicable RBI guidelines.',
    // Testimonials
    testimonials: [
      { quote: 'Got my home loan disbursed in 9 days flat. The RM kept me posted at every stage — no chasing, no surprises.', name: 'Rohit Kapoor',  role: 'Home Loan customer · 2024' },
      { quote: '15 years and 3 FD renewals later, still my first call when I need anything banking. The relationship matters.', name: 'Mrs. Lakshmi Nair', role: 'Retired Principal · FD Customer' },
      { quote: 'Working capital line that actually scales with our seasonal business. Old bank could never figure it out.',     name: 'Anil Gupta',     role: 'MD · Gupta Textiles' }
    ],
    // CTA
    ctaHeadline: 'Ready to make your money work harder?',
    ctaBody: 'Open an account in 15 minutes. Talk to a relationship manager today — no call-tree, no waiting.',
    ctaButton: 'Open Account',
    // Contact perks
    contactPerks: [
      { icon: '◷', text: 'Response within 4 business hours' },
      { icon: '✓', text: 'KYC-compliant onboarding · 100% digital' },
      { icon: '☎', text: 'Dedicated relationship manager from day one' },
      { icon: '🛡', text: 'No commission-driven product pushing — ever' }
    ],
    email: 'relationships@meridian.co.in',
    phone: '+91 22 6789 4500',
    address: 'Meridian Tower, Bandra Kurla Complex\nMumbai, Maharashtra 400051',
    hours: 'Mon–Sat · 9:30am–6:30pm IST'
  };
}

function terminalSample() {
  return {
    ...commonSample,
    businessName: 'Forge Labs',
    tagline: '> Production-grade software, deployed.',
    _description: 'A small senior engineering studio shipping production-grade systems for early-stage and growth-stage software teams. Founded by ex-Stripe and ex-Cloudflare engineers in 2018.',
    primaryColor: '#00ff41',
    foundedYear: '2018',
    tone: 'professional',
    // Hero
    heroPromptCmd: './launch.sh --mode=production',
    heroSub: 'A senior engineering studio for software teams that have outgrown contractors but aren\'t ready for a 50-person agency. Six engineers, one shared Slack, no junior layer.',
    heroCtaPrimary: '▶ run services.sh',
    heroCtaSecondary: 'cat README.md',
    heroMetaStatus: '● ONLINE',
    heroMetaModules: '06 loaded',
    heroMetaBuild: 'v2026.stable',
    heroTypingLines: [
      { text: '> Production-grade software, deployed.' },
      { text: '> Senior engineers. No juniors learning on your dime.' },
      { text: '> From scoping to deploy in weeks, not quarters.' },
      { text: '> Async-first. Documented. Predictable.' }
    ],
    // Status bar
    statusItems: [
      { text: 'TypeScript' }, { text: 'Cloud-native' }, { text: 'Production-grade' },
      { text: 'Open source' }, { text: 'Continuous delivery' }, { text: 'Performance' },
      { text: 'Reliability' }, { text: 'Security' }
    ],
    // About
    aboutFileName: 'about.ts',
    aboutBody: 'Forge Labs was founded in 2018 by two former infrastructure engineers — one from Stripe, one from Cloudflare — who got tired of watching ambitious software projects get diluted by big agencies and unreliable contractors. The studio has stayed deliberately small: six senior engineers, one designer, one operations lead. No interns, no offshore subcontractors, no handoffs. Every project is run by people you have met, with a single shared Slack channel and weekly demo calls. We have shipped production systems for fintechs, AI labs, and developer-tooling startups across three continents — and we are still measured the same way our customers are: by uptime, latency, and revenue impact.',
    aboutHeadlineLead: 'What runs',
    aboutHeadlineTail: 'in our stack.',
    aboutMeta: 'Battle-tested expertise across every module we ship. Each capability is production-grade and deployed for real customers running real load.',
    stackItems: [
      { name: 'TypeScript',          percent: '95' },
      { name: 'Cloud Architecture',  percent: '92' },
      { name: 'Distributed Systems', percent: '88' },
      { name: 'Security Engineering',percent: '90' },
      { name: 'DevOps & SRE',        percent: '87' },
      { name: 'Frontend Performance',percent: '78' }
    ],
    // Services
    servicesHeadlineLead: 'Technical',
    servicesHeadlineTail: 'Capabilities',
    servicesMeta: 'Every service is a production-ready module engineered for real load, audited for security, and shipped on a schedule we will commit to in writing.',
    services: [
      { name: 'Backend Engineering',     body: 'TypeScript and Go services, message queues, and API design — built to scale and handed off documented.', status: 'ACTIVE' },
      { name: 'Cloud Architecture',      body: 'AWS, GCP, and Cloudflare blueprints that scale with your customers without scaling your invoice.',      status: 'ACTIVE' },
      { name: 'Infrastructure & DevOps', body: 'CI/CD, observability, and SRE practices baked in from sprint one — not bolted on at launch.',           status: 'ACTIVE' },
      { name: 'Performance Engineering', body: 'Profiling, tuning, and reliability work for systems with real traffic and real revenue at stake.',       status: 'ACTIVE' },
      { name: 'Security & Compliance',   body: 'Threat modelling, audits, SOC 2 readiness — the unsexy work that ships you to enterprise customers.',     status: 'ACTIVE' },
      { name: 'Senior Advisory',         body: 'Senior eyes on a tricky decision, paid by the day. No retainers, no junior shadows, no upsells.',         status: 'ACTIVE' }
    ],
    // Process
    processHeadlineLead: 'How We',
    processHeadlineTail: 'Execute',
    processSteps: [
      { hash: 'a1f3e9c', phase: 'PHASE 01', title: 'init: Discovery & Scoping',     body: 'A five-day diagnostic — code review, stakeholder interviews, traffic analysis, and a written scope you can hand to your CFO.',     branch: 'branch: discovery' },
      { hash: 'b8d2c4f', phase: 'PHASE 02', title: 'feat: Architecture & Plan',     body: 'A bespoke execution blueprint with sequencing, dependencies, and risk callouts. Every decision documented before any code is written.', branch: 'branch: planning' },
      { hash: 'c5a7b1d', phase: 'PHASE 03', title: 'build: Precision Execution',     body: 'Two-week sprints with weekly demos. You see the running system on day three and every Friday after that. No surprises at launch.',     branch: 'branch: production' },
      { hash: 'd9e1f6a', phase: 'PHASE 04', title: 'deploy: Launch & Optimise',      body: 'Post-launch we monitor, iterate, and compound — your investment appreciates over time as we tune for the load you actually have.',     branch: 'branch: main ← merged' }
    ],
    // Numbers
    numberStats: [
      { value: '500', suffix: '+',  label: 'projects_shipped' },
      { value: '99',  suffix: '%',  label: 'client_retention' },
      { value: '08',  suffix: 'yr', label: 'years_in_production' },
      { value: '24',  suffix: 'hr', label: 'response_sla' }
    ],
    // Testimonials
    testimonials: [
      { quote: 'Working with Forge was like finding a senior engineer who actually cares about the outcome. Methodical, precise, and exceptional at every level. We will work with them again on the next product.', name: 'Michael Reyes',  role: 'CTO · Helix Logistics' },
      { quote: 'Rare to find a team that ships fast AND thinks deeply. They anticipated edge cases before we could even file the issue. The code review feedback alone justified the engagement.',                  name: 'Sarah Lin',     role: 'Founder & CEO · Northbeam' },
      { quote: 'The architecture document Forge wrote for us has been used by every engineer we have hired since. Every decision was traceable, every output was clean. This is engineering at its best.',         name: 'James Kowalski', role: 'Head of Platform · Orbit' }
    ],
    // CTA
    ctaHeadlineLead: 'Ready to ship',
    ctaHeadlineTail: 'something great?',
    ctaBody: 'Open a connection with Forge Labs. We respond within 24 hours, in writing, with a calendar link and a scoping doc.',
    ctaButton: '$ ./start_project.sh →',
    // Contact
    email: 'hello@forgelabs.dev',
    phone: '+1 (415) 555-0142',
    address: '88 Montgomery Street\nSan Francisco, CA 94104',
    hours: 'Mon–Fri, 09:00–18:00 PT'
  };
}

function web3Sample() {
  return {
    ...commonSample,
    businessName: 'Helix Protocol',
    tagline: 'Trustless infrastructure for the next billion users.',
    _description: 'Helix Protocol is a non-custodial, multi-chain settlement and routing protocol. Built by ex-Coinbase and ex-Polygon engineers, audited by Trail of Bits, used by 340+ teams across DeFi and CeFi.',
    primaryColor: '#00e5ff',
    foundedYear: '2021',
    tone: 'professional',
    // Hero
    heroBadge: 'Mainnet · Live',
    heroHeadlineLead: 'Trustless infra for',
    heroHeadlineAccent: 'Web3.',
    heroSub: 'Multi-chain settlement, routing, and custody primitives — audited, open-source, and battle-tested across $2.4B+ in on-chain value.',
    heroCtaPrimary: 'Read the Docs',
    heroCtaSecondary: 'Talk to Engineers',
    heroPanelTitle: 'Helix · Console',
    heroPortfolioChips: [
      { label: 'Total Value Locked', value: '$2.4B+',  change: '↑ +12.4% MoM' },
      { label: '24h Settlement',     value: '$48.2M',  change: '↑ +3.2%' },
      { label: 'Chains Supported',   value: '12',      change: 'Live across all' }
    ],
    // Ticker
    tickerTokens: [
      { symbol: 'BTC',  price: '$67,420', up: 'up',   change: '2.4%' },
      { symbol: 'ETH',  price: '$3,580',  up: 'up',   change: '1.8%' },
      { symbol: 'SOL',  price: '$184',    up: 'down', change: '0.9%' },
      { symbol: 'BNB',  price: '$412',    up: 'up',   change: '3.1%' },
      { symbol: 'ARB',  price: '$1.24',   up: 'up',   change: '5.2%' },
      { symbol: 'OP',   price: '$2.18',   up: 'up',   change: '1.4%' },
      { symbol: 'AVAX', price: '$38.4',   up: 'up',   change: '2.8%' },
      { symbol: 'MATIC',price: '$0.92',   up: 'down', change: '1.2%' }
    ],
    // Services
    servicesLabel: 'What We Build',
    servicesHeadline1: 'The full stack.',
    servicesHeadline2: 'Nothing missing.',
    services: [
      { name: 'Smart Contract Engineering', body: 'Audited, gas-optimised contracts in Solidity, Vyper, and Move — shipped to mainnet with full test coverage.' },
      { name: 'Protocol Architecture',       body: 'Modular system design that survives forks, upgrades, and adversarial conditions — without forklift migrations.' },
      { name: 'Wallet & Custody',            body: 'Self-custody and MPC infrastructure with hardware-backed key management for institutional desks.' },
      { name: 'Cross-chain Routing',         body: 'High-throughput bridge and routing infrastructure across 12 chains with sub-second median finality.' },
      { name: 'Compliance & KYT',            body: 'On-chain analytics, address screening, and risk scoring built for regulated counterparties.' },
      { name: 'Developer Tooling',           body: 'TypeScript SDKs, REST and gRPC APIs, and observability dashboards that make integration painless.' }
    ],
    // About manifesto
    aboutLabel: 'Our Foundation',
    aboutQuoteLine1: "We didn't build",
    aboutQuoteAccent1: 'Helix.',
    aboutQuoteLine2: 'to be another platform.',
    aboutQuoteLine3: 'We built it to be the',
    aboutQuoteAccent2: 'last one',
    aboutQuoteTail: 'you need.',
    aboutBody: 'Helix Protocol was founded in 2021 by two infrastructure engineers — one from Coinbase Custody, one from Polygon — who watched the on-chain ecosystem fragment into incompatible silos and decided to build the connective tissue that should have existed all along.\n\nOur architecture is non-custodial by design, our contracts are audited by Trail of Bits and OpenZeppelin, and our infrastructure is monitored on-chain around the clock. We do not ask you to trust us — we make trust unnecessary. Every contract is open-source, every upgrade is timelocked, every parameter is publicly governed.\n\nEvery team that builds on Helix gets direct access to protocol engineers, not a support ticket queue. That is the difference between a vendor and a partner — and that is the only kind of company we know how to be.',
    aboutCtaText: 'Start Building →',
    dataRows: [
      { key: 'Total value secured on-chain', value: '$2.4B+',   sub: 'since protocol launch in 2021' },
      { key: 'Infrastructure uptime',         value: '99.98%',   sub: 'zero critical incidents to date' },
      { key: 'Active developer teams',        value: '340+',     sub: 'across DeFi, CeFi, and infra' },
      { key: 'Transaction finality',          value: '<400ms',   sub: 'median, all supported chains' },
      { key: 'Countries with active users',   value: '80+',      sub: 'global protocol footprint' }
    ],
    // Chains
    chainsLabel: 'Supported Chains',
    chains: [
      { name: 'Ethereum',  color: '#627eea' },
      { name: 'Bitcoin',   color: '#f7931a' },
      { name: 'Solana',    color: '#9945ff' },
      { name: 'Polygon',   color: '#8247e5' },
      { name: 'Arbitrum',  color: '#12aaff' },
      { name: 'Optimism',  color: '#ff0420' },
      { name: 'Avalanche', color: '#e84142' },
      { name: 'BNB Chain', color: '#f0b90b' },
      { name: 'Base',      color: '#0052ff' },
      { name: 'Cosmos',    color: '#6f7390' }
    ],
    // Testimonials
    testimonialsLabel: 'Client Voices',
    testimonialsRating: 'Rated 4.9 across 200+ developer teams',
    testimonials: [
      { quote: 'The infrastructure is rock solid. We processed over *$40M in settlements without a single failure* in our first quarter on Helix. This is what institutional-grade actually looks like.', name: 'Karan Nair',  role: 'CTO · ChainVault' },
      { quote: 'Switched from two other providers to Helix. The difference in *latency and reliability is night and day.* Our market-makers noticed within the first hour of cutover.',                       name: 'Riya Joshi',  role: 'Head of Trading · NexFi' },
      { quote: 'Compliance-ready, developer-friendly, and *genuinely fast support from actual engineers.* Rare combination in this space. Building our next three products on their stack.',                  name: 'Alex Lin',    role: 'Founder · DeFiCore' }
    ],
    // CTA
    ctaEyebrow: 'Ready to Ship',
    ctaHeadlineLead: 'Go on-chain with',
    ctaHeadlineAccent: 'Helix.',
    ctaBody: 'Join the protocol trusted by 340+ teams across DeFi, CeFi, and Web3 infrastructure. No lengthy onboarding — deploy to testnet in days, mainnet in weeks.',
    ctaButton: 'Start Building →',
    ctaNote: 'Response within 24 hours · NDA available',
    // Contact perks
    contactPerks: [
      { text: 'Response within 24 hours, guaranteed' },
      { text: 'NDA available on request' },
      { text: 'No commitment to start the conversation' },
      { text: 'Direct access to protocol engineers' }
    ],
    email: 'partners@helixprotocol.io',
    phone: '+1 (415) 555-0188',
    address: 'Helix Labs · 200 Bush Street\nSan Francisco, CA 94104',
    hours: 'Mon–Fri, 09:00–18:00 PT · Discord 24/7'
  };
}

function nbfcSample() {
  return {
    ...commonSample,
    businessName: 'Meridian Capital',
    tagline: 'Honest lending. Transparent rates. Fast decisions.',
    _description: 'Meridian Capital is an RBI-registered NBFC offering personal, business, gold, home, and vehicle loans across 200+ branches in India. Disbursed over ₹12,400 Cr since 2012. CRISIL AA / Stable rated.',
    primaryColor: '#e85d2c',
    foundedYear: '2012',
    tone: 'professional',
    // Compliance
    rbiRegNumber: 'B-13.02345',
    cin: 'U65923MH2012PTC230456',
    nbfcCategory: 'NBFC-ICC (Investment & Credit Co.)',
    mitcLinkLabel: 'Most Important T&Cs',
    fairPracticeLinkLabel: 'Fair Practice Code',
    grievanceLinkLabel: 'Grievance Redressal',
    sachetLinkLabel: 'Report unauthorised entity (Sachet)',
    // Hero
    heroEyebrow: 'RBI Registered NBFC since 2012',
    heroHeadlineLead: 'Loans built',
    heroHeadlineBody: 'around',
    heroHeadlineEmph: 'your life.',
    heroSub: 'Personal, business, gold and home loans designed for real Indian customers — sanctioned in hours, disbursed in days, priced transparently. RBI-regulated, CRISIL AA rated.',
    heroCtaPrimary: 'Apply Now',
    heroCtaSecondary: 'Calculate EMI',
    heroRatePanelTitle: 'Starting at',
    heroRatePanelProduct: 'Personal Loan',
    heroRateValue: '10.99%',
    heroRateUnit: 'p.a.* onwards',
    heroRateBenefits: [
      { icon: '✓', text: 'No collateral required' },
      { icon: '✓', text: 'Decision in 30 minutes' },
      { icon: '✓', text: 'Loans up to ₹40 Lakhs' },
      { icon: '✓', text: 'Tenure up to 60 months' }
    ],
    // Trust
    trustBadges: [
      { icon: '🏛', label: 'RBI Regulated' },
      { icon: '★',  label: 'CRISIL AA / Stable' },
      { icon: '🔒', label: 'ISO 27001 Certified' },
      { icon: '⏱',  label: 'Decision in 30 mins' },
      { icon: '📍', label: '200+ branches' },
      { icon: '⚖',  label: 'Fair Practice Code' }
    ],
    // Products
    productsLabel: 'What We Offer',
    productsHeadline: 'Lending solutions for every life stage.',
    productsBody: 'Salary advance, business expansion, gold pledge, home purchase — whatever the need, our products are priced honestly and approved on merit, not on commissions.',
    products: [
      { icon: '💼', name: 'Personal Loan',    body: 'Unsecured loans for life events, medical bills, weddings, or travel. No collateral, fast disbursal.', amountRange: '₹50K – ₹40L', rateFrom: '10.99%', tenure: '12–60 months' },
      { icon: '🏢', name: 'Business Loan',    body: 'Working capital and term loans for SMEs, traders, and proprietors. Sanctioned on cash-flow merit.', amountRange: '₹2L – ₹2 Cr',   rateFrom: '14.50%', tenure: '12–84 months' },
      { icon: '🪙', name: 'Gold Loan',         body: 'Same-day disbursal against gold ornaments — lowest market rates with full insurance coverage.',     amountRange: '₹25K – ₹50L',  rateFrom: '9.25%',  tenure: '3–36 months' },
      { icon: '🏠', name: 'Home Loan',          body: 'Floating-rate home loans with 30-year tenure and zero foreclosure penalty after 12 EMIs.',          amountRange: '₹5L – ₹5 Cr',   rateFrom: '8.45%',  tenure: '5–30 years' },
      { icon: '🚗', name: 'Vehicle Loan',       body: 'New and pre-owned cars, commercial vehicles, and two-wheelers — sanctioned at the dealership.',       amountRange: '₹50K – ₹50L',  rateFrom: '9.99%',  tenure: '12–84 months' },
      { icon: '🧾', name: 'Loan Against Property', body: 'Mortgage your residential or commercial property for business expansion, education, or large purchases.', amountRange: '₹10L – ₹5 Cr', rateFrom: '10.50%', tenure: '5–15 years' }
    ],
    // Eligibility
    eligibilityLabel: 'Eligibility & Documents',
    eligibilityHeadline: 'Simple eligibility. Honest documentation list.',
    eligibilityCriteria: [
      { icon: '🎂', title: 'Age 21 – 65 years',         body: 'You must be a resident Indian aged between 21 and 65 at loan maturity.' },
      { icon: '💰', title: 'Income ₹25,000+ /month',    body: 'Salaried applicants need a minimum monthly take-home of ₹25,000. Higher for larger loan amounts.' },
      { icon: '📈', title: 'CIBIL score 700+',          body: 'A CIBIL score of 700 or above improves both approval odds and your interest rate.' },
      { icon: '🏢', title: '2+ years employment',       body: 'Total work experience of 2 years, with at least 6 months at the current employer or business.' }
    ],
    documentsList: [
      { category: 'Salaried',      items: 'PAN card, Aadhaar, latest 3 salary slips, 6-month bank statement, latest Form 16, address proof' },
      { category: 'Self-employed', items: 'PAN, Aadhaar, business proof (GST/Udyam/Shop Act), 2-year ITR with computation, 12-month bank statement, partnership deed (if applicable)' }
    ],
    // Process
    processLabel: 'How To Apply',
    processHeadline: 'From apply to disbursal in days.',
    processSteps: [
      { icon: '📝', title: 'Apply Online',         body: 'Fill basic details and upload documents from your phone or laptop. Mobile-friendly, secure.',                duration: '5 minutes' },
      { icon: '🔍', title: 'Soft Credit Check',     body: 'A non-affecting CIBIL pull and quick eligibility verification. No impact on your credit score.',           duration: 'Within 30 mins' },
      { icon: '📋', title: 'Sanction & Agreement',  body: 'You receive the sanction letter, key fact statement, and a digital loan agreement to e-sign.',              duration: 'Within 24 hours' },
      { icon: '💸', title: 'Disbursal',             body: 'Funds credited to your bank account once the agreement is e-signed and KYC documents are verified.',         duration: 'Within 48 hours' }
    ],
    // Charges
    chargesLabel: 'Rates & Charges',
    chargesHeadline: 'What it actually costs. No fine print.',
    chargesBody: 'RBI requires NBFCs to publish their interest rate ranges and fees clearly. Here are ours — applicable charges depend on credit assessment, product, and tenure.',
    rateRows: [
      { product: 'Personal Loan',         rate: '10.99% – 24% p.a.', processingFee: 'Up to 2% + GST',     prepaymentCharge: 'Nil after 6 EMIs' },
      { product: 'Business Loan',         rate: '14.50% – 22% p.a.', processingFee: 'Up to 2.5% + GST',   prepaymentCharge: '4% in 1st year, then nil' },
      { product: 'Home Loan (Floating)',  rate: '8.45% – 12% p.a.',  processingFee: 'Up to 1% + GST',     prepaymentCharge: 'Nil for floating-rate' },
      { product: 'Loan Against Property', rate: '10.50% – 14% p.a.', processingFee: 'Up to 1.5% + GST',   prepaymentCharge: 'Nil after 12 EMIs' },
      { product: 'Gold Loan',             rate: '9.25% – 18% p.a.',  processingFee: '₹500 flat',          prepaymentCharge: 'Nil' },
      { product: 'Vehicle Loan',          rate: '9.99% – 16% p.a.',  processingFee: 'Up to 1% + GST',     prepaymentCharge: '2% on outstanding' }
    ],
    chargesNote: '* Final rate is determined by credit assessment, loan amount, tenure, and product type. Other charges (stamp duty, GST, late payment fees, cheque bounce charges) apply as per the sanction letter and Most Important Terms & Conditions. T&C apply.',
    // Numbers
    numberStats: [
      { value: '12,400', suffix: 'Cr+', label: 'Disbursed since 2012' },
      { value: '5',       suffix: 'L+',  label: 'Customers served' },
      { value: '200',     suffix: '+',   label: 'Branches & service points' },
      { value: '15',      suffix: 'Yr',  label: 'In operation' }
    ],
    // About
    aboutLabel: 'Our Story',
    aboutHeadlineLead: 'Lending built on',
    aboutHeadlineEmph: 'trust.',
    aboutBody: 'Founded in 2012 in Mumbai, Meridian Capital is an RBI-registered Non-Banking Financial Company serving Indian families and small businesses across 200+ branches. We are CRISIL AA / Stable rated, ICRA AA- rated, and have disbursed over ₹12,400 Cr without a single regulatory adverse action. Our lending philosophy is straightforward: honest pricing published on our site, fast credit decisions taken by humans not algorithms, and a relationship manager you can actually reach by phone — from sanction through to closure.',
    aboutPillars: [
      { title: 'Transparent Pricing', body: 'Every fee is published on our site and explained in the sanction letter. No hidden charges, no surprise add-ons, ever.' },
      { title: 'Fair Practice Code',   body: 'Our staff are trained on RBI Fair Practice guidelines. Recovery is professional, dignified, and never coercive.' },
      { title: 'Customer First',        body: 'Dedicated relationship manager from day one — no call-tree maze, no off-shore support, no being passed around.' }
    ],
    ratings: [
      { label: 'RBI Registered NBFC' }, { label: 'CRISIL AA / Stable' }, { label: 'ICRA AA-' },
      { label: 'ISO 27001 Certified' }, { label: 'CKYC Compliant' }, { label: 'AMFI Registered' }
    ],
    // Testimonials
    testimonials: [
      { quote: 'I got my home loan disbursed in 9 days flat. The RM kept me posted at every stage — no chasing, no surprises, no hidden fees at the end. Refreshingly honest.', name: 'Rohit Kapoor',     role: 'Mumbai',   productUsed: 'Home Loan · 2024' },
      { quote: 'Working capital line that actually scales with our seasonal business. Our previous bank could never figure it out — Meridian got it from week one.',                  name: 'Anil Gupta',       role: 'Surat',    productUsed: 'Business Loan · ₹40L' },
      { quote: 'Three gold loan renewals over four years. Same RM each time, same rate transparency, same warmth. That kind of consistency is rare in this industry.',                name: 'Mrs. Lakshmi Iyer', role: 'Chennai', productUsed: 'Gold Loan customer' }
    ],
    // Grievance
    grievanceLabel: 'Customer Care · Grievance Redressal',
    grievanceHeadline: 'We hear you. And we resolve fast.',
    grievanceBody: 'As an RBI-regulated NBFC, Meridian Capital maintains a clear three-tier grievance redressal mechanism. Most issues are resolved at the branch level within 7 working days. If unresolved, the matter escalates to our Principal Nodal Officer and then, if still unresolved, to the RBI Ombudsman.',
    groName: 'Ms. Anjali Mehra',
    groRole: 'Principal Nodal Officer',
    groEmail: 'grievance@meridiancapital.in',
    groPhone: '+91 22 6789 4500',
    groAddress: 'Meridian Capital Ltd, 4th Floor, Meridian Tower\nBandra Kurla Complex, Mumbai 400051',
    groTimings: 'Mon–Fri · 10:00 AM – 6:00 PM IST',
    escalationLevels: [
      { level: 'Level 1 · Branch / Customer Care',  body: 'Walk in to your branch or call our customer care for any service or product issue. Most matters resolved at this level.', contact: '1800 200 5000 · care@meridiancapital.in', tat: 'Within 7 days' },
      { level: 'Level 2 · Principal Nodal Officer',  body: 'If unresolved within 7 days, escalate in writing to our Principal Nodal Officer with the reference number from Level 1.',  contact: 'grievance@meridiancapital.in',           tat: 'Within 14 days' },
      { level: 'Level 3 · RBI Ombudsman / Sachet',   body: 'If unresolved within 30 days, file a complaint with the RBI Ombudsman or report on the Sachet portal for unauthorised entities.', contact: 'cms.rbi.org.in · sachet.rbi.org.in',     tat: 'As per RBI scheme' }
    ],
    // CTA
    ctaHeadline: 'Get a pre-approved offer in 60 seconds.',
    ctaBody: 'Soft credit check that does not affect your CIBIL score. No commitment to proceed. No spam, ever — and a relationship manager who calls within one business hour.',
    ctaButton: 'Check Eligibility',
    ctaNote: 'Soft credit check · Will not affect your CIBIL score',
    // Contact perks
    contactPerks: [
      { icon: '⏱', text: 'Decision in 30 minutes, disbursal in 48 hours' },
      { icon: '✓', text: 'Soft credit check — will not affect your CIBIL score' },
      { icon: '☎', text: 'Dedicated relationship manager from sanction to closure' },
      { icon: '🛡', text: 'No commission-driven product pushing — honest fit advice' }
    ],
    email: 'hello@meridiancapital.in',
    phone: '+91 22 6789 4500',
    address: 'Meridian Tower, Bandra Kurla Complex\nMumbai, Maharashtra 400051',
    hours: 'Mon–Sat · 9:30am–6:30pm IST'
  };
}

function restaurantSample() {
  return {
    ...commonSample,
    businessName: 'Trattoria Verde',
    tagline: 'Honest food, made with love.',
    _description: 'Trattoria Verde is a family-run modern Italian restaurant in Bandra, Mumbai. Founded 2014 by Chef Marco Russo. Hand-rolled pasta, wood-fired mains, thoughtful wine list. Featured in Vogue Living and TimeOut Best New Restaurant 2024.',
    primaryColor: '#7a2e2e',
    foundedYear: '2014',
    tone: 'friendly',
    heroEyebrow: 'Modern Italian · Mumbai · Since 2014',
    heroHeadlineLead: 'Crafted with',
    heroHeadlineEmph: 'passion,',
    heroHeadlineTail: 'served with care.',
    heroSub: 'A neighbourhood trattoria run by a small family team. Hand-rolled pasta, wood-fired mains, a thoughtfully short wine list — and a kitchen open till the last guest goes home happy.',
    heroCtaPrimary: 'Reserve a Table',
    heroCtaSecondary: 'View Menu',
    heroOpenStatus: '● Open now · Last seating 10:30 PM',
    aboutLabel: 'Our Story',
    aboutHeadlineLead: 'A kitchen rooted in',
    aboutHeadlineEmph: 'tradition.',
    aboutBody: "Founded in 2014 by Chef Marco Russo and his wife Aria, Trattoria Verde began as a six-table room serving the food they grew up eating in Liguria. A decade on, the team is bigger and the dining room a little louder — but the rules haven't changed: pasta is rolled by hand each morning, vegetables come from a single farm forty kilometres from here, and we'd rather close early than serve something we wouldn't eat ourselves. Most of the team has been with us five years or more, and so have most of our regulars.",
    chefName: 'Chef Marco Russo',
    chefRole: 'Executive Chef & Founder',
    chefBio: 'Trained in Genoa, refined across kitchens in Milan and Tokyo, Marco believes good food is built on three things: an honest ingredient, a steady flame, and patience.',
    signaturesLabel: 'Signature Plates',
    signaturesHeadline: "What we're known for.",
    signatureDishes: [
      { name: 'Truffle Tagliatelle',     body: 'Hand-rolled tagliatelle, slow butter sauce, shaved black truffle, aged parmesan.',                price: '₹780',   tag: "Chef's Pick" },
      { name: 'Wood-Fired Branzino',      body: 'Whole Mediterranean sea bass, salt-baked, finished over olive wood. Lemon, capers, parsley oil.', price: '₹1,420', tag: '' },
      { name: 'Slow-Braised Lamb Shank',  body: 'Eight-hour braise in red wine and rosemary, soft polenta, gremolata.',                            price: '₹1,160', tag: '' },
      { name: 'Burrata di Andria',        body: 'Fresh burrata flown weekly, heirloom tomato, aged balsamic, focaccia.',                            price: '₹620',   tag: 'V' },
      { name: 'Tiramisù della Nonna',     body: "Marco's grandmother's recipe — hand-whipped mascarpone, espresso-soaked ladyfingers, cocoa.",       price: '₹420',   tag: 'Classic' },
      { name: 'Risotto Mare Nostrum',     body: 'Carnaroli rice, prawn, scallop, calamari, saffron, finished with a touch of Sambuca.',              price: '₹990',   tag: '' }
    ],
    menuLabel: 'Full Menu',
    menuHeadline: "Today's offerings.",
    menuIntro: 'Vegan and gluten-free options marked. Please tell us about any allergies — our kitchen is happy to adapt.',
    menuCategories: [
      { name: 'Antipasti', items: 'Bruschetta | ₹320 | Toasted ciabatta, heirloom tomato, basil, olive oil | V\nCarpaccio di Manzo | ₹540 | Beef tenderloin, parmesan, rocket, lemon |\nVitello Tonnato | ₹620 | Cold veal, tuna-caper sauce, capers |\nInsalata Caprese | ₹420 | Buffalo mozzarella, tomato, basil | V' },
      { name: 'Pasta',     items: 'Cacio e Pepe | ₹560 | Pecorino, black pepper, hand-rolled spaghetti | V\nSpaghetti Vongole | ₹740 | Clams, white wine, garlic, parsley |\nPappardelle al Cinghiale | ₹820 | Wild boar ragù, juniper, red wine |\nGnocchi Pesto Genovese | ₹620 | Hand-rolled potato gnocchi, pesto, pine nuts | V' },
      { name: 'Mains',     items: 'Branzino al Forno | ₹1,420 | Wood-fired sea bass, lemon, capers |\nLamb Shank Brasato | ₹1,160 | Eight-hour red wine braise, polenta |\nPollo alla Milanese | ₹880 | Breaded chicken, rocket, cherry tomato, lemon |\nMelanzane Parmigiana | ₹680 | Eggplant, tomato, mozzarella, basil | V' },
      { name: 'Dolci',     items: 'Tiramisù della Nonna | ₹420 | Espresso, mascarpone, ladyfingers, cocoa |\nPanna Cotta | ₹360 | Vanilla cream, seasonal berries, balsamic |\nAffogato | ₹320 | Vanilla gelato, hot espresso, amaretto | V\nCantucci & Vin Santo | ₹420 | Tuscan almond biscotti, dessert wine |' }
    ],
    reviews: [
      { quote: 'A meal here is what you go to a restaurant for in the first place — soul, smoke, and salt.',                                              source: 'Vir Sanghvi',         role: 'Food Critic, HT Brunch',   stars: '5' },
      { quote: "Marco's tagliatelle alone is worth the trip across the city. The lamb shank is the postscript that closes the deal.",                    source: 'Conde Nast Traveller', role: 'Best New Restaurant 2024', stars: '5' },
      { quote: "My family's anniversary spot for three years running. They remember our table, our wine, our daughter's allergies.",                     source: 'Priya Iyer',           role: 'Bandra · regular guest',    stars: '5' }
    ],
    hoursList: [
      { day: 'Monday',    closed: 'Yes', open: '',         close: '' },
      { day: 'Tuesday',   closed: 'No',  open: '12:00 PM', close: '11:00 PM' },
      { day: 'Wednesday', closed: 'No',  open: '12:00 PM', close: '11:00 PM' },
      { day: 'Thursday',  closed: 'No',  open: '12:00 PM', close: '11:00 PM' },
      { day: 'Friday',    closed: 'No',  open: '12:00 PM', close: '12:00 AM' },
      { day: 'Saturday',  closed: 'No',  open: '11:00 AM', close: '12:00 AM' },
      { day: 'Sunday',    closed: 'No',  open: '11:00 AM', close: '10:30 PM' }
    ],
    pressItems: [
      { label: 'Featured in Vogue Living' },
      { label: 'TimeOut Best New Restaurant 2024' },
      { label: 'HT Brunch · 4.5★' },
      { label: 'Conde Nast Traveller' },
      { label: "BBC Travel · \"Mumbai's soul on a plate\"" }
    ],
    ctaHeadline: 'Hungry? Reserve your table.',
    ctaBody: 'A 24-hour notice helps us prep your favourites. Walk-ins welcome — first-come, first-served on weekends.',
    ctaButton: 'Book a Table',
    ctaPhone: '+91 22 6789 4500',
    email: 'reservations@trattoriaverde.in',
    phone: '+91 22 6789 4500',
    address: '14 Hill Road, Bandra West\nMumbai, Maharashtra 400050',
    hours: 'Tue–Sun · 12:00 PM – 11:00 PM (Mon closed)'
  };
}

function portfolioSample() {
  return {
    ...commonSample,
    businessName: 'Aria Mehta',
    tagline: 'Brand & editorial designer.',
    _description: 'Aria Mehta is an independent brand and editorial designer based in Mumbai with 10 years of experience. Past work includes Helix Coffee, Northbeam Magazine, Studio Halve, and Orbit Skincare. Available for select projects in 2026.',
    primaryColor: '#0a0a0a',
    foundedYear: '2016',
    tone: 'professional',
    heroEyebrow: 'Available for select projects · 2026',
    heroNameLead: 'Aria',
    heroNameTail: 'Mehta',
    heroRole: 'Brand & Editorial Designer',
    heroSub: 'I help small studios and ambitious founders build brands that have a point of view. Most of my work sits at the intersection of editorial typography, considered visual systems, and clear writing.',
    heroCtaPrimary: 'View Work',
    heroCtaSecondary: 'Get in Touch',
    skillsItems: [
      { text:'Brand Identity' }, { text:'Editorial Design' }, { text:'Typography' },
      { text:'Print' }, { text:'Web' }, { text:'Packaging' }, { text:'Art Direction' }, { text:'Strategy' }
    ],
    aboutLabel: 'About',
    aboutHeadlineLead: 'Designing things',
    aboutHeadlineEmph: 'that mean something.',
    aboutBody: "Hi, I'm Aria. I've spent the last decade making things — first at a small studio in Bombay, then briefly in-house at a magazine, and for the past six years on my own.\n\nI work in close partnership with founders and editors who care deeply about how their work looks and reads. Most engagements run six to twelve weeks. I take on roughly eight clients a year, with at least one personal or pro-bono project mixed in.\n\nIf you're building something with a strong point of view and you want a collaborator rather than a vendor, I'd love to hear from you.",
    aboutLocationLine: 'Mumbai · Available remotely worldwide',
    workLabel: 'Selected Work',
    workHeadline: "A few things I'm proud of.",
    workItems: [
      { year:'2024', client:'Helix Coffee',       title:'Brand identity & packaging',       body:'Logo, typography, packaging system, and editorial photography direction for a third-wave roaster expanding to four cities.', tag:'Branding' },
      { year:'2024', client:'Northbeam Magazine', title:'Quarterly editorial redesign',     body:'Full editorial redesign across grid, typography, and section structure for an architecture quarterly.',                  tag:'Editorial' },
      { year:'2023', client:'Studio Halve',       title:'Website & writing system',         body:'Design and copywriting for a 12-page studio site, including a custom CMS structure for project case studies.',          tag:'Web' },
      { year:'2023', client:'Orbit Skincare',     title:'Packaging redesign · 14 SKUs',     body:'A complete packaging refresh across the line, plus the launch campaign visual system.',                                  tag:'Packaging' },
      { year:'2022', client:'Maya Editions',      title:'Custom typeface · "Maya Display"', body:"A serif display family in three weights, drawn for a small literary publisher's book covers and interiors.",            tag:'Type' },
      { year:'2022', client:'Helix Coffee',       title:'In-store editorial program',       body:'Quarterly seasonal menus, postcards, and shelf-talkers for thirty-two retail locations.',                              tag:'Editorial' }
    ],
    servicesLabel: 'Services',
    servicesHeadline: 'What I can take on.',
    services: [
      { name:'Brand Identity',     body:'Logo, typography, voice, and a system that scales from a business card to a 200-page lookbook.' },
      { name:'Editorial Design',   body:'Magazines, books, reports, and editorial systems for publishers who care about how the work feels in hand.' },
      { name:'Typography',         body:'Custom typefaces and lettering for brands and publications. From a logo wordmark to a complete display family.' },
      { name:'Web & Digital',      body:'Marketing sites and editorial-led product UI, designed in close collaboration with a small developer network.' },
      { name:'Strategy & Writing', body:'Naming, positioning, and editorial copy for projects where the words matter as much as the visuals.' }
    ],
    clientList: [
      { name:'Helix Coffee' }, { name:'Northbeam Magazine' }, { name:'Studio Halve' },
      { name:'Orbit Skincare' }, { name:'Maya Editions' }, { name:'Atelier Co.' },
      { name:'Forge Architects' }, { name:'Marigold Press' }, { name:'Quiet Records' },
      { name:'Paper Lantern Books' }
    ],
    testimonials: [
      { quote: "Aria doesn't decorate, she reasons. Every choice on our brand had a clear answer behind it. I'd hire again in a heartbeat.",       name:'Sarah Lin',    role:'Founder · Helix Coffee' },
      { quote: 'The redesign moved the magazine from "competent" to "essential" in our readers\' minds. A genuinely transformative engagement.',   name:'Marcus Webb',  role:'Editor-in-Chief · Northbeam' },
      { quote: 'A real collaborator. Thoughtful, fast, and the writing was as sharp as the visuals — rare combination.',                          name:'Priya Raman',  role:'Founder · Orbit' }
    ],
    ctaHeadlineLead: 'Have something',
    ctaHeadlineEmph: 'worth making?',
    ctaBody: "I take on around eight projects a year. If you have something you care about, I'd love to hear about it — even if you're not sure of the scope yet.",
    ctaButton: 'Start a Conversation',
    email: 'hello@ariamehta.in',
    address: 'Mumbai, India',
    hours: 'Mon–Fri · 10:00 AM – 7:00 PM IST'
  };
}

function insurtechSample() {
  return {
    ...commonSample,
    businessName: 'Stratus',
    tagline: 'Insurance APIs for the modern stack.',
    _description: 'Stratus is a B2B InsurTech API platform powering insurers, brokers, and embedded-insurance teams. Quote, underwrite, claim — one developer-first stack. SOC 2 Type II, IRDAI-aligned. Founded 2020 in Bangalore.',
    primaryColor: '#00a085',
    foundedYear: '2020',
    tone: 'professional',
    heroBadge: 'SOC 2 Type II · IRDAI-aligned',
    heroHeadlineLead: 'Insurance APIs for the',
    heroHeadlineAccent: 'modern stack.',
    heroSub: 'Quote, underwrite, and settle claims through one developer-first platform. Used by 80+ insurers and brokers across India to ship products in days, not quarters.',
    heroCtaPrimary: 'Get API Keys',
    heroCtaSecondary: 'Read Docs',
    codeLanguage: 'node.js',
    codeSnippet: `const stratus = new Stratus(process.env.STRATUS_KEY);

const quote = await stratus.quotes.create({
  product: 'health',
  age: 32,
  city: 'mumbai',
  cover: 1000000
});

console.log(quote.premium);
// → 8420 (₹/year, GST inclusive)`,
    customerLogos: [
      { name:'Acko' }, { name:'Digit' }, { name:'Bajaj Allianz' }, { name:'Star Health' },
      { name:'HDFC Ergo' }, { name:'Tata AIG' }, { name:'Care Health' }, { name:'PolicyBazaar' }
    ],
    productsLabel: 'API Suite',
    productsHeadline: 'One stack. Every insurance primitive.',
    productsBody: 'A coherent set of APIs designed by engineers who shipped insurance infrastructure at scale. Pick what you need, ignore the rest.',
    products: [
      { icon:'⚡', name:'Quotes API',        body:'Sub-100ms quotes across 30+ insurers. Smart caching, fallback handling, and full normalisation across products.', endpoint:'POST /v1/quotes' },
      { icon:'🛡', name:'Underwriting API',  body:'Risk scoring with explainable signals. Returns approve / refer / decline plus the precise reasons regulators ask for.', endpoint:'POST /v1/underwrite' },
      { icon:'📋', name:'Claims API',         body:'File, track, and settle claims through one endpoint. Document OCR, auto-fraud scoring, and SLA dashboards built in.',   endpoint:'POST /v1/claims' },
      { icon:'🔐', name:'KYC & AML',           body:'Aadhaar, PAN, video KYC, sanctions screening — all bundled with audit trails ready for IRDAI inspections.',         endpoint:'POST /v1/kyc' },
      { icon:'📊', name:'Analytics API',       body:'Customer cohort, claims-ratio, and product-mix dashboards delivered as JSON. Plug straight into your BI stack.',     endpoint:'GET  /v1/analytics' },
      { icon:'🔔', name:'Webhooks',           body:'Reliable, signed, idempotent event delivery. Every quote, policy, and claim triggers events with retries and DLQs.',   endpoint:'POST /v1/webhooks' }
    ],
    howLabel: 'Integration',
    howHeadline: 'Live in days, not quarters.',
    howSteps: [
      { title:'Sign up',        body:'Create a sandbox account. No credit card required, no sales call to start.',                              duration:'5 minutes' },
      { title:'Get API keys',   body:'Generate sandbox + production keys in the dashboard. Rotate, scope, and revoke any time.',                duration:'Instant' },
      { title:'Build & test',   body:'Code against the sandbox with realistic mock data. Full request logs, replay, and time-travel debugging.', duration:'1–3 days' },
      { title:'Ship to prod',   body:'Flip the keys, deploy. We monitor with you for the first 30 days through a shared Slack channel.',         duration:'Same day' }
    ],
    platformStats: [
      { value:'99.99', suffix:'%',   label:'Uptime SLA · 12 months' },
      { value:'80',    suffix:'+',   label:'Insurers integrated' },
      { value:'2.4',   suffix:'B+',  label:'Annual API calls' },
      { value:'<80',   suffix:'ms',  label:'Median quote latency' }
    ],
    complianceLabel: 'Compliance & Security',
    complianceHeadline: 'Built for regulated workloads.',
    complianceBody: 'Every layer of the platform is built to satisfy regulatory and security audits — IRDAI inspections, RBI scrutiny, IT-Act and DPDP compliance, and the security reviews your customers will run on you. We publish a SOC 2 Type II report and an IRDAI compliance addendum to every customer on request.',
    complianceBadges: [
      { label:'SOC 2 Type II' }, { label:'ISO 27001' }, { label:'IRDAI Aligned' }, { label:'DPDP Compliant' },
      { label:'IT-Act Compliant' }, { label:'PCI-DSS Level 1' }, { label:'CKYCR Linked' }, { label:'AES-256 at rest' }
    ],
    pricingLabel: 'Pricing',
    pricingHeadline: 'Transparent, scaling pricing.',
    pricingPlans: [
      { name:'Starter',    price:'Free',          tagline:'For exploring the API',          popular:'No',  cta:'Start building',   features:'1,000 sandbox calls / month\nCommunity support\n3 webhook endpoints\nBasic dashboards' },
      { name:'Growth',     price:'₹49,000 / mo',  tagline:'For shipping products',           popular:'Yes', cta:'Talk to sales',    features:'500K production calls / month\n24-hour priority support\nUnlimited webhooks\nAdvanced analytics\n99.9% SLA' },
      { name:'Enterprise', price:'Custom',        tagline:'For regulated incumbents',        popular:'No',  cta:'Contact sales',    features:'Custom volume & rate limits\nDedicated CSM + Slack channel\nVPC peering & private link\nCustom SLAs up to 99.99%\nOn-prem deployment available' }
    ],
    ctaHeadlineLead: 'Ready to integrate',
    ctaHeadlineAccent: 'in 24 hours?',
    ctaBody: 'Sandbox keys, full docs, and a Slack channel with our engineers — that\'s how integrations move from "let me explore" to "shipped" in a week.',
    ctaButton: 'Get API Keys',
    ctaNote: 'Sandbox keys are free · No credit card required',
    email: 'partners@stratus.dev',
    phone: '+91 80 4567 8900',
    address: 'Indiranagar, Bangalore 560038',
    hours: 'Mon–Fri · 09:00–18:00 IST'
  };
}

function insuranceMarketSample() {
  return {
    ...commonSample,
    businessName: 'Coverwise',
    tagline: 'Compare. Buy. Claim. All under one roof.',
    _description: 'Coverwise is an IRDAI-licensed insurance broker that helps Indian families compare and buy insurance from 50+ licensed carriers. 12 lakh+ customers served. 97% claim assistance success rate. Founded in 2014 in Mumbai.',
    primaryColor: '#00856f',
    foundedYear: '2014',
    tone: 'friendly',
    heroEyebrow: 'IRDAI-licensed broker · serving since 2014',
    heroHeadlineLead: 'Compare insurance,',
    heroHeadlineEmph: 'find your fit.',
    heroSub: 'Quotes from 50+ IRDAI-licensed insurers in 30 seconds. Independent advice from licensed advisors. Real claim assistance when you need it most.',
    heroCtaPrimary: 'Compare Now',
    heroCtaSecondary: 'Talk to Advisor',
    quoteCardTitle: 'Get a free quote in 30 seconds',
    quoteCardNote: 'No obligation · No spam · IRDAI Lic. CB-XXX/2014',
    categoriesLabel: 'What we cover',
    categoriesHeadline: 'Find the right cover for every life moment.',
    categoriesBody: 'Health, motor, life, home, travel — every category, every major insurer in India. Compare apples-to-apples and pick what actually fits.',
    categories: [
      { icon:'❤️', name:'Health Insurance',  tagline:'Cashless at 8000+ hospitals', body:'Family floater and individual covers from ₹3 lakh to ₹2 crore. Pre-existing diseases, OPD, mental health — all options compared.' },
      { icon:'🚗', name:'Car Insurance',     tagline:'Renew in 60 seconds',         body:'Comprehensive, third-party, and zero-depreciation covers from every major motor insurer. Instant policy delivery.' },
      { icon:'🏍', name:'Two-Wheeler',       tagline:'From ₹600/year',               body:'Bike and scooter insurance with optional accident cover. Compare premiums across 25+ insurers in one tap.' },
      { icon:'🛡', name:'Term Life',          tagline:'High cover, low premium',     body:'Pure protection covers up to ₹2 crore at premiums that won\'t hurt. Compare claim-settlement ratios honestly.' },
      { icon:'🏠', name:'Home Insurance',     tagline:'Structure + contents covered', body:'Fire, burglary, natural-disaster cover for your house and what\'s inside. Even renters can buy.' },
      { icon:'✈️', name:'Travel Insurance',   tagline:'For domestic & international', body:'Medical emergencies, trip cancellation, lost baggage. Schengen and student-travel plans included.' }
    ],
    whyLabel: 'Why us',
    whyHeadline: 'Why thousands trust us.',
    whyPoints: [
      { icon:'⚖', title:'Compare 50+ Insurers',    body:'Every IRDAI-licensed major carrier in India, side-by-side. We don\'t hide options that don\'t pay us.' },
      { icon:'💸', title:'Lowest Premiums',         body:'Direct insurer rates with our broker discount built in — usually 15–25% cheaper than buying retail.' },
      { icon:'☎', title:'Real Claim Assistance',    body:'A dedicated case manager handles your paperwork, follow-ups, and escalations until your claim is settled.' },
      { icon:'🛡', title:'IRDAI-Licensed Advisors',  body:'Our advisors are licensed by IRDAI and bound by Fair Practice Code. No commission-driven product pushing.' }
    ],
    processLabel: 'How it works',
    processHeadline: 'From quote to claim — we handle it all.',
    processSteps: [
      { icon:'📝', title:'Get free quotes',        body:'Tell us about you in 30 seconds. We pull live quotes from every major insurer.' },
      { icon:'🔍', title:'Compare side-by-side',   body:'Premium, claim ratio, hospital network, exclusions — see them all in one clear table.' },
      { icon:'✓',  title:'Buy with one tap',        body:'Pay online, get the policy on email and WhatsApp instantly. No paperwork, no agent visits.' },
      { icon:'🤝', title:'We handle your claim',    body:'When you need to claim, your case manager fills the forms, follows up, and stays with you till payout.' }
    ],
    marketStats: [
      { value:'12',     suffix:'L+',  label:'Customers covered' },
      { value:'50',     suffix:'+',   label:'Insurer partners' },
      { value:'97',     suffix:'%',   label:'Claim assistance success rate' },
      { value:'₹2,400', suffix:'Cr',  label:'Premium serviced annually' }
    ],
    partnersLabel: 'We compare across IRDAI-licensed insurers',
    insurerPartners: [
      { name:'HDFC ERGO' }, { name:'Star Health' }, { name:'ICICI Lombard' }, { name:'Bajaj Allianz' },
      { name:'Tata AIG' }, { name:'Care Health' }, { name:'Niva Bupa' }, { name:'Reliance General' },
      { name:'New India Assurance' }, { name:'Aditya Birla Health' }, { name:'SBI General' }, { name:'Acko' }
    ],
    marketReviews: [
      { quote:'My health insurance claim was settled in 11 days flat. The case manager kept me posted at every step — no chasing, no hidden charges. Saved my family during a tough time.',           name:'Rohit Kapoor',  role:'Mumbai',    productUsed:'Health · ₹8L cashless claim · 2024' },
      { quote:'Compared 14 motor policies in 2 minutes. Saved ₹4,200 on annual premium vs renewing direct with my old insurer. The whole thing took 5 minutes including the payment.',                name:'Priya Iyer',    role:'Bangalore', productUsed:'Car · zero-dep · 2024' },
      { quote:'Got a term cover of ₹1.5 crore at half the premium I was paying earlier. The advisor explained every clause — no jargon, no upselling, no commission spiel.',                          name:'Anil Gupta',    role:'Pune',      productUsed:'Term Life · ₹1.5 Cr · 2024' }
    ],
    ctaHeadline: 'Get the right cover. In 30 seconds.',
    ctaBody: 'Quotes from every major insurer, side-by-side. No commission added, no obligation, no spam — just a fair comparison.',
    ctaButton: 'Compare Now',
    ctaNote: 'Free comparison · No obligation · IRDAI Lic. CB-XXX/2014',
    email: 'help@coverwise.in',
    phone: '1800 200 5000',
    address: 'Lower Parel, Mumbai 400013',
    hours: 'Mon–Sat · 9:00 AM – 9:00 PM IST'
  };
}

// ── Per-template data picker ──────────────────────────────────
function sampleFor(templateId) {
  if (templateId === 'template-2')  return agencySample();
  if (templateId === 'template-3')  return terminalSample();
  if (templateId === 'template-4')  return web3Sample();
  if (templateId === 'template-5')  return localSample();
  if (templateId === 'template-6')  return bfsiSample();
  if (templateId === 'template-7')  return startupSample();
  if (templateId === 'template-8')  return insuranceSample();
  if (templateId === 'template-9')  return nbfcSample();
  if (templateId === 'template-10') return restaurantSample();
  if (templateId === 'template-11') return portfolioSample();
  if (templateId === 'template-12') return insurtechSample();
  if (templateId === 'template-13') return insuranceMarketSample();
  return commonSample;
}

// ── Render one template safely ────────────────────────────────
function renderOne(n) {
  const file = path.join(__dirname, `website-template-${n}.ejs`);
  if (!fs.existsSync(file)) {
    return { ok: false, html: errorPage(n, `Template file not found: ${file}`) };
  }
  const tpl = fs.readFileSync(file, 'utf8');
  const data = buildTemplateData(sampleFor(`template-${n}`));
  try {
    const html = ejs.render(tpl, data, { filename: file });
    return { ok: true, html };
  } catch (err) {
    return { ok: false, html: errorPage(n, err.message) };
  }
}

function errorPage(n, message) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Template ${n} — error</title>
<style>
  body{font-family:system-ui,sans-serif;background:#1a1315;color:#f5e1d0;padding:32px;line-height:1.6}
  h1{color:#ff8c7a;font-size:1.1rem;margin-bottom:10px}
  pre{background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:14px;font-size:.78rem;white-space:pre-wrap;word-break:break-word;color:#ffbea8}
  p{font-size:.85rem;color:rgba(245,225,208,.7);margin-top:12px}
</style>
</head><body>
  <h1>Template ${n} couldn't render</h1>
  <p>This template hasn't been updated to the new schema pattern yet. It expects specific data keys that aren't in the sample.</p>
  <pre>${String(message).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>
</body></html>`;
}

// ── Write previews + side-by-side index ───────────────────────
const OUTDIR = __dirname;
const TEMPLATES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const NAMES = {
  1: 'Editorial',   2: 'Agency',     3: 'Terminal',  4: 'Web3',
  5: 'Local',       6: 'BFSI',       7: 'Startup',   8: 'Insurance',
  9: 'NBFC',       10: 'Restaurant', 11: 'Portfolio',
  12: 'InsurTech SaaS', 13: 'Insurance Market'
};

const results = TEMPLATES.map(n => {
  const r = renderOne(n);
  const outPath = path.join(OUTDIR, `preview-${n}.html`);
  fs.writeFileSync(outPath, r.html);
  return { n, ok: r.ok, outPath, file: `preview-${n}.html` };
});

// Print summary
console.log('\nRender results:');
results.forEach(r => console.log(`  ${r.ok ? '✓' : '✗'}  template-${r.n}  (${NAMES[r.n]})`));

// ── Build the side-by-side index ──────────────────────────────
const indexHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Template Preview — side by side</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --bg:       #09080c;
      --bg-card:  #100e13;
      --border:   rgba(255,210,140,.1);
      --text:     #f5f0e8;
      --text-soft:rgba(245,240,232,.6);
      --accent:   #e8a030;
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}

    .topbar{
      position:sticky;top:0;z-index:10;
      background:rgba(9,8,12,.92);backdrop-filter:blur(14px);
      border-bottom:1px solid var(--border);
      padding:14px 28px;display:flex;align-items:center;gap:20px;flex-wrap:wrap
    }
    .brand{font-weight:800;letter-spacing:-.02em;font-size:1rem}
    .brand em{font-style:normal;color:var(--accent)}
    .toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .tool-label{font-size:.75rem;color:var(--text-soft);margin-right:6px}
    .chip{
      background:var(--bg-card);border:1px solid var(--border);
      color:var(--text-soft);font-size:.78rem;font-weight:500;
      padding:7px 14px;border-radius:100px;cursor:pointer;
      transition:all .2s
    }
    .chip:hover{color:var(--text);border-color:rgba(232,160,48,.35)}
    .chip.active{background:rgba(232,160,48,.14);border-color:var(--accent);color:var(--accent)}

    .grid{
      display:grid;gap:22px;padding:26px;
      grid-template-columns:repeat(auto-fit,minmax(var(--col-width,520px),1fr))
    }
    .grid.cols-1{grid-template-columns:1fr}
    .grid.cols-2{grid-template-columns:repeat(2,1fr)}
    .grid.cols-3{grid-template-columns:repeat(3,1fr)}
    .grid.cols-4{grid-template-columns:repeat(4,1fr)}

    .card{
      background:var(--bg-card);border:1px solid var(--border);
      border-radius:14px;overflow:hidden;
      display:flex;flex-direction:column
    }
    .card-head{
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 16px;border-bottom:1px solid var(--border);
      background:rgba(255,255,255,.02)
    }
    .card-title{font-size:.88rem;font-weight:700}
    .card-title small{color:var(--text-soft);font-weight:400;margin-left:8px;font-size:.72rem}
    .card-actions{display:flex;gap:6px}
    .icon-btn{
      background:transparent;border:1px solid var(--border);color:var(--text-soft);
      width:28px;height:28px;border-radius:6px;cursor:pointer;
      display:inline-flex;align-items:center;justify-content:center;
      font-size:.8rem;transition:all .2s
    }
    .icon-btn:hover{color:var(--accent);border-color:var(--accent)}

    .frame-wrap{
      position:relative;background:#fff;
      display:flex;align-items:flex-start;justify-content:center;
      overflow:auto
    }
    .frame-wrap iframe{
      border:none;display:block;
      transform-origin:top left;
      background:#fff
    }
    .status-bad{
      position:absolute;top:10px;right:10px;
      background:rgba(248,113,113,.18);color:#fca5a5;
      border:1px solid rgba(248,113,113,.4);
      padding:4px 10px;border-radius:100px;
      font-size:.68rem;font-weight:700;letter-spacing:.05em
    }

    .hint{text-align:center;color:var(--text-soft);font-size:.75rem;padding:20px}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand">Template<em>Preview</em></div>

    <div class="toolbar">
      <span class="tool-label">Columns:</span>
      <button class="chip" data-cols="1">1</button>
      <button class="chip active" data-cols="2">2</button>
      <button class="chip" data-cols="3">3</button>
      <button class="chip" data-cols="4">4</button>
    </div>

    <div class="toolbar">
      <span class="tool-label">Viewport:</span>
      <button class="chip active" data-viewport="desktop">Desktop</button>
      <button class="chip" data-viewport="tablet">Tablet</button>
      <button class="chip" data-viewport="mobile">Mobile</button>
    </div>

    <div class="toolbar">
      <span class="tool-label">Show:</span>
      <button class="chip active" data-filter="all">All</button>
      <button class="chip" data-filter="schema">Schema-driven only</button>
    </div>
  </div>

  <div class="grid cols-2" id="grid">
${results.map(r => `    <article class="card" data-template="${r.n}" data-schema="${[2,3,4,5,6,7,8,9,10,11,12,13].includes(r.n) ? 'yes' : 'no'}">
      <div class="card-head">
        <div class="card-title">${NAMES[r.n]}<small>template-${r.n}</small></div>
        <div class="card-actions">
          <a class="icon-btn" href="preview-${r.n}.html" target="_blank" title="Open full-size in new tab">↗</a>
        </div>
      </div>
      <div class="frame-wrap">
        <iframe src="preview-${r.n}.html" loading="lazy" title="Template ${r.n}"></iframe>
        ${r.ok ? '' : '<span class="status-bad">crashed</span>'}
      </div>
    </article>`).join('\n')}
  </div>

  <div class="hint">Tip: click "↗" to open a template full-size in a new tab. Viewport toggles resize all frames at once.</div>

<script>
  /* Viewport widths (what the iframe content is rendered at) */
  const VP_WIDTHS = { desktop: 1280, tablet: 900, mobile: 420 };
  /* Column → visible card height (the aspect box). Desktop content is taller so columns=1 gets more height. */
  const HEIGHT_BY_COLS = { 1: 1200, 2: 820, 3: 640, 4: 500 };

  const grid = document.getElementById('grid');
  const state = { cols: 2, viewport: 'desktop', filter: 'all' };

  function applyChips(groupAttr, activeValue) {
    document.querySelectorAll('.chip[' + groupAttr + ']').forEach(c => {
      c.classList.toggle('active', c.getAttribute(groupAttr) === activeValue);
    });
  }

  function layout() {
    grid.className = 'grid cols-' + state.cols;
    const vpW = VP_WIDTHS[state.viewport];
    const cardHeight = HEIGHT_BY_COLS[state.cols];

    document.querySelectorAll('.card').forEach(card => {
      const isSchema = card.getAttribute('data-schema') === 'yes';
      const show = state.filter === 'all' || (state.filter === 'schema' && isSchema);
      card.style.display = show ? 'flex' : 'none';

      const wrap = card.querySelector('.frame-wrap');
      const frame = card.querySelector('iframe');
      wrap.style.height = cardHeight + 'px';

      // Calculate how much to scale down the iframe so its vpW matches the card width
      const cardW = card.clientWidth;
      if (cardW > 0) {
        const scale = Math.min(1, cardW / vpW);
        frame.style.width = vpW + 'px';
        frame.style.height = (cardHeight / scale) + 'px';
        frame.style.transform = 'scale(' + scale + ')';
      }
    });
  }

  document.querySelectorAll('.chip[data-cols]').forEach(c => c.addEventListener('click', () => {
    state.cols = parseInt(c.getAttribute('data-cols'), 10);
    applyChips('data-cols', String(state.cols));
    layout();
  }));
  document.querySelectorAll('.chip[data-viewport]').forEach(c => c.addEventListener('click', () => {
    state.viewport = c.getAttribute('data-viewport');
    applyChips('data-viewport', state.viewport);
    layout();
  }));
  document.querySelectorAll('.chip[data-filter]').forEach(c => c.addEventListener('click', () => {
    state.filter = c.getAttribute('data-filter');
    applyChips('data-filter', state.filter);
    layout();
  }));

  window.addEventListener('resize', () => {
    clearTimeout(window._lt); window._lt = setTimeout(layout, 120);
  });
  requestAnimationFrame(layout);
</script>
</body>
</html>
`;

const indexOut = path.join(OUTDIR, 'preview-all.html');
fs.writeFileSync(indexOut, indexHtml);

const okCount = results.filter(r => r.ok).length;
console.log(`\n✓ Wrote ${results.length} preview files + preview-all.html`);
console.log(`  ${okCount}/${results.length} templates rendered cleanly`);
console.log(`\nOpen:  ${path.relative(process.cwd(), indexOut)}`);
