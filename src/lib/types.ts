// ========================
// CONSTANTS
// ========================

export const CENTRES = ['Prayag Sangeet Samiti', 'Khairagarh University'] as const;
export type Centre = (typeof CENTRES)[number];

export const INSTRUMENTS = ['Guitar', 'Piano', 'Tabla', 'Vocal', 'Keyboard', 'Violin'] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

export const STUDENT_STATUSES = ['active', 'inactive'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const PAYMENT_STATUSES = ['Paid', 'Pending', 'Late', 'Waived'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_PLANS = ['MONTHLY', 'QUARTERLY', 'CUSTOM'] as const;
export type PaymentPlan = (typeof PAYMENT_PLANS)[number];

export const PAYMENT_TYPES = ['Monthly', 'Quarterly', 'Custom'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const EXAM_PAYMENT_STATUSES = ['Paid', 'Pending'] as const;
export type ExamPaymentStatus = (typeof EXAM_PAYMENT_STATUSES)[number];

export const EXAM_YEARS = [1, 2, 3, 4, 5, 6] as const;
export type ExamYear = (typeof EXAM_YEARS)[number];

// ========================
// ENTITY INTERFACES
// ========================

export interface Student {
  id: string;
  name: string;
  phone: string;
  age: number;
  parents_name: string;
  instrument: Instrument;
  centre: Centre;
  class_timing: string;
  payment_plan?: PaymentPlan;
  created_at: string;
  status: StudentStatus;
}

export interface InstrumentFee {
  id: string;
  instrument_name: Instrument;
  monthly_fee: number;
}

export interface FeePayment {
  id: string;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_type: PaymentType;
  period_start?: string;
  period_end?: string;
  status: PaymentStatus;
  notes?: string;
  updated_at: string;
  created_at?: string;
}

export interface ExamFeeStructure {
  id: string;
  exam_year: ExamYear;
  exam_fee: number;
}

export interface ExamRegistration {
  id: string;
  student_id: string;
  exam_year: ExamYear;
  centre: Centre;
  exam_fee: number;
  payment_status: ExamPaymentStatus;
  created_at: string;
}

// ========================
// DATABASE SHAPE
// ========================

export interface Database {
  students: Student[];
  instrument_fees: InstrumentFee[];
  fee_payments: FeePayment[];
  exam_fee_structure: ExamFeeStructure[];
  exam_registrations: ExamRegistration[];
}

// ========================
// DASHBOARD STATS
// ========================

export interface DashboardStats {
  totalStudents: number;
  studentsByCentre: Record<string, number>;
  studentsByInstrument: Record<string, number>;
  studentsInExams: number;
  monthlyFeesCollected: number;
  monthlyFeesPending: number;
  examFeesCollected: number;
  examFeesPending: number;
}
