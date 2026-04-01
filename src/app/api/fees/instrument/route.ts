// GET/PUT /api/fees/instrument — instrument fee structure
import { NextRequest, NextResponse } from 'next/server';
import { getInstrumentFees, updateInstrumentFee } from '@/lib/db';

export async function GET() {
  try {
    const fees = await getInstrumentFees();
    return NextResponse.json({ fees });
  } catch (error) {
    console.error('[API] Error fetching instrument fees:', error);
    return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, monthly_fee } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Fee ID is required' }, { status: 400 });
    }
    if (typeof monthly_fee !== 'number' || monthly_fee < 0 || monthly_fee > 100000) {
      return NextResponse.json({ error: 'Valid fee amount required (0-100000)' }, { status: 400 });
    }

    const updated = await updateInstrumentFee(id, monthly_fee);
    if (!updated) {
      return NextResponse.json({ error: 'Fee record not found' }, { status: 404 });
    }

    return NextResponse.json({ fee: updated });
  } catch (error) {
    console.error('[API] Error updating instrument fee:', error);
    return NextResponse.json({ error: 'Failed to update fee' }, { status: 500 });
  }
}
