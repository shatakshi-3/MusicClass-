// GET/PUT /api/exams/structure — exam fee structure
import { NextRequest, NextResponse } from 'next/server';
import { getExamFeeStructure, updateExamFee } from '@/lib/db';

export async function GET() {
  try {
    const structure = await getExamFeeStructure();
    return NextResponse.json({ structure });
  } catch (error) {
    console.error('[API] Error fetching exam structure:', error);
    return NextResponse.json({ error: 'Failed to fetch exam structure' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, exam_fee } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Fee ID is required' }, { status: 400 });
    }
    if (typeof exam_fee !== 'number' || exam_fee < 0 || exam_fee > 100000) {
      return NextResponse.json({ error: 'Valid fee amount required (0-100000)' }, { status: 400 });
    }

    const updated = await updateExamFee(id, exam_fee);
    if (!updated) {
      return NextResponse.json({ error: 'Exam fee record not found' }, { status: 404 });
    }

    return NextResponse.json({ fee: updated });
  } catch (error) {
    console.error('[API] Error updating exam fee:', error);
    return NextResponse.json({ error: 'Failed to update exam fee' }, { status: 500 });
  }
}
