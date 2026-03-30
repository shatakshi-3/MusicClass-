// PUT /api/fees/monthly/[id] — update payment status
import { NextRequest, NextResponse } from 'next/server';
import { updatePaymentStatus, deleteMonthlyPayment } from '@/lib/db';
import { PAYMENT_STATUSES, type PaymentStatus } from '@/lib/types';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !PAYMENT_STATUSES.includes(status as PaymentStatus)) {
      return NextResponse.json({ error: 'Valid status required: Paid, Pending, Late, Waived' }, { status: 400 });
    }

    const success = updatePaymentStatus(id, status as PaymentStatus);
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
    const success = deleteMonthlyPayment(id);
    if (!success) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting monthly payment:', error);
    return NextResponse.json({ error: 'Failed to delete monthly payment' }, { status: 500 });
  }
}
