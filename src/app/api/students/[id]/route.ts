// GET/PUT/DELETE /api/students/[id]
import { NextRequest, NextResponse } from 'next/server';
import { getStudentById, updateStudent, deleteStudent } from '@/lib/db';
import { INSTRUMENTS, CENTRES, PAYMENT_BEHAVIORS } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await getStudentById(id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ student });
  } catch (error) {
    console.error('[API] Error fetching student:', error);
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length < 2) {
        return NextResponse.json({ error: 'Valid name required' }, { status: 400 });
      }
      updates.name = body.name.trim();
    }
    if (body.phone !== undefined) {
      if (typeof body.phone !== 'string' || !/^\d{10}$/.test(body.phone)) {
        return NextResponse.json({ error: 'Valid 10-digit phone required' }, { status: 400 });
      }
      updates.phone = body.phone.trim();
    }
    if (body.age !== undefined) {
      if (typeof body.age !== 'number' || body.age < 3 || body.age > 80) {
        return NextResponse.json({ error: 'Valid age (3-80) required' }, { status: 400 });
      }
      updates.age = body.age;
    }
    if (body.parents_name !== undefined) {
      updates.parents_name = String(body.parents_name).trim();
    }
    if (body.instrument !== undefined) {
      if (!INSTRUMENTS.includes(body.instrument)) {
        return NextResponse.json({ error: 'Invalid instrument' }, { status: 400 });
      }
      updates.instrument = body.instrument;
    }
    if (body.centre !== undefined) {
      if (!CENTRES.includes(body.centre)) {
        return NextResponse.json({ error: 'Invalid centre' }, { status: 400 });
      }
      updates.centre = body.centre;
    }
    if (body.class_timing !== undefined) {
      updates.class_timing = String(body.class_timing).trim();
    }
    if (body.payment_type !== undefined) {
      if (!PAYMENT_BEHAVIORS.includes(body.payment_type)) {
        return NextResponse.json({ error: 'Invalid payment type' }, { status: 400 });
      }
      updates.payment_type = body.payment_type;
    }
    if (body.status !== undefined) {
      if (!['active', 'inactive'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    const student = await updateStudent(id, updates);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error) {
    console.error('[API] Error updating student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteStudent(id);
    if (!success) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting student:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
