// POST /api/sync — sync students from Google Form responses
import { NextResponse } from 'next/server';
import { fetchFormResponses, isSheetConfigured } from '@/lib/sheets';
import { getStudents, createStudent, generateExpectedPayments } from '@/lib/db';

export async function POST() {
  try {
    // Check if configured
    if (!isSheetConfigured()) {
      return NextResponse.json(
        {
          error: 'Google Sheet CSV URL is not configured. Add GOOGLE_SHEET_CSV_URL to your .env.local file.',
          setupRequired: true,
        },
        { status: 400 }
      );
    }

    // Fetch form responses
    const { entries, errors: parseErrors } = await fetchFormResponses();

    if (entries.length === 0 && parseErrors.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: 0,
        errors: [],
        message: 'No form responses found. Make sure students have submitted the Google Form.',
      });
    }

    // Get existing students to dedup by phone
    const existingStudents = getStudents();
    const existingPhones = new Set(existingStudents.map((s) => s.phone));

    let imported = 0;
    let skipped = 0;
    const importErrors: string[] = [];

    for (const entry of entries) {
      // Skip if phone already exists
      if (existingPhones.has(entry.phone)) {
        skipped++;
        continue;
      }

      try {
        createStudent({
          name: entry.name,
          phone: entry.phone,
          age: entry.age,
          parents_name: entry.parents_name,
          instrument: entry.instrument,
          centre: entry.centre,
          class_timing: entry.class_timing,
          status: 'active',
        });

        existingPhones.add(entry.phone); // Prevent duplicates within the same sync
        imported++;
      } catch (err) {
        importErrors.push(`Failed to create ${entry.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Auto-generate monthly payment records for newly imported students
    if (imported > 0) {
      const now = new Date();
      generateExpectedPayments(now.getMonth() + 1, now.getFullYear());
    }

    // Build message
    const parts: string[] = [];
    if (imported > 0) parts.push(`${imported} new student${imported > 1 ? 's' : ''} imported`);
    if (skipped > 0) parts.push(`${skipped} already existed`);
    if (parseErrors.length > 0) parts.push(`${parseErrors.length} row${parseErrors.length > 1 ? 's' : ''} had errors`);

    return NextResponse.json({
      imported,
      skipped,
      errors: [
        ...parseErrors.map((e) => `Row ${e.row}: ${e.reason}`),
        ...importErrors,
      ],
      message: parts.join(', ') || 'Sync complete',
    });
  } catch (error) {
    console.error('[Sync] Error syncing from Google Form:', error);
    const message = error instanceof Error ? error.message : 'Failed to sync';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
