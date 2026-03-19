// Google Sheets CSV fetcher — 100% free, no API keys needed
// Reads from a published Google Sheet CSV URL

import { INSTRUMENTS, CENTRES, type Instrument, type Centre } from './types';

const SHEET_CSV_URL = process.env.GOOGLE_SHEET_CSV_URL || '';

interface FormRow {
  name: string;
  phone: string;
  age: number;
  parents_name: string;
  instrument: string;
  centre: string;
  class_timing: string;
  timestamp: string;
}

/**
 * Parse a CSV line handling quoted fields (Google Sheets may quote fields with commas)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Maps a raw instrument value from the form to a valid Instrument type
 */
function mapInstrument(raw: string): Instrument | null {
  const cleaned = raw.trim();
  // Exact match first
  const found = INSTRUMENTS.find(
    (i) => i.toLowerCase() === cleaned.toLowerCase()
  );
  return found || null;
}

/**
 * Maps a raw centre value from the form to a valid Centre type
 */
function mapCentre(raw: string): Centre | null {
  const cleaned = raw.trim();
  const found = CENTRES.find(
    (c) => c.toLowerCase() === cleaned.toLowerCase()
  );
  return found || null;
}

export interface ParsedFormEntry {
  name: string;
  phone: string;
  age: number;
  parents_name: string;
  instrument: Instrument;
  centre: Centre;
  class_timing: string;
}

export interface SyncError {
  row: number;
  reason: string;
  data?: string;
}

/**
 * Fetch and parse all form responses from the published Google Sheet CSV.
 *
 * Expected column order (matches the recommended Google Form):
 *   0: Timestamp
 *   1: Student Name
 *   2: Phone Number
 *   3: Age
 *   4: Parent/Guardian Name
 *   5: Instrument
 *   6: Centre
 *   7: Class Timing
 */
export async function fetchFormResponses(): Promise<{
  entries: ParsedFormEntry[];
  errors: SyncError[];
}> {
  if (!SHEET_CSV_URL) {
    throw new Error('GOOGLE_SHEET_CSV_URL is not configured');
  }

  const response = await fetch(SHEET_CSV_URL, {
    cache: 'no-store', // Always get fresh data
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  const lines = csvText.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return { entries: [], errors: [] }; // Only header or empty
  }

  const entries: ParsedFormEntry[] = [];
  const errors: SyncError[] = [];

  // Skip header row (index 0), process data rows
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const rowNum = i + 1; // human-readable row number

    try {
      // Extract fields (Timestamp is col 0, data starts at col 1)
      const name = (cols[1] || '').trim();
      const phone = (cols[2] || '').trim().replace(/\D/g, '').slice(-10);
      const ageRaw = parseInt(cols[3] || '');
      const parents_name = (cols[4] || '').trim();
      const instrumentRaw = (cols[5] || '').trim();
      const centreRaw = (cols[6] || '').trim();
      const class_timing = (cols[7] || '').trim();

      // Validate required fields
      if (!name || name.length < 2) {
        errors.push({ row: rowNum, reason: 'Missing or invalid name', data: name });
        continue;
      }
      if (!phone || !/^\d{10}$/.test(phone)) {
        errors.push({ row: rowNum, reason: 'Invalid phone number (need 10 digits)', data: phone });
        continue;
      }
      if (isNaN(ageRaw) || ageRaw < 3 || ageRaw > 80) {
        errors.push({ row: rowNum, reason: 'Invalid age', data: cols[3] });
        continue;
      }

      const instrument = mapInstrument(instrumentRaw);
      if (!instrument) {
        errors.push({ row: rowNum, reason: `Unknown instrument: "${instrumentRaw}"`, data: instrumentRaw });
        continue;
      }

      const centre = mapCentre(centreRaw);
      if (!centre) {
        errors.push({ row: rowNum, reason: `Unknown centre: "${centreRaw}"`, data: centreRaw });
        continue;
      }

      entries.push({
        name,
        phone,
        age: ageRaw,
        parents_name: parents_name || name, // fallback if parent name empty
        instrument,
        centre,
        class_timing: class_timing || 'TBD',
      });
    } catch {
      errors.push({ row: rowNum, reason: 'Failed to parse row' });
    }
  }

  return { entries, errors };
}

/**
 * Check if Google Sheet CSV URL is configured
 */
export function isSheetConfigured(): boolean {
  return !!SHEET_CSV_URL;
}
