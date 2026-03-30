// GET /api/fees — fee payments with filters
// POST /api/fees — record a new payment
import { NextRequest, NextResponse } from 'next/server';
import { getFeePayments, createFeePayment, getStudentById } from '@/lib/db';
import type { Centre, Instrument, PaymentStatus, PaymentLabel } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const student_id = url.searchParams.get('student_id') || undefined;
    const payment_type = url.searchParams.get('payment_type') as PaymentLabel | null;
    const centre = url.searchParams.get('centre') as Centre | null;
    const instrument = url.searchParams.get('instrument') as Instrument | null;
    const status = url.searchParams.get('status') as PaymentStatus | null;

    const payments = getFeePayments({
      student_id,
      payment_type: payment_type || undefined,
      centre: centre || undefined,
      instrument: instrument || undefined,
      status: status || undefined,
    });

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = payments.filter(p => p.status !== 'Paid').reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({ payments, totalAmount, paidAmount, pendingAmount });
  } catch (error) {
    console.error('[API] Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, amount, payment_date, payment_type, period_label, status, notes } = body;

    if (!student_id || amount === undefined || amount < 0 || !payment_date || !payment_type || !status) {
      return NextResponse.json({ error: 'Missing required fields or invalid amount' }, { status: 400 });
    }

    const student = getStudentById(student_id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const payment = createFeePayment({
      student_id,
      amount: Number(amount),
      payment_date,
      payment_type,
      period_label: period_label || undefined,
      status,
      notes
    });

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating payment:', error);
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 });
  }
}
