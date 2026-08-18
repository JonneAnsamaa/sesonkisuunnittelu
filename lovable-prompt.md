# Sesonkisuunnittelu — Dependencies Planning Tool

Rakenna React-sovellus sesonkisuunnittelun aikataulutukseen. Sovellus aikatauluttaa suunnittelusessioita kolmelle päivälle minimoiden henkilöiden päällekkäisyyksiä.

## Kieli
UI-tekstit suomeksi. Koodin muuttujanimet englanniksi.

## Datan syöttö
Sovelluksessa on JSON-editori (textarea) johon voi pastettaa session-datan. Myöhemmin lisätään SharePoint-integraatio. Sovelluksen tulee sisältää alla oleva esimerkkidata oletuksena.

## Datarakenne

### Sessiot (input)
```typescript
interface Session {
  id: string;
  topic: string;
  owner: string;
  ownerDomain: string; // "DSE", "DG", "S&M", "MSS", "B2B", "other" jne.
  duration: number; // minuuteissa
  priority: number; // 1 = korkein, 99 = ei priorisoitu
  participants: {
    name: string;
    domain: string;
    required: boolean;
  }[];
}
```

### Neukkarit (rooms)
```typescript
interface Room {
  id: string;
  name: string;
  capacity: number;
}
```

### Konfiguraatio
```typescript
interface Config {
  days: { day: number; date: string; label: string }[];
  dayStartTime: string; // "09:00"
  dayEndTime: string;   // "17:00"
  lunchStart: string;   // "12:00"
  lunchEnd: string;     // "13:00"
  breakBetweenSessions: number; // 15 min
  slotGranularity: number; // 15 min
}
```

### Henkilöiden esteet (availability constraints)
```typescript
interface AvailabilityConstraint {
  person: string;      // henkilön nimi (sama kuin participants[].name)
  day: number;         // päivä (1, 2 tai 3)
  startTime: string;   // esteen alkuaika "09:00"
  endTime: string;     // esteen loppuaika "12:00"
  reason?: string;     // vapaaehtoinen syy, esim. "Muu palaveri"
}
```
Este tarkoittaa: tämä henkilö EI OLE käytettävissä tänä aikana. Aikataulutusalgoritmi ei saa sijoittaa sessiota tähän slottiin jos henkilö on session pakollinen (required) osallistuja. Nice-to-have osallistujan este on pehmeä — sessio voidaan sijoittaa, mutta este raportoidaan.

## Aikataulutusalgoritmi

Tämä on sovelluksen ydinlogiikka. Toteuta tarkasti:

```javascript
function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function buildTimeSlots(config) {
  const dayStart = timeToMinutes(config.dayStartTime);
  const dayEnd = timeToMinutes(config.dayEndTime);
  const lunchStart = timeToMinutes(config.lunchStart);
  const lunchEnd = timeToMinutes(config.lunchEnd);
  const slots = [];
  for (let t = dayStart; t < dayEnd; t += config.slotGranularity) {
    if (t >= lunchStart && t < lunchEnd) continue;
    slots.push(t);
  }
  return slots;
}

function canFitSession(startSlot, duration, config) {
  const endTime = startSlot + duration;
  const lunchStart = timeToMinutes(config.lunchStart);
  const dayEnd = timeToMinutes(config.dayEndTime);
  if (endTime > dayEnd) return false;
  if (startSlot < lunchStart && endTime > lunchStart) return false;
  return true;
}

function getAvailabilityConflicts(session, startTime, endTime, day, constraints) {
  const conflicts = [];
  for (const p of session.participants) {
    for (const c of constraints) {
      if (c.person !== p.name || c.day !== day) continue;
      const cStart = timeToMinutes(c.startTime);
      const cEnd = timeToMinutes(c.endTime);
      if (startTime < cEnd && endTime > cStart) {
        conflicts.push({
          person: p.name,
          domain: p.domain,
          requiredInThis: p.required,
          type: 'availability',
          reason: c.reason || 'Ei käytettävissä',
          constraintStart: c.startTime,
          constraintEnd: c.endTime,
        });
      }
    }
  }
  return conflicts;
}

function getPersonConflicts(session, startTime, endTime, day, scheduled, allSessions) {
  const conflicts = [];
  for (const s of scheduled) {
    if (s.day !== day) continue;
    const sStart = timeToMinutes(s.startTime);
    const sEnd = timeToMinutes(s.endTime);
    if (startTime < sEnd && endTime > sStart) {
      const other = allSessions.find(x => x.id === s.id);
      if (!other) continue;
      for (const p of session.participants) {
        if (other.participants.some(op => op.name === p.name)) {
          conflicts.push({
            person: p.name,
            domain: p.domain,
            requiredInThis: p.required,
            requiredInOther: other.participants.find(op => op.name === p.name)?.required,
            type: 'overlap',
            otherSessionId: s.id,
            otherSessionTopic: other.topic,
          });
        }
      }
    }
  }
  return conflicts;
}

function selectRoom(session, startTime, endTime, day, scheduled, rooms) {
  const count = session.participants.length;
  const sorted = [...rooms].sort((a, b) => b.capacity - a.capacity);
  for (const room of sorted) {
    if (room.capacity < count) continue;
    const free = !scheduled.some(s =>
      s.day === day && s.room === room.id &&
      timeToMinutes(s.startTime) < endTime && timeToMinutes(s.endTime) > startTime
    );
    if (free) return room;
  }
  for (const room of sorted) {
    const free = !scheduled.some(s =>
      s.day === day && s.room === room.id &&
      timeToMinutes(s.startTime) < endTime && timeToMinutes(s.endTime) > startTime
    );
    if (free) return room;
  }
  return null;
}

// constraints = AvailabilityConstraint[] (voi olla tyhjä)
function runScheduler(sessions, rooms, config, constraints = []) {
  const sorted = [...sessions].sort((a, b) => {
    const aReq = a.participants.filter(p => p.required).length;
    const bReq = b.participants.filter(p => p.required).length;
    if (bReq !== aReq) return bReq - aReq;
    if (b.participants.length !== a.participants.length) return b.participants.length - a.participants.length;
    return a.priority - b.priority;
  });

  const timeSlots = buildTimeSlots(config);
  const scheduled = [];
  const allConflicts = [];

  for (const session of sorted) {
    let best = null;
    let bestScore = Infinity;

    for (let day = 1; day <= config.days.length; day++) {
      for (const slot of timeSlots) {
        const end = slot + session.duration;
        if (!canFitSession(slot, session.duration, config)) continue;

        // Tarkista esteet (availability constraints)
        const availConflicts = getAvailabilityConflicts(session, slot, end, day, constraints);
        const requiredAvailBlock = availConflicts.some(c => c.requiredInThis);
        // Jos pakollinen osallistuja on estynyt → tämä slotti on ehdoton EI
        if (requiredAvailBlock) continue;

        // Tarkista henkilöpäällekkäisyydet muiden sessioiden kanssa
        const overlapConflicts = getPersonConflicts(session, slot, end, day, scheduled, sessions);
        const allSlotConflicts = [...availConflicts, ...overlapConflicts];

        // Pisteytys: pakollisten konflikti painaa 1000x, nice-to-have 1x
        const requiredOverlaps = overlapConflicts.filter(c => c.requiredInThis).length;
        const optionalConflicts = allSlotConflicts.filter(c => !c.requiredInThis).length;
        const score = requiredOverlaps * 1000 + optionalConflicts;

        const room = selectRoom(session, slot, end, day, scheduled, rooms);
        if (!room) continue;

        if (score < bestScore) {
          bestScore = score;
          best = { day, startTime: minutesToTime(slot), endTime: minutesToTime(end), room: room.id, roomName: room.name, conflicts: allSlotConflicts };
        }
        if (score === 0) break;
      }
      if (best && bestScore === 0) break;
    }

    if (best) {
      scheduled.push({
        id: session.id, topic: session.topic, owner: session.owner, ownerDomain: session.ownerDomain,
        day: best.day, startTime: best.startTime, endTime: best.endTime,
        room: best.room, roomName: best.roomName, participantCount: session.participants.length, conflicts: best.conflicts,
      });
      if (best.conflicts.length > 0) {
        allConflicts.push({ sessionId: session.id, sessionTopic: session.topic, conflicts: best.conflicts });
      }
    }
  }

  return { scheduled, allConflicts };
}
```

## Kolme näkymää (tabs/välilehdet)

### 1. Listanäkymä
- Kronologinen lista, ryhmitelty päivittäin
- Jokainen sessio näyttää:
  - Ylärivi: aika, **domain-tagi** (värikoodattu badge), neukkari, aihe, omistaja, osallistujamäärä
  - Alarivi: osallistujien nimet (omistaja lihavoitu)
- Rivin vasemmassa reunassa 4px väripalkki domainin mukaan + hieno värigradientti taustavärinä
- Domain-tagi: pieni badge jossa domain-lyhenne valkoisella tekstillä värillisellä taustalla

### 2. Koululukujärjestysnäkymä (grid)
- Sarakkeet = neukkarihuoneet
- Rivit = aikaslotit 15 min tarkkuudella
- Sessiot näkyvät korttimaisina blokkein jotka span useaa riviä keston mukaan
- Värikoodaus domainin mukaan (taustaväri + vasemman reunan palkki)
- Lounasaika näkyy viivoitettuna
- Päivävalitsin (Päivä 1 / Päivä 2 / Päivä 3)

### 3. Päällekkäisyydet-näkymä
- Listaa kaikki väistämättömät konfliktit, kaksi tyyppiä:
  - **Henkilöpäällekkäisyys** (type: overlap): henkilö on kahdessa sessiossa samaan aikaan. Näyttää: sessio, henkilö, domain, PAKOLLINEN/nice-to-have, mikä toinen sessio on päällekkäin
  - **Saatavuuseste** (type: availability): henkilö on merkitty estyneeksi tähän aikaan. Näyttää: sessio, henkilö, esteen aikaväli, syy
- Pakolliset konfliktit punaisella, nice-to-have oranssilla
- Yhteenveto yläosassa: "X pakollista konfliktia, Y nice-to-have konfliktia"

## Henkilöfiltteri (kaikissa näkymissä)
- Dropdown josta valitaan henkilö nimellä
- Valitun henkilön sessiot korostuvat (keltainen highlight)
- Muut sessiot himmenevät (opacity 0.25)
- Päällekkäisyydet punaisella korostuksella
- Listanäkymässä valitun henkilön nimi korostuu keltaisella osallistujalistassa

## Domain-värit
- Jokainen uniikki domain saa oman värin automaattisesti
- Väripaletti: `['#4A90D9', '#E67E22', '#27AE60', '#8E44AD', '#E74C3C', '#16A085', '#F39C12', '#2C3E50', '#D35400', '#1ABC9C']`
- Legend näkyy yläosassa

## Asetukset-sivu
- Neukkarien hallinta (lisää, poista, muokkaa nimeä ja kapasiteettia)
- Päivien päivämäärät
- Kellonajat (aloitus, lopetus, lounas)
- Tauon pituus sessioiden välissä
- **Henkilöiden esteet** — hallintanäkymä jossa:
  - Dropdown: valitse henkilö (lista kaikista osallistujista)
  - Valitse päivä (1/2/3)
  - Valitse aikaväli (alku- ja loppuaika)
  - Vapaaehtoinen syy-kenttä
  - Lisää/poista esteitä listalta
  - Esteet näytetään taulukkona: henkilö, päivä, aika, syy, poista-nappi

## Osallistujien required/nice-to-have -hallinta
- Sessioiden datanäkymässä (JSON-editorissa tai erillisessä taulukkonäkymässä) jokaisella osallistujalla on `required`-kenttä
- required=true → **Pakollinen** (badge: punainen). Algoritmi ei sijoita sessiota aikaan jolloin tämä henkilö on estynyt tai toisessa sessiossa
- required=false → **Nice-to-have** (badge: sininen). Algoritmi yrittää välttää päällekkäisyyttä mutta sallii sen tarvittaessa
- Listanäkymässä osallistujien nimet näyttävät eron: pakolliset normaalilla fontilla, nice-to-have kursiivilla ja vaaleammalla

## Esimerkkidata (upota sovellukseen oletuksena)

### Oletusneukkarit:
```json
[
  { "id": "room-1", "name": "Iso neukkari", "capacity": 20 },
  { "id": "room-2", "name": "Keskikokoinen neukkari", "capacity": 12 },
  { "id": "room-3", "name": "Pieni neukkari", "capacity": 6 }
]
```

### Oletuskonfiguraatio:
```json
{
  "days": [
    { "day": 1, "date": "2026-08-17", "label": "Päivä 1" },
    { "day": 2, "date": "2026-08-18", "label": "Päivä 2" },
    { "day": 3, "date": "2026-08-19", "label": "Päivä 3" }
  ],
  "dayStartTime": "09:00",
  "dayEndTime": "17:00",
  "lunchStart": "12:00",
  "lunchEnd": "13:00",
  "breakBetweenSessions": 15,
  "slotGranularity": 15
}
```

### Esimerkkiesteet:
```json
[
  { "person": "Heidi Falenius", "day": 1, "startTime": "14:00", "endTime": "16:00", "reason": "Johtoryhmän kokous" },
  { "person": "Filip Holmberg", "day": 2, "startTime": "09:00", "endTime": "11:00", "reason": "Asiakastapaaminen" }
]
```

### Esimerkkisessiot (5 kpl testausta varten):
```json
[
  {
    "id": "session-1",
    "topic": "Eduskuntavaaleista kasvua - tulostavoitteet ja markkinointi",
    "owner": "Satu Raatikainen",
    "ownerDomain": "S&M",
    "duration": 60,
    "priority": 2,
    "participants": [
      { "name": "Satu Raatikainen", "domain": "S&M", "required": true },
      { "name": "Heidi Falenius", "domain": "DSE", "required": true },
      { "name": "Tuuli Rikama", "domain": "DG", "required": true },
      { "name": "Tuukka Aalto", "domain": "DG", "required": true }
    ]
  },
  {
    "id": "session-2",
    "topic": "Eduskuntavaaleista kasvua - digin ostaminen & operaatiot",
    "owner": "Toni Törnqvist",
    "ownerDomain": "DG",
    "duration": 60,
    "priority": 2,
    "participants": [
      { "name": "Toni Törnqvist", "domain": "DG", "required": true },
      { "name": "Bilal Gill", "domain": "DSE", "required": true },
      { "name": "Heidi Falenius", "domain": "DSE", "required": true },
      { "name": "Jani Moisiola", "domain": "MSS", "required": true }
    ]
  },
  {
    "id": "session-3",
    "topic": "Eduskuntavaaleista kasvua - monimediallinen ostaminen",
    "owner": "Heidi Falenius",
    "ownerDomain": "DSE",
    "duration": 60,
    "priority": 2,
    "participants": [
      { "name": "Heidi Falenius", "domain": "DSE", "required": true },
      { "name": "Toni Törnqvist", "domain": "DG", "required": true },
      { "name": "Jani Moisiola", "domain": "MSS", "required": true },
      { "name": "Anniina Hautala", "domain": "DG", "required": true },
      { "name": "Päivi Rautio", "domain": "TM", "required": true }
    ]
  },
  {
    "id": "session-4",
    "topic": "AI Platform & Operating model",
    "owner": "Filip Holmberg",
    "ownerDomain": "DSE",
    "duration": 60,
    "priority": 4,
    "participants": [
      { "name": "Filip Holmberg", "domain": "DSE", "required": true },
      { "name": "Heidi Falenius", "domain": "DSE", "required": true },
      { "name": "Bilal Gill", "domain": "DSE", "required": true }
    ]
  },
  {
    "id": "session-5",
    "topic": "Content Studio: Salesforce-Monday -integraatio",
    "owner": "Jani Moisiola",
    "ownerDomain": "MSS",
    "duration": 60,
    "priority": 9,
    "participants": [
      { "name": "Jani Moisiola", "domain": "MSS", "required": true },
      { "name": "Sami Vallius", "domain": "MSS", "required": true },
      { "name": "Bilal Gill", "domain": "DSE", "required": false }
    ]
  }
]
```

## Tyyli
- Moderni, siisti, ammattimainen
- Tailwind CSS
- shadcn/ui -komponentit
- Responsiivinen (toimii myös isolla näytöllä kokouksessa)
- Tulostusystävällinen
