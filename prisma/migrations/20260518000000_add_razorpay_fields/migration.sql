-- ================================================================
-- Add Razorpay-specific fields to payments table
-- Generated: 2026-05-18
-- Apply with: npx prisma migrate deploy
-- ================================================================

ALTER TABLE `payments`
  ADD COLUMN `razorpayOrderId`   VARCHAR(64) NULL,
  ADD COLUMN `razorpayPaymentId` VARCHAR(64) NULL;
