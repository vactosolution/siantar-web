-- Migration: Fix payment-proofs bucket visibility, add driver DANA field & payment rejection reason
-- Date: 2026-04-09

-- 1. Make payment-proofs bucket PUBLIC so uploaded proof images can be viewed
UPDATE storage.buckets SET public = true WHERE id = 'payment-proofs';

-- 2. Add payment_rejection_reason to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT;

-- 3. Add dana_number to profiles table for drivers
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dana_number TEXT;

-- 4. Add index for faster cancelled order queries
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
