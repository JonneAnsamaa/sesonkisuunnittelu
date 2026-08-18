# Sesonkisuunnittelu — Dependencies Planning Tool

## Yleiskuvaus

Työkalu Sanoma Media Finlandin sesonkisuunnittelun (dependencies planning) aikatauluttamiseen.
Sesonki = kehityssykli. Nyt suunnitellaan **sykli 3** (31.8.–31.12.2026).

Dependencies planning on 3-päiväinen suunnittelusessio, jossa eri domainien tiimit suunnittelevat
tulevan sesongin kehitysprojekteja — erityisesti tiimi- ja domainrajat ylittäviä riippuvuuksia.

## Kieli

Kaikki käyttöliittymätekstit, koodikommentit ja dokumentaatio **suomeksi**.
Muuttujanimet ja funktiot englanniksi.

---

## Datarakenne

### Organisaatiorakenne

```
Domain (business unit, lyhenne esim. "SME", "IS")
  └── Tiimi
       └── Kehitysprojekti
            └── Omistaja (henkilö)
```

### Suunnittelusession tiedot (input.json)

Jokainen suunnittelusessio sisältää:

| Kenttä | Tyyppi | Kuvaus |
|--------|--------|--------|
| `id` | string | Uniikki tunniste (generoitu) |
| `topic` | string | Suunnittelun aihe |
| `owner` | string | Aiheen omistaja (fasilitoija) |
| `ownerDomain` | string | Omistajan domain-lyhenne |
| `duration` | number | Kesto minuuteissa (omistajan määrittämä) |
| `priority` | number | Domainin prioriteetti (1 = korkein) |
| `status` | string | `"active"` (oletus), `"internal"` (domainin sisäinen) tai `"cancelled"` (ei tarvita) |
| `participants` | array | Lista tarvittavista henkilöistä |
| `participants[].name` | string | Henkilön nimi |
| `participants[].domain` | string | Henkilön domain-lyhenne |
| `participants[].team` | string | Henkilön tiimi (jos tiedossa) |
| `participants[].required` | boolean | Onko pakollinen (true) vai toivottu (false) |

### Neukkarit (rooms.json)

| Kenttä | Tyyppi | Kuvaus |
|--------|--------|--------|
| `id` | string | Neukkaritunniste |
| `name` | string | Neukkarin nimi |
| `capacity` | number | Henkilökapasiteetti |
| `floor` | string | Kerros (valinnainen) |

### Henkilöiden esteet (constraints.json)

| Kenttä | Tyyppi | Kuvaus |
|--------|--------|--------|
| `person` | string | Henkilön nimi (sama kuin participants[].name) |
| `day` | number | Päivä (1, 2 tai 3) |
| `startTime` | string | Esteen alkuaika "HH:MM" |
| `endTime` | string | Esteen loppuaika "HH:MM" |
| `reason` | string | Syy (valinnainen, esim. "Johtoryhmän kokous") |

### Generoitu aikataulu (schedule.json)

| Kenttä | Tyyppi | Kuvaus |
|--------|--------|--------|
| `id` | string | Session id |
| `day` | number | Päivä (1, 2 tai 3) |
| `startTime` | string | Alkuaika "HH:MM" |
| `endTime` | string | Loppuaika "HH:MM" |
| `room` | string | Neukkarin id |
| `conflicts` | array | Lista konflikteista (päällekkäisyydet + esteet) |
| `conflicts[].type` | string | `"overlap"` (toinen sessio) tai `"availability"` (henkilökohtainen este) |

---

## Osallistujien roolit

- **Pakollinen** (`required: true`) — henkilön PITÄÄ olla sessiossa. Algoritmi ei sijoita sessiota aikaan jolloin pakollinen osallistuja on estynyt tai toisessa sessiossa.
- **Toivottu** (`required: false`) — henkilön toivotaan osallistuvan. Algoritmi yrittää minimoida näiden päällekkäisyyksiä, mutta sallii ne tarvittaessa.

## Session tilat

- **Aktiivinen** (`status: "active"`, oletus) — normaali sessio, aikataulutetaan normaalisti.
- **Domainin sisäinen** (`status: "internal"`) — sijoitetaan viimeisenä, kun kaikki aktiiviset sessiot on ensin aikataulutettu.
- **Ei tarvita** (`status: "cancelled"`) — sessiota ei aikatauluteta lainkaan. Näkyy sessiolistassa yliviivattuna.

---

## Aikataulutussäännöt

### Prioriteettijärjestys (tärkeimmästä alaspäin)

1. **Pakollisten osallistujien esteet** — jos pakollinen osallistuja on merkitty estyneeksi (constraints.json), tämä slotti on EHDOTON EI.
2. **Pakollisten osallistujien päällekkäisyydet** — sama pakollinen henkilö ei saa olla kahdessa sessiossa yhtä aikaa.
3. **Neukkarikapasiteetin optimointi** — isoimmat sessiot isoimpiin neukkareihin.
4. **Prioriteettijärjestys** — korkeamman prioriteetin sessiot aikaisemmin agendalla.
5. **Toivotut osallistujat** — minimoidaan esteiden ja päällekkäisyyksien vaikutus, mutta näistä voidaan joustaa.
6. **"Ei tarvita" -sessiot** — merkittyjä sessioita ei aikatauluteta lainkaan.
7. **Domainin sisäiset sessiot** — sijoitetaan viimeisenä, kun kaikki muut sessiot on ensin aikataulutettu.

### Päivien rakenne

- **3 suunnittelupäivää** käytettävissä
- Päivien tarkat kellonajat konfiguroidaan `data/rooms.json`-tiedostossa (oletuksena 09:00–17:00)
- Sessioiden väliin 15 min tauko (konfiguroitavissa)
- Lounastauko 12:00–13:00 (konfiguroitavissa)

### Aikataulutusalgoritmin vaiheet

1. **Lajittele** sessiot: eniten pakollisia osallistujia ensin, sitten prioriteetin mukaan
2. **Tarkista esteet**: jos pakollinen osallistuja estynyt → ohita slotti kokonaan
3. **Sijoita** kukin sessio ensimmäiseen vapaaseen slottiin jossa:
   - Mikään pakollinen osallistuja ei ole varattu eikä estynyt
   - Neukkarin kapasiteetti riittää
   - Mahdollisimman vähän nice-to-have osallistujien konflikteja
4. **Optimoi** neukkarijako: suurin sessio → suurin vapaa neukkari
5. **Raportoi** väistämättömät konfliktit erilliseen listaan

### Konfliktiraportti

Kaksi tyyppiä:
- **overlap**: henkilö kahdessa sessiossa samaan aikaan. Raportoi: henkilö, domain, kumpi sessio, onko pakollinen/nice-to-have kummassakin
- **availability**: henkilö estynyt. Raportoi: henkilö, esteen aikaväli, syy

---

## Käyttöliittymä (ui/index.html)

Yksi itsenäinen HTML-tiedosto joka sisältää kaiken (HTML + CSS + JS). Lukee datan suoraan
upotetusta JSON:sta tai erillisestä tiedostosta.

### Kolme näkymää

#### 1. Listanäkymä
- Kronologinen lista kaikista sessioista
- Jokainen rivi: aika, huone, aihe, omistaja, osallistujamäärä
- Ryhmitelty päivittäin
- Lajiteltu kellonajan mukaan

#### 2. Koululukujärjestysnäkymä (grid)
- Sarakkeet = neukkarihuoneet
- Rivit = aikaslotit (30 min tarkkuudella)
- Solut = sessiot (span usean rivin yli keston mukaan)
- Värikoodaus domainin mukaan
- Päivävalitsin (Päivä 1 / 2 / 3)

#### 3. Henkilönäkymä (filtteri)
- Dropdown josta valitaan henkilö nimellä
- Lukujärjestysnäkymässä korostuu (highlight) ne sessiot joihin henkilö osallistuu
- Muut sessiot himmennetään
- Näyttää myös mahdolliset päällekkäisyydet punaisella

### UI:n tekninen toteutus
- Vanilla HTML + CSS + JavaScript (ei frameworkeja)
- Responsiivinen (toimii myös isolla näytöllä kokouksessa)
- Tulostusystävällinen (print CSS)
- Data upotetaan suoraan HTML-tiedostoon `<script>`-tagiin

---

## Tiedostojen vastuut

| Tiedosto | Vastuu |
|----------|--------|
| `src/parse-input.js` | Lukee Excel-tiedoston (xlsx), muuntaa `data/input.json`-muotoon |
| `src/scheduler.js` | Lukee `input.json` + `rooms.json`, tuottaa `schedule.json` |
| `src/generate-html.js` | Yhdistää `input.json` + `schedule.json` → `ui/index.html` |
| `data/input.json` | Raakadata excelistä (sessiot, henkilöt) |
| `data/rooms.json` | Neukkarit, kapasiteetit, päivärakenne |
| `data/schedule.json` | Algoritmin tuottama aikataulu |
| `ui/index.html` | Lopullinen käyttöliittymä (itsenäinen tiedosto, jaettavissa) |

---

## Kehitysohjeet

- `node src/parse-input.js data/suunnittelu.xlsx` → tuottaa `data/input.json`
- `node src/scheduler.js` → tuottaa `data/schedule.json`
- `node src/generate-html.js` → tuottaa `ui/index.html`
- Avaa `ui/index.html` selaimessa

Koko pipeline yhdellä komennolla: `npm run build`
