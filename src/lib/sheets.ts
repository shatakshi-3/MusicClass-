// Google Sheets integration using service account
import { google } from 'googleapis';
import { cache } from './cache';
import { mockStudents, type Student } from './mockData';

const CACHE_KEY = 'all_students';

// Column mapping for the Google Sheet (0-indexed)
const COLUMNS = {
  name: 0,
  phone: 1,
  age: 2,
  parentName: 3,
  course: 4,
  classTiming: 5,
  examCentre: 6,
  notes: 7,
  feeStatus: 8,
  lastFeePaid: 9,
};

function getSheetClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !key || !sheetId) {
    return null;
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return { sheets: google.sheets({ version: 'v4', auth }), sheetId };
}

function rowToStudent(row: string[], rowIndex: number): Student {
  return {
    id: row[COLUMNS.phone] || String(rowIndex),
    name: row[COLUMNS.name] || '',
    phone: row[COLUMNS.phone] || '',
    age: parseInt(row[COLUMNS.age]) || 0,
    parentName: row[COLUMNS.parentName] || '',
    course: row[COLUMNS.course] || '',
    classTiming: row[COLUMNS.classTiming] || '',
    examCentre: row[COLUMNS.examCentre] || '',
    notes: row[COLUMNS.notes] || '',
    feeStatus: (row[COLUMNS.feeStatus] as 'Paid' | 'Due') || 'Due',
    lastFeePaid: row[COLUMNS.lastFeePaid] || '',
  };
}

export async function getStudents(): Promise<Student[]> {
  // Check cache first
  const cached = cache.get<Student[]>(CACHE_KEY);
  if (cached) return cached;

  const client = getSheetClient();

  // Fallback to mock data if no credentials
  if (!client) {
    console.log('[Sheets] No credentials configured — using mock data');
    cache.set(CACHE_KEY, mockStudents);
    return mockStudents;
  }

  try {
    const response = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: 'Sheet1!A2:J', // Skip header row
    });

    const rows = response.data.values || [];
    const students = rows.map((row, idx) => rowToStudent(row as string[], idx + 2));

    // Deduplicate by phone number (keep last entry)
    const phoneMap = new Map<string, Student>();
    for (const s of students) {
      if (s.phone) phoneMap.set(s.phone, s);
    }
    const deduped = Array.from(phoneMap.values());

    cache.set(CACHE_KEY, deduped);
    return deduped;
  } catch (error) {
    console.error('[Sheets] Error fetching students:', error);
    // Fallback to mock on error
    return mockStudents;
  }
}

export async function findRowByPhone(phone: string): Promise<number | null> {
  const client = getSheetClient();
  if (!client) return null;

  try {
    const response = await client.sheets.spreadsheets.values.get({
      spreadsheetId: client.sheetId,
      range: 'Sheet1!B2:B', // Phone column
    });

    const rows = response.data.values || [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === phone) {
        return i + 2; // 1-indexed, skip header
      }
    }
    return null;
  } catch (error) {
    console.error('[Sheets] Error finding row:', error);
    return null;
  }
}

export async function updateStudentRow(
  phone: string,
  updates: Partial<Pick<Student, 'examCentre' | 'feeStatus' | 'lastFeePaid' | 'notes'>>
): Promise<boolean> {
  const client = getSheetClient();

  // Update mock data in dev mode
  if (!client) {
    const idx = mockStudents.findIndex((s) => s.phone === phone);
    if (idx === -1) return false;
    if (updates.examCentre !== undefined) mockStudents[idx].examCentre = updates.examCentre;
    if (updates.feeStatus !== undefined) mockStudents[idx].feeStatus = updates.feeStatus;
    if (updates.lastFeePaid !== undefined) mockStudents[idx].lastFeePaid = updates.lastFeePaid;
    if (updates.notes !== undefined) mockStudents[idx].notes = updates.notes;
    cache.invalidate(CACHE_KEY);
    return true;
  }

  try {
    const rowIndex = await findRowByPhone(phone);
    if (!rowIndex) return false;

    // Build batch update
    const data: { range: string; values: string[][] }[] = [];
    const colLetter = (col: number) => String.fromCharCode(65 + col);

    if (updates.examCentre !== undefined) {
      data.push({
        range: `Sheet1!${colLetter(COLUMNS.examCentre)}${rowIndex}`,
        values: [[updates.examCentre]],
      });
    }
    if (updates.notes !== undefined) {
      data.push({
        range: `Sheet1!${colLetter(COLUMNS.notes)}${rowIndex}`,
        values: [[updates.notes]],
      });
    }
    if (updates.feeStatus !== undefined) {
      data.push({
        range: `Sheet1!${colLetter(COLUMNS.feeStatus)}${rowIndex}`,
        values: [[updates.feeStatus]],
      });
    }
    if (updates.lastFeePaid !== undefined) {
      data.push({
        range: `Sheet1!${colLetter(COLUMNS.lastFeePaid)}${rowIndex}`,
        values: [[updates.lastFeePaid]],
      });
    }

    if (data.length > 0) {
      await client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: client.sheetId,
        requestBody: {
          valueInputOption: 'USER_ENTERED',
          data,
        },
      });
    }

    cache.invalidate(CACHE_KEY);
    return true;
  } catch (error) {
    console.error('[Sheets] Error updating row:', error);
    return false;
  }
}
