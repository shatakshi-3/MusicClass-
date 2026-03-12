// POST /api/student-update — update student record
import { NextRequest, NextResponse } from 'next/server';
import { updateStudentRow } from '@/lib/sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, examCentre, feeStatus, lastFeePaid, notes } = body;

    // Input validation
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Sanitize inputs
    const updates: Record<string, string> = {};

    if (examCentre !== undefined) {
      if (!['Centre A', 'Centre B'].includes(examCentre)) {
        return NextResponse.json({ error: 'Invalid exam centre' }, { status: 400 });
      }
      updates.examCentre = examCentre;
    }

    if (feeStatus !== undefined) {
      if (!['Paid', 'Due'].includes(feeStatus)) {
        return NextResponse.json({ error: 'Invalid fee status' }, { status: 400 });
      }
      updates.feeStatus = feeStatus;
    }

    if (lastFeePaid !== undefined) {
      if (typeof lastFeePaid !== 'string' || lastFeePaid.length > 50) {
        return NextResponse.json({ error: 'Invalid last fee paid value' }, { status: 400 });
      }
      updates.lastFeePaid = lastFeePaid.trim();
    }

    if (notes !== undefined) {
      if (typeof notes !== 'string' || notes.length > 500) {
        return NextResponse.json({ error: 'Notes must be under 500 characters' }, { status: 400 });
      }
      updates.notes = notes.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const success = await updateStudentRow(phone, updates);

    if (!success) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}
