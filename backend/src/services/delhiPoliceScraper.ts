import https from 'https';
import crypto from 'crypto';
import { db } from '../config/firebase';

export interface DelhiPoliceCrimeRecord {
  id: string;
  sNo?: string;
  pressDate: string;
  title: string;
  desc: string;
  district: string;
  policeStation: string;
  category: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  riskRelevance: number;
  city: string;
  cityId: string;
  source: string;
  sourceUrl: string;
  timestamp: Date;
  time: string;
  lat: null;
  lng: null;
  loc: null;
}

function normalizeCategoryAndSeverity(category: string, title: string): {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  riskRelevance: number;
} {
  const combined = `${category} ${title}`.toLowerCase();

  if (combined.includes('murder') || combined.includes('rape') || combined.includes('assault') || combined.includes('women') || combined.includes('stalking')) {
    return {
      type: combined.includes('assault') ? 'Assault' : combined.includes('women') || combined.includes('stalking') ? 'Harassment' : 'Violent Crime',
      severity: 'CRITICAL',
      riskRelevance: 90,
    };
  }

  if (combined.includes('snatch') || combined.includes('chain')) {
    return {
      type: 'Chain Snatching',
      severity: 'HIGH',
      riskRelevance: 80,
    };
  }

  if (combined.includes('robbery') || combined.includes('extortion') || combined.includes('gang') || combined.includes('arms') || combined.includes('weapon')) {
    return {
      type: combined.includes('extortion') ? 'Extortion' : combined.includes('robbery') ? 'Robbery' : 'Armed Crime',
      severity: 'HIGH',
      riskRelevance: 80,
    };
  }

  if (combined.includes('theft') || combined.includes('burglary') || combined.includes('stolen') || combined.includes('auto theft')) {
    return {
      type: combined.includes('burglary') ? 'Burglary' : 'Theft',
      severity: 'MODERATE',
      riskRelevance: 60,
    };
  }

  if (combined.includes('harass') || combined.includes('molest') || combined.includes('eve teasing')) {
    return {
      type: 'Harassment',
      severity: 'CRITICAL',
      riskRelevance: 85,
    };
  }

  if (combined.includes('narcotics') || combined.includes('drug') || combined.includes('liquor') || combined.includes('illicit')) {
    return {
      type: 'Illicit Activity',
      severity: 'MODERATE',
      riskRelevance: 55,
    };
  }

  return {
    type: category.trim() || 'Incident',
    severity: 'MODERATE',
    riskRelevance: 50,
  };
}

function parseDate(dateStr: string): Date {
  // e.g. "22/08/2026" or "22-08-2026"
  try {
    const clean = dateStr.trim();
    const parts = clean.includes('/') ? clean.split('/') : clean.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  } catch {}
  return new Date();
}

/**
 * Fetch and parse press releases directly from Delhi Police portal
 */
export async function fetchDelhiPolicePressReleases(): Promise<DelhiPoliceCrimeRecord[]> {
  const url = 'https://www.delhipolice.gov.in/newpressrelease';

  return new Promise((resolve, reject) => {
    const req = https.get(url, { rejectUnauthorized: false, timeout: 15000 }, (res) => {
      let html = '';
      res.on('data', (chunk) => {
        html += chunk;
      });

      res.on('end', () => {
        try {
          const records = parseHtmlPressReleases(html);
          resolve(records);
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Delhi Police portal request timed out'));
    });
  });
}

/**
 * Extract crime rows from official table markup
 */
function parseHtmlPressReleases(html: string): DelhiPoliceCrimeRecord[] {
  const records: DelhiPoliceCrimeRecord[] = [];

  // Match table rows: <tr class="RowStyle"> or <tr class="AltRowStyle">
  const rowRegex = /<tr class="(?:RowStyle|AltRowStyle)"[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRegex) || [];

  for (const row of rows) {
    // Extract all <td> cells
    const tdMatches = row.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (tdMatches.length < 6) continue;

    // Helper to strip tags & HTML entities
    const cleanText = (raw: string) => {
      return raw
        .replace(/<[^>]+>/g, '')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const sNo = cleanText(tdMatches[0] || '');
    const pressDate = cleanText(tdMatches[1] || '');
    const title = cleanText(tdMatches[2] || '');
    const district = cleanText(tdMatches[3] || '');
    const policeStation = cleanText(tdMatches[4] || '');
    const category = cleanText(tdMatches[5] || '');

    if (!title || !pressDate) continue;

    const { type, severity, riskRelevance } = normalizeCategoryAndSeverity(category, title);
    const dateObj = parseDate(pressDate);

    // Create deterministic ID using MD5 hash of date + title
    const idHash = crypto.createHash('md5').update(`${pressDate}_${title}`).digest('hex').substring(0, 12);
    const id = `dp_${idHash}`;

    records.push({
      id,
      sNo,
      pressDate,
      title,
      desc: title,
      district,
      policeStation,
      category,
      type,
      severity,
      riskRelevance,
      city: 'New Delhi',
      cityId: 'New Delhi',
      source: 'Delhi Police',
      sourceUrl: 'https://www.delhipolice.gov.in/newpressrelease',
      timestamp: dateObj,
      time: pressDate,
      lat: null,
      lng: null,
      loc: null,
    });
  }

  return records;
}

/**
 * Fetch from Delhi Police and store into Firestore crimeReports collection
 */
export async function syncDelhiPoliceCrimeData(): Promise<{
  success: boolean;
  totalFetched: number;
  insertedOrUpdated: number;
  records: DelhiPoliceCrimeRecord[];
}> {
  const records = await fetchDelhiPolicePressReleases();
  let count = 0;

  for (const record of records) {
    const docRef = db.collection('crimeReports').doc(record.id);
    await docRef.set(
      {
        ...record,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    count++;
  }

  return {
    success: true,
    totalFetched: records.length,
    insertedOrUpdated: count,
    records,
  };
}
