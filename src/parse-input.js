import { readFileSync, writeFileSync, existsSync } from 'fs';
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
  duration: 6,
  participantListReady: 7,
  info: 8,
  internalOnly: 9,
};

const DATA_START = 3;

const KNOWN_DOMAIN_PREFIXES = [
  'DSE&A', 'DSE', 'DG', 'S&M', 'MSS', 'B2B', 'N&F', 'TM',
  'Core & Sales Reporting', 'Digital & AI', 'BSS/SME',
  'Marketing', 'Print', 'Ad Manager & Creative AI',
  'Ad Manager Product', 'Ad Manager', 'Creative AI',
  'Performance Products', 'Personalization', 'API', 'SF', 'OPU', 'CPR',
  'PP', 'YDP',
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
  'Raatikainen Satu': 'Satu Raatikainen',
  'Hedi Falenius': 'Heidi Falenius',
  'Maiju Toivinen': 'Maiju Toivonen',
  'Rosa Forssel': 'Rosa Forsell',
  'Muhammad FAizan': 'Muhammad Faizan',
  'Mikhail Shamkov': 'Mikhail Shmakov',
  'Fabio La torre': 'Fabio La Torre',
  'Zeeshan Rais': 'Zeeshan Rais',
  'Minna Krushe': 'Minna Kruhse',
  'Maria Meruman': 'Maria Meurman',
  'Tarja Wiljanen': 'Tarja Viljanen',
  'Niko-Petteri Varho': 'Petteri Varho',
};

// Nämä eivät ole henkilönimiä
const NOT_NAMES = new Set([
  'Raportointi', 'Data', 'TM', 'Ad Manager Product',
  'TBD', 'Sanna W', 'Digital', 'AI:',
  'Digital Operations', 'Product Sales', 'Marketing',
  'Performance Products', 'Sales Development Team',
  'Tuotemyynti', 'Nelonen Media', 'Ad Mananger', 'Advendio',
  'Ad Manager', 'Creative AI', 'Product', 'Products',
  'Core', 'Radio', 'Salesdev', 'Solutions Sales', 'Self Service',
  'Markkinointistrategt', 'Transformation', 'Media Solutions',
  'Sales Engine', 'Reporting Mission Team', 'Mission Team',
  'Sales Engine Transformation', 'Beat Core',
]);

function normalizeName(name) {
  return NAME_ALIASES[name] || name;
}

function extractNames(text) {
  if (!text || typeof text !== 'string') return [];

  let processed = text;

  // Strip zero-width spaces and other invisible Unicode
  processed = processed.replace(/[​-‍﻿]/g, '');

  // Replace known domain prefixes (with colon/dot) with newlines — handles inline prefixes
  for (const prefix of KNOWN_DOMAIN_PREFIXES) {
    const re = new RegExp(prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[:.]\\s*', 'gi');
    processed = processed.replace(re, '\n');
  }

  // Extract names from parentheses BEFORE stripping them — require 2+ words (first+last)
  const parenNames = [];
  const parenPattern = /\(([^)]+)\)/g;
  let parenMatch;
  while ((parenMatch = parenPattern.exec(processed)) !== null) {
    const inner = parenMatch[1];
    const innerParts = inner.split(/[,/]/).map(p => p.trim());
    for (const p of innerParts) {
      const namePattern = /^[A-ZÄÖÅÉÈ][a-zäöåéèü]+\s+[A-ZÄÖÅÉÈ][a-zäöåéèü]+(?:\s+[A-ZÄÖÅÉÈ][a-zäöåéèü]+)?$/;
      if (namePattern.test(p) && p.length >= 4 && p.length <= 40) {
        parenNames.push(p);
      }
    }
  }

  const names = [];
  const lines = processed.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);

  for (let line of lines) {
    // Strip known domain prefixes without colon at line start
    for (const prefix of KNOWN_DOMAIN_PREFIXES) {
      const re = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
      line = line.replace(re, '');
    }
    if (line.includes(':')) {
      line = line.replace(/^([^,:]+):\s*/, '');
    }

    line = line.replace(/\([^)]*\)/g, '');

    const parts = line.split(/[,/]/).map(p => p.trim()).filter(Boolean);

    for (let part of parts) {
      part = part.replace(/^[+•–-]\s*/, '');
      part = part.replace(/[?….,;:]+$/, '').trim();
      part = part.replace(/\s*-\s*$/, '').trim();

      if (!part) continue;

      // Try extracting a name from the end of a longer non-matching string
      const namePattern = /^[A-ZÄÖÅÉÈ][a-zäöåéèü]+(?:\s+[A-ZÄÖÅÉÈ][a-zäöåéèü]+){0,3}$/;
      if (namePattern.test(part) && part.length >= 4 && part.length <= 40) {
        const normalized = normalizeName(part);
        if (!NOT_NAMES.has(normalized)) {
          names.push(normalized);
        }
      } else {
        const tailMatch = part.match(/([A-ZÄÖÅÉÈ][a-zäöåéèü]+\s+[A-ZÄÖÅÉÈ][a-zäöåéèü]+)\s*$/);
        if (tailMatch && tailMatch[1].length >= 4) {
          const normalized = normalizeName(tailMatch[1]);
          if (!NOT_NAMES.has(normalized)) {
            names.push(normalized);
          }
        }
      }
    }
  }

  for (const pn of parenNames) {
    const normalized = normalizeName(pn);
    if (!NOT_NAMES.has(normalized)) {
      names.push(normalized);
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
  if (!raw) return 90;
  const str = String(raw).trim().toLowerCase();
  const minMatch = str.match(/([\d,.]+)\s*min/);
  if (minMatch) return Math.round(parseFloat(minMatch[1].replace(',', '.')));
  const match = str.match(/([\d,.]+)/);
  if (!match) return 90;
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
  if (PERSON_DOMAIN_MAP[name]) return PERSON_DOMAIN_MAP[name];
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

// Henkilö→domain-mäppäys tiimiselitteet.xlsx:stä
const PERSON_DOMAIN_MAP = {};
const DOMAIN_DESCRIPTIONS = {};
const teamExplainPath = 'data/tiimiselitteet.xlsx';
if (existsSync(teamExplainPath)) {
  const twb = XLSX.readFile(teamExplainPath);
  const trows = XLSX.utils.sheet_to_json(twb.Sheets[twb.SheetNames[0]], { header: 1 });
  for (const row of trows) {
    const domain = (row[0] || '').toString().trim();
    const desc = (row[1] || '').toString().trim();
    if (domain && desc && domain !== 'Domain' && domain !== 'Tiimit DG:n alla') {
      DOMAIN_DESCRIPTIONS[domain] = desc;
    }
    const people = (row[3] || '').toString();
    if (!domain || !people || domain === 'Domain' || domain === 'Tiimit DG:n alla') continue;
    const names = people.split(',').map(n => n.trim()).filter(Boolean);
    for (const name of names) {
      const normalized = normalizeName(name);
      if (normalized && !NOT_NAMES.has(normalized)) {
        PERSON_DOMAIN_MAP[normalized] = domain;
      }
    }
  }
  console.log(`Ladattu ${Object.keys(PERSON_DOMAIN_MAP).length} henkilö→domain-mäppäystä tiimiselitteistä`);
}

const EXCLUDE_PATTERNS = ['ei suunnittelu', 'buukattu', 'buukannut', 'ei pidetä', 'ei tarvita'];

function parseRow(row, index) {
  const topic = row[COL.topic];
  if (!topic || typeof topic !== 'string' || !topic.trim()) return null;

  const domain = (row[COL.domain] || '').toString().trim();
  const ownerRaw = cleanOwner(row[COL.owner]);
  const internalOnly = row[COL.internalOnly] === 'x' || row[COL.internalOnly] === true;

  const infoText = (row[COL.info] || '').toString().toLowerCase();
  if (EXCLUDE_PATTERNS.some(p => infoText.includes(p))) return null;

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

  const topicLines = topic.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
  const cleanTopic = (topicLines[0] || '').replace(/\s+/g, ' ');

  const session = {
    id: `session-${index}`,
    topic: cleanTopic,
    topicFull: topic.trim(),
    owner: ownerRaw,
    ownerDomain: domain,
    duration: parseDuration(row[COL.duration]),
    priority: parsePriority(row[COL.priority]),
    status: internalOnly ? 'internal' : 'active',
    participants,
    participantListReady: row[COL.participantListReady] === true,
  };

  const meetingMatch = cleanTopic.match(/^(.+),\s*meeting\s*\d+$/i);
  if (meetingMatch) {
    session.group = meetingMatch[1].trim().replace(/\s+/g, ' ');
  }

  return session;
}

// Lue edellinen input.json lukitustietojen säilyttämiseksi
const prevInput = existsSync('data/input.json')
  ? JSON.parse(readFileSync('data/input.json', 'utf-8'))
  : null;
const prevLocked = {};
if (prevInput && prevInput.sessions) {
  for (const s of prevInput.sessions) {
    if (s.locked) prevLocked[s.topic] = true;
  }
}

const sessions = [];
const skippedInternal = [];
let sessionCounter = 1;
const groupCounters = {};

for (let i = DATA_START; i < rows.length; i++) {
  const row = rows[i];
  if (!row || !row[COL.topic]) continue;

  const session = parseRow(row, sessionCounter);
  if (!session) continue;

  if (prevLocked[session.topic]) session.locked = true;

  if (session.group) {
    if (!(session.group in groupCounters)) groupCounters[session.group] = 0;
    session.groupOrder = groupCounters[session.group]++;
  }

  if (session.status === 'internal') {
    skippedInternal.push(session.topic);
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
  personDomains: PERSON_DOMAIN_MAP,
  domainDescriptions: DOMAIN_DESCRIPTIONS,
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
  const groupStr = s.group ? ` [${s.group} #${s.groupOrder + 1}]` : '';
  console.log(`  [${s.id}] ${s.ownerDomain} ${prioStr}${groupStr} | ${s.topic}`);
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
