// Google Sheets CSV/TSV fetcher — 100% resilient parsing
import { INSTRUMENTS, CENTRES, type Instrument, type Centre } from './types';

const SHEET_CSV_URL = process.env.GOOGLE_SHEET_CSV_URL || '';

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
 * Split line by Tab (\t) or Comma (,), handling quotes
 */
function parseLine(line: string): string[] {
  // If line contains tabs, split by tab
  if (line.includes('\t')) {
    return line.split('\t').map(s => s.trim().replace(/^"|"$/g, ''));
  }

  // Otherwise CSV comma split
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
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

function mapInstrument(raw: string): Instrument {
  const cleaned = (raw || '').trim().toLowerCase();
  if (cleaned.includes('vocal')) return 'Vocal';
  if (cleaned.includes('tabla')) return 'Tabla';
  if (cleaned.includes('piano') || cleaned.includes('keyboard')) return 'Piano';
  if (cleaned.includes('guitar')) return 'Guitar';
  if (cleaned.includes('harmonium')) return 'Harmonium';

  // Exact match search
  const found = INSTRUMENTS.find(i => i.toLowerCase() === cleaned);
  return found || 'Vocal';
}

function mapCentre(raw: string): Centre {
  const cleaned = (raw || '').trim().toLowerCase();
  if (cleaned.includes('khairagarh') || cleaned.includes('university') || cleaned.includes('centre b')) {
    return 'Khairagarh University';
  }
  return 'Prayag Sangeet Samiti';
}

export async function fetchFormResponses(): Promise<{
  entries: ParsedFormEntry[];
  errors: SyncError[];
}> {
  if (!SHEET_CSV_URL) {
    throw new Error('GOOGLE_SHEET_CSV_URL is not configured');
  }

  // Fetch with explicit redirect following
  let csvText = '';
  const response = await fetch(SHEET_CSV_URL, {
    cache: 'no-store',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }

  const responseText = await response.text();

  // Check if we got HTML (redirect page) instead of CSV
  if (responseText.trim().startsWith('<')) {
    // Got HTML redirect — extract the redirect URL from href and re-fetch
    const locationMatch = responseText.match(/href="([^"]+)"/);
    if (locationMatch) {
      const redirectUrl = locationMatch[1].replace(/&amp;/g, '&');
      const redirectResponse = await fetch(redirectUrl, { cache: 'no-store', redirect: 'follow' });
      if (!redirectResponse.ok) {
        throw new Error(`Failed to fetch sheet after redirect: ${redirectResponse.status}`);
      }
      csvText = await redirectResponse.text();
    } else {
      throw new Error('Google Sheet returned HTML instead of CSV. Make sure the sheet is published to web as CSV.');
    }
  } else {
    csvText = responseText;
  }

  // Split lines, filter out completely empty rows
  const lines = csvText.split('\n').filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    // Skip rows that are all commas (empty CSV row like ",,,,,,,")
    if (trimmed.replace(/,/g, '').trim() === '') return false;
    return true;
  });

  if (lines.length < 2) {
    return { entries: [], errors: [] };
  }

  const entries: ParsedFormEntry[] = [];
  const errors: SyncError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const rowNum = i + 1;

    try {
      const name = (cols[1] || '').trim();
      const phone = (cols[2] || '').trim().replace(/\D/g, '').slice(-10);

      // Extract numeric digits from age (e.g. "9yeae" -> 9, "10 yars" -> 10)
      const ageDigits = (cols[3] || '').replace(/\D/g, '');
      let age = ageDigits ? parseInt(ageDigits, 10) : 10;
      if (isNaN(age) || age < 3 || age > 80) age = 10;

      const parents_name = (cols[4] || '').trim();
      const instrumentRaw = (cols[5] || '').trim();
      const centreRaw = (cols[6] || '').trim();
      const class_timing = (cols[7] || '').trim();

      if (!name || name.length < 2) {
        errors.push({ row: rowNum, reason: 'Missing or invalid name', data: name });
        continue;
      }
      if (!phone || phone.length < 10) {
        errors.push({ row: rowNum, reason: 'Invalid phone number', data: cols[2] });
        continue;
      }

      const instrument = mapInstrument(instrumentRaw);
      const centre = mapCentre(centreRaw);

      entries.push({
        name,
        phone,
        age,
        parents_name: parents_name || name,
        instrument,
        centre,
        class_timing: class_timing || 'Mon/Wed/Fri 5:00 PM',
      });
    } catch {
      errors.push({ row: rowNum, reason: 'Failed to parse row' });
    }
  }

  return { entries, errors };
}

export function isSheetConfigured(): boolean {
  return !!SHEET_CSV_URL;
}
