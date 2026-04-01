// GET /api/students — list students with filters
// POST /api/students — create new student
import { NextRequest, NextResponse } from 'next/server';
import { getStudents, createStudent, getFeeForInstrument } from '@/lib/db';
import { INSTRUMENTS, CENTRES, PAYMENT_BEHAVIORS, type Instrument, type Centre, type StudentStatus, type PaymentBehavior } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const centre = url.searchParams.get('centre') as Centre | null;
    const instrument = url.searchParams.get('instrument') as Instrument | null;
    const status = url.searchParams.get('status') as StudentStatus | null;
    const search = url.searchParams.get('search') || undefined;

    const students = await getStudents({
      centre: centre || undefined,
      instrument: instrument || undefined,
      status: status || undefined,
      search,
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error('[API] Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, age, parents_name, instrument, centre, class_timing, payment_type } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Valid name is required (min 2 chars)' }, { status: 400 });
    }
    if (!phone || typeof phone !== 'string' || !/^\d{10}$/.test(phone)) {
      return NextResponse.json({ error: 'Valid 10-digit phone number is required' }, { status: 400 });
    }
    if (!age || typeof age !== 'number' || age < 3 || age > 80) {
      return NextResponse.json({ error: 'Valid age (3-80) is required' }, { status: 400 });
    }
    if (!parents_name || typeof parents_name !== 'string') {
      return NextResponse.json({ error: 'Parent name is required' }, { status: 400 });
    }
    if (!instrument || !INSTRUMENTS.includes(instrument)) {
      return NextResponse.json({ error: 'Valid instrument is required' }, { status: 400 });
    }
    if (!centre || !CENTRES.includes(centre)) {
      return NextResponse.json({ error: 'Valid centre is required' }, { status: 400 });
    }
    if (!class_timing || typeof class_timing !== 'string') {
      return NextResponse.json({ error: 'Class timing is required' }, { status: 400 });
    }
    if (!payment_type || !PAYMENT_BEHAVIORS.includes(payment_type)) {
      return NextResponse.json({ error: 'Valid payment type is required' }, { status: 400 });
    }

    // Check for duplicate phone
    const existing = await getStudents({ search: phone });
    if (existing.some(s => s.phone === phone)) {
      return NextResponse.json({ error: 'A student with this phone number already exists' }, { status: 409 });
    }

    const student = await createStudent({
      name: name.trim(),
      phone: phone.trim(),
      age,
      parents_name: parents_name.trim(),
      instrument,
      centre,
      class_timing: class_timing.trim(),
      payment_type: payment_type as PaymentBehavior,
      status: 'active',
    });

    const monthlyFee = await getFeeForInstrument(instrument);

    return NextResponse.json({ student, monthlyFee }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating student:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
