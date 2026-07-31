// GET /api/dashboard — aggregated analytics
import { NextResponse } from 'next/server';
import { getStudents, getFeePayments, getExamRegistrations } from '@/lib/db';
import { INSTRUMENTS, CENTRES } from '@/lib/types';
import type { DashboardStats } from '@/lib/types';

export async function GET() {
  try {
    // Run all queries in parallel — if one fails, catch individually
    const [studentsResult, paymentsResult, regsResult] = await Promise.allSettled([
      getStudents({ status: 'active' }),
      getFeePayments(),
      getExamRegistrations(),
    ]);

    const students = studentsResult.status === 'fulfilled' ? studentsResult.value : [];
    const payments = paymentsResult.status === 'fulfilled' ? paymentsResult.value : [];
    const regs = regsResult.status === 'fulfilled' ? regsResult.value : [];

    if (studentsResult.status === 'rejected') {
      console.error('[Dashboard] Failed to fetch students:', studentsResult.reason);
    }
    if (paymentsResult.status === 'rejected') {
      console.error('[Dashboard] Failed to fetch payments:', paymentsResult.reason);
    }
    if (regsResult.status === 'rejected') {
      console.error('[Dashboard] Failed to fetch exam registrations:', regsResult.reason);
    }

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
    const monthlyStudents = students.filter(s => s.student_type === 'MONTHLY' || !s.student_type).length;
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

    // Average payment per student
    const activeIds = new Set(students.map(s => s.id));
    const activePayments = payments.filter(p => activeIds.has(p.student_id));
    const avgPaymentPerStudent = students.length > 0
      ? Math.round(activePayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0) / students.length)
      : 0;

    // Exam stats
    const examFeesCollected = regs.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
    const examFeesPending = regs.reduce((sum, r) => sum + Number(r.remaining_balance || 0), 0);
    const uniqueExamStudents = new Set(regs.map(r => r.student_id));

    // Pending fees
    const pendingFromPayments = payments.reduce((sum, p) => {
      if (p.status === 'Paid') return sum;
      return sum + Number(p.remaining_balance || 0);
    }, 0);
    const pendingFees = pendingFromPayments + examFeesPending;

    // Fully paid vs partially paid
    const studentPaymentGroups = new Map<string, any[]>();
    for (const p of payments) {
      const existing = studentPaymentGroups.get(p.student_id) || [];
      existing.push(p);
      studentPaymentGroups.set(p.student_id, existing);
    }

    let fullyPaidStudents = 0;
    let partiallyPaidStudents = 0;
    for (const [, studentPayments] of studentPaymentGroups) {
      const allPaid = studentPayments.every((p: any) => p.status === 'Paid');
      const anyPartial = studentPayments.some((p: any) => p.status === 'Partially Paid');
      if (allPaid) fullyPaidStudents++;
      else if (anyPartial) partiallyPaidStudents++;
    }
    for (const reg of regs) {
      if (reg.payment_status === 'Paid' && !studentPaymentGroups.has(reg.student_id)) {
        fullyPaidStudents++;
      } else if (reg.payment_status === 'Partially Paid') {
        partiallyPaidStudents++;
      }
    }

    const stats: DashboardStats = {
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

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('[API] Error fetching dashboard stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
