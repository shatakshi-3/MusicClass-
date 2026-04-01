// ========================
// CONSTANTS
// ========================

export const CENTRES = ['Prayag Sangeet Samiti', 'Khairagarh University'] as const;
export type Centre = (typeof CENTRES)[number];

export const INSTRUMENTS = ['Guitar', 'Piano', 'Tabla', 'Vocal', 'Keyboard', 'Violin'] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

export const STUDENT_STATUSES = ['active', 'inactive'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const PAYMENT_STATUSES = ['Paid', 'Pending'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_BEHAVIORS = ['REGULAR', 'OCCASIONAL', 'FLEXIBLE'] as const;
export type PaymentBehavior = (typeof PAYMENT_BEHAVIORS)[number];

export const PAYMENT_LABELS = ['Regular', 'Occasional', 'Flexible'] as const;
export type PaymentLabel = (typeof PAYMENT_LABELS)[number];

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
  payment_type?: PaymentBehavior;
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
  payment_type: PaymentLabel;
  period_label?: string;
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
// DASHBOARD STATS
// ========================

export interface DashboardStats {
  totalStudents: number;
  studentsByCentre: Record<string, number>;
  studentsByInstrument: Record<string, number>;
  studentsInExams: number;
  totalCollected: number;
  last30DaysCollected: number;
  studentsNoPay30Days: number;
  avgPaymentPerStudent: number;
  examFeesCollected: number;
  examFeesPending: number;
}
