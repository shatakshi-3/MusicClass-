// Supabase-backed data layer for the Music Class app
// All operations are async and query PostgreSQL via Supabase

import { supabase } from './supabase';
import type {
  Student, InstrumentFee, FeePayment,
  ExamFeeStructure, ExamRegistration, DashboardStats,
  Instrument, Centre, PaymentStatus, PaymentLabel, PaymentBehavior,
  ExamPaymentStatus, ExamYear, StudentStatus, StudentType,
} from './types';
import { INSTRUMENTS, CENTRES, EXAM_FEE_MAP } from './types';

// ========================
// STUDENTS
// ========================

export async function getStudents(filters?: {
  centre?: Centre; instrument?: Instrument; status?: StudentStatus; search?: string; student_type?: StudentType;
}): Promise<Student[]> {
  let query = supabase.from('students').select('*');

  if (filters?.centre) query = query.eq('centre', filters.centre);
  if (filters?.instrument) query = query.eq('instrument', filters.instrument);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.student_type) query = query.eq('student_type', filters.student_type);
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
      student_type: data.student_type || 'MONTHLY',
      exam_year: data.exam_year || null,
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

  // Delete outdated instruments (Keyboard, Violin) from DB if present
  const outdated = (data ?? []).filter(item => !INSTRUMENTS.includes(item.instrument_name as any));
  if (outdated.length > 0) {
    const outdatedIds = outdated.map(o => o.id);
    await supabase.from('instrument_fees').delete().in('id', outdatedIds);
  }

  // Ensure all valid subjects (including Harmonium) exist in DB
  const existingNames = new Set((data ?? []).map(i => i.instrument_name));
  const missing = INSTRUMENTS.filter(inst => !existingNames.has(inst));
  if (missing.length > 0) {
    const toInsert = missing.map(inst => ({ instrument_name: inst, monthly_fee: 700 }));
    await supabase.from('instrument_fees').insert(toInsert);
    const { data: updatedData } = await supabase
      .from('instrument_fees')
      .select('*')
      .order('instrument_name');
    return ((updatedData ?? []) as InstrumentFee[]).filter(i => INSTRUMENTS.includes(i.instrument_name as any));
  }

  return ((data ?? []) as InstrumentFee[]).filter(item => INSTRUMENTS.includes(item.instrument_name as any));
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
  student_type?: StudentType;
  student_exam_year?: ExamYear | null;
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
        payment_type,
        student_type,
        exam_year
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

  // Transform the joined data to match the expected flat format with smart fallbacks
  return (data ?? []).map((row: any) => {
    const studentType = row.students?.student_type as StudentType | undefined;
    const examYear = row.students?.exam_year as ExamYear | null | undefined;
    const defaultTotal = studentType === 'EXAM' && examYear ? EXAM_FEE_MAP[examYear] : 700;
    const totalFee = Number(row.total_fee || defaultTotal);
    const amountPaid = Number(row.amount_paid ?? (row.status === 'Paid' ? totalFee : row.amount ?? 0));
    const remainingBalance = Number(row.remaining_balance ?? Math.max(0, totalFee - amountPaid));
    const installmentNumber = Number(row.installment_number ?? (amountPaid > 0 ? 1 : 0));

    return {
      id: row.id,
      student_id: row.student_id,
      amount: amountPaid,
      payment_date: row.payment_date,
      payment_type: row.payment_type,
      period_label: row.period_label,
      status: row.status,
      notes: row.notes,
      total_fee: totalFee,
      amount_paid: amountPaid,
      remaining_balance: remainingBalance,
      installment_number: installmentNumber,
      payment_mode: row.payment_mode,
      updated_at: row.updated_at,
      created_at: row.created_at,
      student_name: row.students?.name ?? 'Unknown',
      student_phone: row.students?.phone ?? '',
      student_instrument: (row.students?.instrument ?? 'Guitar') as Instrument,
      student_centre: (row.students?.centre ?? 'Prayag Sangeet Samiti') as Centre,
      student_payment_type: row.students?.payment_type as PaymentBehavior | undefined,
      student_type: studentType,
      student_exam_year: examYear,
    };
  });
}

export async function createFeePayment(
  data: Omit<FeePayment, 'id' | 'created_at' | 'updated_at'>
): Promise<FeePayment> {
  const now = new Date().toISOString();
  const payload: any = {
    student_id: data.student_id,
    amount: data.amount_paid || data.amount,
    payment_date: data.payment_date,
    payment_type: data.payment_type,
    period_label: data.period_label || null,
    status: data.status,
    notes: data.notes || null,
    total_fee: data.total_fee ?? 0,
    amount_paid: data.amount_paid ?? data.amount ?? 0,
    remaining_balance: data.remaining_balance ?? 0,
    installment_number: data.installment_number ?? 1,
    payment_mode: data.payment_mode || null,
    updated_at: now,
  };

  let { data: payment, error } = await supabase
    .from('fee_payments')
    .insert(payload)
    .select()
    .single();

  // Fallback for missing V2 schema columns
  if (error && (error.message.includes('column') || error.code === '42703' || error.message.includes('schema cache'))) {
    delete payload.total_fee;
    delete payload.amount_paid;
    delete payload.remaining_balance;
    delete payload.installment_number;
    delete payload.payment_mode;

    const res = await supabase.from('fee_payments').insert(payload).select().single();
    payment = res.data;
    error = res.error;
  }

  if (error) throw new Error(`Failed to create fee payment: ${error.message}`);
  return payment as FeePayment;
}

export async function updateFeePayment(
  id: string,
  updates: Partial<FeePayment>
): Promise<boolean> {
  const payload: any = { ...updates, updated_at: new Date().toISOString() };
  if (updates.amount_paid !== undefined) {
    payload.amount = Number(updates.amount_paid);
  }

  let { error } = await supabase
    .from('fee_payments')
    .update(payload)
    .eq('id', id);

  // Fallback for missing V2 schema columns
  if (error && (error.message.includes('column') || error.code === '42703' || error.message.includes('schema cache'))) {
    console.warn('[db] Installment columns missing in fee_payments table. Falling back to core columns.');
    const safeUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.status) safeUpdates.status = updates.status;
    if (updates.notes !== undefined) safeUpdates.notes = updates.notes;
    if (updates.amount_paid !== undefined) safeUpdates.amount = Number(updates.amount_paid);
    else if (updates.amount !== undefined) safeUpdates.amount = Number(updates.amount);
    if (updates.payment_type) safeUpdates.payment_type = updates.payment_type;
    if (updates.period_label) safeUpdates.period_label = updates.period_label;
    if (updates.payment_date) safeUpdates.payment_date = updates.payment_date;

    const res = await supabase
      .from('fee_payments')
      .update(safeUpdates)
      .eq('id', id);
    error = res.error;
  }

  if (error) throw new Error(`Failed to update payment: ${error.message}`);
  return true;
}

export async function updatePaymentStatus(
  id: string,
  updates: Partial<FeePayment>
): Promise<boolean> {
  return updateFeePayment(id, updates);
}

export async function deleteFeePayment(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('fee_payments')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete fee payment: ${error.message}`);
  return true;
}

// Get existing payment record for an exam student (to avoid duplicates)
export async function getExamPaymentForStudent(studentId: string): Promise<FeePayment | null> {
  const { data, error } = await supabase
    .from('fee_payments')
    .select('*')
    .eq('student_id', studentId)
    .eq('payment_type', 'Regular')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch exam payment: ${error.message}`);
  return data as FeePayment | null;
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

  if (error) {
    console.warn(`[db] Fee for exam year ${examYear} error: ${error.message}. Using default fee map.`);
    return EXAM_FEE_MAP[examYear] || 7500;
  }
  return data?.exam_fee ?? EXAM_FEE_MAP[examYear] ?? 7500;
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

  // Fetch all fee payments to check student payments for accurate fallback
  const { data: allFeePayments } = await supabase.from('fee_payments').select('*');
  const paymentsByStudent = new Map<string, number>();
  (allFeePayments ?? []).forEach((p: any) => {
    const prev = paymentsByStudent.get(p.student_id) || 0;
    const paid = Number(p.amount_paid || p.amount || 0);
    paymentsByStudent.set(p.student_id, prev + paid);
  });

  return (data ?? []).map((row: any) => {
    const examYear = row.exam_year as ExamYear;
    const defaultFee = EXAM_FEE_MAP[examYear] || 7500;
    const totalFee = Number(row.exam_fee || defaultFee);

    // Smart fallback for amount_paid & remaining_balance
    let amountPaid = Number(row.amount_paid ?? 0);
    if (!amountPaid || amountPaid === 0) {
      if (row.payment_status === 'Paid') {
        amountPaid = totalFee;
      } else {
        const studentFeePaymentsSum = paymentsByStudent.get(row.student_id) || 0;
        if (studentFeePaymentsSum > 0) {
          amountPaid = Math.min(totalFee, studentFeePaymentsSum);
        } else if (row.payment_status === 'Partially Paid') {
          amountPaid = Math.round(totalFee / 2); // 50% partial payment fallback
        }
      }
    }

    let remainingBalance = Number(row.remaining_balance ?? Math.max(0, totalFee - amountPaid));
    if (row.payment_status === 'Paid') {
      remainingBalance = 0;
      amountPaid = totalFee;
    } else {
      remainingBalance = Math.max(0, totalFee - amountPaid);
    }

    const installmentNumber = Number(row.installment_number ?? (amountPaid > 0 ? 1 : 0));

    return {
      id: row.id,
      student_id: row.student_id,
      exam_year: examYear,
      centre: row.centre,
      exam_fee: totalFee,
      payment_status: row.payment_status,
      amount_paid: amountPaid,
      remaining_balance: remainingBalance,
      installment_number: installmentNumber,
      created_at: row.created_at,
      student_name: row.students?.name ?? 'Unknown',
      student_phone: row.students?.phone ?? '',
      student_instrument: (row.students?.instrument ?? 'Guitar') as Instrument,
    };
  });
}

export async function createExamRegistration(data: {
  student_id: string;
  exam_year: ExamYear;
  centre: Centre;
}): Promise<ExamRegistration> {
  const examFee = await getFeeForExamYear(data.exam_year);

  // Payload with new V2 installment columns
  const fullPayload: any = {
    student_id: data.student_id,
    exam_year: data.exam_year,
    centre: data.centre,
    exam_fee: examFee,
    payment_status: 'Pending',
    amount_paid: 0,
    remaining_balance: examFee,
    installment_number: 0,
  };

  let { data: reg, error } = await supabase
    .from('exam_registrations')
    .insert(fullPayload)
    .select()
    .single();

  // If column error occurs (e.g. amount_paid column not yet created in Supabase DB)
  if (error && (error.message.includes('column') || error.code === '42703')) {
    console.warn('[db] Installment columns missing in exam_registrations table. Falling back to core columns.');
    const corePayload = {
      student_id: data.student_id,
      exam_year: data.exam_year,
      centre: data.centre,
      exam_fee: examFee,
      payment_status: 'Pending',
    };

    const fallbackRes = await supabase
      .from('exam_registrations')
      .insert(corePayload)
      .select()
      .single();

    reg = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    console.error('[db] Failed to create exam registration:', error);
    throw new Error(`Failed to create exam registration: ${error.message}`);
  }

  return reg as ExamRegistration;
}

export async function updateExamRegistration(
  id: string,
  updates: Partial<ExamRegistration>
): Promise<boolean> {
  let { error } = await supabase
    .from('exam_registrations')
    .update(updates)
    .eq('id', id);

  // Fallback for missing V2 schema columns
  if (error && (error.message.includes('column') || error.code === '42703' || error.message.includes('schema cache'))) {
    console.warn('[db] Installment columns missing in exam_registrations table. Falling back to core columns.');
    const safeUpdates: any = {};
    if (updates.payment_status) safeUpdates.payment_status = updates.payment_status;
    if (updates.exam_fee !== undefined) safeUpdates.exam_fee = updates.exam_fee;
    if (updates.exam_year !== undefined) safeUpdates.exam_year = updates.exam_year;
    if (updates.centre) safeUpdates.centre = updates.centre;

    const res = await supabase
      .from('exam_registrations')
      .update(safeUpdates)
      .eq('id', id);
    error = res.error;
  }

  if (error) throw new Error(`Failed to update exam registration: ${error.message}`);
  return true;
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
  const [students, payments, regs] = await Promise.all([
    getStudents({ status: 'active' }),
    getFeePayments(),
    getExamRegistrations(),
  ]);

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

  // Monthly vs Exam students
  const monthlyStudents = students.filter(s => s.student_type === 'MONTHLY').length;
  const examStudents = students.filter(s => s.student_type === 'EXAM').length;

  // Total collected (all time)
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  // Last 30 days collected
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const last30 = payments.filter(p => new Date(p.payment_date) >= thirtyDaysAgo);
  const last30DaysCollected = last30.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  // Students with no payment in last 30 days
  const recentPayerIds = new Set(
    payments
      .filter(p => new Date(p.payment_date) >= thirtyDaysAgo)
      .map(p => p.student_id)
  );
  const studentsNoPay30Days = students.filter(s => !recentPayerIds.has(s.id)).length;

  // Average payment per student (all time, active only)
  const activeIds = new Set(students.map(s => s.id));
  const activePayments = payments.filter(p => activeIds.has(p.student_id));
  const avgPaymentPerStudent = students.length > 0
    ? Math.round(activePayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0) / students.length)
    : 0;

  // Exam stats

  const examFeesCollected = regs.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
  const examFeesPending = regs.reduce((sum, r) => sum + Number(r.remaining_balance || 0), 0);

  const uniqueExamStudents = new Set(regs.map(r => r.student_id));

  // Pending fees (from fee_payments + exam_registrations)
  const pendingFromPayments = payments.reduce((sum, p) => {
    if (p.status === 'Paid') return sum;
    return sum + Number(p.remaining_balance || 0);
  }, 0);

  const pendingFees = pendingFromPayments + examFeesPending;

  // Fully paid students (all payments are Paid)
  const studentPaymentGroups = new Map<string, FeePayment[]>();
  for (const p of payments) {
    const existing = studentPaymentGroups.get(p.student_id) || [];
    existing.push(p);
    studentPaymentGroups.set(p.student_id, existing);
  }

  let fullyPaidStudents = 0;
  let partiallyPaidStudents = 0;
  for (const [, studentPayments] of studentPaymentGroups) {
    const allPaid = studentPayments.every(p => p.status === 'Paid');
    const anyPartial = studentPayments.some(p => p.status === 'Partially Paid');
    if (allPaid) {
      fullyPaidStudents++;
    } else if (anyPartial) {
      partiallyPaidStudents++;
    }
  }

  // Also check exam registrations
  for (const reg of regs) {
    if (reg.payment_status === 'Paid' && !studentPaymentGroups.has(reg.student_id)) {
      fullyPaidStudents++;
    } else if (reg.payment_status === 'Partially Paid') {
      partiallyPaidStudents++;
    }
  }

  return {
    totalStudents: students.length,
    monthlyStudents,
    examStudents,
    studentsByCentre,
    studentsByInstrument,
    studentsInExams: uniqueExamStudents.size,
    totalCollected: totalCollected + examFeesCollected,
    last30DaysCollected,
    studentsNoPay30Days,
    avgPaymentPerStudent,
    examFeesCollected,
    examFeesPending,
    pendingFees,
    fullyPaidStudents,
    partiallyPaidStudents,
  };
}
