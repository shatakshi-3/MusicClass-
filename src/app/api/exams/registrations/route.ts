// GET/POST /api/exams/registrations — exam registrations
import { NextRequest, NextResponse } from 'next/server';
import { getExamRegistrations, createExamRegistration, getStudentById } from '@/lib/db';
import { CENTRES, EXAM_YEARS, type Centre, type ExamPaymentStatus, type ExamYear } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const centre = url.searchParams.get('centre') as Centre | null;
    const payment_status = url.searchParams.get('payment_status') as ExamPaymentStatus | null;

    const registrations = getExamRegistrations({
      centre: centre || undefined,
      payment_status: payment_status || undefined,
    });

    const totalFees = registrations.reduce((sum, r) => sum + r.exam_fee, 0);
    const paidFees = registrations.filter(r => r.payment_status === 'Paid').reduce((sum, r) => sum + r.exam_fee, 0);

    return NextResponse.json({ registrations, totalFees, paidFees });
  } catch (error) {
    console.error('[API] Error fetching exam registrations:', error);
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, exam_year, centre } = body;

    if (!student_id || typeof student_id !== 'string') {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const student = getStudentById(student_id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    if (!exam_year || !EXAM_YEARS.includes(exam_year as ExamYear)) {
      return NextResponse.json({ error: 'Valid exam year (1-6) is required' }, { status: 400 });
    }

    if (!centre || !CENTRES.includes(centre as Centre)) {
      return NextResponse.json({ error: 'Valid centre is required' }, { status: 400 });
    }

    const registration = createExamRegistration({
      student_id,
      exam_year: exam_year as ExamYear,
      centre: centre as Centre,
    });

    return NextResponse.json({ registration }, { status: 201 });
  } catch (error) {
    console.error('[API] Error creating exam registration:', error);
    return NextResponse.json({ error: 'Failed to create registration' }, { status: 500 });
  }
}
