import { readFileSync, writeFileSync, existsSync } from 'fs';

const input = JSON.parse(readFileSync('data/input.json', 'utf-8'));
const roomsData = JSON.parse(readFileSync('data/rooms.json', 'utf-8'));
const constraints = existsSync('data/constraints.json')
  ? JSON.parse(readFileSync('data/constraints.json', 'utf-8'))
  : [];

const { config, rooms } = roomsData;
const { sessions, season } = input;

const colorPalette = [
  '#4A90D9', '#E67E22', '#27AE60', '#8E44AD',
  '#E74C3C', '#16A085', '#F39C12', '#2C3E50',
  '#D35400', '#1ABC9C', '#9B59B6', '#34495E',
];

const html = `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sesonki ${season.number} — Dependencies Planning</title>
  <style>
    :root {
      --bg: #f5f5f5;
      --card-bg: #ffffff;
      --text: #1a1a1a;
      --text-muted: #666;
      --border: #ddd;
      --highlight: #fff3cd;
      --highlight-border: #ffc107;
      --conflict-bg: #fde8e8;
      --conflict-border: #e74c3c;
      --dimmed-opacity: 0.25;
      --accent: #4A90D9;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.5; padding: 1rem;
    }
    header { text-align: center; margin-bottom: 1.5rem; padding: 1rem; }
    header h1 { font-size: 1.5rem; font-weight: 700; }
    header p { color: var(--text-muted); margin-top: 0.25rem; }

    .controls {
      display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem;
    }
    .controls button, .controls select {
      padding: 0.5rem 1rem; border: 1px solid var(--border); border-radius: 6px;
      background: var(--card-bg); cursor: pointer; font-size: 0.9rem;
    }
    .controls button.active { background: var(--text); color: white; border-color: var(--text); }
    .controls select { min-width: 200px; }

    .legend { display: flex; gap: 1rem; justify-content: center; margin-bottom: 1rem; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; }

    /* Lista */
    .list-view { max-width: 960px; margin: 0 auto; }
    .day-group { margin-bottom: 2rem; }
    .day-group h2 { font-size: 1.1rem; padding: 0.5rem 0; border-bottom: 2px solid var(--text); margin-bottom: 0.75rem; }

    .session-row { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); border-left: 4px solid transparent; transition: opacity 0.2s; }
    .session-row-top { display: grid; grid-template-columns: 100px 60px 150px 1fr 150px 60px; gap: 0.75rem; align-items: center; }
    .session-row:hover { background: #f0f0f0; }
    .session-row .time { font-weight: 600; font-variant-numeric: tabular-nums; }
    .session-row .domain-tag { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; padding: 0.15rem 0.4rem; border-radius: 3px; text-align: center; color: white; white-space: nowrap; }
    .session-row .room { color: var(--text-muted); font-size: 0.85rem; }
    .session-row .topic { font-weight: 500; }
    .session-row .owner { font-size: 0.85rem; color: var(--text-muted); }
    .session-row .count { text-align: right; font-size: 0.85rem; color: var(--text-muted); }
    .session-row .participants { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; padding-left: 100px; margin-left: 0.75rem; }
    .participant-name.is-owner { font-weight: 600; color: var(--text); }
    .participant-name.nice-to-have { font-style: italic; opacity: 0.7; }
    .session-row.highlighted .participant-name.is-selected { background: #ffeeba; border-radius: 2px; padding: 0 3px; }
    .session-row.highlighted { background: var(--highlight); border-left-color: var(--highlight-border) !important; }
    .session-row.dimmed { opacity: var(--dimmed-opacity); }
    .session-row.conflict { background: var(--conflict-bg); border-left-color: var(--conflict-border) !important; }

    /* Grid */
    .grid-view { overflow-x: auto; }
    .timetable { display: grid; gap: 1px; background: var(--border); border: 1px solid var(--border); min-width: 600px; }
    .timetable .time-label { background: var(--bg); padding: 0.25rem 0.5rem; font-size: 0.75rem; font-variant-numeric: tabular-nums; text-align: right; border-right: 2px solid var(--border); }
    .timetable .room-header { background: var(--text); color: white; padding: 0.5rem; text-align: center; font-weight: 600; font-size: 0.85rem; }
    .timetable .cell { background: var(--card-bg); min-height: 28px; position: relative; }
    .session-block { position: absolute; left: 2px; right: 2px; top: 1px; border-radius: 4px; padding: 0.35rem 0.5rem; font-size: 0.8rem; overflow: hidden; cursor: pointer; border-left: 4px solid; transition: opacity 0.2s; z-index: 1; }
    .session-block .block-topic { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .session-block .block-owner { font-size: 0.7rem; opacity: 0.8; }
    .session-block .block-time { font-size: 0.7rem; opacity: 0.7; }
    .session-block.dimmed { opacity: var(--dimmed-opacity); }
    .session-block.highlighted { box-shadow: 0 0 0 2px var(--highlight-border); z-index: 2; }
    .session-block.conflict { box-shadow: 0 0 0 2px var(--conflict-border); z-index: 3; }
    .lunch-row { background: repeating-linear-gradient(45deg, #f9f9f9, #f9f9f9 10px, #f0f0f0 10px, #f0f0f0 20px); text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 0.25rem; }

    /* Conflicts */
    .conflicts-view { max-width: 900px; margin: 0 auto; }
    .conflict-card { background: var(--card-bg); border: 1px solid var(--conflict-border); border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
    .conflict-card h3 { font-size: 0.95rem; margin-bottom: 0.5rem; }
    .conflict-card ul { list-style: none; }
    .conflict-card li { padding: 0.25rem 0; font-size: 0.85rem; }
    .badge { display: inline-block; padding: 0.1rem 0.4rem; border-radius: 3px; font-size: 0.7rem; font-weight: 600; }
    .badge.required { background: var(--conflict-bg); color: var(--conflict-border); }
    .badge.optional { background: #e8f4fd; color: #2980b9; }
    .badge.availability { background: #fff3cd; color: #856404; }

    /* Sessions edit */
    .sessions-view { max-width: 960px; margin: 0 auto; }
    .sessions-toolbar { position: sticky; top: 0; z-index: 10; background: var(--bg); padding: 0.75rem 0 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .sessions-toolbar h2 { font-size: 1.1rem; white-space: nowrap; }
    .sessions-search { flex: 1; max-width: 320px; padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 6px; font-size: 0.85rem; background: var(--card-bg); }
    .sessions-search:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 2px rgba(74,144,217,0.15); }
    .session-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 0.625rem; overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s; }
    .session-card:hover { border-color: #bbb; }
    .session-card.open { border-color: var(--accent); box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .session-card.just-added { animation: cardFlash 1.2s ease-out; }
    @keyframes cardFlash { 0% { background: #e8f4fd; box-shadow: 0 0 0 3px rgba(74,144,217,0.3); } 100% { background: var(--card-bg); box-shadow: none; } }
    .session-card-header { display: grid; grid-template-columns: auto 1fr auto auto; gap: 0.5rem; align-items: center; padding: 0.65rem 0.85rem; cursor: pointer; }
    .session-card-header:hover { background: #fafafa; }
    .session-card-header .sc-domain { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; padding: 0.15rem 0.4rem; border-radius: 3px; color: white; white-space: nowrap; text-align: center; min-width: 36px; }
    .session-card-header .sc-main { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
    .session-card-header .sc-title { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .session-card-header .sc-subtitle { font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .session-card-header .sc-schedule { font-size: 0.75rem; color: var(--accent); white-space: nowrap; text-align: right; }
    .session-card-header .sc-schedule.unscheduled { color: var(--text-muted); font-style: italic; }
    .session-card-header .sc-arrow { font-size: 0.7rem; color: var(--text-muted); transition: transform 0.2s; width: 16px; text-align: center; }
    .session-card.open .sc-arrow { transform: rotate(90deg); }
    .session-card-body { padding: 0 1rem 1rem; display: none; border-top: 1px solid var(--border); }
    .session-card.open .session-card-body { display: block; padding-top: 1rem; }
    .sc-field { display: grid; grid-template-columns: 120px 1fr; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem; }
    .sc-field label { font-size: 0.85rem; color: var(--text-muted); }
    .sc-field input, .sc-field select { padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 4px; font-size: 0.85rem; width: 100%; }
    .sc-field input[type="number"] { width: 100px; }
    .participants-edit { margin-top: 0.75rem; }
    .participants-edit table { width: 100%; }
    .participants-edit th { font-size: 0.8rem; text-align: left; padding: 0.3rem 0.5rem; border-bottom: 1px solid var(--border); }
    .participants-edit td { padding: 0.3rem 0.5rem; border-bottom: 1px solid #f0f0f0; font-size: 0.85rem; }
    .participants-edit input[type="text"] { width: 100%; padding: 0.3rem; border: 1px solid var(--border); border-radius: 3px; font-size: 0.85rem; }
    .toggle-required { cursor: pointer; padding: 0.15rem 0.5rem; border-radius: 3px; font-size: 0.75rem; font-weight: 600; border: none; }
    .toggle-required.on { background: var(--conflict-bg); color: var(--conflict-border); }
    .toggle-required.off { background: #e8f4fd; color: #2980b9; }
    .add-participant-row { display: flex; gap: 0.5rem; margin-top: 0.5rem; align-items: center; }
    .add-participant-row input { padding: 0.35rem 0.5rem; border: 1px solid var(--border); border-radius: 4px; font-size: 0.85rem; }
    .session-card-actions { display: flex; gap: 0.5rem; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #f0f0f0; }

    /* Admin */
    .admin-view { max-width: 900px; margin: 0 auto; }
    .admin-section { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; }
    .admin-section h2 { font-size: 1.1rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
    .admin-section h3 { font-size: 0.95rem; margin: 1rem 0 0.5rem; color: var(--text-muted); }

    .form-row { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; }
    .form-row label { font-size: 0.85rem; min-width: 120px; }
    .form-row input, .form-row select { padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 4px; font-size: 0.85rem; }
    .form-row input[type="time"] { width: 110px; }
    .form-row input[type="number"] { width: 80px; }
    .form-row input[type="text"] { width: 200px; }
    .form-row input[type="date"] { width: 160px; }

    .btn { padding: 0.4rem 0.8rem; border: 1px solid var(--border); border-radius: 4px; cursor: pointer; font-size: 0.8rem; background: var(--card-bg); }
    .btn:hover { background: #eee; }
    .btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
    .btn-primary:hover { opacity: 0.9; }
    .btn-success { background: #27AE60; color: white; border-color: #27AE60; }
    .btn-success:hover { opacity: 0.9; }
    .btn-danger { color: var(--conflict-border); border-color: var(--conflict-border); }
    .btn-danger:hover { background: var(--conflict-bg); }

    .export-section { background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem; }
    .export-section h2 { font-size: 1.1rem; margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
    .export-section p { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; }
    .export-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .unsaved-badge { display: inline-block; background: #F39C12; color: white; font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 3px; margin-left: 0.5rem; vertical-align: middle; }
    .toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: #27AE60; color: white; padding: 0.6rem 1.2rem; border-radius: 6px; font-size: 0.85rem; z-index: 1000; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
    .toast.show { opacity: 1; }

    table.admin-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    table.admin-table th { text-align: left; padding: 0.5rem; border-bottom: 2px solid var(--border); font-weight: 600; }
    table.admin-table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid var(--border); }
    table.admin-table tr:hover { background: #f9f9f9; }

    .rules-list { padding-left: 1.25rem; }
    .rules-list li { margin-bottom: 0.5rem; font-size: 0.9rem; }
    .rules-list .rule-num { font-weight: 700; color: var(--accent); }

    .status-bar { text-align: center; padding: 0.5rem; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; }
    .status-bar strong { color: var(--text); }

    .hidden { display: none; }
    .admin-only { display: none; }
    body.is-admin .admin-only { display: inline-block; }
    @media print { .controls, .admin-view { display: none; } body { padding: 0; } }
    @media (max-width: 768px) {
      .session-row-top { grid-template-columns: 80px 1fr; }
      .session-row .room, .session-row .owner, .session-row .count, .session-row .domain-tag { display: none; }
      .form-row { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>

<div id="login-gate" style="display:flex;justify-content:center;align-items:center;min-height:80vh;">
  <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:2.5rem;text-align:center;max-width:360px;width:100%;">
    <h1 style="font-size:1.3rem;margin-bottom:0.25rem;">Sesonki ${season.number}</h1>
    <p style="color:var(--text-muted);margin-bottom:1.5rem;font-size:0.9rem;">Dependencies Planning</p>
    <input id="pw-input" type="password" placeholder="Salasana" style="width:100%;padding:0.6rem;border:1px solid var(--border);border-radius:6px;font-size:1rem;margin-bottom:0.75rem;text-align:center;" onkeydown="if(event.key==='Enter')checkPw()">
    <button onclick="checkPw()" style="width:100%;padding:0.6rem;background:var(--accent);color:white;border:none;border-radius:6px;font-size:0.9rem;cursor:pointer;font-weight:600;">Avaa aikataulu</button>
    <p id="pw-error" style="color:var(--conflict-border);font-size:0.8rem;margin-top:0.5rem;display:none;">Väärä salasana</p>
  </div>
</div>

<div id="app-content" style="display:none;">

<header>
  <h1>Sesonki ${season.number} — Dependencies Planning</h1>
  <p>${season.startDate} – ${season.endDate}</p>
</header>

<div class="controls" id="main-controls">
  <button id="btn-list" class="active" onclick="showView('list')">Lista</button>
  <button id="btn-grid" onclick="showView('grid')">Lukujärjestys</button>
  <button id="btn-conflicts" onclick="showView('conflicts')">Päällekkäisyydet</button>
  <button id="btn-sessions" class="admin-only" onclick="showView('sessions')">Sessiot</button>
  <button id="btn-admin" class="admin-only" onclick="showView('admin')">Asetukset</button>
  <button class="admin-only" style="background:#27AE60;color:white;border-color:#27AE60;font-weight:600" onclick="rebuildUI();showToast('Aikataulu rakennettu uudelleen!')" title="Aja aikataulutusalgoritmi uudelleen">&#x21bb; Aikatauluta</button>

  <div style="display: flex; align-items: center; gap: 0.5rem;">
    <label for="person-filter" style="font-size: 0.85rem;">Henkilö:</label>
    <select id="person-filter" onchange="filterPerson(this.value)"></select>
  </div>

  <div id="day-buttons" style="display: flex; align-items: center; gap: 0.5rem;">
    <label style="font-size: 0.85rem;">Päivä:</label>
  </div>
</div>

<div id="legend" class="legend"></div>
<div id="status-bar" class="status-bar"></div>

<div id="view-list" class="list-view"></div>
<div id="view-grid" class="grid-view hidden"></div>
<div id="view-conflicts" class="conflicts-view hidden"></div>
<div id="view-sessions" class="sessions-view hidden"></div>
<div id="view-admin" class="admin-view hidden"></div>
<div id="toast" class="toast"></div>

</div>

<script id="init-sessions" type="application/json">${JSON.stringify(sessions).replace(/</g,'\\u003c')}</script>
<script id="init-config" type="application/json">${JSON.stringify(config)}</script>
<script id="init-rooms" type="application/json">${JSON.stringify(rooms)}</script>
<script id="init-constraints" type="application/json">${JSON.stringify(constraints)}</script>

<script>
// === DATA (muokattava) ===
let sessions = JSON.parse(document.getElementById('init-sessions').textContent);
let config = JSON.parse(document.getElementById('init-config').textContent);
let rooms = JSON.parse(document.getElementById('init-rooms').textContent);
let constraints = JSON.parse(document.getElementById('init-constraints').textContent);
const PALETTE = ${JSON.stringify(colorPalette)};

let schedule = [];
let conflicts = [];
let domainColors = {};
let currentView = 'list';
let currentDay = 1;
let currentPerson = '';

// === SCHEDULER (selaimessa) ===
function timeToMin(t) { const [h,m]=t.split(':').map(Number); return h*60+m; }
function minToTime(m) { return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); }

function buildTimeSlots() {
  const s=timeToMin(config.dayStartTime), e=timeToMin(config.dayEndTime), ls=timeToMin(config.lunchStart), le=timeToMin(config.lunchEnd), g=config.slotGranularity;
  const slots=[]; for(let t=s;t<e;t+=g){if(t>=ls&&t<le)continue;slots.push(t);} return slots;
}
function canFit(start,dur) {
  const end=start+dur, ls=timeToMin(config.lunchStart), de=timeToMin(config.dayEndTime);
  if(end>de)return false; if(start<ls&&end>ls)return false; return true;
}
function getAvailConflicts(session,start,end,day) {
  const c=[];
  for(const p of session.participants) for(const con of constraints) {
    if(con.person!==p.name||con.day!==day)continue;
    if(start<timeToMin(con.endTime)&&end>timeToMin(con.startTime))
      c.push({person:p.name,domain:p.domain,requiredInThis:p.required,type:'availability',reason:con.reason||'Ei käytettävissä',constraintStart:con.startTime,constraintEnd:con.endTime});
  }
  return c;
}
function getOverlapConflicts(session,start,end,day,scheduled) {
  const c=[];
  for(const s of scheduled) {
    if(s.day!==day)continue;
    if(start<timeToMin(s.endTime)&&end>timeToMin(s.startTime)) {
      const other=sessions.find(x=>x.id===s.id); if(!other)continue;
      for(const p of session.participants)
        if(other.participants.some(op=>op.name===p.name))
          c.push({person:p.name,domain:p.domain,requiredInThis:p.required,requiredInOther:other.participants.find(op=>op.name===p.name)?.required,type:'overlap',otherSessionId:s.id,otherSessionTopic:other.topic});
    }
  }
  return c;
}
function selectRoom(session,start,end,day,scheduled) {
  const n=session.participants.length, dr=rooms.filter(r=>!r.availableDays||r.availableDays.includes(day)), sr=[...dr].sort((a,b)=>b.capacity-a.capacity);
  for(const r of sr){if(r.capacity<n)continue;if(!scheduled.some(s=>s.day===day&&s.room===r.id&&timeToMin(s.startTime)<end&&timeToMin(s.endTime)>start))return r;}
  for(const r of sr){if(!scheduled.some(s=>s.day===day&&s.room===r.id&&timeToMin(s.startTime)<end&&timeToMin(s.endTime)>start))return r;}
  return null;
}
function runScheduler() {
  const sorted=[...sessions].sort((a,b)=>{
    const ar=a.participants.filter(p=>p.required).length,br=b.participants.filter(p=>p.required).length;
    if(br!==ar)return br-ar; if(b.participants.length!==a.participants.length)return b.participants.length-a.participants.length; return a.priority-b.priority;
  });
  const slots=buildTimeSlots(); schedule=[]; conflicts=[];
  for(const session of sorted) {
    if(!session.participants.length){continue;}
    let best=null, bestScore=Infinity;
    for(let day=1;day<=config.days.length;day++) {
      for(const slot of slots) {
        const end=slot+session.duration;
        if(!canFit(slot,session.duration))continue;
        const ac=getAvailConflicts(session,slot,end,day);
        if(ac.some(c=>c.requiredInThis))continue;
        const oc=getOverlapConflicts(session,slot,end,day,schedule);
        const all=[...ac,...oc];
        const score=oc.filter(c=>c.requiredInThis).length*1000+all.filter(c=>!c.requiredInThis).length;
        const room=selectRoom(session,slot,end,day,schedule);
        if(!room)continue;
        if(score<bestScore){bestScore=score;best={day,startTime:minToTime(slot),endTime:minToTime(end),room:room.id,roomName:room.name,conflicts:all};}
        if(score===0)break;
      }
      if(best&&bestScore===0)break;
    }
    if(best){
      const rm=rooms.find(r=>r.id===best.room);
      schedule.push({id:session.id,topic:session.topic,owner:session.owner,ownerDomain:session.ownerDomain,day:best.day,startTime:best.startTime,endTime:best.endTime,room:best.room,roomName:best.roomName,roomFloor:rm?rm.floor:'',participantCount:session.participants.length,conflicts:best.conflicts});
      if(best.conflicts.length>0)conflicts.push({sessionId:session.id,sessionTopic:session.topic,conflicts:best.conflicts});
    }
  }
}

// === UI HELPERS ===
function buildDomainColors() {
  domainColors={};
  const doms=[...new Set(sessions.map(s=>s.ownerDomain))];
  doms.forEach((d,i)=>{domainColors[d]=PALETTE[i%PALETTE.length];});
}
function allParticipants() {
  const s=new Set(); sessions.forEach(se=>se.participants.forEach(p=>s.add(p.name))); return [...s].sort((a,b)=>a.localeCompare(b,'fi'));
}

function rebuildUI() {
  buildDomainColors(); runScheduler();
  // Legend
  const doms=[...new Set(sessions.map(s=>s.ownerDomain))];
  document.getElementById('legend').innerHTML=doms.map(d=>'<div class="legend-item"><div class="legend-dot" style="background:'+domainColors[d]+'"></div>'+d+'</div>').join('');
  // Person dropdown
  const sel=document.getElementById('person-filter');
  const prev=sel.value; sel.innerHTML='<option value="">Kaikki</option>'+allParticipants().map(p=>'<option value="'+p+'">'+p+'</option>').join('');
  sel.value=prev;
  // Day buttons
  const db=document.getElementById('day-buttons');
  db.innerHTML='<label style="font-size:0.85rem;">Päivä:</label>'+config.days.map(d=>'<button class="day-btn'+(d.day===currentDay?' active':'')+'" onclick="selectDay('+d.day+')">'+d.label+'</button>').join('');
  // Conflict count
  document.getElementById('btn-conflicts').textContent='Päällekkäisyydet'+(conflicts.length?' ('+conflicts.length+')':'');
  // Status
  document.getElementById('status-bar').innerHTML='<strong>'+schedule.length+'</strong>/'+sessions.length+' sessiota aikataulutettu · <strong>'+rooms.length+'</strong> neukkaria · <strong>'+config.days.length+'</strong> päivää · <strong>'+allParticipants().length+'</strong> henkilöä';
  render();
  if(typeof applyMode==='function')applyMode();
}

// === VIEW SWITCHING ===
function showView(v) {
  currentView=v;
  ['list','grid','conflicts','sessions','admin'].forEach(id=>{document.getElementById('view-'+id).classList.add('hidden');document.getElementById('btn-'+id).classList.remove('active');});
  document.getElementById('view-'+v).classList.remove('hidden'); document.getElementById('btn-'+v).classList.add('active');
  render();
}
function selectDay(d) { currentDay=d; document.querySelectorAll('.day-btn').forEach(b=>b.classList.toggle('active',b.textContent.includes(d))); render(); }
function filterPerson(n) { currentPerson=n; render(); }

function getSessionParts(id) { const s=sessions.find(x=>x.id===id); return s?s.participants:[]; }
function isIn(id,name) { return getSessionParts(id).some(p=>p.name===name); }
function hasConf(id,name) { const e=schedule.find(s=>s.id===id); return e?e.conflicts.some(c=>c.person===name):false; }

// === RENDER VIEWS ===
function render() {
  if(currentView==='list')renderList(); else if(currentView==='grid')renderGrid(); else if(currentView==='conflicts')renderConflicts(); else if(currentView==='sessions')renderSessions(); else if(currentView==='admin')renderAdmin();
}

function renderList() {
  const el=document.getElementById('view-list'); let h='';
  for(const day of config.days) {
    const ds=schedule.filter(s=>s.day===day.day).sort((a,b)=>a.startTime.localeCompare(b.startTime));
    h+='<div class="day-group"><h2>'+day.label+(day.date?' — '+day.date:'')+'</h2>';
    for(const s of ds) {
      let c='session-row';
      if(currentPerson){if(isIn(s.id,currentPerson)){c+=hasConf(s.id,currentPerson)?' conflict':' highlighted';}else c+=' dimmed';}
      const dc=domainColors[s.ownerDomain]||'#999';
      h+='<div class="'+c+'" style="border-left-color:'+dc+';background:linear-gradient(90deg,'+dc+'08 0%,transparent 40%)">';
      h+='<div class="session-row-top">';
      h+='<span class="time">'+s.startTime+'–'+s.endTime+'</span>';
      h+='<span class="domain-tag" style="background:'+dc+'">'+s.ownerDomain+'</span>';
      h+='<span class="room">'+(s.roomFloor?s.roomFloor+' · ':'')+s.roomName+'</span>';
      h+='<span class="topic">'+s.topic+'</span>';
      h+='<span class="owner">'+s.owner+'</span>';
      h+='<span class="count">'+s.participantCount+' hlö</span>';
      h+='</div>';
      const parts=getSessionParts(s.id);
      if(parts.length){
        h+='<div class="participants">';
        h+=parts.map(p=>{
          let pc='participant-name';
          if(p.name===s.owner)pc+=' is-owner';
          if(!p.required)pc+=' nice-to-have';
          if(currentPerson&&p.name===currentPerson)pc+=' is-selected';
          return '<span class="'+pc+'">'+p.name+'</span>';
        }).join(', ');
        h+='</div>';
      }
      h+='</div>';
    }
    h+='</div>';
  }
  el.innerHTML=h;
}

function renderGrid() {
  const el=document.getElementById('view-grid');
  const ds=timeToMin(config.dayStartTime),de=timeToMin(config.dayEndTime),ls=timeToMin(config.lunchStart),le=timeToMin(config.lunchEnd),g=config.slotGranularity;
  const slots=[]; for(let t=ds;t<de;t+=g)slots.push(t);
  const dayRooms=rooms.filter(r=>!r.availableDays||r.availableDays.includes(currentDay));
  const rc=dayRooms.length;
  let h='<div class="timetable" style="grid-template-columns:60px repeat('+rc+',1fr)">';
  h+='<div class="room-header"></div>'; dayRooms.forEach(r=>{h+='<div class="room-header">'+r.name+'<br><small>'+r.floor+' · '+r.capacity+' hlö</small></div>';});
  const dayS=schedule.filter(s=>s.day===currentDay);
  for(const slot of slots) {
    const ts=minToTime(slot);
    if(slot>=ls&&slot<le){h+='<div class="time-label">'+ts+'</div>';for(let i=0;i<rc;i++)h+='<div class="lunch-row">'+(slot===ls?'Lounas':'')+'</div>';continue;}
    h+='<div class="time-label">'+ts+'</div>';
    for(const room of dayRooms) {
      h+='<div class="cell">';
      const sh=dayS.find(s=>s.room===room.id&&timeToMin(s.startTime)===slot);
      if(sh) {
        const dur=timeToMin(sh.endTime)-timeToMin(sh.startTime), hs=dur/g, ht=(hs*29)-2, col=domainColors[sh.ownerDomain]||'#999';
        let c='session-block';
        if(currentPerson){if(isIn(sh.id,currentPerson)){c+=hasConf(sh.id,currentPerson)?' conflict':' highlighted';}else c+=' dimmed';}
        h+='<div class="'+c+'" style="height:'+ht+'px;background:'+col+'18;border-left-color:'+col+'" title="'+sh.topic+'">';
        h+='<div class="block-topic">'+sh.topic+'</div><div class="block-owner">'+sh.owner+'</div><div class="block-time">'+sh.startTime+'–'+sh.endTime+'</div></div>';
      }
      h+='</div>';
    }
  }
  h+='</div>'; el.innerHTML=h;
}

function renderConflicts() {
  const el=document.getElementById('view-conflicts');
  if(!conflicts.length){el.innerHTML='<p style="text-align:center;color:var(--text-muted);padding:2rem;">Ei päällekkäisyyksiä!</p>';return;}
  const reqCount=conflicts.reduce((n,c)=>n+c.conflicts.filter(x=>x.requiredInThis).length,0);
  const optCount=conflicts.reduce((n,c)=>n+c.conflicts.filter(x=>!x.requiredInThis).length,0);
  let h='<div style="margin-bottom:1rem;text-align:center;"><strong>'+reqCount+'</strong> pakollista konfliktia · <strong>'+optCount+'</strong> nice-to-have konfliktia</div>';
  for(const c of conflicts) {
    h+='<div class="conflict-card"><h3>'+c.sessionTopic+'</h3><ul>';
    for(const cf of c.conflicts) {
      const badge=cf.type==='availability'?'<span class="badge availability">ESTE</span>':cf.requiredInThis?'<span class="badge required">PAKOLLINEN</span>':'<span class="badge optional">Nice-to-have</span>';
      let detail='';
      if(cf.type==='availability')detail=cf.reason+' ('+cf.constraintStart+'–'+cf.constraintEnd+')';
      else detail='päällekkäin: "'+cf.otherSessionTopic+'"';
      h+='<li>'+badge+' <strong>'+cf.person+'</strong> ('+cf.domain+') — '+detail+'</li>';
    }
    h+='</ul></div>';
  }
  el.innerHTML=h;
}

function renderAdmin() {
  const el=document.getElementById('view-admin');
  let h='';

  // Säännöt
  h+='<div class="admin-section"><h2>Aikataulutussäännöt</h2>';
  h+='<ol class="rules-list">';
  h+='<li><span class="rule-num">1.</span> <strong>Pakollisten osallistujien esteet</strong> — jos pakollinen osallistuja on merkitty estyneeksi, sessiota EI sijoiteta tälle ajalle.</li>';
  h+='<li><span class="rule-num">2.</span> <strong>Pakollisten päällekkäisyydet</strong> — pakollinen henkilö ei saa olla kahdessa sessiossa yhtä aikaa.</li>';
  h+='<li><span class="rule-num">3.</span> <strong>Neukkarikapasiteetti</strong> — isoimmat sessiot (eniten osallistujia) isoimpiin neukkareihin.</li>';
  h+='<li><span class="rule-num">4.</span> <strong>Prioriteettijärjestys</strong> — korkeamman prioriteetin sessiot sijoitetaan ensin.</li>';
  h+='<li><span class="rule-num">5.</span> <strong>Nice-to-have</strong> — minimoidaan päällekkäisyyksiä, mutta sallitaan tarvittaessa.</li>';
  h+='</ol></div>';

  // Päivät
  h+='<div class="admin-section"><h2>Suunnittelupäivät</h2>';
  config.days.forEach((d,i)=>{
    h+='<div class="form-row">';
    h+='<label>'+d.label+'</label>';
    h+='<input type="date" value="'+(d.date||'')+'" onchange="updateDay('+i+',this.value)">';
    h+='<input type="text" value="'+d.label+'" placeholder="Otsikko" onchange="updateDayLabel('+i+',this.value)">';
    if(config.days.length>1) h+='<button class="btn btn-danger" onclick="removeDay('+i+')">Poista</button>';
    h+='</div>';
  });
  h+='<button class="btn" onclick="addDay()" style="margin-top:0.5rem">+ Lisää päivä</button>';
  h+='</div>';

  // Kellonajat
  h+='<div class="admin-section"><h2>Kellonajat</h2>';
  h+='<div class="form-row"><label>Päivä alkaa</label><input type="time" value="'+config.dayStartTime+'" onchange="config.dayStartTime=this.value;rebuildUI()"></div>';
  h+='<div class="form-row"><label>Päivä loppuu</label><input type="time" value="'+config.dayEndTime+'" onchange="config.dayEndTime=this.value;rebuildUI()"></div>';
  h+='<div class="form-row"><label>Lounas alkaa</label><input type="time" value="'+config.lunchStart+'" onchange="config.lunchStart=this.value;rebuildUI()"></div>';
  h+='<div class="form-row"><label>Lounas loppuu</label><input type="time" value="'+config.lunchEnd+'" onchange="config.lunchEnd=this.value;rebuildUI()"></div>';
  h+='<div class="form-row"><label>Tauko (min)</label><input type="number" value="'+config.breakBetweenSessions+'" min="0" max="60" onchange="config.breakBetweenSessions=+this.value;rebuildUI()"></div>';
  h+='</div>';

  // Neukkarit
  h+='<div class="admin-section"><h2>Neukkarit ('+rooms.length+')</h2>';
  h+='<table class="admin-table"><thead><tr><th>Kerros</th><th>Nimi</th><th>Hlö</th><th>Käytössä</th><th></th></tr></thead><tbody>';
  rooms.forEach((r,i)=>{
    const days=r.availableDays||config.days.map(d=>d.day);
    const dayLabels=days.map(d=>{const dd=config.days.find(x=>x.day===d);return dd?dd.label:'P'+d;}).join(', ');
    h+='<tr>';
    h+='<td><input type="text" value="'+(r.floor||'')+'" onchange="rooms['+i+'].floor=this.value;rebuildUI()" style="width:50px;border:1px solid var(--border);padding:0.3rem;border-radius:3px;"></td>';
    h+='<td><input type="text" value="'+r.name+'" onchange="rooms['+i+'].name=this.value;rebuildUI()" style="width:100%;border:1px solid var(--border);padding:0.3rem;border-radius:3px;"></td>';
    h+='<td><input type="number" value="'+r.capacity+'" min="1" onchange="rooms['+i+'].capacity=+this.value;rebuildUI()" style="width:55px;border:1px solid var(--border);padding:0.3rem;border-radius:3px;"></td>';
    h+='<td style="font-size:0.8rem;">'+dayLabels+'</td>';
    h+='<td><button class="btn btn-danger" onclick="removeRoom('+i+')">Poista</button></td>';
    h+='</tr>';
  });
  h+='</tbody></table>';
  h+='<button class="btn" onclick="addRoom()" style="margin-top:0.5rem">+ Lisää neukkari</button>';
  h+='</div>';

  // Esteet
  h+='<div class="admin-section"><h2>Henkilöiden esteet</h2>';
  if(constraints.length) {
    h+='<table class="admin-table"><thead><tr><th>Henkilö</th><th>Päivä</th><th>Aika</th><th>Syy</th><th></th></tr></thead><tbody>';
    constraints.forEach((c,i)=>{
      const dayLabel=config.days.find(d=>d.day===c.day)?.label||('Päivä '+c.day);
      h+='<tr><td>'+c.person+'</td><td>'+dayLabel+'</td><td>'+c.startTime+'–'+c.endTime+'</td><td>'+(c.reason||'')+'</td>';
      h+='<td><button class="btn btn-danger" onclick="removeConstraint('+i+')">Poista</button></td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='<h3>Lisää este</h3>';
  h+='<div class="form-row">';
  h+='<select id="c-person">'+allParticipants().map(p=>'<option>'+p+'</option>').join('')+'</select>';
  h+='<select id="c-day">'+config.days.map(d=>'<option value="'+d.day+'">'+d.label+'</option>').join('')+'</select>';
  h+='<input type="time" id="c-start" value="09:00">';
  h+='<span>–</span>';
  h+='<input type="time" id="c-end" value="12:00">';
  h+='<input type="text" id="c-reason" placeholder="Syy (valinnainen)">';
  h+='<button class="btn btn-primary" onclick="addConstraint()">Lisää</button>';
  h+='</div>';
  h+='</div>';

  // Vie/tuo tiedot
  h+='<div class="export-section"><h2>Tietojen tallennus</h2>';
  h+='<p>Selaimessa tehdyt muutokset (sessiot, esteet, neukkarit, asetukset) <strong>eivät tallennu automaattisesti</strong> projektin tiedostoihin. Vie muokatut tiedot alla olevilla napeilla ja korvaa projektin <code>data/</code>-kansion tiedostot.</p>';
  h+='<div class="export-buttons">';
  h+='<button class="btn btn-success" onclick="exportAll()">Vie kaikki tiedot (.zip)</button>';
  h+='<button class="btn" onclick="exportFile(\\'input.json\\',buildInputJson())">Vie sessiot (input.json)</button>';
  h+='<button class="btn" onclick="exportFile(\\'rooms.json\\',buildRoomsJson())">Vie neukkarit (rooms.json)</button>';
  h+='<button class="btn" onclick="exportFile(\\'constraints.json\\',JSON.stringify(constraints,null,2))">Vie esteet (constraints.json)</button>';
  h+='</div>';
  h+='<div style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border)">';
  h+='<p style="margin-bottom:0.5rem">Tai tuo aiemmin viedyt tiedostot:</p>';
  h+='<div class="export-buttons">';
  h+='<button class="btn" onclick="importFile(\\'sessions\\')">Tuo sessiot</button>';
  h+='<button class="btn" onclick="importFile(\\'rooms\\')">Tuo neukkarit</button>';
  h+='<button class="btn" onclick="importFile(\\'constraints\\')">Tuo esteet</button>';
  h+='</div>';
  h+='</div>';
  h+='</div>';

  el.innerHTML=h;
}

// === SESSIONS VIEW ===
let openSessionId = null;
let justAddedId = null;
let sessionSearch = '';

function renderSessions() {
  const el=document.getElementById('view-sessions');
  let h='<div class="sessions-toolbar">';
  h+='<h2>Sessiot ('+sessions.length+')</h2>';
  h+='<input class="sessions-search" type="text" placeholder="Hae sessiota..." value="'+escHtml(sessionSearch)+'" oninput="sessionSearch=this.value;renderSessions()">';
  h+='<button class="btn btn-primary" onclick="addSession()">+ Uusi sessio</button>';
  h+='</div>';

  const q=sessionSearch.toLowerCase();
  for(let si=0;si<sessions.length;si++) {
    const s=sessions[si];
    if(q && !(s.topic.toLowerCase().includes(q)||s.owner.toLowerCase().includes(q)||s.ownerDomain.toLowerCase().includes(q)||s.participants.some(p=>p.name.toLowerCase().includes(q)))) continue;
    const isOpen=openSessionId===s.id;
    const dc=domainColors[s.ownerDomain]||'#999';
    const scheduled=schedule.find(x=>x.id===s.id);
    const isNew=justAddedId===s.id;

    h+='<div class="session-card'+(isOpen?' open':'')+(isNew?' just-added':'')+'" id="card-'+s.id+'" style="border-left:4px solid '+dc+'">';

    h+='<div class="session-card-header" onclick="toggleSession(\\''+s.id+'\\')">';
    h+='<span class="sc-domain" style="background:'+dc+'">'+(s.ownerDomain||'–')+'</span>';
    h+='<div class="sc-main">';
    h+='<span class="sc-title">'+escHtml(s.topic)+'</span>';
    h+='<span class="sc-subtitle">';
    h+='<span>'+escHtml(s.owner)+'</span>';
    h+='<span>'+s.participants.length+' hlö</span>';
    h+='<span>'+s.duration+' min</span>';
    if(s.priority<99)h+='<span>Prio '+s.priority+'</span>';
    h+='</span>';
    h+='</div>';
    if(scheduled){const dl=config.days.find(d=>d.day===scheduled.day);h+='<span class="sc-schedule">'+scheduled.startTime+'–'+scheduled.endTime+'<br>'+(dl?dl.label:'Päivä '+scheduled.day)+', '+(scheduled.roomFloor?scheduled.roomFloor+' ':'')+scheduled.roomName+'</span>';}
    else h+='<span class="sc-schedule unscheduled">Ei aikataulutettu</span>';
    h+='<span class="sc-arrow">&#9654;</span>';
    h+='</div>';

    h+='<div class="session-card-body">';

    h+='<div class="sc-field"><label>Aihe</label><input type="text" value="'+escHtml(s.topic)+'" onchange="updateSession('+si+',\\'topic\\',this.value)"></div>';
    h+='<div class="sc-field"><label>Omistaja</label><input type="text" value="'+escHtml(s.owner)+'" onchange="updateSession('+si+',\\'owner\\',this.value)"></div>';
    h+='<div class="sc-field"><label>Domain</label><input type="text" value="'+escHtml(s.ownerDomain)+'" onchange="updateSession('+si+',\\'ownerDomain\\',this.value)"></div>';
    h+='<div class="sc-field"><label>Kesto (min)</label><input type="number" value="'+s.duration+'" min="15" step="15" onchange="updateSession('+si+',\\'duration\\',+this.value)"></div>';
    h+='<div class="sc-field"><label>Prioriteetti</label><input type="number" value="'+s.priority+'" min="1" max="99" onchange="updateSession('+si+',\\'priority\\',+this.value)"></div>';

    h+='<div class="participants-edit">';
    h+='<h3 style="font-size:0.9rem;margin-bottom:0.5rem;">Osallistujat ('+s.participants.length+')</h3>';
    h+='<table><thead><tr><th>Nimi</th><th>Domain</th><th>Rooli</th><th></th></tr></thead><tbody>';
    for(let pi=0;pi<s.participants.length;pi++) {
      const p=s.participants[pi];
      h+='<tr>';
      h+='<td><input type="text" value="'+escHtml(p.name)+'" onchange="updateParticipant('+si+','+pi+',\\'name\\',this.value)"></td>';
      h+='<td><input type="text" value="'+escHtml(p.domain)+'" style="width:80px" onchange="updateParticipant('+si+','+pi+',\\'domain\\',this.value)"></td>';
      h+='<td><button class="toggle-required '+(p.required?'on':'off')+'" onclick="toggleRequired('+si+','+pi+')">'+(p.required?'Pakollinen':'Nice-to-have')+'</button></td>';
      h+='<td><button class="btn btn-danger" style="padding:0.2rem 0.5rem;font-size:0.75rem" onclick="removeParticipant('+si+','+pi+')">&#x2715;</button></td>';
      h+='</tr>';
    }
    h+='</tbody></table>';

    h+='<div class="add-participant-row">';
    h+='<input type="text" id="new-p-name-'+si+'" placeholder="Nimi" style="width:160px">';
    h+='<input type="text" id="new-p-domain-'+si+'" placeholder="Domain" style="width:80px">';
    h+='<button class="btn" onclick="addParticipant('+si+')">+ Lisää</button>';
    h+='</div>';
    h+='</div>';

    h+='<div class="session-card-actions">';
    h+='<button class="btn btn-danger" onclick="removeSession('+si+')">Poista sessio</button>';
    h+='</div>';

    h+='</div>';
    h+='</div>';
  }

  el.innerHTML=h;

  if(justAddedId){const card=document.getElementById('card-'+justAddedId);if(card)card.scrollIntoView({behavior:'smooth',block:'start'});justAddedId=null;}
}

function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function toggleSession(id){openSessionId=openSessionId===id?null:id;renderSessions();}

function updateSession(si,field,val){sessions[si][field]=val;rebuildUI();}

function toggleRequired(si,pi){sessions[si].participants[pi].required=!sessions[si].participants[pi].required;rebuildUI();}

function updateParticipant(si,pi,field,val){sessions[si].participants[pi][field]=val;rebuildUI();}

function removeParticipant(si,pi){sessions[si].participants.splice(pi,1);rebuildUI();}

function addParticipant(si){
  const nameEl=document.getElementById('new-p-name-'+si);
  const domEl=document.getElementById('new-p-domain-'+si);
  const name=nameEl.value.trim(), domain=domEl.value.trim();
  if(!name)return;
  sessions[si].participants.push({name:name,domain:domain||sessions[si].ownerDomain,required:true});
  rebuildUI();
}

function addSession(){
  const id='session-new-'+Date.now();
  sessions.unshift({id:id,topic:'Uusi sessio',owner:'',ownerDomain:'',duration:60,priority:99,participants:[]});
  openSessionId=id;
  justAddedId=id;
  rebuildUI();
}

function removeSession(si){
  if(!confirm('Poistetaanko sessio "'+sessions[si].topic+'"?'))return;
  if(openSessionId===sessions[si].id)openSessionId=null;
  sessions.splice(si,1);
  rebuildUI();
}

// === ADMIN ACTIONS ===
function updateDay(i,val){config.days[i].date=val;rebuildUI();}
function updateDayLabel(i,val){config.days[i].label=val;rebuildUI();}
function addDay(){const n=config.days.length+1;config.days.push({day:n,date:'',label:'Päivä '+n});rebuildUI();}
function removeDay(i){config.days.splice(i,1);config.days.forEach((d,j)=>{d.day=j+1;});rebuildUI();}
function addRoom(){const n=rooms.length+1;rooms.push({id:'room-'+n,name:'Neukkari '+n,floor:'',capacity:10,availableDays:config.days.map(d=>d.day)});rebuildUI();}
function removeRoom(i){rooms.splice(i,1);rebuildUI();}
function addConstraint(){
  const p=document.getElementById('c-person').value,d=+document.getElementById('c-day').value,s=document.getElementById('c-start').value,e=document.getElementById('c-end').value,r=document.getElementById('c-reason').value;
  if(p&&d&&s&&e)constraints.push({person:p,day:d,startTime:s,endTime:e,reason:r});
  rebuildUI();
}
function removeConstraint(i){constraints.splice(i,1);rebuildUI();}

// === EXPORT/IMPORT ===
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500);}

function downloadBlob(filename,content,type){
  const blob=new Blob([content],{type:type||'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);
}

function buildInputJson(){
  return JSON.stringify({season:{number:3,startDate:'2026-08-31',endDate:'2026-12-31'},sessions:sessions},null,2);
}
function buildRoomsJson(){
  return JSON.stringify({config:config,rooms:rooms},null,2);
}

function exportFile(name,content){downloadBlob(name,content);showToast(name+' ladattu!');}

function exportAll(){
  const files={'input.json':buildInputJson(),'rooms.json':buildRoomsJson(),'constraints.json':JSON.stringify(constraints,null,2),'schedule.json':JSON.stringify({schedule:schedule,conflicts:conflicts},null,2)};
  const names=Object.keys(files);
  names.forEach(n=>downloadBlob(n,files[n]));
  showToast(names.length+' tiedostoa ladattu!');
}

function importFile(target){
  const input=document.createElement('input');input.type='file';input.accept='.json';
  input.onchange=function(){
    const file=input.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=function(){
      try{
        const data=JSON.parse(reader.result);
        if(target==='sessions'){if(data.sessions)sessions=data.sessions;else sessions=data;showToast('Sessiot tuotu ('+sessions.length+')');}
        else if(target==='rooms'){if(data.rooms){rooms=data.rooms;if(data.config)config=data.config;}else rooms=data;showToast('Neukkarit tuotu ('+rooms.length+')');}
        else if(target==='constraints'){constraints=data;showToast('Esteet tuotu ('+constraints.length+')');}
        rebuildUI();
      }catch(e){alert('Tiedoston luku epäonnistui: '+e.message);}
    };
    reader.readAsText(file);
  };
  input.click();
}

// === PASSWORD & MODE ===
const VIEW_PW = 'luottokumppani';
const ADMIN_PW = 'luottokumppaniadmin';
let isAdmin = false;

function checkPw(){
  const val=document.getElementById('pw-input').value;
  if(val===ADMIN_PW){isAdmin=true;unlock();}
  else if(val===VIEW_PW){isAdmin=false;unlock();}
  else{document.getElementById('pw-error').style.display='block';document.getElementById('pw-input').value='';document.getElementById('pw-input').focus();}
}
function unlock(){
  sessionStorage.setItem('sesonki-mode',isAdmin?'admin':'view');
  document.getElementById('login-gate').style.display='none';
  document.getElementById('app-content').style.display='block';
  applyMode();
  rebuildUI();
}
function applyMode(){
  document.body.classList.toggle('is-admin',isAdmin);
}

// Auto-unlock if already authenticated this session
const savedMode=sessionStorage.getItem('sesonki-mode');
if(savedMode){isAdmin=savedMode==='admin';unlock();}
</script>
</body>
</html>`;

writeFileSync('ui/index.html', html, 'utf-8');
console.log('Generoitu → ui/index.html');
