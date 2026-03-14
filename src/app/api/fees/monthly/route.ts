// GET /api/fees/monthly — monthly fee payments with filters
import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyPayments } from '@/lib/db';
import type { Centre, Instrument, PaymentStatus } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const month = url.searchParams.get('month') ? Number(url.searchParams.get('month')) : undefined;
    const year = url.searchParams.get('year') ? Number(url.searchParams.get('year')) : undefined;
    const centre = url.searchParams.get('centre') as Centre | null;
    const instrument = url.searchParams.get('instrument') as Instrument | null;
    const status = url.searchParams.get('status') as PaymentStatus | null;

    const payments = getMonthlyPayments({
      month,
      year,
      centre: centre || undefined,
      instrument: instrument || undefined,
      status: status || undefined,
    });

    // Compute totals
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = payments.filter(p => p.status !== 'Paid').reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({ payments, totalAmount, paidAmount, pendingAmount });
  } catch (error) {
    console.error('[API] Error fetching monthly payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
