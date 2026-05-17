'use strict';

/**
 * Prisma seed — populates the templates catalogue and an initial admin user.
 *
 * Run after `prisma migrate deploy`:
 *
 *   npm run db:seed
 *
 * Idempotent — uses upserts so re-running won't duplicate or overwrite
 * existing customer data.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TEMPLATES = [
  { templateId: 'template-1',  displayName: 'Editorial / Magazine',   isPublished: false },
  { templateId: 'template-2',  displayName: 'Agency / Professional',  isPublished: false },
  { templateId: 'template-3',  displayName: 'Terminal / Dev Studio',  isPublished: false },
  { templateId: 'template-4',  displayName: 'Web3 / Protocol',        isPublished: false },
  { templateId: 'template-5',  displayName: 'Local Service',          isPublished: true  },
  { templateId: 'template-6',  displayName: 'BFSI / Banking',         isPublished: false },
  { templateId: 'template-7',  displayName: 'Startup / SaaS',         isPublished: false },
  { templateId: 'template-8',  displayName: 'Insurance Advisor',      isPublished: true  },
  { templateId: 'template-9',  displayName: 'NBFC / Lender',          isPublished: false },
  { templateId: 'template-10', displayName: 'Restaurant / Café',      isPublished: false },
  { templateId: 'template-11', displayName: 'Portfolio / Freelancer', isPublished: false },
  { templateId: 'template-12', displayName: 'InsurTech SaaS',         isPublished: true  },
  { templateId: 'template-13', displayName: 'Insurance Market',       isPublished: true  }
];

async function seedTemplates() {
  for (const t of TEMPLATES) {
    await prisma.template.upsert({
      where:  { templateId: t.templateId },
      update: { displayName: t.displayName, isPublished: t.isPublished },
      create: t
    });
  }
  console.log(`✓ Seeded ${TEMPLATES.length} templates`);
}

async function seedBootstrapAdmin() {
  const email = process.env.AUTH0_BOOTSTRAP_ADMIN_EMAIL;
  if (!email) {
    console.log('· AUTH0_BOOTSTRAP_ADMIN_EMAIL not set — skipping admin seed.');
    return;
  }

  // We don't know the Auth0 sub until the user signs in for the first time,
  // so we use a placeholder. The auth middleware (src/lib/auth.js) will
  // update auth0Id on the first real sign-in via getOrCreateUser().
  const auth0Id = `bootstrap|${email}`;

  await prisma.user.upsert({
    where:  { email },
    update: { role: 'ADMIN' },
    create: { auth0Id, email, role: 'ADMIN', name: 'Bootstrap Admin' }
  });

  console.log(`✓ Ensured admin user exists: ${email}`);
  console.log('  When this email signs in via Auth0 the first time,');
  console.log('  the bootstrap auth0Id will be replaced with the real one.');
}

async function main() {
  await seedTemplates();
  await seedBootstrapAdmin();
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
