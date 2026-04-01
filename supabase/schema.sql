-- ============================================================
-- Music Class Dashboard — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor to create all tables
-- ============================================================

-- 1. STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text NOT NULL,
  age         integer NOT NULL,
  parents_name text NOT NULL,
  instrument  text NOT NULL,
  centre      text NOT NULL,
  class_timing text NOT NULL,
  payment_type text NOT NULL DEFAULT 'REGULAR',
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. INSTRUMENT FEES
CREATE TABLE IF NOT EXISTS instrument_fees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_name text NOT NULL UNIQUE,
  monthly_fee     numeric NOT NULL DEFAULT 0
);

-- 3. FEE PAYMENTS
CREATE TABLE IF NOT EXISTS fee_payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount        numeric NOT NULL,
  payment_date  timestamptz NOT NULL,
  payment_type  text NOT NULL,
  period_label  text,
  status        text NOT NULL DEFAULT 'Pending',
  notes         text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 4. EXAM FEE STRUCTURE
CREATE TABLE IF NOT EXISTS exam_fee_structure (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_year integer NOT NULL UNIQUE,
  exam_fee  numeric NOT NULL DEFAULT 0
);

-- 5. EXAM REGISTRATIONS
CREATE TABLE IF NOT EXISTS exam_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_year       integer NOT NULL,
  centre          text NOT NULL,
  exam_fee        numeric NOT NULL,
  payment_status  text NOT NULL DEFAULT 'Pending',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id   ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_payment_date ON fee_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status       ON fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_exam_reg_student_id       ON exam_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_reg_exam_year        ON exam_registrations(exam_year);
CREATE INDEX IF NOT EXISTS idx_students_status           ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_centre           ON students(centre);
CREATE INDEX IF NOT EXISTS idx_students_instrument       ON students(instrument);

-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS on all tables. Permissive policies allow all
-- operations via the anon key since the app already has
-- session-based auth (iron-session) guarding all routes.
-- ============================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE instrument_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_fee_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_registrations ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated/anon users
CREATE POLICY "Allow all on students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on instrument_fees" ON instrument_fees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on fee_payments" ON fee_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on exam_fee_structure" ON exam_fee_structure FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on exam_registrations" ON exam_registrations FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SEED: Instrument fees (if empty)
-- ============================================================
INSERT INTO instrument_fees (instrument_name, monthly_fee) VALUES
  ('Guitar', 1200),
  ('Piano', 1500),
  ('Tabla', 1000),
  ('Vocal', 900),
  ('Keyboard', 1300),
  ('Violin', 1400)
ON CONFLICT (instrument_name) DO NOTHING;

-- ============================================================
-- SEED: Exam fee structure (if empty)
-- ============================================================
INSERT INTO exam_fee_structure (exam_year, exam_fee) VALUES
  (1, 1500),
  (2, 2000),
  (3, 2500),
  (4, 3000),
  (5, 3500),
  (6, 4000)
ON CONFLICT (exam_year) DO NOTHING;
