import { readFileSync, writeFileSync } from 'fs';
import XLSX from 'xlsx';

const inputPath = process.argv[2] || 'data/testitesti.xlsx';

const workbook = XLSX.readFile(inputPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const COL = {
  domain: 1,
  priority: 2,
  topic: 3,
  owner: 4,
  participants: 5,
  info: 6,
  duration: 7,
  participantListReady: 8,
  internalOnly: 9,
};

const DATA_START = 3;

const KNOWN_DOMAIN_PREFIXES = [
  'DSE&A', 'DSE', 'DG', 'S&M', 'MSS', 'B2B', 'N&F', 'TM',
  'Core & Sales Reporting', 'Digital & AI', 'BSS/SME',
  'Marketing', 'Print', 'Ad Manager & Creative AI',
  'Ad Manager Product', 'Ad Manager', 'Creative AI',
  'Performance Products', 'API', 'SF', 'OPU', 'CPR',
];

// Nimimäppäykset: normalisoidaan variantit samaan nimeen
const NAME_ALIASES = {
  'Filip': 'Filip Holmberg',
  'Fillip': 'Filip Holmberg',
  'Filip Homberg': 'Filip Holmberg',
  'Jaana': 'Jaana Tanskanen',
  'Jaana Ta': 'Jaana Tanskanen',
  'Jaanat': 'Jaana Tanskanen',
  'Jaana Ty': 'Jaana Tyynismaa',
  'Satu': 'Satu Raatikainen',
  'Heidi': 'Heidi Falenius',
  'Bilal': 'Bilal Gill',
  'Antero': 'Antero Karttunen',
  'Toni': 'Toni Törnqvist',
  'Anniina': 'Anniina Hautala',
  'Leena': 'Leena Koskinen',
  'Tuukka': 'Tuukka Aalto',
  'Tuuli': 'Tuuli Rikama',
  'Päivi': 'Päivi Rautio',
  'Päivi Vaittiinen': 'Päivi Vaittinen',
  'Vesa': 'Vesa Mäkinen',
  'Tanja': 'Tanja Virtanen',
  'Harri': 'Harri Lilja',
  'Airi': 'Airi Viljamaa',
  'Maiju': 'Maiju Häkkinen',
  'Johannes': 'Johannes Hocksell',
  'Jero': 'Jero Karppinen',
  'Katriina': 'Katriina Siimes',
  'Sami Luutiviki': 'Sami Luutikivi',
  'Jenni Tammninen': 'Jenni Tamminen',
};

// Nämä eivät ole henkilönimiä
const NOT_NAMES = new Set([
  'Raportointi', 'Data', 'TM', 'Ad Manager Product',
  'TBD', 'Sanna W', 'Digital', 'AI:',
  'Digital Operations', 'Product Sales', 'Marketing',
  'Performance Products', 'Sales Development Team',
  'Tuotemyynti', 'Nelonen Media', 'Ad Mananger', 'Advendio',
  'Ad Manager', 'Creative AI',
]);

function normalizeName(name) {
  return NAME_ALIASES[name] || name;
}

function extractNames(text) {
  if (!text || typeof text !== 'string') return [];

  const names = [];
  const lines = text.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);

  for (let line of lines) {
    for (const prefix of KNOWN_DOMAIN_PREFIXES) {
      const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:.]?\\s*`, 'i');
      line = line.replace(re, '');
    }

    line = line.replace(/\([^)]*\)/g, '');

    const parts = line.split(/[,/]/).map(p => p.trim()).filter(Boolean);

    for (let part of parts) {
      part = part.replace(/[?…]+$/, '').trim();
      part = part.replace(/\s*-\s*$/, '').trim();

      if (!part) continue;

      const namePattern = /^[A-ZÄÖÅÉÈ][a-zäöåéèü]+(?:\s+[A-ZÄÖÅÉÈ][a-zäöåéèü]+){0,3}$/;
      if (namePattern.test(part) && part.length >= 4 && part.length <= 40) {
        const normalized = normalizeName(part);
        if (!NOT_NAMES.has(normalized)) {
          names.push(normalized);
        }
      }
    }
  }

  return [...new Set(names)];
}

function cleanOwner(raw) {
  if (!raw || typeof raw !== 'string') return 'TBD';
  let name = raw.split(/[\r\n]/)[0].trim();
  name = name.replace(/[?]+$/, '').trim();
  name = name.replace(/\s*\(.*\)/, '').trim();

  if (name.includes(' + ') || name.includes(' & ')) {
    return name;
  }

  if (name.endsWith(':') || name === 'TBD' || name === 'Digital & AI:' || !name) return 'TBD';

  return normalizeName(name);
}

function splitMultiOwner(ownerStr) {
  if (ownerStr.includes(' + ')) return ownerStr.split(' + ').map(n => n.trim());
  if (ownerStr.includes(' & ')) return ownerStr.split(' & ').map(n => n.trim());
  if (ownerStr.includes('/')) return ownerStr.split('/').map(n => n.trim());
  return [ownerStr];
}

function parseDuration(raw) {
  if (!raw) return 60;
  const str = String(raw).trim().toLowerCase();
  const match = str.match(/([\d,.]+)/);
  if (!match) return 60;
  const hours = parseFloat(match[1].replace(',', '.'));
  return Math.round(hours * 60);
}

function parsePriority(raw) {
  if (!raw) return 99;
  const num = parseInt(raw);
  if (!isNaN(num)) return num;
  return 99;
}

function guessParticipantDomain(name, participantsText) {
  if (!participantsText) return '';
  const lines = participantsText.split(/[\r\n]+/);
  for (const line of lines) {
    if (!line.includes(name)) continue;
    for (const prefix of KNOWN_DOMAIN_PREFIXES) {
      if (line.trim().startsWith(prefix)) {
        return prefix.replace(/:$/, '').trim();
      }
    }
  }
  return '';
}

function parseRow(row, index) {
  const topic = row[COL.topic];
  if (!topic || typeof topic !== 'string' || !topic.trim()) return null;

  const domain = (row[COL.domain] || '').toString().trim();
  const ownerRaw = cleanOwner(row[COL.owner]);
  const internalOnly = row[COL.internalOnly] === 'x' || row[COL.internalOnly] === true;

  const participantNames = extractNames(row[COL.participants]);
  const ownerNames = splitMultiOwner(ownerRaw);

  const participants = [];
  const added = new Set();

  for (const oName of ownerNames) {
    if (oName && oName !== 'TBD') {
      const normalized = normalizeName(oName);
      if (!NOT_NAMES.has(normalized) && !added.has(normalized)) {
        participants.push({
          name: normalized,
          domain: domain,
          team: '',
          required: true,
        });
        added.add(normalized);
      }
    }
  }

  for (const name of participantNames) {
    if (added.has(name)) continue;
    const participantDomain = guessParticipantDomain(name, row[COL.participants] || '');
    participants.push({
      name,
      domain: participantDomain || domain,
      team: '',
      required: true,
    });
    added.add(name);
  }

  return {
    id: `session-${index}`,
    topic: topic.split('\n')[0].replace(/\r/g, '').trim(),
    topicFull: topic.trim(),
    owner: ownerRaw,
    ownerDomain: domain,
    duration: parseDuration(row[COL.duration]),
    priority: parsePriority(row[COL.priority]),
    internalOnly,
    participants,
    participantListReady: row[COL.participantListReady] === true,
  };
}

const sessions = [];
const skippedInternal = [];
let sessionCounter = 1;

for (let i = DATA_START; i < rows.length; i++) {
  const row = rows[i];
  if (!row || !row[COL.topic]) continue;

  const session = parseRow(row, sessionCounter);
  if (!session) continue;

  if (session.internalOnly) {
    skippedInternal.push(session.topic);
    continue;
  }

  sessions.push(session);
  sessionCounter++;
}

const output = {
  season: {
    number: 3,
    startDate: '2026-08-31',
    endDate: '2026-12-31',
  },
  sessions,
};

writeFileSync('data/input.json', JSON.stringify(output, null, 2), 'utf-8');

console.log(`\nParsittu ${sessions.length} sessiota → data/input.json`);
if (skippedInternal.length > 0) {
  console.log(`\nOhitettu ${skippedInternal.length} domainin sisäistä sessiota:`);
  skippedInternal.forEach(t => console.log(`  - ${t}`));
}

console.log('\nSessiot:');
for (const s of sessions) {
  const prioStr = s.priority === 99 ? 'ei prio' : `prio ${s.priority}`;
  console.log(`  [${s.id}] ${s.ownerDomain} ${prioStr} | ${s.topic}`);
  console.log(`    Omistaja: ${s.owner} | Kesto: ${s.duration}min | Osallistujia: ${s.participants.length}`);
  if (s.participants.length > 0) {
    console.log(`    Henkilöt: ${s.participants.map(p => p.name).join(', ')}`);
  }
}

const allPeople = new Set();
for (const s of sessions) {
  for (const p of s.participants) {
    allPeople.add(p.name);
  }
}
console.log(`\nYhteensä ${allPeople.size} uniikkia henkilöä:`);
[...allPeople].sort((a, b) => a.localeCompare(b, 'fi')).forEach(n => console.log(`  - ${n}`));
