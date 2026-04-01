/**
 * Migration script: db.json → Supabase PostgreSQL
 *
 * Usage:
 *   npx tsx scripts/migrate-to-supabase.ts
 *
 * Prerequisites:
 *   1. Supabase project created and schema.sql executed in SQL Editor
 *   2. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set in .env.local
 *   3. data/db.json exists with the old data
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

interface OldDB {
  students: any[];
  instrument_fees: any[];
  fee_payments: any[];
  exam_fee_structure: any[];
  exam_registrations: any[];
}

async function migrate() {
  console.log('📂 Reading db.json...');
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ data/db.json not found');
    process.exit(1);
  }

  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const db: OldDB = JSON.parse(raw);

  console.log(`  Students:           ${db.students.length}`);
  console.log(`  Instrument Fees:    ${db.instrument_fees.length}`);
  console.log(`  Fee Payments:       ${db.fee_payments.length}`);
  console.log(`  Exam Fee Structure: ${db.exam_fee_structure.length}`);
  console.log(`  Exam Registrations: ${db.exam_registrations.length}`);
  console.log('');

  // Map old string IDs → new UUIDs
  const studentIdMap = new Map<string, string>();

  // ----- 1. Instrument Fees -----
  // These are seeded by schema.sql, but let's upsert in case values differ
  console.log('🎸 Migrating instrument_fees...');
  for (const fee of db.instrument_fees) {
    const { data, error } = await supabase
      .from('instrument_fees')
      .upsert(
        {
          instrument_name: fee.instrument_name,
          monthly_fee: fee.monthly_fee,
        },
        { onConflict: 'instrument_name' }
      )
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Instrument fee ${fee.instrument_name}: ${error.message}`);
    } else {
      console.log(`  ✅ ${fee.instrument_name} → ${data.id}`);
    }
  }

  // ----- 2. Students -----
  console.log('\n👨‍🎓 Migrating students...');
  for (const s of db.students) {
    const { data, error } = await supabase
      .from('students')
      .insert({
        name: s.name,
        phone: s.phone,
        age: s.age,
        parents_name: s.parents_name,
        instrument: s.instrument,
        centre: s.centre,
        class_timing: s.class_timing,
        payment_type: s.payment_type || 'REGULAR',
        status: s.status || 'active',
        created_at: s.created_at || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Student ${s.name} (${s.id}): ${error.message}`);
    } else {
      studentIdMap.set(s.id, data.id);
      console.log(`  ✅ ${s.name}: ${s.id} → ${data.id}`);
    }
  }

  console.log(`\n  Mapped ${studentIdMap.size}/${db.students.length} students`);

  // ----- 3. Fee Payments -----
  console.log('\n💰 Migrating fee_payments...');
  let paymentSuccess = 0;
  let paymentSkipped = 0;

  for (const p of db.fee_payments) {
    const newStudentId = studentIdMap.get(p.student_id);
    if (!newStudentId) {
      console.warn(`  ⚠️  Skipping payment ${p.id}: student ${p.student_id} not found in map`);
      paymentSkipped++;
      continue;
    }

    const { error } = await supabase.from('fee_payments').insert({
      student_id: newStudentId,
      amount: p.amount,
      payment_date: p.payment_date,
      payment_type: p.payment_type,
      period_label: p.period_label || null,
      status: p.status || 'Pending',
      notes: p.notes || null,
      updated_at: p.updated_at || new Date().toISOString(),
      created_at: p.created_at || new Date().toISOString(),
    });

    if (error) {
      console.error(`  ❌ Payment ${p.id}: ${error.message}`);
    } else {
      paymentSuccess++;
    }
  }
  console.log(`  ✅ ${paymentSuccess} migrated, ⚠️ ${paymentSkipped} skipped`);

  // ----- 4. Exam Fee Structure -----
  // These are also seeded, upsert to sync values
  console.log('\n📝 Migrating exam_fee_structure...');
  for (const e of db.exam_fee_structure) {
    const { error } = await supabase
      .from('exam_fee_structure')
      .upsert(
        {
          exam_year: e.exam_year,
          exam_fee: e.exam_fee,
        },
        { onConflict: 'exam_year' }
      );

    if (error) {
      console.error(`  ❌ Exam year ${e.exam_year}: ${error.message}`);
    } else {
      console.log(`  ✅ Year ${e.exam_year}: ₹${e.exam_fee}`);
    }
  }

  // ----- 5. Exam Registrations -----
  console.log('\n🎓 Migrating exam_registrations...');
  let examSuccess = 0;
  let examSkipped = 0;

  for (const r of db.exam_registrations) {
    const newStudentId = studentIdMap.get(r.student_id);
    if (!newStudentId) {
      console.warn(`  ⚠️  Skipping exam registration ${r.id}: student ${r.student_id} not found in map`);
      examSkipped++;
      continue;
    }

    const { error } = await supabase.from('exam_registrations').insert({
      student_id: newStudentId,
      exam_year: r.exam_year,
      centre: r.centre,
      exam_fee: r.exam_fee,
      payment_status: r.payment_status || 'Pending',
      created_at: r.created_at || new Date().toISOString(),
    });

    if (error) {
      console.error(`  ❌ Exam reg ${r.id}: ${error.message}`);
    } else {
      examSuccess++;
    }
  }
  console.log(`  ✅ ${examSuccess} migrated, ⚠️ ${examSkipped} skipped`);

  // ----- Summary -----
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Migration complete!');
  console.log(`  Students:           ${studentIdMap.size}/${db.students.length}`);
  console.log(`  Fee Payments:       ${paymentSuccess}/${db.fee_payments.length}`);
  console.log(`  Exam Registrations: ${examSuccess}/${db.exam_registrations.length}`);
  console.log('='.repeat(50));
}

migrate().catch((err) => {
  console.error('💥 Migration failed:', err);
  process.exit(1);
});
