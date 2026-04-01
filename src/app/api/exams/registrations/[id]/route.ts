// PUT /api/exams/registrations/[id] — update exam payment status
import { NextRequest, NextResponse } from 'next/server';
import { updateExamPaymentStatus, deleteExamRegistration } from '@/lib/db';
import { EXAM_PAYMENT_STATUSES, type ExamPaymentStatus } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { payment_status } = body;

    if (!payment_status || !EXAM_PAYMENT_STATUSES.includes(payment_status as ExamPaymentStatus)) {
      return NextResponse.json({ error: 'Valid payment status required: Paid, Pending' }, { status: 400 });
    }

    const success = await updateExamPaymentStatus(id, payment_status as ExamPaymentStatus);
    if (!success) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating exam payment:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteExamRegistration(id);
    if (!success) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting exam registration:', error);
    return NextResponse.json({ error: 'Failed to delete exam registration' }, { status: 500 });
  }
}
