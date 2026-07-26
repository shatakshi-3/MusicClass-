-- ============================================================
-- Music Class Dashboard — Migration V2
-- Adds student types (Monthly/Exam), installment-based payments,
-- updated subjects, and new fee structures.
-- Run this in the Supabase SQL Editor AFTER the initial schema.
-- ============================================================

-- ============================================================
-- 1. ADD student_type AND exam_year TO students
-- ============================================================
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_type text NOT NULL DEFAULT 'MONTHLY';
ALTER TABLE students ADD COLUMN IF NOT EXISTS exam_year integer;

-- Migrate existing students: set all to MONTHLY
UPDATE students SET student_type = 'MONTHLY' WHERE student_type IS NULL OR student_type = '';

-- Index for filtering by student type
CREATE INDEX IF NOT EXISTS idx_students_student_type ON students(student_type);

-- ============================================================
-- 2. ADD installment tracking columns to fee_payments
-- ============================================================
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS total_fee numeric NOT NULL DEFAULT 0;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS remaining_balance numeric NOT NULL DEFAULT 0;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS installment_number integer NOT NULL DEFAULT 1;
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS payment_mode text;

-- For existing payment records, set total_fee and amount_paid = amount (backward compat)
UPDATE fee_payments
SET total_fee = amount,
    amount_paid = CASE WHEN status = 'Paid' THEN amount ELSE 0 END,
    remaining_balance = CASE WHEN status = 'Paid' THEN 0 ELSE amount END
WHERE total_fee = 0;

-- ============================================================
-- 3. UPDATE exam_fee_structure TO NEW FEE VALUES
-- ============================================================
UPDATE exam_fee_structure SET exam_fee = 7500 WHERE exam_year = 1;
UPDATE exam_fee_structure SET exam_fee = 8000 WHERE exam_year = 2;
UPDATE exam_fee_structure SET exam_fee = 8500 WHERE exam_year = 3;
UPDATE exam_fee_structure SET exam_fee = 9000 WHERE exam_year = 4;
UPDATE exam_fee_structure SET exam_fee = 9500 WHERE exam_year = 5;
UPDATE exam_fee_structure SET exam_fee = 10000 WHERE exam_year = 6;

-- ============================================================
-- 4. UPDATE instrument_fees — add Harmonium, set all to ₹700
-- ============================================================
INSERT INTO instrument_fees (instrument_name, monthly_fee) VALUES
  ('Harmonium', 700)
ON CONFLICT (instrument_name) DO NOTHING;

-- Set all monthly fees to ₹700 (flat rate for all subjects)
UPDATE instrument_fees SET monthly_fee = 700;

-- ============================================================
-- 5. ADD columns to exam_registrations for payment tracking
-- ============================================================
ALTER TABLE exam_registrations ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0;
ALTER TABLE exam_registrations ADD COLUMN IF NOT EXISTS remaining_balance numeric NOT NULL DEFAULT 0;
ALTER TABLE exam_registrations ADD COLUMN IF NOT EXISTS installment_number integer NOT NULL DEFAULT 0;

-- Backfill existing exam registrations
UPDATE exam_registrations
SET amount_paid = CASE WHEN payment_status = 'Paid' THEN exam_fee ELSE 0 END,
    remaining_balance = CASE WHEN payment_status = 'Paid' THEN 0 ELSE exam_fee END
WHERE amount_paid = 0 AND remaining_balance = 0;

-- ============================================================
-- DONE — Migration V2 Complete
-- ============================================================
