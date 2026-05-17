'use strict';

/**
 * ─────────────────────────────────────────────────────────────────
 *  PAYMENTS — Integration seam for the deployment team
 * ─────────────────────────────────────────────────────────────────
 *
 *  The current implementation is an in-memory dummy store, used by
 *  the demo at /api/pay → /api/generate. It is intentionally tiny
 *  so the deployer can see every line they need to replace.
 *
 *  Three function shapes the rest of the codebase calls into:
 *
 *    createPayment({ userId, templateId, amount, currency })
 *      → returns { paymentId, orderId, providerData }
 *      The frontend uses providerData to open the gateway widget.
 *
 *    verifyWebhook({ headers, rawBody })
 *      → returns { ok, paymentId, status } or throws
 *      Wire this to POST /api/payments/webhook in server.js (TODO).
 *
 *    consumePayment(paymentId)
 *      → atomic "this payment was used for a download" mark.
 *      Already called by /api/generate — do not rename without
 *      updating server.js.
 *
 *  ─────────────────────────────────────────────────────────────────
 *  HANDOFF / TODO (Razorpay — recommended for India):
 *    1. npm i razorpay
 *    2. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET
 *       in .env (see .env.example).
 *    3. Replace the `createPayment` body below with the commented
 *       Razorpay block.
 *    4. Implement `verifyWebhook` (signature check with
 *       crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)) and
 *       add the route in server.js.
 *    5. Persist the row with `prisma.payment.create({ data: {...} })`
 *       so refunds and download history survive restarts.
 *  ─────────────────────────────────────────────────────────────────
 */

const crypto = require('crypto');

const PAYMENT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const PROVIDER = (process.env.PAYMENT_PROVIDER || 'dummy').toLowerCase();

// In-memory dummy store. Replaced by prisma.payment rows in prod.
const payments = new Map();

// ─── Dummy implementation (current demo path) ────────────────────

function createDummyPayment({ userId = null, templateId, amount = 900, currency = 'INR' } = {}) {
  const paymentId = 'dummy_' + crypto.randomBytes(12).toString('hex');
  payments.set(paymentId, {
    paymentId,
    userId,
    templateId,
    amount,
    currency,
    status: 'CREATED',
    createdAt: Date.now(),
    usedAt: null
  });
  return {
    paymentId,
    orderId: paymentId,                // gateways usually return a separate orderId
    providerData: { provider: 'dummy', amount, currency }
  };
}

function consumePayment(paymentId) {
  const p = payments.get(paymentId);
  if (!p)       return { ok: false, reason: 'Invalid payment' };
  if (p.usedAt) return { ok: false, reason: 'Payment already used' };
  if (Date.now() - p.createdAt > PAYMENT_TTL_MS) {
    return { ok: false, reason: 'Payment expired' };
  }
  p.usedAt = Date.now();
  p.status = 'PAID';
  return { ok: true };
}

// ─── Razorpay scaffold (uncomment + npm i razorpay to enable) ────
//
// const Razorpay = require('razorpay');
// const rzp = new Razorpay({
//   key_id:     process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });
//
// async function createRazorpayPayment({ userId, templateId, amount = 900, currency = 'INR' }) {
//   const order = await rzp.orders.create({
//     amount,                          // in paise — ₹9 = 900
//     currency,
//     receipt: `tpl_${templateId}_${Date.now()}`,
//     notes:   { userId, templateId }
//   });
//   // Persist:
//   //   await prisma.payment.create({
//   //     data: { paymentId: order.id, userId, templateId, amount, currency, status: 'CREATED' }
//   //   });
//   return {
//     paymentId:    order.id,
//     orderId:      order.id,
//     providerData: { provider: 'razorpay', keyId: process.env.RAZORPAY_KEY_ID, amount, currency }
//   };
// }
//
// function verifyRazorpayWebhook({ headers, rawBody }) {
//   const signature = headers['x-razorpay-signature'];
//   const expected  = crypto
//     .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
//     .update(rawBody)
//     .digest('hex');
//   if (signature !== expected) throw new Error('Invalid webhook signature');
//   const event = JSON.parse(rawBody);
//   return {
//     ok: true,
//     paymentId: event.payload.payment.entity.order_id,
//     status:    event.event === 'payment.captured' ? 'PAID' : 'FAILED'
//   };
// }

// ─── Stripe scaffold (alternative for global) ─────────────────────
//
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
//
// async function createStripePayment({ userId, templateId, amount = 900, currency = 'usd' }) {
//   const session = await stripe.checkout.sessions.create({
//     mode: 'payment',
//     payment_method_types: ['card'],
//     line_items: [{ price_data: { currency, product_data: { name: `BeyondSite ${templateId}` }, unit_amount: amount }, quantity: 1 }],
//     success_url: `${process.env.APP_URL}/generate?paymentId={CHECKOUT_SESSION_ID}`,
//     cancel_url:  `${process.env.APP_URL}/cancel`,
//     metadata:    { userId, templateId }
//   });
//   return { paymentId: session.id, orderId: session.id, providerData: { provider: 'stripe', url: session.url } };
// }

// ─── Public surface — dispatcher swaps based on PAYMENT_PROVIDER ──

function createPayment(args) {
  if (PROVIDER === 'razorpay') {
    throw new Error('Razorpay not wired. Uncomment the scaffold above and npm i razorpay.');
  }
  if (PROVIDER === 'stripe') {
    throw new Error('Stripe not wired. Uncomment the scaffold above and npm i stripe.');
  }
  return createDummyPayment(args);
}

function verifyWebhook(/* { headers, rawBody } */) {
  throw new Error('verifyWebhook is not implemented for the dummy provider. Wire Razorpay/Stripe first.');
}

module.exports = {
  // Legacy exports — preserved so existing server.js calls keep working
  payments,
  PAYMENT_TTL_MS,
  consumePayment,
  // New deployment surface
  createPayment,
  verifyWebhook,
  PROVIDER
};
