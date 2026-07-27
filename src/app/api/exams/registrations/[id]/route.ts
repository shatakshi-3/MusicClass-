// PUT /api/exams/registrations/[id] — update exam registration (payment status + installment tracking)
// DELETE /api/exams/registrations/[id] — delete exam registration
import { NextRequest, NextResponse } from 'next/server';
import { updateExamRegistration, deleteExamRegistration } from '@/lib/db';
import { EXAM_PAYMENT_STATUSES, type ExamPaymentStatus } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { payment_status, amount_paid, remaining_balance, installment_number } = body;

    const updates: Record<string, any> = {};

    if (payment_status) {
      if (!EXAM_PAYMENT_STATUSES.includes(payment_status as ExamPaymentStatus)) {
        return NextResponse.json({ error: 'Valid payment status required: Paid, Pending, Partially Paid' }, { status: 400 });
      }
      updates.payment_status = payment_status;
    }

    if (amount_paid !== undefined) updates.amount_paid = Number(amount_paid);
    if (remaining_balance !== undefined) updates.remaining_balance = Number(remaining_balance);
    if (installment_number !== undefined) updates.installment_number = Number(installment_number);

    // Auto-calculate status based on amounts
    if (updates.amount_paid !== undefined && updates.remaining_balance !== undefined) {
      if (updates.remaining_balance <= 0) {
        updates.payment_status = 'Paid';
        updates.remaining_balance = 0;
      } else if (updates.amount_paid > 0) {
        updates.payment_status = 'Partially Paid';
      } else {
        updates.payment_status = 'Pending';
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const success = await updateExamRegistration(id, updates);
    if (!success) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating exam payment:', error);
    const message = error instanceof Error ? error.message : 'Failed to update payment';
    return NextResponse.json({ error: message }, { status: 500 });
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
