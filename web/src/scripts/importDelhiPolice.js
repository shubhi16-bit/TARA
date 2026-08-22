import https from 'https';
import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCc2l1aaywbwqwnB-2TYu0iNaJLdH2eImI",
  authDomain: "tara-3b146.firebaseapp.com",
  projectId: "tara-3b146",
  storageBucket: "tara-3b146.firebasestorage.app",
  messagingSenderId: "536025525990",
  appId: "1:536025525990:web:301fd53a0bc09b94a31527"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function normalizeCategoryAndSeverity(category, title) {
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

function parseDate(dateStr) {
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

async function fetchDelhiPoliceHtml() {
  const url = 'https://www.delhipolice.gov.in/newpressrelease';
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => reject(err));
  });
}

function parsePressReleases(html) {
  const records = [];
  const rowRegex = /<tr class="(?:RowStyle|AltRowStyle)"[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowRegex) || [];

  for (const row of rows) {
    const tdMatches = row.match(/<td[\s\S]*?<\/td>/gi) || [];
    if (tdMatches.length < 6) continue;

    const cleanText = (raw) => {
      return raw
        .replace(/<[^>]+>/g, '')
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const sNo = cleanText(tdMatches[0]);
    const pressDate = cleanText(tdMatches[1]);
    const title = cleanText(tdMatches[2]);
    const district = cleanText(tdMatches[3]);
    const policeStation = cleanText(tdMatches[4]);
    const category = cleanText(tdMatches[5]);

    if (!title || !pressDate) continue;

    const { type, severity, riskRelevance } = normalizeCategoryAndSeverity(category, title);
    const dateObj = parseDate(pressDate);
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

export async function runImport() {
  console.log("=================================================");
  console.log("IMPORTING REAL DELHI POLICE CRIME DATA TO FIRESTORE");
  console.log("Source: https://www.delhipolice.gov.in/newpressrelease");
  console.log("=================================================");

  console.log("Fetching official press releases from Delhi Police portal...");
  const html = await fetchDelhiPoliceHtml();
  const records = parsePressReleases(html);

  console.log(`Parsed ${records.length} official press releases.`);
  console.log("Syncing into Firestore collection 'crimeReports'...");

  let inserted = 0;
  for (const record of records) {
    const docRef = doc(db, "crimeReports", record.id);
    await setDoc(docRef, {
      ...record,
      importedAt: new Date(),
    }, { merge: true });
    inserted++;
  }

  console.log(`Successfully synced ${inserted} official crime records into Firestore.`);
  console.log("=================================================");
  process.exit(0);
}

runImport().catch(err => {
  console.error("Failed to import Delhi Police crime data:", err);
  process.exit(1);
});

