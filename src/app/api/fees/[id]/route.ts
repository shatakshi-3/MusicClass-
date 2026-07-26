// PUT /api/fees/[id] — update payment fields (supports installment updates)
// DELETE /api/fees/[id] — delete payment record
import { NextRequest, NextResponse } from 'next/server';
import { updatePaymentStatus, deleteFeePayment } from '@/lib/db';
import { PAYMENT_STATUSES, PAYMENT_LABELS, type PaymentStatus, type PaymentLabel } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      status, notes, payment_type, period_label,
      amount_paid, remaining_balance, installment_number,
      payment_mode, payment_date, amount, total_fee,
    } = body;

    const updates: Record<string, any> = {};

    if (status) {
      if (!PAYMENT_STATUSES.includes(status as PaymentStatus)) {
        return NextResponse.json({ error: 'Valid status required' }, { status: 400 });
      }
      updates.status = status;
    }

    if (payment_type) {
      if (!PAYMENT_LABELS.includes(payment_type as PaymentLabel)) {
        return NextResponse.json({ error: 'Valid payment type required' }, { status: 400 });
      }
      updates.payment_type = payment_type;
    }

    if (notes !== undefined) updates.notes = notes;
    if (period_label !== undefined) updates.period_label = period_label;
    if (payment_date !== undefined) updates.payment_date = payment_date;
    if (payment_mode !== undefined) updates.payment_mode = payment_mode;

    // Installment tracking fields
    if (amount_paid !== undefined) updates.amount_paid = Number(amount_paid);
    if (remaining_balance !== undefined) updates.remaining_balance = Number(remaining_balance);
    if (installment_number !== undefined) updates.installment_number = Number(installment_number);
    if (amount !== undefined) updates.amount = Number(amount);
    if (total_fee !== undefined) updates.total_fee = Number(total_fee);

    // Auto-calculate status based on amounts if both are provided
    if (updates.amount_paid !== undefined && updates.remaining_balance !== undefined) {
      if (updates.remaining_balance <= 0) {
        updates.status = 'Paid';
        updates.remaining_balance = 0;
      } else if (updates.amount_paid > 0) {
        updates.status = 'Partially Paid';
      } else {
        updates.status = 'Pending';
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided to update' }, { status: 400 });
    }

    const success = await updatePaymentStatus(id, updates);
    if (!success) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating payment:', error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteFeePayment(id);
    if (!success) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting fee payment:', error);
    return NextResponse.json({ error: 'Failed to delete fee payment' }, { status: 500 });
  }
}
