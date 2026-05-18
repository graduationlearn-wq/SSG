'use strict';

const crypto = require('crypto');

const PAYMENT_TTL_MS = 30 * 60 * 1000;
const PROVIDER = (process.env.PAYMENT_PROVIDER || 'dummy').toLowerCase();

// In-memory store — replaced by prisma.payment rows once DB is connected
const payments = new Map();

// ─── Dummy ──────────────────────────────────────────────────────────────────

function createDummyPayment({ userId = null, templateId, amount = 499900, currency = 'INR' } = {}) {
  const paymentId = 'dummy_' + crypto.randomBytes(12).toString('hex');
  payments.set(paymentId, {
    paymentId, userId, templateId, amount, currency,
    status: 'PAID',       // dummy skips checkout so goes straight to PAID
    createdAt: Date.now(),
    usedAt: null
  });
  return {
    paymentId,
    orderId: paymentId,
    providerData: { provider: 'dummy', amount, currency }
  };
}

// ─── Razorpay ────────────────────────────────────────────────────────────────

let _rzp = null;
function getRzp() {
  if (!_rzp) {
    const Razorpay = require('razorpay');
    _rzp = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }
  return _rzp;
}

async function createRazorpayPayment({ userId = null, templateId, amount = 499900, currency = 'INR' } = {}) {
  const rzp = getRzp();
  const order = await rzp.orders.create({
    amount,
    currency,
    receipt: `tpl_${templateId}_${Date.now()}`,
    notes: { userId: userId || 'guest', templateId }
  });
  payments.set(order.id, {
    paymentId:  order.id,
    userId,
    templateId,
    amount,
    currency,
    status:     'CREATED',   // becomes PAID after verifyRazorpaySignature succeeds
    createdAt:  Date.now(),
    usedAt:     null,
    razorpayPaymentId: null
  });
  return {
    paymentId:    order.id,
    orderId:      order.id,
    providerData: { provider: 'razorpay', keyId: process.env.RAZORPAY_KEY_ID, amount, currency }
  };
}

// Called from /api/payments/verify after the Razorpay checkout succeeds client-side
function verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  return expected === razorpay_signature;
}

// Mark payment PAID after client-side signature is verified
function markPaymentPaid(orderId, razorpayPaymentId) {
  const p = payments.get(orderId);
  if (!p) return false;
  p.status = 'PAID';
  p.razorpayPaymentId = razorpayPaymentId || null;
  return true;
}

// ─── Webhook (server-to-server Razorpay events) ───────────────────────────────

function verifyRazorpayWebhook({ headers, rawBody }) {
  const signature = headers['x-razorpay-signature'];
  const expected  = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  if (signature !== expected) throw new Error('Invalid webhook signature');
  const event = JSON.parse(rawBody);
  return {
    ok:        true,
    paymentId: event.payload.payment.entity.order_id,
    status:    event.event === 'payment.captured' ? 'PAID' : 'FAILED'
  };
}

// ─── consumePayment — called by /api/generate before zipping ─────────────────

function consumePayment(paymentId) {
  const p = payments.get(paymentId);
  if (!p)       return { ok: false, reason: 'Invalid payment' };
  if (p.usedAt) return { ok: false, reason: 'Payment already used' };
  if (Date.now() - p.createdAt > PAYMENT_TTL_MS) return { ok: false, reason: 'Payment expired' };
  // Razorpay orders must pass /api/payments/verify before they can gate a download
  if (PROVIDER === 'razorpay' && p.status !== 'PAID') return { ok: false, reason: 'Payment not verified' };
  p.usedAt = Date.now();
  p.status = 'PAID';
  return { ok: true };
}

// ─── Public dispatcher ────────────────────────────────────────────────────────

async function createPayment(args) {
  if (PROVIDER === 'razorpay') return createRazorpayPayment(args);
  return createDummyPayment(args);
}

function verifyWebhook(opts) {
  if (PROVIDER === 'razorpay') return verifyRazorpayWebhook(opts);
  throw new Error('verifyWebhook is not implemented for the dummy provider');
}

module.exports = {
  payments,
  PAYMENT_TTL_MS,
  PROVIDER,
  consumePayment,
  createPayment,
  verifyWebhook,
  verifyRazorpaySignature,
  markPaymentPaid
};
