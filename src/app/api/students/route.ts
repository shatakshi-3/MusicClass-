// GET /api/students — fetch all students
import { NextResponse } from 'next/server';
import { getStudents } from '@/lib/sheets';

export async function GET() {
  try {
    const students = await getStudents();
    return NextResponse.json({ students });
  } catch (error) {
    console.error('[API] Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}
