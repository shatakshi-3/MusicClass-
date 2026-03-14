// POST /api/fees/monthly/generate — generate monthly payment records
import { NextRequest, NextResponse } from 'next/server';
import { generateMonthlyPayments } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, year } = body;

    if (!month || typeof month !== 'number' || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Valid month (1-12) required' }, { status: 400 });
    }
    if (!year || typeof year !== 'number' || year < 2020 || year > 2050) {
      return NextResponse.json({ error: 'Valid year (2020-2050) required' }, { status: 400 });
    }

    const count = generateMonthlyPayments(month, year);

    return NextResponse.json({
      success: true,
      generated: count,
      message: count > 0
        ? `Generated payment records for ${count} student${count > 1 ? 's' : ''}`
        : 'All active students already have records for this month',
    });
  } catch (error) {
    console.error('[API] Error generating payments:', error);
    return NextResponse.json({ error: 'Failed to generate payments' }, { status: 500 });
  }
}
