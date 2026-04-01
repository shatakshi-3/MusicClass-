// Supabase-backed data layer for the Music Class app
// All operations are async and query PostgreSQL via Supabase

import { supabase } from './supabase';
import type {
  Student, InstrumentFee, FeePayment,
  ExamFeeStructure, ExamRegistration, DashboardStats,
  Instrument, Centre, PaymentStatus, PaymentLabel, PaymentBehavior,
  ExamPaymentStatus, ExamYear, StudentStatus,
} from './types';
import { INSTRUMENTS, CENTRES } from './types';

// ========================
// STUDENTS
// ========================

export async function getStudents(filters?: {
  centre?: Centre; instrument?: Instrument; status?: StudentStatus; search?: string;
}): Promise<Student[]> {
  let query = supabase.from('students').select('*');

  if (filters?.centre) query = query.eq('centre', filters.centre);
  if (filters?.instrument) query = query.eq('instrument', filters.instrument);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    const q = `%${filters.search}%`;
    query = query.or(`name.ilike.${q},phone.ilike.${q},parents_name.ilike.${q}`);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch students: ${error.message}`);
  return (data ?? []) as Student[];
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch student: ${error.message}`);
  return (data as Student) ?? undefined;
}

export async function createStudent(data: Omit<Student, 'id' | 'created_at'>): Promise<Student> {
  const { data: student, error } = await supabase
    .from('students')
    .insert({
      name: data.name,
      phone: data.phone,
      age: data.age,
      parents_name: data.parents_name,
      instrument: data.instrument,
      centre: data.centre,
      class_timing: data.class_timing,
      payment_type: data.payment_type || 'REGULAR',
      status: data.status || 'active',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create student: ${error.message}`);
  return student as Student;
}

export async function updateStudent(
  id: string,
  updates: Partial<Omit<Student, 'id' | 'created_at'>>
): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no rows matched
    throw new Error(`Failed to update student: ${error.message}`);
  }
  return data as Student;
}

export async function deactivateStudent(id: string): Promise<boolean> {
  const { error, count } = await supabase
    .from('students')
    .update({ status: 'inactive' })
    .eq('id', id);

  if (error) throw new Error(`Failed to deactivate student: ${error.message}`);
  return (count ?? 0) > 0;
}

export async function deleteStudent(id: string): Promise<boolean> {
  // CASCADE on foreign keys handles fee_payments and exam_registrations
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete student: ${error.message}`);
  return true;
}

// ========================
// INSTRUMENT FEES
// ========================

export async function getInstrumentFees(): Promise<InstrumentFee[]> {
  const { data, error } = await supabase
    .from('instrument_fees')
    .select('*')
    .order('instrument_name');

  if (error) throw new Error(`Failed to fetch instrument fees: ${error.message}`);
  return (data ?? []) as InstrumentFee[];
}

export async function updateInstrumentFee(id: string, monthly_fee: number): Promise<InstrumentFee | null> {
  const { data, error } = await supabase
    .from('instrument_fees')
    .update({ monthly_fee })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to update instrument fee: ${error.message}`);
  }
  return data as InstrumentFee;
}

export async function getFeeForInstrument(instrument: Instrument): Promise<number> {
  const { data, error } = await supabase
    .from('instrument_fees')
    .select('monthly_fee')
    .eq('instrument_name', instrument)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch fee for instrument: ${error.message}`);
  return data?.monthly_fee ?? 0;
}

// ========================
// FEE PAYMENTS
// ========================

export async function getFeePayments(filters?: {
  student_id?: string;
  payment_type?: PaymentLabel;
  status?: PaymentStatus;
  centre?: Centre;
  instrument?: Instrument;
}): Promise<(FeePayment & {
  student_name: string;
  student_phone: string;
  student_instrument: Instrument;
  student_centre: Centre;
  student_payment_type?: PaymentBehavior;
})[]> {
  // Use a join query to get student info alongside payments
  let query = supabase
    .from('fee_payments')
    .select(`
      *,
      students!inner (
        name,
        phone,
        instrument,
        centre,
        payment_type
      )
    `);

  if (filters?.student_id) query = query.eq('student_id', filters.student_id);
  if (filters?.payment_type) query = query.eq('payment_type', filters.payment_type);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.centre) query = query.eq('students.centre', filters.centre);
  if (filters?.instrument) query = query.eq('students.instrument', filters.instrument);

  query = query.order('payment_date', { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch fee payments: ${error.message}`);

  // Transform the joined data to match the expected flat format
  return (data ?? []).map((row: any) => ({
    id: row.id,
    student_id: row.student_id,
    amount: row.amount,
    payment_date: row.payment_date,
    payment_type: row.payment_type,
    period_label: row.period_label,
    status: row.status,
    notes: row.notes,
    updated_at: row.updated_at,
    created_at: row.created_at,
    student_name: row.students?.name ?? 'Unknown',
    student_phone: row.students?.phone ?? '',
    student_instrument: (row.students?.instrument ?? 'Guitar') as Instrument,
    student_centre: (row.students?.centre ?? 'Prayag Sangeet Samiti') as Centre,
    student_payment_type: row.students?.payment_type as PaymentBehavior | undefined,
  }));
}

export async function createFeePayment(
  data: Omit<FeePayment, 'id' | 'created_at' | 'updated_at'>
): Promise<FeePayment> {
  const now = new Date().toISOString();
  const { data: payment, error } = await supabase
    .from('fee_payments')
    .insert({
      student_id: data.student_id,
      amount: data.amount,
      payment_date: data.payment_date,
      payment_type: data.payment_type,
      period_label: data.period_label || null,
      status: data.status,
      notes: data.notes || null,
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create fee payment: ${error.message}`);
  return payment as FeePayment;
}

export async function updatePaymentStatus(
  id: string,
  updates: Partial<FeePayment>
): Promise<boolean> {
  const { error, count } = await supabase
    .from('fee_payments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to update payment: ${error.message}`);
  return true;
}

export async function deleteFeePayment(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('fee_payments')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete fee payment: ${error.message}`);
  return true;
}

// ========================
// EXAM FEE STRUCTURE
// ========================

export async function getExamFeeStructure(): Promise<ExamFeeStructure[]> {
  const { data, error } = await supabase
    .from('exam_fee_structure')
    .select('*')
    .order('exam_year');

  if (error) throw new Error(`Failed to fetch exam fee structure: ${error.message}`);
  return (data ?? []) as ExamFeeStructure[];
}

export async function updateExamFee(id: string, exam_fee: number): Promise<ExamFeeStructure | null> {
  const { data, error } = await supabase
    .from('exam_fee_structure')
    .update({ exam_fee })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to update exam fee: ${error.message}`);
  }
  return data as ExamFeeStructure;
}

export async function getFeeForExamYear(examYear: ExamYear): Promise<number> {
  const { data, error } = await supabase
    .from('exam_fee_structure')
    .select('exam_fee')
    .eq('exam_year', examYear)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch fee for exam year: ${error.message}`);
  return data?.exam_fee ?? 0;
}

// ========================
// EXAM REGISTRATIONS
// ========================

export async function getExamRegistrations(filters?: {
  centre?: Centre;
  payment_status?: ExamPaymentStatus;
}): Promise<(ExamRegistration & {
  student_name: string;
  student_phone: string;
  student_instrument: Instrument;
})[]> {
  let query = supabase
    .from('exam_registrations')
    .select(`
      *,
      students!inner (
        name,
        phone,
        instrument
      )
    `);

  if (filters?.centre) query = query.eq('centre', filters.centre);
  if (filters?.payment_status) query = query.eq('payment_status', filters.payment_status);

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch exam registrations: ${error.message}`);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    student_id: row.student_id,
    exam_year: row.exam_year,
    centre: row.centre,
    exam_fee: row.exam_fee,
    payment_status: row.payment_status,
    created_at: row.created_at,
    student_name: row.students?.name ?? 'Unknown',
    student_phone: row.students?.phone ?? '',
    student_instrument: (row.students?.instrument ?? 'Guitar') as Instrument,
  }));
}

export async function createExamRegistration(data: {
  student_id: string;
  exam_year: ExamYear;
  centre: Centre;
}): Promise<ExamRegistration> {
  const examFee = await getFeeForExamYear(data.exam_year);

  const { data: reg, error } = await supabase
    .from('exam_registrations')
    .insert({
      student_id: data.student_id,
      exam_year: data.exam_year,
      centre: data.centre,
      exam_fee: examFee,
      payment_status: 'Pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create exam registration: ${error.message}`);
  return reg as ExamRegistration;
}

export async function updateExamPaymentStatus(
  id: string,
  payment_status: ExamPaymentStatus
): Promise<boolean> {
  const { error } = await supabase
    .from('exam_registrations')
    .update({ payment_status })
    .eq('id', id);

  if (error) throw new Error(`Failed to update exam payment status: ${error.message}`);
  return true;
}

export async function deleteExamRegistration(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('exam_registrations')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete exam registration: ${error.message}`);
  return true;
}

// ========================
// DASHBOARD STATS
// ========================

export async function getDashboardStats(): Promise<DashboardStats> {
  // Fetch all active students
  const { data: activeStudents, error: studentsErr } = await supabase
    .from('students')
    .select('*')
    .eq('status', 'active');

  if (studentsErr) throw new Error(`Failed to fetch students: ${studentsErr.message}`);
  const students = (activeStudents ?? []) as Student[];

  // Students by centre
  const studentsByCentre: Record<string, number> = {};
  for (const c of CENTRES) {
    studentsByCentre[c] = students.filter(s => s.centre === c).length;
  }

  // Students by instrument
  const studentsByInstrument: Record<string, number> = {};
  for (const i of INSTRUMENTS) {
    studentsByInstrument[i] = students.filter(s => s.instrument === i).length;
  }

  // Fetch all fee payments
  const { data: allPayments, error: paymentsErr } = await supabase
    .from('fee_payments')
    .select('*');

  if (paymentsErr) throw new Error(`Failed to fetch payments: ${paymentsErr.message}`);
  const payments = (allPayments ?? []) as FeePayment[];

  // Total collected (all time, Paid only)
  const paidPayments = payments.filter(p => p.status === 'Paid');
  const totalCollected = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Last 30 days collected
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const last30 = paidPayments.filter(p => new Date(p.payment_date) >= thirtyDaysAgo);
  const last30DaysCollected = last30.reduce((sum, p) => sum + Number(p.amount), 0);

  // Students with no payment in last 30 days
  const recentPayerIds = new Set(
    payments
      .filter(p => new Date(p.payment_date) >= thirtyDaysAgo)
      .map(p => p.student_id)
  );
  const studentsNoPay30Days = students.filter(s => !recentPayerIds.has(s.id)).length;

  // Average payment per student (all time, active only)
  const activeIds = new Set(students.map(s => s.id));
  const activePayments = paidPayments.filter(p => activeIds.has(p.student_id));
  const avgPaymentPerStudent = students.length > 0
    ? Math.round(activePayments.reduce((sum, p) => sum + Number(p.amount), 0) / students.length)
    : 0;

  // Exam stats
  const { data: examRegs, error: examErr } = await supabase
    .from('exam_registrations')
    .select('*');

  if (examErr) throw new Error(`Failed to fetch exam registrations: ${examErr.message}`);
  const regs = (examRegs ?? []) as ExamRegistration[];

  const examFeesCollected = regs
    .filter(r => r.payment_status === 'Paid')
    .reduce((sum, r) => sum + Number(r.exam_fee), 0);
  const examFeesPending = regs
    .filter(r => r.payment_status === 'Pending')
    .reduce((sum, r) => sum + Number(r.exam_fee), 0);

  const uniqueExamStudents = new Set(regs.map(r => r.student_id));

  return {
    totalStudents: students.length,
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
}
