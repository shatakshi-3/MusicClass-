// JSON file-based data store for the Music Class app
// Persists to data/db.json, auto-seeds on first run

import fs from 'fs';
import path from 'path';
import { cache } from './cache';
import type {
  Database, Student, InstrumentFee, MonthlyFeePayment,
  ExamFeeStructure, ExamRegistration, DashboardStats,
  Instrument, Centre, PaymentStatus, ExamPaymentStatus, ExamYear, StudentStatus,
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

  // Migration logic for Centre names
  let migrated = false;
  db.students.forEach(s => {
    if ((s.centre as string) === 'Centre A') { s.centre = 'Prayag Sangeet Samiti' as Centre; migrated = true; }
    if ((s.centre as string) === 'Centre B') { s.centre = 'Khairagarh University' as Centre; migrated = true; }
  });
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

  // Generate sample students
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
      created_at: new Date(Date.now() - Math.floor(Math.random() * 180 * 86400000)).toISOString(),
      status: Math.random() > 0.1 ? 'active' : 'inactive',
    });
  }

  // Generate monthly payments for current and previous 2 months
  const now = new Date();
  const monthlyPayments: MonthlyFeePayment[] = [];
  const paymentStatuses: PaymentStatus[] = ['Paid', 'Pending', 'Late', 'Waived'];

  for (let offset = 0; offset < 3; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();

    for (const s of students) {
      if (s.status !== 'active') continue;
      const fee = instrumentFees.find(f => f.instrument_name === s.instrument)!;
      const status: PaymentStatus = offset === 0
        ? (Math.random() > 0.5 ? 'Pending' : 'Paid')
        : pick(paymentStatuses);
      monthlyPayments.push({
        id: uid(),
        student_id: s.id,
        month: m,
        year: y,
        amount: fee.monthly_fee,
        status,
        updated_at: new Date().toISOString(),
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
    monthly_fee_payments: monthlyPayments,
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
  MONTHLY_PAYMENTS: 'db:monthly_payments',
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
// MONTHLY FEE PAYMENTS
// ========================

export function getMonthlyPayments(filters?: {
  month?: number; year?: number; centre?: Centre; instrument?: Instrument; status?: PaymentStatus;
}): (MonthlyFeePayment & { student_name: string; student_phone: string; student_instrument: Instrument; student_centre: Centre })[] {
  const db = readDB();
  let payments = db.monthly_fee_payments;

  if (filters?.month) payments = payments.filter(p => p.month === filters.month);
  if (filters?.year) payments = payments.filter(p => p.year === filters.year);
  if (filters?.status) payments = payments.filter(p => p.status === filters.status);

  // Join with students
  const studentMap = new Map(db.students.map(s => [s.id, s]));
  let joined = payments.map(p => {
    const s = studentMap.get(p.student_id);
    return {
      ...p,
      student_name: s?.name ?? 'Unknown',
      student_phone: s?.phone ?? '',
      student_instrument: (s?.instrument ?? 'Guitar') as Instrument,
      student_centre: (s?.centre ?? 'Prayag Sangeet Samiti') as Centre,
    };
  });

  if (filters?.centre) joined = joined.filter(j => j.student_centre === filters.centre);
  if (filters?.instrument) joined = joined.filter(j => j.student_instrument === filters.instrument);

  return joined;
}

export function updatePaymentStatus(id: string, status: PaymentStatus): boolean {
  const db = readDB();
  const idx = db.monthly_fee_payments.findIndex(p => p.id === id);
  if (idx === -1) return false;
  db.monthly_fee_payments[idx].status = status;
  db.monthly_fee_payments[idx].updated_at = new Date().toISOString();
  writeDB(db);
  invalidateAll();
  return true;
}

export function generateMonthlyPayments(month: number, year: number): number {
  const db = readDB();

  // Only generate for active students who don't already have a record
  const existing = new Set(
    db.monthly_fee_payments
      .filter(p => p.month === month && p.year === year)
      .map(p => p.student_id)
  );

  const activeStudents = db.students.filter(s => s.status === 'active' && !existing.has(s.id));
  let count = 0;

  for (const s of activeStudents) {
    const fee = db.instrument_fees.find(f => f.instrument_name === s.instrument);
    db.monthly_fee_payments.push({
      id: uid(),
      student_id: s.id,
      month,
      year,
      amount: fee?.monthly_fee ?? 0,
      status: 'Pending',
      updated_at: new Date().toISOString(),
    });
    count++;
  }

  if (count > 0) {
    writeDB(db);
    invalidateAll();
  }
  return count;
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

  // Current month payments
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const currentPayments = db.monthly_fee_payments.filter(
    p => p.month === currentMonth && p.year === currentYear
  );
  const monthlyFeesCollected = currentPayments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const monthlyFeesPending = currentPayments
    .filter(p => p.status !== 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);

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
    monthlyFeesCollected,
    monthlyFeesPending,
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

  // Cascade delete associated records
  db.monthly_fee_payments = db.monthly_fee_payments.filter(p => p.student_id !== id);
  db.exam_registrations = db.exam_registrations.filter(r => r.student_id !== id);

  db.students.splice(idx, 1);
  writeDB(db);
  invalidateAll();
  return true;
}

export function deleteMonthlyPayment(id: string): boolean {
  const db = readDB();
  const idx = db.monthly_fee_payments.findIndex(p => p.id === id);
  if (idx === -1) return false;

  db.monthly_fee_payments.splice(idx, 1);
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
