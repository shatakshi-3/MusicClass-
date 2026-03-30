// PUT /api/fees/[id] — update payment fields
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
    const { status, notes, payment_type, period_label } = body;

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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided to update' }, { status: 400 });
    }

    const success = updatePaymentStatus(id, updates);
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
    const success = deleteFeePayment(id);
    if (!success) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting fee payment:', error);
    return NextResponse.json({ error: 'Failed to delete fee payment' }, { status: 500 });
  }
}
