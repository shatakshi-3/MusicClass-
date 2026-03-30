// JSON file-based data store for the Music Class app
// Persists to data/db.json, auto-seeds on first run

import fs from 'fs';
import path from 'path';
import { cache } from './cache';
import type {
  Database, Student, InstrumentFee, FeePayment,
  ExamFeeStructure, ExamRegistration, DashboardStats,
  Instrument, Centre, PaymentStatus, ExamPaymentStatus, PaymentLabel, PaymentBehavior, ExamYear, StudentStatus,
} from './types';
import { INSTRUMENTS, CENTRES, EXAM_YEARS } from './types';

// ========================
// FILE PATH & I/O
// ========================

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'db.json');

function readDB(): Database {
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedData();
    writeDB(seed);
    return seed;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  const db = JSON.parse(raw) as Database;

  let migrated = false;

  // === MIGRATION: old monthly_fee_payments → fee_payments ===
  if ((db as any).monthly_fee_payments) {
    db.fee_payments = (db as any).monthly_fee_payments.map((p: any) => ({
      id: p.id,
      student_id: p.student_id,
      amount: p.amount,
      payment_date: new Date(p.year, p.month - 1, 1).toISOString(),
      payment_type: 'Regular' as PaymentLabel,
      period_label: `${p.year}-${String(p.month).padStart(2, '0')}`,
      status: (p.status === 'Late' || p.status === 'Waived') ? 'Paid' : p.status,
      updated_at: p.updated_at,
      created_at: p.updated_at || new Date().toISOString()
    }));
    delete (db as any).monthly_fee_payments;
    migrated = true;
  }
  if (!db.fee_payments) db.fee_payments = [];

  // === MIGRATION: old payment_plan → payment_type on students ===
  const planMap: Record<string, PaymentBehavior> = { 'MONTHLY': 'REGULAR', 'QUARTERLY': 'OCCASIONAL', 'CUSTOM': 'FLEXIBLE' };
  db.students.forEach(s => {
    // Migrate old payment_plan field
    if ((s as any).payment_plan) {
      s.payment_type = planMap[(s as any).payment_plan] || (s as any).payment_plan;
      delete (s as any).payment_plan;
      migrated = true;
    }
    if (!s.payment_type) { s.payment_type = 'REGULAR'; migrated = true; }

    // Centre name migration
    if ((s.centre as string) === 'Centre A') { s.centre = 'Prayag Sangeet Samiti' as Centre; migrated = true; }
    if ((s.centre as string) === 'Centre B') { s.centre = 'Khairagarh University' as Centre; migrated = true; }
  });

  // === MIGRATION: old fee_payments fields ===
  const labelMap: Record<string, PaymentLabel> = { 'Monthly': 'Regular', 'Quarterly': 'Occasional', 'Custom': 'Flexible' };
  db.fee_payments.forEach((p: any) => {
    // Migrate old payment_type values
    if (labelMap[p.payment_type]) { p.payment_type = labelMap[p.payment_type]; migrated = true; }
    // Migrate period_start → period_label
    if (p.period_start && !p.period_label) { p.period_label = p.period_start; delete p.period_start; migrated = true; }
    if (p.period_end) { delete p.period_end; migrated = true; }
    // Simplify old statuses
    if (p.status === 'Late' || p.status === 'Waived') { p.status = 'Paid'; migrated = true; }
  });

  // Exam centre migration
  db.exam_registrations.forEach(r => {
    if ((r.centre as string) === 'Centre A') { r.centre = 'Prayag Sangeet Samiti' as Centre; migrated = true; }
    if ((r.centre as string) === 'Centre B') { r.centre = 'Khairagarh University' as Centre; migrated = true; }
  });

  if (migrated) {
    writeDB(db);
  }

  return db;
}

function writeDB(db: Database): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ========================
// SEED DATA
// ========================

function createSeedData(): Database {
  const instrumentFees: InstrumentFee[] = [
    { id: uid(), instrument_name: 'Guitar', monthly_fee: 1200 },
    { id: uid(), instrument_name: 'Piano', monthly_fee: 1500 },
    { id: uid(), instrument_name: 'Tabla', monthly_fee: 1000 },
    { id: uid(), instrument_name: 'Vocal', monthly_fee: 900 },
    { id: uid(), instrument_name: 'Keyboard', monthly_fee: 1300 },
    { id: uid(), instrument_name: 'Violin', monthly_fee: 1400 },
  ];

  const examFees: ExamFeeStructure[] = [
    { id: uid(), exam_year: 1, exam_fee: 1500 },
    { id: uid(), exam_year: 2, exam_fee: 2000 },
    { id: uid(), exam_year: 3, exam_fee: 2500 },
    { id: uid(), exam_year: 4, exam_fee: 3000 },
    { id: uid(), exam_year: 5, exam_fee: 3500 },
    { id: uid(), exam_year: 6, exam_fee: 4000 },
  ];

  const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
    'Krishna', 'Ishaan', 'Ananya', 'Diya', 'Saanvi', 'Aanya', 'Priya', 'Meera',
    'Riya', 'Kavya', 'Tara', 'Nisha', 'Rohan', 'Dev', 'Kabir', 'Aryan', 'Dhruv',
    'Neha', 'Pooja', 'Shreya', 'Kiara', 'Zara',
  ];
  const lastNames = [
    'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Nair',
    'Joshi', 'Mehta', 'Iyer', 'Chopra', 'Rao', 'Das', 'Bhat',
  ];
  const timings = [
    'Mon/Wed 4:00 PM', 'Mon/Wed 5:00 PM', 'Tue/Thu 4:00 PM', 'Tue/Thu 5:00 PM',
    'Tue/Thu 6:00 PM', 'Fri 4:00 PM', 'Sat 10:00 AM', 'Sat 11:00 AM',
    'Sat 2:00 PM', 'Sun 10:00 AM', 'Sun 11:00 AM',
  ];

  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const behaviors: PaymentBehavior[] = ['REGULAR', 'OCCASIONAL', 'FLEXIBLE'];
  const labels: PaymentLabel[] = ['Regular', 'Occasional', 'Flexible'];
  const sampleLabels = ['Jan Fee', 'Feb Fee', 'Mar Fee', 'Advance', 'Quarter 1', 'Misc', 'Annual Partial', 'Late Payment'];

  const usedPhones = new Set<string>();
  const students: Student[] = [];

  for (let i = 0; i < 55; i++) {
    let phone: string;
    do { phone = '9' + Math.floor(100000000 + Math.random() * 900000000).toString(); } while (usedPhones.has(phone));
    usedPhones.add(phone);

    const fn = pick(firstNames);
    const ln = pick(lastNames);
    students.push({
      id: uid(),
      name: `${fn} ${ln}`,
      phone,
      age: Math.floor(Math.random() * 25) + 6,
      parents_name: `${pick(firstNames)} ${ln}`,
      instrument: pick(INSTRUMENTS),
      centre: pick(CENTRES),
      class_timing: pick(timings),
      payment_type: pick(behaviors),
      created_at: new Date(Date.now() - Math.floor(Math.random() * 180 * 86400000)).toISOString(),
      status: Math.random() > 0.1 ? 'active' : 'inactive',
    });
  }

  // Generate irregular payments — random dates, random amounts
  const now = new Date();
  const feePayments: FeePayment[] = [];

  for (const s of students) {
    if (s.status !== 'active') continue;

    const fee = instrumentFees.find(f => f.instrument_name === s.instrument)!;
    // Each student gets 1-5 random payments in the last 120 days
    const payCount = Math.floor(Math.random() * 5) + 1;
    for (let j = 0; j < payCount; j++) {
      const daysAgo = Math.floor(Math.random() * 120);
      const payDate = new Date(now.getTime() - daysAgo * 86400000);
      // Amount can vary: full fee, partial, or extra
      const variance = 0.7 + Math.random() * 0.6; // 70% to 130% of base
      const amount = Math.round(fee.monthly_fee * variance / 50) * 50; // round to nearest 50

      feePayments.push({
        id: uid(),
        student_id: s.id,
        amount,
        payment_date: payDate.toISOString(),
        payment_type: pick(labels),
        period_label: pick(sampleLabels),
        status: Math.random() > 0.15 ? 'Paid' : 'Pending',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }
  }

  // Generate some exam registrations
  const examRegistrations: ExamRegistration[] = [];
  const examStudents = students.filter(s => s.status === 'active').slice(0, 15);
  for (const s of examStudents) {
    const ey = pick(EXAM_YEARS);
    const ef = examFees.find(e => e.exam_year === ey)!;
    examRegistrations.push({
      id: uid(),
      student_id: s.id,
      exam_year: ey,
      centre: s.centre,
      exam_fee: ef.exam_fee,
      payment_status: Math.random() > 0.4 ? 'Paid' : 'Pending',
      created_at: new Date().toISOString(),
    });
  }

  return {
    students,
    instrument_fees: instrumentFees,
    fee_payments: feePayments,
    exam_fee_structure: examFees,
    exam_registrations: examRegistrations,
  };
}

// ========================
// CACHE KEYS
// ========================

const CK = {
  STUDENTS: 'db:students',
  INSTRUMENT_FEES: 'db:instrument_fees',
  FEE_PAYMENTS: 'db:fee_payments',
  EXAM_STRUCTURE: 'db:exam_structure',
  EXAM_REGISTRATIONS: 'db:exam_registrations',
  DASHBOARD: 'db:dashboard',
};

function invalidateAll() {
  Object.values(CK).forEach(k => cache.invalidate(k));
}

// ========================
// STUDENTS
// ========================

export function getStudents(filters?: {
  centre?: Centre; instrument?: Instrument; status?: StudentStatus; search?: string;
}): Student[] {
  const db = readDB();
  let result = db.students;

  if (filters?.centre) result = result.filter(s => s.centre === filters.centre);
  if (filters?.instrument) result = result.filter(s => s.instrument === filters.instrument);
  if (filters?.status) result = result.filter(s => s.status === filters.status);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.parents_name.toLowerCase().includes(q)
    );
  }

  return result;
}

export function getStudentById(id: string): Student | undefined {
  const db = readDB();
  return db.students.find(s => s.id === id);
}

export function createStudent(data: Omit<Student, 'id' | 'created_at'>): Student {
  const db = readDB();
  const student: Student = {
    ...data,
    id: uid(),
    created_at: new Date().toISOString(),
  };
  db.students.push(student);
  writeDB(db);
  invalidateAll();
  return student;
}

export function updateStudent(id: string, updates: Partial<Omit<Student, 'id' | 'created_at'>>): Student | null {
  const db = readDB();
  const idx = db.students.findIndex(s => s.id === id);
  if (idx === -1) return null;

  db.students[idx] = { ...db.students[idx], ...updates };
  writeDB(db);
  invalidateAll();
  return db.students[idx];
}

export function deactivateStudent(id: string): boolean {
  const db = readDB();
  const idx = db.students.findIndex(s => s.id === id);
  if (idx === -1) return false;
  db.students[idx].status = 'inactive';
  writeDB(db);
  invalidateAll();
  return true;
}

// ========================
// INSTRUMENT FEES
// ========================

export function getInstrumentFees(): InstrumentFee[] {
  const db = readDB();
  return db.instrument_fees;
}

export function updateInstrumentFee(id: string, monthly_fee: number): InstrumentFee | null {
  const db = readDB();
  const idx = db.instrument_fees.findIndex(f => f.id === id);
  if (idx === -1) return null;
  db.instrument_fees[idx].monthly_fee = monthly_fee;
  writeDB(db);
  invalidateAll();
  return db.instrument_fees[idx];
}

export function getFeeForInstrument(instrument: Instrument): number {
  const db = readDB();
  const fee = db.instrument_fees.find(f => f.instrument_name === instrument);
  return fee?.monthly_fee ?? 0;
}

// ========================
// FEE PAYMENTS
// ========================

export function getFeePayments(filters?: {
  student_id?: string; payment_type?: PaymentLabel; status?: PaymentStatus; centre?: Centre; instrument?: Instrument;
}): (FeePayment & { student_name: string; student_phone: string; student_instrument: Instrument; student_centre: Centre; student_payment_type?: PaymentBehavior })[] {
  const db = readDB();
  let payments = db.fee_payments;

  if (filters?.student_id) payments = payments.filter(p => p.student_id === filters.student_id);
  if (filters?.payment_type) payments = payments.filter(p => p.payment_type === filters.payment_type);
  if (filters?.status) payments = payments.filter(p => p.status === filters.status);

  const studentMap = new Map(db.students.map(s => [s.id, s]));
  let joined = payments.map(p => {
    const s = studentMap.get(p.student_id);
    return {
      ...p,
      student_name: s?.name ?? 'Unknown',
      student_phone: s?.phone ?? '',
      student_instrument: (s?.instrument ?? 'Guitar') as Instrument,
      student_centre: (s?.centre ?? 'Prayag Sangeet Samiti') as Centre,
      student_payment_type: s?.payment_type,
    };
  });

  if (filters?.centre) joined = joined.filter(j => j.student_centre === filters.centre);
  if (filters?.instrument) joined = joined.filter(j => j.student_instrument === filters.instrument);

  joined.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  return joined;
}

export function createFeePayment(data: Omit<FeePayment, 'id' | 'created_at' | 'updated_at'>): FeePayment {
  const db = readDB();
  const payment: FeePayment = {
    ...data,
    id: uid(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.fee_payments.push(payment);
  writeDB(db);
  invalidateAll();
  return payment;
}

export function updatePaymentStatus(id: string, updates: Partial<FeePayment>): boolean {
  const db = readDB();
  const idx = db.fee_payments.findIndex(p => p.id === id);
  if (idx === -1) return false;
  db.fee_payments[idx] = { ...db.fee_payments[idx], ...updates, updated_at: new Date().toISOString() };
  writeDB(db);
  invalidateAll();
  return true;
}

// ========================
// EXAM FEE STRUCTURE
// ========================

export function getExamFeeStructure(): ExamFeeStructure[] {
  const db = readDB();
  return db.exam_fee_structure;
}

export function updateExamFee(id: string, exam_fee: number): ExamFeeStructure | null {
  const db = readDB();
  const idx = db.exam_fee_structure.findIndex(e => e.id === id);
  if (idx === -1) return null;
  db.exam_fee_structure[idx].exam_fee = exam_fee;
  writeDB(db);
  invalidateAll();
  return db.exam_fee_structure[idx];
}

export function getFeeForExamYear(examYear: ExamYear): number {
  const db = readDB();
  const entry = db.exam_fee_structure.find(e => e.exam_year === examYear);
  return entry?.exam_fee ?? 0;
}

// ========================
// EXAM REGISTRATIONS
// ========================

export function getExamRegistrations(filters?: {
  centre?: Centre; payment_status?: ExamPaymentStatus;
}): (ExamRegistration & { student_name: string; student_phone: string; student_instrument: Instrument })[] {
  const db = readDB();
  let regs = db.exam_registrations;

  if (filters?.centre) regs = regs.filter(r => r.centre === filters.centre);
  if (filters?.payment_status) regs = regs.filter(r => r.payment_status === filters.payment_status);

  const studentMap = new Map(db.students.map(s => [s.id, s]));
  return regs.map(r => {
    const s = studentMap.get(r.student_id);
    return {
      ...r,
      student_name: s?.name ?? 'Unknown',
      student_phone: s?.phone ?? '',
      student_instrument: (s?.instrument ?? 'Guitar') as Instrument,
    };
  });
}

export function createExamRegistration(data: {
  student_id: string; exam_year: ExamYear; centre: Centre;
}): ExamRegistration {
  const db = readDB();
  const examFee = getFeeForExamYear(data.exam_year);
  const reg: ExamRegistration = {
    id: uid(),
    student_id: data.student_id,
    exam_year: data.exam_year,
    centre: data.centre,
    exam_fee: examFee,
    payment_status: 'Pending',
    created_at: new Date().toISOString(),
  };
  db.exam_registrations.push(reg);
  writeDB(db);
  invalidateAll();
  return reg;
}

export function updateExamPaymentStatus(id: string, payment_status: ExamPaymentStatus): boolean {
  const db = readDB();
  const idx = db.exam_registrations.findIndex(r => r.id === id);
  if (idx === -1) return false;
  db.exam_registrations[idx].payment_status = payment_status;
  writeDB(db);
  invalidateAll();
  return true;
}

// ========================
// DASHBOARD STATS
// ========================

export function getDashboardStats(): DashboardStats {
  const cached = cache.get<DashboardStats>(CK.DASHBOARD);
  if (cached) return cached;

  const db = readDB();
  const activeStudents = db.students.filter(s => s.status === 'active');

  const studentsByCentre: Record<string, number> = {};
  for (const c of CENTRES) {
    studentsByCentre[c] = activeStudents.filter(s => s.centre === c).length;
  }

  const studentsByInstrument: Record<string, number> = {};
  for (const i of INSTRUMENTS) {
    studentsByInstrument[i] = activeStudents.filter(s => s.instrument === i).length;
  }

  // All-time collected
  const paidPayments = db.fee_payments.filter(p => p.status === 'Paid');
  const totalCollected = paidPayments.reduce((sum, p) => sum + p.amount, 0);

  // Last 30 days collected
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const last30 = paidPayments.filter(p => new Date(p.payment_date) >= thirtyDaysAgo);
  const last30DaysCollected = last30.reduce((sum, p) => sum + p.amount, 0);

  // Students with no payment in last 30 days
  const recentPayerIds = new Set(
    db.fee_payments
      .filter(p => new Date(p.payment_date) >= thirtyDaysAgo)
      .map(p => p.student_id)
  );
  const studentsNoPay30Days = activeStudents.filter(s => !recentPayerIds.has(s.id)).length;

  // Average payment per student (all time, active only)
  const activeIds = new Set(activeStudents.map(s => s.id));
  const activePayments = paidPayments.filter(p => activeIds.has(p.student_id));
  const avgPaymentPerStudent = activeStudents.length > 0
    ? Math.round(activePayments.reduce((sum, p) => sum + p.amount, 0) / activeStudents.length)
    : 0;

  // Exam stats
  const examFeesCollected = db.exam_registrations
    .filter(r => r.payment_status === 'Paid')
    .reduce((sum, r) => sum + r.exam_fee, 0);
  const examFeesPending = db.exam_registrations
    .filter(r => r.payment_status === 'Pending')
    .reduce((sum, r) => sum + r.exam_fee, 0);

  const uniqueExamStudents = new Set(db.exam_registrations.map(r => r.student_id));

  const stats: DashboardStats = {
    totalStudents: activeStudents.length,
    studentsByCentre,
    studentsByInstrument,
    studentsInExams: uniqueExamStudents.size,
    totalCollected,
    last30DaysCollected,
    studentsNoPay30Days,
    avgPaymentPerStudent,
    examFeesCollected,
    examFeesPending,
  };

  cache.set(CK.DASHBOARD, stats, 30);
  return stats;
}

// ========================
// DELETION OPERATIONS (ADMIN)
// ========================

export function deleteStudent(id: string): boolean {
  const db = readDB();
  const idx = db.students.findIndex(s => s.id === id);
  if (idx === -1) return false;

  db.fee_payments = db.fee_payments.filter(p => p.student_id !== id);
  db.exam_registrations = db.exam_registrations.filter(r => r.student_id !== id);

  db.students.splice(idx, 1);
  writeDB(db);
  invalidateAll();
  return true;
}

export function deleteFeePayment(id: string): boolean {
  const db = readDB();
  const idx = db.fee_payments.findIndex(p => p.id === id);
  if (idx === -1) return false;

  db.fee_payments.splice(idx, 1);
  writeDB(db);
  invalidateAll();
  return true;
}

export function deleteExamRegistration(id: string): boolean {
  const db = readDB();
  const idx = db.exam_registrations.findIndex(r => r.id === id);
  if (idx === -1) return false;

  db.exam_registrations.splice(idx, 1);
  writeDB(db);
  invalidateAll();
  return true;
}
