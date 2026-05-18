# Deployment Guide

This guide walks the tech team through taking BeyondSite from "intern repo on GitHub" to "running production URL with real auth, real DB, and real payments." Every step has been scaffolded — the work below is configuration + small code swaps, not new implementation.

> **Reviewer demo path?** Skip this guide and read [README.md](./README.md) → Quick Start. The app boots end-to-end without a DB, without Auth0, and without a payment gateway.

---

## What's ready vs. what you'll wire

| Concern             | Status      | What you do                                                                    |
|---                  |---          |---                                                                              |
| Container build     | ✅ Ready    | `docker build -t beyondsite .` — multi-stage, non-root, healthcheck             |
| MySQL schema        | ✅ Ready    | `prisma/migrations/20260515000000_init/migration.sql` — apply with `npm run db:migrate:deploy` |
| Seed data           | ✅ Ready    | `npm run db:seed` — upserts 13 templates + first admin                          |
| Auth0 middleware    | ✅ Ready    | Set `AUTH0_DOMAIN` + `AUTH0_AUDIENCE` → activates automatically                 |
| Login route swap    | 🟡 Manual   | Replace `DUMMY_USERS` block in `server.js` + add `/auth/google` routes (HANDOFF comment shows the recipe)   |
| Razorpay / Stripe   | 🟡 Manual   | Uncomment the scaffold in `src/lib/payments.js`, set env vars, wire webhook    |
| Logging             | ✅ Ready    | Winston JSON in prod, pipes to stdout (Datadog / CloudWatch / Loki pick up)    |
| CI                  | ✅ Ready    | `.github/workflows/ci.yml` already passes on every push                         |
| Hosting             | 🟡 You pick | Render / Railway / DigitalOcean / Fly / EKS — all work with the Docker image    |
| Domain + TLS        | 🟡 You pick | Most hosts handle TLS automatically. Get a `.in` from BigRock / GoDaddy India  |
| Storage (uploads)   | 🟡 Optional | Default = local disk. Set `UPLOAD_STORAGE=s3` + `AWS_*` to switch to S3        |

Three "manual" items above are the real wiring work. Everything else is set-the-env-var.

---

## Step-by-step

### 1. Provision the infrastructure

You need three external services:

- **A MySQL 8 database.** AWS RDS, PlanetScale, DigitalOcean Managed MySQL, or just MySQL on a droplet. Whatever the team prefers. Note the `mysql://user:pass@host:3306/dbname` connection string.
- **An Auth0 tenant.** Free tier is fine for years. In the Auth0 dashboard:
  - Create an API → note the **Audience** (e.g. `https://api.beyondsite.com`)
  - Create a SPA Application → note the **Domain** and **Client ID**
  - Enable **Google OAuth**: Go to Authentication → Connections → Social → Google → enable and configure allowed domains
  - (Optional) Add a Login Action that sets a `https://beyondSure.com/role` custom claim so users come back from Auth0 already tagged as `admin` or `customer`
- **A container host.** Render is the easiest — free tier, auto-deploy on git push, zero config. Railway and Fly are also good. EKS / ECS work too if the team is already on AWS.

Optional but recommended:

- A **payment gateway account** — Razorpay (India) or Stripe (global). Both have test modes; you do not need to take real charges to deploy.
- An **S3 bucket** for user-uploaded images. Default is local disk, which is fine for a single-replica deploy but breaks when you scale horizontally.

### 2. Apply the database schema

```bash
# Set DATABASE_URL in your environment first
export DATABASE_URL="mysql://app_user:password@your-host:3306/beyondsite"

# Generate the Prisma client
npm run db:generate

# Apply the init migration → creates 6 tables + indexes + foreign keys
npm run db:migrate:deploy

# Seed the templates catalogue + first admin user
npm run db:seed
```

Verify with:

```bash
npx prisma studio
# Opens http://localhost:5555 — browse your fresh DB
```

You should see the `templates` table populated with 13 rows and one `users` row matching `AUTH0_BOOTSTRAP_ADMIN_EMAIL`.

### 3. Configure environment variables

Start from `.env.example` and fill in. The minimum set for a real deploy:

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=mysql://app_user:password@host:3306/beyondsite

AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.beyondsite.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...

GEMINI_API_KEY=...
GROQ_API_KEY=...

AUTH0_BOOTSTRAP_ADMIN_EMAIL=you@yourcompany.com
```

If you're enabling Razorpay or Stripe:

```env
PAYMENT_PROVIDER=razorpay              # or stripe
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

If you're enabling S3 uploads:

```env
UPLOAD_STORAGE=s3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=beyondsite-uploads
```

### 4. Swap the dummy login for Auth0

Open `server.js`, find the `// HANDOFF — Replace the DUMMY_USERS path below` block, and follow the 5-step recipe in the comment. The new `/api/login` handler should:

1. Receive the JWT from the Auth0 client SDK on the frontend.
2. Call `verifyToken(token)` from `src/lib/auth.js`.
3. Call `getOrCreateUser(decoded)` — this upserts the user via Prisma.
4. Return `{ success, isAdmin, email, name }` same shape as before.

Once that's working, remove the `DUMMY_USERS` constant entirely.

**Google OAuth routes** (optional but recommended):

Add these routes in `server.js` before the existing auth routes:

```js
// Google OAuth - redirect to Auth0
app.get('/auth/google', (req, res) => {
  const redirectUri = `${process.env.APP_URL}/auth/google/callback`;
  const authUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?` +
    `response_type=code&` +
    `client_id=${process.env.AUTH0_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `scope=openid profile email`;
  res.redirect(authUrl);
});

// Google OAuth callback - exchange code for token
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    const tokenResponse = await axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      code,
      redirect_uri: `${process.env.APP_URL}/auth/google/callback`
    });

    const { access_token } = tokenResponse.data;
    const decoded = await verifyToken(access_token);
    const user = await getOrCreateUser(decoded);

    // Set session and redirect to home with token
    res.redirect(`/login?token=${access_token}&email=${encodeURIComponent(user.email)}&isAdmin=${user.role === 'ADMIN'}`);
  } catch (err) {
    logger.error({ error: err.message }, 'Google auth callback failed');
    res.redirect('/login?error=auth_failed');
  }
});
```

### 5. Swap the dummy payment for Razorpay (or Stripe)

Open `src/lib/payments.js`. Uncomment the **Razorpay scaffold** block. Install the SDK:

```bash
npm install razorpay
```

Add a webhook route in `server.js`:

```js
const { verifyWebhook } = require('./src/lib/payments');

app.post('/api/payments/webhook',
  express.raw({ type: 'application/json' }),  // raw body for signature check
  async (req, res) => {
    try {
      const result = verifyWebhook({ headers: req.headers, rawBody: req.body });
      // Mark payment as PAID in Prisma so /api/generate accepts it
      await prisma.payment.update({
        where: { paymentId: result.paymentId },
        data:  { status: result.status }
      });
      res.json({ ok: true });
    } catch (e) {
      logger.error({ error: e.message }, 'Webhook verification failed');
      res.status(400).json({ error: 'Invalid webhook' });
    }
  }
);
```

Register the webhook URL in the Razorpay dashboard pointing at `https://your-domain.com/api/payments/webhook` and copy the webhook secret into `RAZORPAY_WEBHOOK_SECRET`.

### 6. Deploy the container

```bash
# Build
docker build -t beyondsite:latest .

# Push to your registry (example: GitHub Container Registry)
docker tag beyondsite:latest ghcr.io/beyondsure/beyondsite:latest
docker push ghcr.io/beyondsure/beyondsite:latest

# Or use docker-compose locally to smoke-test the full stack first:
docker compose up --build
```

On Render / Railway / Fly, point the service at the image and paste in the env vars. The HEALTHCHECK in the Dockerfile pings `/health` every 30s — the host will route traffic only after it returns 200.

### 7. Smoke-test the production deploy

After the first deploy, run through:

```bash
# 1. Health check returns ok + db ok
curl https://your-domain.com/health
# → {"status":"ok","checks":{"database":"ok"}}

# 2. Auth0 sign-in works
# Open https://your-domain.com/login → click sign in → Auth0 hosted page → redirected back

# 3. The bootstrap admin sees the admin UI
# Sign in as AUTH0_BOOTSTRAP_ADMIN_EMAIL → /profile should show "Admin · Bypass Enabled"

# 4. Customer flow works end-to-end
# Sign in as a non-admin → fill required fields → preview → pay (test mode) → download ZIP

# 5. Logs are flowing
docker logs <container> | head -20
# → JSON lines with timestamp, level, message, requestId
```

If any step fails, the README's "Troubleshooting" table covers the common issues.

---

## Manual Test Checklist

Run these tests after deployment to verify everything works:

### 1. Template Rendering (Critical)
```bash
# Verify all 4 published templates render correctly
cd templates && node preview-test.js
# Expected: "13/13 templates rendered cleanly" (or at least 4 published ones)

# Verify preview HTML files exist for published templates
ls -la preview-5.html preview-8.html preview-12.html preview-13.html
```

### 2. Configuration
```bash
# Verify config.yaml is valid YAML
node -e "require('js-yaml').load(require('fs').readFileSync('config.yaml'))"

# Verify required environment variables are set
echo $DATABASE_URL
echo $AUTH0_DOMAIN
echo $AUTH0_AUDIENCE
```

### 3. Docker Build
```bash
# Build the container
docker build -t beyondsite .

# Run and test health endpoint
docker run -d -p 3001:3000 --name test beyondsite
curl http://localhost:3001/health
# Expected: {"status":"ok","checks":{"database":"ok"}}
docker rm -f test
```

### 4. Payment Flow (Test Mode)
```bash
# Create a payment
curl -X POST http://localhost:3000/api/pay
# Expected: {"success":true,"paymentId":"pay_...","amount":9}

# Verify payment works for generation
curl -X POST http://localhost:3000/api/generate -H "Content-Type: application/json" -d '{"templateId":"template-5","data":{...}}'
```

### 5. Authentication
```bash
# Test dummy login
curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d '{"email":"admin@beyondsite.com","password":"admin123"}'
# Expected: {"success":true,"role":"admin",...}

# Test protected route without auth
curl http://localhost:3000/profile
# Expected: 401 Unauthorized
```

### 6. End-to-End Flow
1. Open browser to http://localhost:3000
2. Select template (template-5, 8, 12, or 13)
3. Fill required fields: businessName, tagline, _description
4. Click preview - verify website renders
5. Click pay (dummy) - verify success
6. Click download - verify ZIP contains index.html + assets/

---

## Rollback

```bash
# Roll the container back to the previous tag
docker compose -f docker-compose.prod.yml down
docker pull ghcr.io/beyondsure/beyondsite:<previous-sha>
docker compose -f docker-compose.prod.yml up -d

# If a migration broke prod, rollback DB:
npx prisma migrate resolve --rolled-back 20260515000000_init
# Then manually revert the schema with the inverse SQL.
```

Prisma migrations are forward-only by default — if you need rollbacks, write `down.sql` files and apply them manually. For BeyondSite's scale this is fine; the init migration is the only schema change so far.

---

## Operational notes

- **Logs.** Winston outputs JSON on stdout in prod. Any aggregator that tails container stdout (Datadog, CloudWatch Container Insights, Loki, Better Stack) picks them up with zero config.
- **Metrics.** Not implemented yet. The `/health` endpoint is the only observability surface. If the team wants Prometheus metrics, add `prom-client` and expose `/metrics`.
- **Rate limits.** Per-route limits live in `server.js` (search for `rateLimit`). Defaults are conservative: 15 AI calls/hour, 10 downloads/hour, 30 chats/10min. Tune per traffic pattern.
- **Backups.** The DB host's automated backups cover the data layer. There is no application-level backup of uploaded user images — if you use local-disk storage and the container dies, those are lost. Switch to S3 (env-var flip) for durability.
- **Secrets rotation.** Auth0 client secret and Gemini/Groq keys should rotate quarterly. Update the env vars on the host and redeploy — no code change needed.

---

## What's still pending product-side

The deployer cannot fix these from the outside — they're roadmap items the BeyondSite team will pick up next:

- Wire `prisma.draft.*` and `prisma.website.*` calls into the form-save and generate paths. Schema and client exist; the request handlers still use in-memory state.
- Deterministic 4th-layer fallback for `/api/ai-section` (when both Gemini and Groq fail).
- Extract custom-cursor logic from inline `<script>` in `index.html` to `public/cursor.js`.
- Refactor `templates/website-template-1.ejs` to the safe-locals pattern.

See [`SiteMemory/roadmap/ROADMAP.md`](./SiteMemory/roadmap/ROADMAP.md) for the full backlog.

---

## Questions / contact

For questions about specific architectural decisions, read [`SiteMemory/decisions/ADR.md`](./SiteMemory/decisions/ADR.md) — every non-trivial choice is documented there with context, decision, and consequences. The code answers *what*, the ADRs answer *why*.
