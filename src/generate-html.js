import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

const input = JSON.parse(readFileSync('data/input.json', 'utf-8'));
const roomsData = JSON.parse(readFileSync('data/rooms.json', 'utf-8'));
const constraints = existsSync('data/constraints.json')
  ? JSON.parse(readFileSync('data/constraints.json', 'utf-8'))
  : [];
const preferences = existsSync('data/preferences.json')
  ? JSON.parse(readFileSync('data/preferences.json', 'utf-8'))
  : [];

const { config, rooms } = roomsData;
const { sessions, season, personDomains, domainDescriptions } = input;

const bgImagePath = 'data/app-background.jpg';
const bgBase64 = existsSync(bgImagePath)
  ? readFileSync(bgImagePath).toString('base64')
  : '';

const discoMusicPath = 'data/The_Champs_-_Tequila_(mp3.pm).mp3';
const discoMusicBase64 = existsSync(discoMusicPath)
  ? readFileSync(discoMusicPath).toString('base64')
  : '';

const memePath = 'data/this-is-fine.webp';
const memeBase64 = existsSync(memePath)
  ? readFileSync(memePath).toString('base64')
  : '';

const fontPath = 'data/UnicaOne-Regular.ttf';
const fontBase64 = existsSync(fontPath)
  ? readFileSync(fontPath).toString('base64')
  : '';

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
  <meta name="robots" content="noindex, nofollow">
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
      background: var(--bg); color: var(--text); line-height: 1.5; padding: 1rem; overflow-x: hidden; max-width: 100vw;
    }
    body.has-bg {
      background-color: rgba(245,245,245,0.7);
      background-image: url('data:image/jpeg;base64,${bgBase64}');
      background-size: cover; background-position: center; background-attachment: fixed;
      background-blend-mode: overlay;
      --bg: rgba(245,245,245,0.8);
      --card-bg: rgba(255,255,255,0.88);
    }
    @font-face { font-family: 'Unica One'; src: url(data:font/ttf;base64,${fontBase64}) format('truetype'); font-weight: 400; font-style: normal; }
    header { text-align: center; margin-bottom: 1.5rem; padding: 1.5rem 1rem; overflow: hidden; }
    header h1 { font-family: 'Unica One', sans-serif; font-size: clamp(1.4rem, 5vw, 3.2rem); font-weight: 400; letter-spacing: 0.05em; text-transform: uppercase; -webkit-text-stroke: 0.5px currentColor; word-break: break-word; }
    header p { color: var(--text-muted); margin-top: 0.25rem; font-size: clamp(0.75rem, 2vw, 1rem); }

    .controls {
      display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem;
    }
    .controls button, .controls select {
      padding: 0.55rem 1.1rem; border: 1px solid var(--border); border-radius: 8px;
      background: var(--card-bg); cursor: pointer; font-size: 0.95rem; font-weight: 400;
    }
    .controls button.active { background: var(--text); color: white; border-color: var(--text); }
    .controls select { min-width: 200px; }

    .filter-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .filter-label { font-size: 0.8rem; font-weight: 600; color: var(--text); }
    #person-filter, #domain-filter { padding: 0.6rem 2rem 0.6rem 1rem; border: 1px solid var(--border); border-radius: 24px; font-size: 0.9rem; background: var(--card-bg); min-width: 200px; cursor: pointer; }
    .day-btn-group { display: inline-flex; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .day-btn-group .day-btn { padding: 0.5rem 1rem; border: none; border-left: 1px solid var(--border); background: var(--card-bg); cursor: pointer; font-size: 0.85rem; white-space: nowrap; }
    .day-btn-group .day-btn:first-child { border-left: none; }
    .day-btn-group .day-btn.active { background: var(--text); color: white; }

    .legend { display: flex; gap: 1rem; justify-content: center; margin-bottom: 1rem; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; cursor: help; position: relative; }
    .legend-item .legend-tooltip { display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: var(--text); color: white; padding: 0.3rem 0.6rem; border-radius: 5px; font-size: 0.75rem; white-space: nowrap; pointer-events: none; margin-bottom: 4px; z-index: 10; }
    .legend-item:hover .legend-tooltip { display: block; }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; }

    /* Lista */
    .list-view { max-width: 960px; margin: 0 auto; }
    .day-group { margin-bottom: 2rem; }
    .day-group h2 { font-size: 1.1rem; padding: 0.5rem 0; border-bottom: 2px solid var(--text); margin-bottom: 0.75rem; }

    .session-row { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--border); border-left: 4px solid transparent; transition: opacity 0.2s; }
    .session-row-top { display: grid; grid-template-columns: 100px 60px 150px 1fr; gap: 0.75rem; align-items: center; }
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
    .timetable { display: grid; column-gap: 1px; row-gap: 0; background: var(--border); border: 1px solid var(--border); min-width: 600px; }
    .timetable .time-label { background: var(--bg); padding: 0 0.5rem; font-size: 0.75rem; font-variant-numeric: tabular-nums; text-align: right; border-right: 2px solid var(--border); display: flex; align-items: center; justify-content: flex-end; }
    .timetable .time-label.slot-30 { border-top: 1px solid var(--border); }
    .timetable .room-header { background: var(--text); color: white; padding: 0.5rem; text-align: center; font-weight: 600; font-size: 0.85rem; }
    .timetable .cell { background: var(--card-bg); min-height: 40px; position: relative; }
    .timetable .cell.slot-30 { border-top: 1px solid var(--border); }
    .session-block { position: absolute; left: 2px; right: 2px; top: 1px; border-radius: 6px; padding: 0.25rem 0.35rem; font-size: 0.62rem; overflow: hidden; cursor: pointer; border-left: 4px solid; transition: opacity 0.2s, box-shadow 0.15s; z-index: 1; display: flex; flex-direction: column; }
    .session-block:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.18); z-index: 4; }
    .session-block .block-topic { font-weight: 600; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--topic-lines, 3); flex-shrink: 1; min-height: 0; }
    .session-block .block-time { font-size: 0.6rem; opacity: 0.7; flex-shrink: 0; }
    .session-block .block-meta { display: flex; align-items: center; gap: 0.3rem; font-size: 0.58rem; opacity: 0.85; margin-top: auto; line-height: 1; flex-shrink: 0; }
    .session-block.dimmed { opacity: var(--dimmed-opacity); }
    .session-block.highlighted { box-shadow: 0 0 0 2px var(--highlight-border); z-index: 2; }
    .session-block.conflict { box-shadow: 0 0 0 2px var(--conflict-border); z-index: 3; }
    .lunch-row { background: repeating-linear-gradient(45deg, #f9f9f9, #f9f9f9 10px, #f0f0f0 10px, #f0f0f0 20px); text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 0.25rem; }
    .lunch-row.slot-30 { border-top: 1px solid var(--border); }

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

    /* Stats bar */
    .stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; max-width: 960px; margin: 0 auto 1.5rem; }
    .stat-card { background: var(--card-bg); border: 1px solid var(--border); border-left: 3px solid var(--border); border-radius: 8px; padding: 0.75rem 1rem; }
    .stat-label { font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.35rem; }
    .stat-value { font-size: 1.75rem; font-weight: 700; margin: 0.25rem 0; }
    .stat-sub { font-size: 0.75rem; color: var(--text-muted); }

    /* List cards */
    .list-card { background: var(--card-bg); border: 1px solid var(--border); border-left: 4px solid; border-radius: 8px; padding: 0.85rem 1.1rem; margin-bottom: 0.75rem; transition: opacity 0.2s, box-shadow 0.2s; display: grid; grid-template-columns: 70px 1fr; gap: 0 1rem; cursor: default; }
    .list-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12); transform: translateY(-1px); transition: box-shadow 0.15s, transform 0.15s; }
    .list-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .list-card.dimmed { opacity: var(--dimmed-opacity); }
    .list-card.highlighted { background: var(--highlight); border-left-color: var(--highlight-border) !important; }
    .list-card.conflict { background: var(--conflict-bg); border-left-color: var(--conflict-border) !important; }
    .list-card-time { grid-row: 1 / 4; display: flex; flex-direction: column; justify-content: flex-start; padding-top: 0.1rem; }
    .list-card-time .time-start { font-size: 1.15rem; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }
    .list-card-time .time-end { font-size: 0.8rem; color: var(--text-muted); font-variant-numeric: tabular-nums; }
    .list-card-time .time-dur { font-size: 0.75rem; color: var(--text-muted); font-style: italic; }
    .list-card-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem; flex-wrap: wrap; }
    .list-card-title { font-size: 1rem; font-weight: 600; }
    .domain-badge { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; padding: 0.12rem 0.45rem; border-radius: 4px; color: white; white-space: nowrap; }
    .status-badge { font-size: 0.65rem; font-weight: 700; padding: 0.12rem 0.45rem; border-radius: 4px; white-space: nowrap; }
    .status-badge.st-cancelled { background: #f0f0f0; color: #999; }
    .status-badge.st-internal { background: #e8f4fd; color: #2980b9; }
    .session-card.is-cancelled { opacity: 0.55; }
    .session-card.is-cancelled .sc-title { text-decoration: line-through; color: var(--text-muted); }
    .list-card.is-internal { border-left-style: dashed; }
    .list-card-meta { font-size: 0.82rem; color: var(--text-muted); display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .list-card-participants { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .participant-chip { display: inline-flex; align-items: center; gap: 0.3rem; background: #f5f5f5; border: 1px solid #e8e8e8; border-radius: 20px; padding: 0.15rem 0.55rem 0.15rem 0.15rem; font-size: 0.72rem; white-space: nowrap; }
    .participant-chip.is-owner { font-weight: 600; }
    .participant-chip.nice-to-have { opacity: 0.6; font-style: italic; }
    .participant-chip.is-selected { background: #ffeeba; border-color: var(--highlight-border); }
    .p-avatar { width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 0.55rem; font-weight: 700; flex-shrink: 0; }

    /* Language toggle */
    .lang-toggle { position: absolute; top: 1rem; right: 1rem; display: flex; gap: 0.25rem; }
    .lang-toggle button { padding: 0.3rem 0.6rem; border: 1px solid var(--border); border-radius: 4px; background: var(--card-bg); cursor: pointer; font-size: 0.85rem; }
    .lang-toggle button.active { background: var(--text); color: white; border-color: var(--text); }

    .hidden { display: none; }
    .admin-only { display: none !important; }
    body.is-admin .admin-only { display: inline-block !important; }
    body.is-admin .admin-only.admin-block { display: block !important; }
    @media print { .controls, .admin-view, .lang-toggle { display: none; } body { padding: 0; } }
    @media (max-width: 768px) {
      .stats-bar { grid-template-columns: repeat(2, 1fr); }
      .list-card-meta { gap: 0.5rem; }
      .form-row { flex-direction: column; align-items: flex-start; }
      .controls { gap: 0.5rem; }
      .controls select, #person-filter, #domain-filter { min-width: 0; width: 100%; }
      .filter-group { width: 100%; }
      .day-btn-group { width: 100%; display: flex; }
      .day-btn-group .day-btn { flex: 1; padding: 0.5rem 0.4rem; font-size: 0.8rem; }
      header { padding: 1rem 0.5rem; }
      .sessions-toolbar { flex-direction: column; align-items: stretch; }
      .session-card-header { grid-template-columns: auto 1fr auto; }
      .session-card-header .sc-schedule { grid-column: 1 / -1; text-align: left; }
      .lang-toggle { position: static; justify-content: center; margin-bottom: 0.5rem; }
    }
    .logged-in #login-gate { display: none !important; }
    .logged-in #app-content { display: block !important; }
  </style>
</head>
<body>
<script>if(sessionStorage.getItem('sesonki-mode'))document.documentElement.classList.add('logged-in');</script>
<div id="login-gate" style="position:fixed;inset:0;display:flex;justify-content:center;align-items:center;background:#0a0a0a;z-index:9999;">
  ${bgBase64 ? '<div style="position:absolute;inset:0;background-image:url(data:image/jpeg;base64,' + bgBase64 + ');background-size:cover;background-position:center;opacity:0.45;"></div>' : ''}
  <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.3) 50%,rgba(0,0,0,0.7) 100%);"></div>
  <div class="login-lang-toggle" style="position:absolute;top:1.5rem;right:1.5rem;display:flex;gap:0.5rem;z-index:2;">
    <button id="login-lang-fi" class="active" onclick="setLoginLang('fi')" style="padding:0.5rem 1rem;border:2px solid rgba(255,255,255,0.5);border-radius:8px;background:rgba(255,255,255,0.15);backdrop-filter:blur(8px);color:white;cursor:pointer;font-size:0.95rem;font-weight:600;transition:all 0.2s;">&#127467;&#127470; Suomi</button>
    <button id="login-lang-en" onclick="setLoginLang('en')" style="padding:0.5rem 1rem;border:2px solid rgba(255,255,255,0.3);border-radius:8px;background:rgba(255,255,255,0.05);backdrop-filter:blur(8px);color:rgba(255,255,255,0.7);cursor:pointer;font-size:0.95rem;font-weight:600;transition:all 0.2s;">&#127468;&#127463; English</button>
  </div>
  <div style="position:relative;z-index:1;text-align:center;max-width:520px;width:100%;padding:2rem;color:white;">
    <h1 id="welcome-title" style="font-size:2.2rem;font-weight:800;margin-bottom:0.5rem;letter-spacing:-0.02em;text-shadow:0 2px 20px rgba(0,0,0,0.5);">Sesonki 3 tulee.</h1>
    <p id="welcome-subtitle" style="font-size:1.2rem;font-weight:600;margin-bottom:2rem;opacity:0.9;text-shadow:0 1px 10px rgba(0,0,0,0.5);">Sinä päätät, oletko valmis.</p>
    <div id="welcome-body" style="font-size:0.95rem;line-height:1.8;opacity:0.8;margin-bottom:1.5rem;text-shadow:0 1px 6px rgba(0,0,0,0.4);">
      Kalenteri tietää enemmän kuin kertoo.<br>Black Friday lähestyy. Joulu odottaa vuoroaan.<br>Kesä tapahtuu joka vuosi, silti se yllättää.
    </div>
    <p id="welcome-footer" style="font-size:0.9rem;font-style:italic;opacity:0.7;margin-bottom:2.5rem;text-shadow:0 1px 6px rgba(0,0,0,0.4);">Tervetuloa riippuvuussuunnitteluun, jossa suunnitelmat elävät,<br>mutta deadlinet eivät.</p>
    <p id="welcome-cta" style="font-size:0.85rem;opacity:0.6;margin-bottom:1rem;text-transform:uppercase;letter-spacing:0.1em;">Syötä salasana ja astu sisään.</p>
    <div style="max-width:320px;margin:0 auto;">
      <input id="pw-input" type="password" placeholder="Salasana" style="width:100%;padding:0.75rem 1rem;border:2px solid rgba(255,255,255,0.3);border-radius:10px;font-size:1rem;text-align:center;background:rgba(255,255,255,0.1);backdrop-filter:blur(12px);color:white;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='rgba(255,255,255,0.7)'" onblur="this.style.borderColor='rgba(255,255,255,0.3)'" onkeydown="if(event.key==='Enter')checkPw()">
      <button id="pw-submit" onclick="checkPw()" style="width:100%;margin-top:0.75rem;padding:0.75rem;background:rgba(255,255,255,0.2);backdrop-filter:blur(8px);color:white;border:2px solid rgba(255,255,255,0.3);border-radius:10px;font-size:0.95rem;cursor:pointer;font-weight:600;transition:all 0.2s;letter-spacing:0.02em;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">Avaa aikataulu</button>
      <p id="pw-error" style="color:#ff6b6b;font-size:0.85rem;margin-top:0.75rem;display:none;text-shadow:0 1px 4px rgba(0,0,0,0.5);">Väärä salasana</p>
    </div>
  </div>
</div>

<div id="app-content" style="display:none;position:relative;">

<header style="position:relative;">
  <div class="lang-toggle">
    <button id="lang-fi" class="active" onclick="setLang('fi')">&#127467;&#127470; Suomi</button>
    <button id="lang-en" onclick="setLang('en')">&#127468;&#127463; English</button>
  </div>
  <h1 id="main-title">Sesonki&shy;suunnittelu: Sesonki ${season.number}/2026</h1>
  <details style="margin-top:0.5rem;cursor:pointer;">
    <summary id="cycles-title" style="font-size:0.85rem;color:#555;font-weight:600;">S3/26 syklit</summary>
    <div style="display:flex;flex-wrap:wrap;gap:0.4rem;justify-content:center;margin-top:0.5rem;">
      <span style="font-size:0.75rem;background:var(--card-bg);border:1px solid var(--border);border-radius:4px;padding:0.2rem 0.5rem;"><strong>1</strong> 31.8–13.9</span>
      <span style="font-size:0.75rem;background:var(--card-bg);border:1px solid var(--border);border-radius:4px;padding:0.2rem 0.5rem;"><strong>2</strong> 14.9–27.9</span>
      <span style="font-size:0.75rem;background:var(--card-bg);border:1px solid var(--border);border-radius:4px;padding:0.2rem 0.5rem;"><strong>3</strong> 28.9–11.10</span>
      <span style="font-size:0.75rem;background:var(--card-bg);border:1px solid var(--border);border-radius:4px;padding:0.2rem 0.5rem;"><strong>4</strong> 12.10–25.10</span>
      <span style="font-size:0.75rem;background:var(--card-bg);border:1px solid var(--border);border-radius:4px;padding:0.2rem 0.5rem;"><strong>5</strong> 26.10–8.11</span>
      <span style="font-size:0.75rem;background:var(--card-bg);border:1px solid var(--border);border-radius:4px;padding:0.2rem 0.5rem;"><strong>6</strong> 9.11–22.11</span>
      <span style="font-size:0.75rem;background:var(--card-bg);border:1px solid var(--border);border-radius:4px;padding:0.2rem 0.5rem;"><strong>7</strong> 23.11–6.12</span>
      <span style="font-size:0.75rem;background:var(--card-bg);border:1px solid var(--border);border-radius:4px;padding:0.2rem 0.5rem;"><strong>8</strong> 7.12–20.12</span>
      <span style="font-size:0.75rem;background:var(--card-bg);border:1px solid var(--border);border-radius:4px;padding:0.2rem 0.5rem;"><strong>9</strong> 21.12–3.1</span>
    </div>
  </details>
</header>

<div class="controls" id="main-controls">
  <button id="btn-list" class="active" onclick="showView('list')">Lista</button>
  <button id="btn-grid" onclick="showView('grid')">Lukujärjestys</button>
  <button id="btn-conflicts" onclick="showView('conflicts')">Päällekkäisyydet</button>
  <button id="btn-sessions" class="admin-only" onclick="showView('sessions')">Sessiot</button>
  <button id="btn-admin" class="admin-only" onclick="showView('admin')">Asetukset</button>
</div>

<div id="stats-bar" class="stats-bar"></div>
<div id="status-bar" class="status-bar" style="display:none;"></div>

<div id="filter-bar" style="max-width:960px;margin:0 auto 1rem;display:flex;align-items:flex-start;gap:2rem;flex-wrap:wrap;">
  <div class="filter-group">
    <label id="person-label" class="filter-label">Henkilöfiltteri</label>
    <select id="person-filter" onchange="filterPerson(this.value)"></select>
  </div>
  <div class="filter-group">
    <label id="domain-label" class="filter-label">Domain</label>
    <select id="domain-filter" onchange="filterDomain(this.value)"></select>
  </div>
  <div class="filter-group">
    <label id="day-label" class="filter-label">Päiväfiltteri</label>
    <div id="day-buttons" class="day-btn-group"></div>
  </div>
</div>
<div id="legend" class="legend"></div>

<div id="view-list" class="list-view"></div>
<div id="view-grid" class="grid-view hidden"></div>
<div id="view-conflicts" class="conflicts-view hidden"></div>
<div id="view-sessions" class="sessions-view hidden"></div>
<div id="view-admin" class="admin-view hidden"></div>
<div id="block-popup" style="display:none;position:fixed;z-index:100;background:var(--card-bg);border:1px solid var(--border);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.15);padding:1rem 1.25rem;max-width:400px;min-width:280px;"></div>
<div id="popup-overlay" style="display:none;position:fixed;inset:0;z-index:99;" onclick="closeBlockPopup()"></div>
<div id="toast" class="toast"></div>

</div>

<script id="init-sessions" type="application/json">${JSON.stringify(sessions).replace(/</g,'\\u003c')}</script>
<script id="init-config" type="application/json">${JSON.stringify(config)}</script>
<script id="init-rooms" type="application/json">${JSON.stringify(rooms)}</script>
<script id="init-constraints" type="application/json">${JSON.stringify(constraints)}</script>
<script id="init-preferences" type="application/json">${JSON.stringify(preferences)}</script>
<script id="init-schedule" type="application/json">${JSON.stringify((() => { try { const s = JSON.parse(readFileSync('data/schedule.json','utf-8')); return { schedule: s.schedule, conflicts: s.conflicts }; } catch(e) { return { schedule: [], conflicts: [] }; } })())}</script>

<script>
// === DATA (muokattava) ===
const BUILD_VERSION = '${new Date().toISOString()}';
let sessions = JSON.parse(document.getElementById('init-sessions').textContent);
let config = JSON.parse(document.getElementById('init-config').textContent);
let rooms = JSON.parse(document.getElementById('init-rooms').textContent);
let constraints = JSON.parse(document.getElementById('init-constraints').textContent);
let preferences = JSON.parse(document.getElementById('init-preferences').textContent);
const PALETTE = ${JSON.stringify(colorPalette)};

const TR = {
  fi: {
    list:'\\ud83d\\udccb Lista', grid:'\\ud83d\\udcc5 Lukujärjestys', conflicts:'\\u26a0\\ufe0f Päällekkäisyydet',
    sessions:'\\ud83d\\udcdd Sessiot', settings:'\\u2699\\ufe0f Asetukset', rescheduleBtn:'\\u21bb Aikatauluta',
    person:'Henkilö', all:'Kaikki', allPersons:'Kaikki henkilöt', dayLabel:'Päivä',
    personFilter:'Henkilöfiltteri', domainFilter:'Domain', allDomains:'Kaikki domainit', dayFilter:'Päiväfiltteri',
    statsSessions:'Suunnittelusettejä', statsTime:'Suunnitteluaikaa',
    statsParticipants:'Osallistujia', statsHours:'Yhteistunteja',
    statsDays:'päivää', statsCalTotal:'kalenteriaikaa yhteensä',
    statsUnique:'eri henkilöä mukana', statsWorkTotal:'kaikkien työpanos yhteensä',
    statsInvestment:'Suunnittelun arvo', statsInvestSub:'à 35 €/hlö-tunti',
    owner:'Vetäjä', min:'min', ppl:'hlö', h:'h',
    noConflicts:'Ei päällekkäisyyksiä!',
    reqConflicts:'pakollista konfliktia', nthConflicts:'toivottujen konfliktia',
    badgeBlocked:'ESTE', badgeRequired:'PAKOLLINEN', badgeNth:'TOIVOTTU',
    overlapWith:'päällekkäin',
    pw:'Salasana', pwOpen:'Avaa aikataulu', pwWrong:'Väärä salasana',
    welcomeTitle:'Sesonki 3 tulee.',
    welcomeSubtitle:'Sinä päätät, oletko valmis.',
    welcomeBody:'Kalenteri tietää enemmän kuin kertoo.<br>Black Friday lähestyy. Joulu odottaa vuoroaan.<br>Kesä tapahtuu joka vuosi, silti se yllättää.',
    welcomeFooter:'Tervetuloa riippuvuussuunnitteluun, jossa suunnitelmat elävät,<br>mutta deadlinet eivät.',
    welcomeCta:'Syötä salasana ja astu sisään.',
    lunch:'Lounas',
    statusLabel:'Tila', statusActive:'Aktiivinen', statusInternal:'Domainin sisäinen', statusCancelled:'Ei tarvita',
    statusScheduled:'sessiota aikataulutettu', statusRooms:'neukkaria',
    statusDays:'päivää', statusPersons:'henkilöä',
    mainTitle:'Sesonki­suunnittelu: Sesonki', cyclesTitle:'S3/26 syklit',
    eggDuck:'\\ud83e\\udd86 Aku Ankka on estynyt \\u2014 h\\u00e4n on Ankkalinnassa kokouksessa Roope-sed\\u00e4n kanssa',
    eggDuckNames:'Aku Ankka muutti kaikki nimet! Palautuu kohta...',
    eggRankTitle:'\\ud83c\\udfc6 Kokouskuningas/-kuningatar',
    eggRankSub:'Eniten sessioita',
    eggRankUnit:'sessiota',
    eggRankClose:'Klikkaa sulkeaksesi',
    eggSpin:'\\ud83c\\udf00 Ei. Kaikki-n\\u00e4kym\\u00e4\\u00e4 ei ole. Lopeta.',
    eggDiscoOn:'\\ud83d\\udd7a DISCO MODE ACTIVATED \\ud83d\\udc83',
    eggDiscoOff:'Disco mode off',
    eggDiscoTitle:'\\ud83c\\udf89 SESONKI 3 HYPE \\ud83c\\udf89',
  },
  en: {
    list:'\\ud83d\\udccb List', grid:'\\ud83d\\udcc5 Timetable', conflicts:'\\u26a0\\ufe0f Conflicts',
    sessions:'\\ud83d\\udcdd Sessions', settings:'\\u2699\\ufe0f Settings', rescheduleBtn:'\\u21bb Schedule',
    person:'Person', all:'All', allPersons:'All persons', dayLabel:'Day',
    personFilter:'Person filter', domainFilter:'Domain', allDomains:'All domains', dayFilter:'Day filter',
    statsSessions:'Planning sessions', statsTime:'Planning time',
    statsParticipants:'Participants', statsHours:'Total hours',
    statsDays:'days', statsCalTotal:'calendar time in total',
    statsUnique:'unique participants', statsWorkTotal:'total effort across all',
    statsInvestment:'Planning investment', statsInvestSub:'at €35/person-hour',
    owner:'Facilitator', min:'min', ppl:'ppl', h:'h',
    noConflicts:'No conflicts!',
    reqConflicts:'required conflicts', nthConflicts:'optional conflicts',
    badgeBlocked:'BLOCKED', badgeRequired:'REQUIRED', badgeNth:'OPTIONAL',
    overlapWith:'overlaps with',
    pw:'Password', pwOpen:'Open schedule', pwWrong:'Wrong password',
    welcomeTitle:'Season 3 is coming.',
    welcomeSubtitle:'You decide if you\\'re ready.',
    welcomeBody:'The calendar knows more than it tells.<br>Black Friday approaches. Christmas awaits its turn.<br>Summer happens every year, yet it always surprises.',
    welcomeFooter:'Welcome to dependencies planning, where plans live,<br>but deadlines don\\'t.',
    welcomeCta:'Enter the password and step inside.',
    lunch:'Lunch',
    statusLabel:'Status', statusActive:'Active', statusInternal:'Domain internal', statusCancelled:'Not needed',
    statusScheduled:'sessions scheduled', statusRooms:'rooms',
    statusDays:'days', statusPersons:'participants',
    mainTitle:'Season Planning: Season', cyclesTitle:'S3/26 cycles',
    eggDuck:'\\ud83e\\udd86 Donald Duck is unavailable \\u2014 he\\'s in a meeting with Uncle Scrooge in Duckburg',
    eggDuckNames:'Donald Duck changed all names! Reverting soon...',
    eggRankTitle:'\\ud83c\\udfc6 Meeting King/Queen',
    eggRankSub:'Most sessions',
    eggRankUnit:'sessions',
    eggRankClose:'Click to close',
    eggSpin:'\\ud83c\\udf00 Nope. There is no All view. Stop it.',
    eggDiscoOn:'\\ud83d\\udd7a DISCO MODE ACTIVATED \\ud83d\\udc83',
    eggDiscoOff:'Disco mode off',
    eggDiscoTitle:'\\ud83c\\udf89 SEASON 3 HYPE \\ud83c\\udf89',
  }
};
const TOPIC_EN = {
'session-1':'Parliamentary elections growth: cross-cutting commercial concept from identity perspective, prioritized as part of DSE Prio 11',
'session-2':'Parliamentary elections growth - revenue targets, marketing & productization',
'session-3':'Parliamentary elections growth - digital buying & operations, transparency notice',
'session-4':'Parliamentary elections growth - login & identity',
'session-5':'Parliamentary elections growth - multimedia buying & operations',
'session-6':'Salesforce-Monday integration - automated project creation - data - time savings TBD',
'session-7':'MSS Prio 9: Insight as a Service monthly pilot for customer interface',
'session-8':'Insight & Research team Monday onboarding',
'session-9':'Content Studio, Insight sales AI solution usage monitoring development',
'session-10':'MSS Prio 7: Deployment of renewed Sanoma segments',
'session-11':'DSE Prio 10: Shared commercial management model: Developing prospecting and Skoutti game-builder',
'session-12':'MS&S Prio 4: Videolle brand controlled phase-out',
'session-13':'Marketing area minor development',
'session-14':'Sales KPI: sales reporting & dashboard data challenges - building foundation for data productization to make development agent-driven, not report-driven',
'session-15':'Performance: Next steps for goal & measurement model and impacts on different domains',
'session-16':'Performance: Advancing co-development model in S3 - selected end-to-end pilots (RevOps & performance model)',
'session-17':'Strategic segmentation: Creating ideal customer profile (ICP)',
'session-18':'Discovery: continuous service products for booking (Growth Service Starter, Google, Meta)',
'session-19':'Discovery: growth service planning team tools & systems development, Salesforce utilization',
'session-20':'Discovery: e-commerce segment product opportunities',
'session-21':'B2B Prio 8, MSS Prio 5: Better ad effectiveness and yield through native advertising',
'session-22':'API renewal PoC to support AI development',
'session-23':'TagomoAI agentic Ad Manager booking: automated agency-advertiser relationship updates',
'session-24':'Reporting: Matillion renewal',
'session-25':'Display material automation in Ad Manager',
'session-26':'Missing Creative AI Capabilities (HTML5 and tags)',
'session-27':'Goal-based purchase flow',
'session-28':'Instream to Ad Manager (Productization, technical requirements, and Booking API work)',
'session-29':'Performance Data Product - faster discovery and development',
'session-30':'Soft launch new RT-optimized CPC productization',
'session-31':'Proof of results through attention measurement',
'session-32':'Discovery: Video hosting and templates',
'session-33':'Optimizing the flow between Snowflake and Claude',
'session-34':'AV Maestro, meeting 1',
'session-35':'AV Maestro, meeting 2',
'session-36':'AV Maestro, meeting 3',
'session-37':'AV Maestro, meeting 4',
'session-38':'AV Manager, gambling, product configuration & sales restrictions',
'session-39':'TV Beat, meeting 1',
'session-40':'TV Beat, meeting 2',
'session-41':'Reporting needs for S3',
};
function topicText(session) {
  if(lang==='en'&&TOPIC_EN[session.id])return TOPIC_EN[session.id];
  return session.topic;
}
function schedTopicText(s) {
  if(lang==='en'&&TOPIC_EN[s.id])return TOPIC_EN[s.id];
  return s.topic;
}

let lang = 'fi';
function t(k) { return (TR[lang]&&TR[lang][k])||k; }

function setLang(l) {
  lang=l;
  document.getElementById('lang-fi').classList.toggle('active',l==='fi');
  document.getElementById('lang-en').classList.toggle('active',l==='en');
  translateStatic();
  rebuildUI();
}

function setLoginLang(l) {
  lang=l;
  const fi=document.getElementById('login-lang-fi');
  const en=document.getElementById('login-lang-en');
  if(fi){fi.classList.toggle('active',l==='fi');fi.style.borderColor=l==='fi'?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.3)';fi.style.background=l==='fi'?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.05)';fi.style.color=l==='fi'?'white':'rgba(255,255,255,0.7)';}
  if(en){en.classList.toggle('active',l==='en');en.style.borderColor=l==='en'?'rgba(255,255,255,0.5)':'rgba(255,255,255,0.3)';en.style.background=l==='en'?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.05)';en.style.color=l==='en'?'white':'rgba(255,255,255,0.7)';}
  translateStatic();
}

function translateStatic() {
  const pi=document.getElementById('pw-input'); if(pi)pi.placeholder=t('pw');
  const pb=document.getElementById('pw-submit'); if(pb)pb.textContent=t('pwOpen');
  const pe=document.getElementById('pw-error'); if(pe)pe.textContent=t('pwWrong');
  const wt=document.getElementById('welcome-title'); if(wt)wt.textContent=t('welcomeTitle');
  const ws=document.getElementById('welcome-subtitle'); if(ws)ws.textContent=t('welcomeSubtitle');
  const wb=document.getElementById('welcome-body'); if(wb)wb.innerHTML=t('welcomeBody');
  const wf=document.getElementById('welcome-footer'); if(wf)wf.innerHTML=t('welcomeFooter');
  const wc=document.getElementById('welcome-cta'); if(wc)wc.textContent=t('welcomeCta');
  const mt=document.getElementById('main-title'); if(mt)mt.innerHTML=t('mainTitle')+' ${season.number}/2026';
  const ct=document.getElementById('cycles-title'); if(ct)ct.textContent=t('cyclesTitle');
}

function getInitials(name) {
  const parts=name.trim().split(/\\s+/);
  if(parts.length>=2)return(parts[0][0]+parts[parts.length-1][0]).toUpperCase();
  return name.substring(0,2).toUpperCase();
}
const personDomains = ${JSON.stringify(personDomains || {})};
const domainDescriptions = Object.assign(${JSON.stringify(domainDescriptions || {})}, {
  'MSS':'Marketing Solutions & Services',
  'MSS / SM':'Marketing Solutions & Services / Sales & Marketing',
  'S&M/B2B':'Sales & Marketing / B2B',
  'B2B':'Business to Business',
  'other':'Muu / Other'
});
const DOMAIN_ALIAS = {'MS&S':'MSS','N&F':'DG','Digital & AI':'DG','Core & Sales Reporting':'DSE','Ad Manager':'DG','Ad Manager Product':'DG','YDP':'DG','Personalization':'DG','Creative AI':'DG','CPR':'DG','PP':'DG','DO':'DG','AP':'DG','ADMP':'DG'};
function resolveDomain(d) { return domainColors[d]?d:(DOMAIN_ALIAS[d]&&domainColors[DOMAIN_ALIAS[d]]?DOMAIN_ALIAS[d]:null); }
function nameColor(name) {
  const pd=personDomains[name];
  const rd=resolveDomain(pd);
  if(rd)return domainColors[rd];
  for(const s of sessions){
    for(const p of s.participants){
      if(p.name===name&&p.domain){const r=resolveDomain(p.domain);if(r)return domainColors[r];}
    }
  }
  return '#999';
}

const _initSched = JSON.parse(document.getElementById('init-schedule').textContent);
let schedule = _initSched.schedule || [];
let conflicts = _initSched.conflicts || [];
let domainColors = {};
let currentView = 'list';
let currentDay = 0;
let currentPerson = '';
let currentDomain = '';

// === SCHEDULER (selaimessa) ===
function timeToMin(t) { const [h,m]=t.split(':').map(Number); return h*60+m; }
function minToTime(m) { return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); }

function buildTimeSlots() {
  const s=timeToMin(config.dayStartTime), e=timeToMin(config.dayEndTime), ls=timeToMin(config.lunchStart), le=timeToMin(config.lunchEnd), g=config.slotGranularity;
  const slots=[]; for(let t=s;t<e;t+=g){if(t>=ls&&t<le)continue;slots.push(t);} return slots;
}
function canFit(start,dur) {
  const end=start+dur, ls=timeToMin(config.lunchStart), le=timeToMin(config.lunchEnd), de=timeToMin(config.dayEndTime);
  if(end>de)return false;
  if(start>=ls&&start<le)return false;
  if(start<ls&&end>ls)return false;
  return true;
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
      const ownSplit=(n)=>n.split(/[+&\\/]/).map(x=>x.trim());
      for(const p of session.participants)
        if(other.participants.some(op=>op.name===p.name))
          c.push({person:p.name,domain:p.domain,requiredInThis:p.required,requiredInOther:other.participants.find(op=>op.name===p.name)?.required,isOwnerInThis:ownSplit(session.owner).includes(p.name),isOwnerInOther:ownSplit(other.owner).includes(p.name),type:'overlap',otherSessionId:s.id,otherSessionTopic:other.topic});
    }
  }
  return c;
}
function selectRoom(session,start,end,day,scheduled) {
  const af=config.activeFloors;
  const n=session.participants.length, dr=rooms.filter(r=>(!r.availableDays||r.availableDays.includes(day))&&(!af||!af.length||af.includes(r.floor))), sr=[...dr].sort((a,b)=>b.capacity-a.capacity);
  for(const r of sr){if(r.capacity<n)continue;if(!scheduled.some(s=>s.day===day&&s.room===r.id&&timeToMin(s.startTime)<end&&timeToMin(s.endTime)>start))return r;}
  for(const r of sr){if(!scheduled.some(s=>s.day===day&&s.room===r.id&&timeToMin(s.startTime)<end&&timeToMin(s.endTime)>start))return r;}
  return null;
}
function computeGroupPlacements(group,startSlot) {
  const ls=timeToMin(config.lunchStart),le=timeToMin(config.lunchEnd),de=timeToMin(config.dayEndTime);
  const placements=[];let ct=startSlot;
  for(const gs of group){
    if(ct>=ls&&ct<le)ct=le;
    let et=ct+gs.duration;
    if(ct<ls&&et>ls){ct=le;et=ct+gs.duration;}
    if(et>de)return null;
    placements.push({session:gs,startTime:ct,endTime:et});
    ct=et;
  }
  return placements;
}
function selectRoomForGroup(placements,day,scheduled) {
  const mx=Math.max(...placements.map(p=>p.session.participants.length));
  const af=config.activeFloors;
  const dr=rooms.filter(r=>(!r.availableDays||r.availableDays.includes(day))&&(!af||!af.length||af.includes(r.floor))),sr=[...dr].sort((a,b)=>b.capacity-a.capacity);
  for(const r of sr){if(r.capacity<mx)continue;if(placements.every(p=>!scheduled.some(s=>s.day===day&&s.room===r.id&&timeToMin(s.startTime)<p.endTime&&timeToMin(s.endTime)>p.startTime)))return r;}
  for(const r of sr){if(placements.every(p=>!scheduled.some(s=>s.day===day&&s.room===r.id&&timeToMin(s.startTime)<p.endTime&&timeToMin(s.endTime)>p.startTime)))return r;}
  return null;
}
function runScheduler() {
  const active=sessions.filter(s=>s.status!=='cancelled');
  const sorted=[...active].sort((a,b)=>{
    const ai=a.status==='internal'?1:0, bi=b.status==='internal'?1:0;
    if(ai!==bi)return ai-bi;
    const ar=a.participants.filter(p=>p.required).length,br=b.participants.filter(p=>p.required).length;
    if(br!==ar)return br-ar; if(b.participants.length!==a.participants.length)return b.participants.length-a.participants.length; return a.priority-b.priority;
  });
  const slots=buildTimeSlots(); const prevSchedule=[...schedule]; schedule=[]; conflicts=[];
  const scheduledIds=new Set();

  // Pre-place locked sessions from previous schedule
  for(const prev of prevSchedule){
    const session=active.find(s=>s.id===prev.id);
    if(!session||!session.locked)continue;
    if(!rooms.find(r=>r.id===prev.room))continue;
    schedule.push({...prev,conflicts:[]});
    scheduledIds.add(prev.id);
  }

  const groups={};
  for(const s of active){if(s.group){if(!groups[s.group])groups[s.group]=[];groups[s.group].push(s);}}
  for(const g of Object.values(groups))g.sort((a,b)=>(a.groupOrder||0)-(b.groupOrder||0));

  for(const session of sorted) {
    if(scheduledIds.has(session.id))continue;
    if(!session.participants.length)continue;

    if(session.group&&groups[session.group]) {
      const group=groups[session.group];
      let best=null,bestScore=Infinity;
      for(let day=1;day<=config.days.length;day++){
        for(const slot of slots){
          const placements=computeGroupPlacements(group,slot);
          if(!placements)continue;
          let blocker=false;
          for(const p of placements){
            const ac=getAvailConflicts(p.session,p.startTime,p.endTime,day);
            if(ac.some(c=>c.requiredInThis)){blocker=true;break;}
            const oc=getOverlapConflicts(p.session,p.startTime,p.endTime,day,schedule);
            if(oc.some(c=>c.isOwnerInThis||c.isOwnerInOther)){blocker=true;break;}
            p.conflicts=[...ac,...oc];
          }
          if(blocker)continue;
          const room=selectRoomForGroup(placements,day,schedule);
          if(!room)continue;
          const tc=placements.flatMap(p=>p.conflicts);
          const score=tc.filter(c=>c.requiredInThis).length*1000+tc.filter(c=>!c.requiredInThis).length;
          if(score<bestScore){bestScore=score;best={day,room,placements};}
          if(score===0)break;
        }
        if(best&&bestScore===0)break;
      }
      if(best){
        for(const p of best.placements){
          const rm=rooms.find(r=>r.id===best.room.id);
          schedule.push({id:p.session.id,topic:p.session.topic,owner:p.session.owner,ownerDomain:p.session.ownerDomain,day:best.day,startTime:minToTime(p.startTime),endTime:minToTime(p.endTime),room:best.room.id,roomName:best.room.name,roomFloor:rm?rm.floor:'',participantCount:p.session.participants.length,conflicts:p.conflicts,group:p.session.group});
          scheduledIds.add(p.session.id);
          if(p.conflicts.length>0)conflicts.push({sessionId:p.session.id,sessionTopic:p.session.topic,conflicts:p.conflicts});
        }
      }
    } else {
      let best=null, bestScore=Infinity;
      for(let day=1;day<=config.days.length;day++) {
        for(const slot of slots) {
          const end=slot+session.duration;
          if(!canFit(slot,session.duration))continue;
          const ac=getAvailConflicts(session,slot,end,day);
          if(ac.some(c=>c.requiredInThis))continue;
          const oc=getOverlapConflicts(session,slot,end,day,schedule);
          const all=[...ac,...oc];
          const ownerOL=oc.filter(c=>c.isOwnerInThis||c.isOwnerInOther).length;
          let pp=0;for(const p of session.participants){const pref=preferences.find(pr=>pr.person===p.name&&pr.type==='prefer-day');if(pref&&!pref.days.includes(day))pp++;}
          const sesPrefs=preferences.filter(pr=>pr.type==='prefer-session-time'&&pr.sessionId===session.id);
          let hardBlock=false;
          for(const sp of sesPrefs){const md=sp.days.includes(day);const ps=sp.startTime?timeToMin(sp.startTime):null;const pe=sp.endTime?timeToMin(sp.endTime):null;const tok=(ps===null||slot>=ps)&&(pe===null||end<=pe);const fits=md&&tok;if(sp.hard&&!fits){hardBlock=true;break;}if(!fits)pp+=5;}
          const nsdPrefs=preferences.filter(pr=>pr.type==='not-same-day'&&pr.sessions.includes(session.id));
          let sdp=0;for(const nsd of nsdPrefs){for(const oid of nsd.sessions.filter(id=>id!==session.id)){if(schedule.some(s=>s.id===oid&&s.day===day))sdp++;}}
          if(hardBlock)continue;
          const score=sdp*50000+ownerOL*10000+oc.filter(c=>c.requiredInThis).length*1000+all.filter(c=>!c.requiredInThis).length+pp*100;
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
}

// === UI HELPERS ===
function buildDomainColors() {
  domainColors={};
  const doms=[...new Set(sessions.map(s=>s.ownerDomain))];
  const FIXED_COLORS={'TM':'#E91E8C'};
  doms.forEach((d,i)=>{domainColors[d]=FIXED_COLORS[d]||PALETTE[i%PALETTE.length];});
}
function allParticipants() {
  const s=new Set(); sessions.forEach(se=>se.participants.forEach(p=>s.add(p.name))); return [...s].sort((a,b)=>a.localeCompare(b,'fi'));
}

function rebuildUI(rerunSchedule) {
  buildDomainColors();
  if(rerunSchedule) runScheduler();
  else if(!schedule.length) runScheduler();
  // Nav labels
  document.getElementById('btn-list').textContent=t('list');
  document.getElementById('btn-grid').textContent=t('grid');
  document.getElementById('btn-sessions').textContent=t('sessions');
  document.getElementById('btn-admin').textContent=t('settings');
  // Legend
  const doms=[...new Set(sessions.map(s=>s.ownerDomain))];
  document.getElementById('legend').innerHTML=doms.map(d=>'<div class="legend-item"><div class="legend-tooltip">'+(domainDescriptions[d]||d)+'</div><div class="legend-dot" style="background:'+domainColors[d]+'"></div>'+d+'</div>').join('');
  // Person dropdown
  const sel=document.getElementById('person-filter');
  const prev=sel.value; sel.innerHTML='<option value="">'+t('allPersons')+'</option>'+allParticipants().map(p=>'<option value="'+p+'">'+p+'</option>').join('')+'<option value="Aku Ankka">\\ud83e\\udd86 '+(lang==='en'?'Donald Duck':'Aku Ankka')+'</option>';
  sel.value=prev;
  document.getElementById('person-label').textContent=t('personFilter');
  document.getElementById('domain-label').textContent=t('domainFilter');
  document.getElementById('day-label').textContent=t('dayFilter');
  // Domain dropdown
  const domSel=document.getElementById('domain-filter');
  const prevDom=domSel.value; domSel.innerHTML='<option value="">'+t('allDomains')+'</option>'+doms.map(d=>'<option value="'+d+'">'+d+'</option>').join('');
  domSel.value=prevDom;
  // Day buttons
  const db=document.getElementById('day-buttons');
  db.innerHTML='<button class="day-btn'+(currentDay===0?' active':'')+'" data-day="0" onclick="selectDay(0)">'+t('all')+'</button>'+config.days.map(d=>'<button class="day-btn'+(d.day===currentDay?' active':'')+'" data-day="'+d.day+'" onclick="selectDay('+d.day+')">'+d.label+'</button>').join('');
  // Conflict count
  document.getElementById('btn-conflicts').textContent=t('conflicts')+(conflicts.length?' ('+conflicts.reduce((n,c)=>n+c.conflicts.length,0)+')':'');
  // Stats bar
  const activeSess=sessions.filter(s=>s.status!=='cancelled');
  const ap=allParticipants();
  const totalMin=activeSess.reduce((s,x)=>s+x.duration,0);
  const totalPersonMin=activeSess.reduce((s,x)=>s+x.duration*x.participants.length,0);
  const totalH=Math.round(totalMin/60);
  const totalPersonH=Math.round(totalPersonMin/60);
  document.getElementById('stats-bar').innerHTML=
    '<div class="stat-card"><div class="stat-label">\\ud83d\\udcc5 '+t('statsSessions')+'</div><div class="stat-value">'+activeSess.length+'</div><div class="stat-sub">'+config.days.length+' '+t('statsDays')+'</div></div>'+
    '<div class="stat-card"><div class="stat-label">\\u23f1 '+t('statsTime')+'</div><div class="stat-value">'+totalH+' '+t('h')+'</div><div class="stat-sub">'+t('statsCalTotal')+'</div></div>'+
    '<div class="stat-card"><div class="stat-label">\\ud83d\\udc65 '+t('statsParticipants')+'</div><div class="stat-value">'+ap.length+'</div><div class="stat-sub">'+t('statsUnique')+'</div></div>'+
    '<div class="stat-card"><div class="stat-label">\\ud83e\\udd1d '+t('statsHours')+'</div><div class="stat-value">'+totalPersonH+' '+t('h')+'</div><div class="stat-sub">'+t('statsWorkTotal')+'</div></div>';
  // Status
  document.getElementById('status-bar').innerHTML='<strong>'+schedule.length+'</strong>/'+sessions.length+' '+t('statusScheduled')+' \\u00b7 <strong>'+rooms.length+'</strong> '+t('statusRooms')+' \\u00b7 <strong>'+config.days.length+'</strong> '+t('statusDays')+' \\u00b7 <strong>'+ap.length+'</strong> '+t('statusPersons');
  render();
  if(typeof applyMode==='function')applyMode();
  if(typeof saveToLocal==='function')saveToLocal();
}

// === VIEW SWITCHING ===
function showView(v) {
  currentView=v;
  ['list','grid','conflicts','sessions','admin'].forEach(id=>{document.getElementById('view-'+id).classList.add('hidden');document.getElementById('btn-'+id).classList.remove('active');});
  document.getElementById('view-'+v).classList.remove('hidden'); document.getElementById('btn-'+v).classList.add('active');
  document.getElementById('stats-bar').style.display=(v==='list'||v==='sessions')?'grid':'none';
  document.getElementById('status-bar').style.display='none';
  document.getElementById('filter-bar').style.display=(v==='conflicts')?'none':'flex';
  if(v==='grid'&&currentDay===0){currentDay=1;document.querySelectorAll('.day-btn').forEach(b=>b.classList.toggle('active',+b.dataset.day===1));}
  document.querySelectorAll('.day-btn').forEach(b=>{if(+b.dataset.day===0){b.disabled=false;b.style.opacity=v==='grid'?'0.4':'';b.style.cursor=v==='grid'?'not-allowed':'pointer';b.style.pointerEvents='auto';}});
  render();
}
let disabledClicks=0;let disabledTimer=null;
function selectDay(d) {
  if(d===0&&currentView==='grid'){
    disabledClicks++;clearTimeout(disabledTimer);disabledTimer=setTimeout(function(){disabledClicks=0;},2000);
    if(disabledClicks>=3){
      disabledClicks=0;
      document.body.style.transition='transform 0.8s ease';
      document.body.style.transform='rotate(360deg)';
      var toast=document.getElementById('toast');
      if(toast){toast.textContent=t('eggSpin');toast.classList.add('show');setTimeout(function(){toast.classList.remove('show');},4500);}
      setTimeout(function(){document.body.style.transform='';setTimeout(function(){document.body.style.transition='';},800);},800);
    }
    return;
  }
  currentDay=d; document.querySelectorAll('.day-btn').forEach(b=>b.classList.toggle('active',+b.dataset.day===d)); render();
}
const DUCK_NAMES_FI=['Aku Ankka','Roope Ankka','Hannu Hanhi','Iines Ankka','Tupu','Hupu','Lupu','Hessu Hansen','Pelle Peloton','Magica de Spell','Kulta Ankka','Mummo Ankka'];
const DUCK_NAMES_EN=['Donald Duck','Scrooge McDuck','Gladstone Gander','Daisy Duck','Huey','Dewey','Louie','Goofy','Gyro Gearloose','Magica de Spell','Goldie O\\'Gilt','Grandma Duck'];
function duckNames(){return lang==='en'?DUCK_NAMES_EN:DUCK_NAMES_FI;}
let duckMode=false;
function filterPerson(n) {
  if(n==='Aku Ankka'){
    const toast=document.getElementById('toast');
    if(toast){toast.innerHTML=t('eggDuck');toast.classList.add('show');setTimeout(function(){toast.classList.remove('show');},5000);}
    duckMode=true;
    currentPerson='';render();
    document.querySelectorAll('.participant-chip, .owner-name, .list-card-owner').forEach(function(el){
      el.dataset.origText=el.textContent;
      el.textContent=duckNames()[Math.floor(Math.random()*duckNames().length)];
    });
    setTimeout(function(){
      duckMode=false;
      render();
    },6000);
    return;
  }
  currentPerson=n; render();
  if(n){
    const first=document.querySelector('.list-card.highlighted,.list-card.conflict');
    if(first)first.scrollIntoView({behavior:'smooth',block:'center'});
  }
}
function filterDomain(d) { currentDomain=d; render(); }

function getSessionParts(id) { const s=sessions.find(x=>x.id===id); return s?s.participants:[]; }
function isIn(id,name) { return getSessionParts(id).some(p=>p.name===name); }
function hasConf(id,name) { const e=schedule.find(s=>s.id===id); return e?e.conflicts.some(c=>c.person===name):false; }

// === RENDER VIEWS ===
function render() {
  if(currentView==='list')renderList(); else if(currentView==='grid')renderGrid(); else if(currentView==='conflicts')renderConflicts(); else if(currentView==='sessions')renderSessions(); else if(currentView==='admin')renderAdmin();
}

function renderList() {
  const el=document.getElementById('view-list'); let h='';
  const daysToShow=currentDay>0?config.days.filter(d=>d.day===currentDay):config.days;
  for(const day of daysToShow) {
    const ds=schedule.filter(s=>s.day===day.day&&(!currentDomain||s.ownerDomain===currentDomain)).sort((a,b)=>a.startTime.localeCompare(b.startTime));
    if(!ds.length)continue;
    h+='<div class="day-group"><h2>'+day.label+(day.date?' — '+day.date:'')+'</h2>';
    for(const s of ds) {
      const sess=sessions.find(x=>x.id===s.id);
      const isInternal=sess&&sess.status==='internal';
      let cls='list-card';
      if(isInternal)cls+=' is-internal';
      if(currentPerson){if(isIn(s.id,currentPerson)){cls+=hasConf(s.id,currentPerson)?' conflict':' highlighted';}else cls+=' dimmed';}
      const dc=domainColors[s.ownerDomain]||'#999';
      h+='<div class="'+cls+'" style="border-left-color:'+dc+'">';
      const dur=timeToMin(s.endTime)-timeToMin(s.startTime);
      h+='<div class="list-card-time"><span class="time-start">'+s.startTime+'</span><span class="time-end">'+s.endTime+'</span><span class="time-dur">'+dur+' '+t('min')+'</span><span class="domain-badge" style="background:'+dc+';font-size:0.6rem;padding:0.1rem 0.35rem;">'+s.ownerDomain+'</span></div>';
      h+='<div class="list-card-header">';
      h+='<span class="list-card-title">'+schedTopicText(s)+'</span>';
      if(isInternal)h+='<span class="status-badge st-internal">'+t('statusInternal')+'</span>';
      h+='</div>';
      const parts=getSessionParts(s.id);
      const roomLabel=(s.roomFloor?s.roomFloor+' ':'')+s.roomName;
      h+='<div class="list-card-meta">';
      h+='<span>\\ud83d\\udccd '+roomLabel+'</span>';
      h+='<span>\\ud83d\\udc65 '+parts.length+' '+t('ppl')+'</span>';
      h+='<span>'+t('owner')+': '+s.owner+'</span>';
      h+='</div>';
      if(parts.length){
        h+='<div class="list-card-participants">';
        h+=parts.map(p=>{
          let cc='participant-chip';
          if(p.name===s.owner)cc+=' is-owner';
          if(!p.required)cc+=' nice-to-have';
          if(currentPerson&&p.name===currentPerson)cc+=' is-selected';
          const col=nameColor(p.name);
          const crown=p.name===s.owner?'\\ud83d\\udc51 ':'';
          return '<div class="'+cc+'"><span class="p-avatar" style="background:'+col+'">'+getInitials(p.name)+'</span><span>'+crown+p.name+'</span></div>';
        }).join('');
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
  const gridDay=currentDay||1;
  const ds=timeToMin(config.dayStartTime),de=timeToMin(config.dayEndTime),ls=timeToMin(config.lunchStart),le=timeToMin(config.lunchEnd),g=config.slotGranularity;
  const slots=[]; for(let t=ds;t<de;t+=g)slots.push(t);
  const dayS=schedule.filter(s=>s.day===gridDay);
  const usedRoomIds=new Set(dayS.map(s=>s.room));
  const dayRooms=rooms.filter(r=>(!r.availableDays||r.availableDays.includes(gridDay))&&usedRoomIds.has(r.id));
  const rc=dayRooms.length;
  let h='<div class="timetable" style="grid-template-columns:60px repeat('+rc+',1fr)">';
  h+='<div class="room-header"></div>'; dayRooms.forEach(r=>{h+='<div class="room-header">'+r.name+'<br><small>'+r.floor+' \\u00b7 '+r.capacity+' '+t('ppl')+'</small></div>';});
  for(const slot of slots) {
    const ts=minToTime(slot);
    const is30=slot%30===0;
    const sc=is30?' slot-30':'';
    if(slot>=ls&&slot<le){h+='<div class="time-label'+sc+'">'+(is30?ts:'')+'</div>';for(let i=0;i<rc;i++)h+='<div class="lunch-row'+sc+'">'+(slot===ls?t('lunch'):'')+'</div>';continue;}
    h+='<div class="time-label'+sc+'">'+(is30?ts:'')+'</div>';
    for(const room of dayRooms) {
      h+='<div class="cell'+sc+'">';
      const sh=dayS.find(s=>s.room===room.id&&timeToMin(s.startTime)===slot);
      if(sh) {
        const dur=timeToMin(sh.endTime)-timeToMin(sh.startTime), hs=dur/g, ht=(hs*40)-2, col=domainColors[sh.ownerDomain]||'#999';
        const topicLines=dur<=30?1:dur<=60?2:dur<=90?3:5;
        let c='session-block';
        if(currentDomain&&sh.ownerDomain!==currentDomain)c+=' dimmed';
        else if(currentPerson){if(isIn(sh.id,currentPerson)){c+=hasConf(sh.id,currentPerson)?' conflict':' highlighted';}else c+=' dimmed';}
        h+='<div class="'+c+'" style="height:'+ht+'px;background:'+col+'18;border-left-color:'+col+';--topic-lines:'+topicLines+'" onclick="showBlockPopup(event,\\''+sh.id+'\\')">';
        h+='<div class="block-topic" title="'+escHtml(schedTopicText(sh))+'">'+schedTopicText(sh)+'</div>';
        h+='<div class="block-time">'+sh.startTime+'\\u2013'+sh.endTime+'</div>';
        h+='<div class="block-meta"><span class="domain-badge" style="background:'+col+'">'+sh.ownerDomain+'</span><span>\\ud83d\\udc65'+sh.participantCount+'</span></div>';
        h+='<div style="font-size:0.55rem;opacity:0.7;margin-top:1px;">'+sh.owner+'</div>';
        h+='</div>';
      }
      h+='</div>';
    }
  }
  h+='</div>'; el.innerHTML=h;
}

function renderConflicts() {
  const el=document.getElementById('view-conflicts');
  if(!conflicts.length){el.innerHTML='<p style="text-align:center;color:var(--text-muted);padding:2rem;">'+t('noConflicts')+'</p>';return;}
  const reqCount=conflicts.reduce((n,c)=>n+c.conflicts.filter(x=>x.requiredInThis).length,0);
  const optCount=conflicts.reduce((n,c)=>n+c.conflicts.filter(x=>!x.requiredInThis).length,0);
  let h='<div id="conflict-summary" style="margin-bottom:1rem;text-align:center;cursor:default;" onclick="thisIsFineClick()"><strong>'+reqCount+'</strong> '+t('reqConflicts')+' \\u00b7 <strong>'+optCount+'</strong> '+t('nthConflicts')+'</div>';
  for(const c of conflicts) {
    h+='<div class="conflict-card"><h3>'+c.sessionTopic+'</h3><ul>';
    for(const cf of c.conflicts) {
      let detail='';
      if(cf.type==='availability')detail=cf.reason+' ('+cf.constraintStart+'\\u2013'+cf.constraintEnd+')';
      else detail=t('overlapWith')+': \\u201c'+cf.otherSessionTopic+'\\u201d';
      h+='<li><strong>'+cf.person+'</strong> ('+cf.domain+') \\u2014 '+detail+'</li>';
    }
    h+='</ul></div>';
  }
  el.innerHTML=h;
}

function renderAdmin() {
  const el=document.getElementById('view-admin');
  let h='';

  h+='<div style="margin-bottom:1.5rem;"><button style="width:100%;padding:0.75rem;background:#27AE60;color:white;border:none;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;" onclick="rebuildUI(true);showToast(\\'Aikataulu rakennettu uudelleen!\\')">&#x21bb; Aikatauluta kaikki uudelleen</button></div>';

  // Säännöt
  h+='<div class="admin-section"><h2>Aikataulutussäännöt</h2>';
  h+='<ol class="rules-list">';
  h+='<li><span class="rule-num">1.</span> <strong>Pakollisten osallistujien esteet</strong> — jos pakollinen osallistuja on merkitty estyneeksi, sessiota EI sijoiteta tälle ajalle.</li>';
  h+='<li><span class="rule-num">2.</span> <strong>Pakollisten päällekkäisyydet</strong> — pakollinen henkilö ei saa olla kahdessa sessiossa yhtä aikaa.</li>';
  h+='<li><span class="rule-num">3.</span> <strong>Neukkarikapasiteetti</strong> — isoimmat sessiot (eniten osallistujia) isoimpiin neukkareihin.</li>';
  h+='<li><span class="rule-num">4.</span> <strong>Prioriteettijärjestys</strong> — korkeamman prioriteetin sessiot sijoitetaan ensin.</li>';
  h+='<li><span class="rule-num">5.</span> <strong>Toivotut osallistujat</strong> — minimoidaan päällekkäisyyksiä, mutta sallitaan tarvittaessa.</li>';
  h+='<li><span class="rule-num">6.</span> <strong>"Ei tarvita" -sessiot</strong> — merkittyjä sessioita ei aikatauluteta lainkaan.</li>';
  h+='<li><span class="rule-num">7.</span> <strong>Domainin sisäiset sessiot</strong> — sijoitetaan viimeisenä, kun kaikki muut sessiot on ensin aikataulutettu.</li>';
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
  h+='<div class="form-row"><label>Päivä alkaa</label><input type="time" value="'+config.dayStartTime+'" onchange="config.dayStartTime=this.value;rebuildUI(true)"></div>';
  h+='<div class="form-row"><label>Päivä loppuu</label><input type="time" value="'+config.dayEndTime+'" onchange="config.dayEndTime=this.value;rebuildUI(true)"></div>';
  h+='<div class="form-row"><label>Lounas alkaa</label><input type="time" value="'+config.lunchStart+'" onchange="config.lunchStart=this.value;rebuildUI(true)"></div>';
  h+='<div class="form-row"><label>Lounas loppuu</label><input type="time" value="'+config.lunchEnd+'" onchange="config.lunchEnd=this.value;rebuildUI(true)"></div>';
  h+='<div class="form-row"><label>Tauko (min)</label><input type="number" value="'+config.breakBetweenSessions+'" min="0" max="60" onchange="config.breakBetweenSessions=+this.value;rebuildUI(true)"></div>';
  h+='</div>';

  // Neukkarit
  h+='<div class="admin-section"><h2>Neukkarit ('+rooms.length+')</h2>';
  h+='<table class="admin-table"><thead><tr><th>Kerros</th><th>Nimi</th><th>Hlö</th><th>Käytössä</th><th></th></tr></thead><tbody>';
  rooms.forEach((r,i)=>{
    const days=r.availableDays||config.days.map(d=>d.day);
    const dayLabels=days.map(d=>{const dd=config.days.find(x=>x.day===d);return dd?dd.label:'P'+d;}).join(', ');
    h+='<tr>';
    h+='<td><input type="text" value="'+(r.floor||'')+'" onchange="rooms['+i+'].floor=this.value;rebuildUI(true)" style="width:50px;border:1px solid var(--border);padding:0.3rem;border-radius:3px;"></td>';
    h+='<td><input type="text" value="'+r.name+'" onchange="rooms['+i+'].name=this.value;rebuildUI(true)" style="width:100%;border:1px solid var(--border);padding:0.3rem;border-radius:3px;"></td>';
    h+='<td><input type="number" value="'+r.capacity+'" min="1" onchange="rooms['+i+'].capacity=+this.value;rebuildUI(true)" style="width:55px;border:1px solid var(--border);padding:0.3rem;border-radius:3px;"></td>';
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

  // Päivätoiveet
  h+='<div class="admin-section"><h2>Päivätoiveet</h2>';
  h+='<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.75rem;">Pehmeitä toiveita jotka ohjaavat algoritmia sijoittamaan henkilön sessiot toivotuille päiville. Ei estä muita päiviä, mutta suosii toivottuja.</p>';
  if(preferences.length) {
    h+='<table class="admin-table"><thead><tr><th>Henkilö</th><th>Toivotut päivät</th><th>Syy</th><th></th></tr></thead><tbody>';
    preferences.forEach((p,i)=>{
      const dayLabels=(p.days||[]).map(d=>{const dd=config.days.find(x=>x.day===d);return dd?dd.label:'Päivä '+d;}).join(', ');
      h+='<tr><td>'+p.person+'</td><td>'+dayLabels+'</td><td style="font-size:0.8rem;color:var(--text-muted);">'+(p.reason||'')+'</td>';
      h+='<td><button class="btn btn-danger" onclick="removePreference('+i+')">Poista</button></td></tr>';
    });
    h+='</tbody></table>';
  }
  h+='<h3>Lisää toive</h3>';
  h+='<div class="form-row">';
  h+='<select id="pref-person">'+allParticipants().map(p=>'<option>'+p+'</option>').join('')+'</select>';
  h+='<div style="display:flex;gap:0.5rem;align-items:center;">';
  config.days.forEach(d=>{h+='<label style="font-size:0.85rem;display:flex;align-items:center;gap:0.2rem;"><input type="checkbox" class="pref-day-cb" value="'+d.day+'"> '+d.label+'</label>';});
  h+='</div>';
  h+='<input type="text" id="pref-reason" placeholder="Syy (valinnainen)">';
  h+='<button class="btn btn-primary" onclick="addPreference()">Lisää</button>';
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
  h+='<button class="btn" onclick="exportFile(\\'preferences.json\\',JSON.stringify(preferences,null,2))">Vie toiveet (preferences.json)</button>';
  h+='</div>';
  h+='<div style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border)">';
  h+='<p style="margin-bottom:0.5rem">Tai tuo aiemmin viedyt tiedostot:</p>';
  h+='<div class="export-buttons">';
  h+='<button class="btn" onclick="importFile(\\'sessions\\')">Tuo sessiot</button>';
  h+='<button class="btn" onclick="importFile(\\'rooms\\')">Tuo neukkarit</button>';
  h+='<button class="btn" onclick="importFile(\\'constraints\\')">Tuo esteet</button>';
  h+='<button class="btn" onclick="importFile(\\'preferences\\')">Tuo toiveet</button>';
  h+='</div>';
  h+='</div>';
  h+='<div style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border)">';
  h+='<p style="margin-bottom:0.5rem;font-size:0.85rem;color:var(--text-muted);">Muutokset tallentuvat automaattisesti selaimen muistiin (localStorage). Jos haluat palauttaa alkuperäiset tiedot:</p>';
  h+='<button class="btn btn-danger" onclick="if(confirm(\\'Palautetaanko kaikki alkuperäiset tiedot? Selaimessa tehdyt muutokset katoavat.\\'))clearLocalData()">Palauta oletusdata</button>';
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

    h+='<div class="session-card'+(isOpen?' open':'')+(isNew?' just-added':'')+(s.status==='cancelled'?' is-cancelled':'')+'" id="card-'+s.id+'" style="border-left:4px solid '+dc+'">';

    h+='<div class="session-card-header" onclick="toggleSession(\\''+s.id+'\\')">';
    h+='<span class="sc-domain" style="background:'+dc+'">'+(s.ownerDomain||'–')+'</span>';
    h+='<div class="sc-main">';
    h+='<span class="sc-title">'+escHtml(s.topic)+'</span>';
    h+='<span class="sc-subtitle">';
    h+='<span>'+escHtml(s.owner)+'</span>';
    h+='<span>'+s.participants.length+' hlö</span>';
    h+='<span>'+s.duration+' min</span>';
    if(s.priority<99)h+='<span>Prio '+s.priority+'</span>';
    if(s.status==='cancelled')h+='<span class="status-badge st-cancelled">'+t('statusCancelled')+'</span>';
    if(s.status==='internal')h+='<span class="status-badge st-internal">'+t('statusInternal')+'</span>';
    if(s.locked)h+='<span style="font-size:0.75rem;opacity:0.7;" title="Lukittu aikataulu">\\ud83d\\udd12</span>';
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
    h+='<div class="sc-field"><label>'+t('statusLabel')+'</label><select onchange="updateSession('+si+',\\'status\\',this.value)"><option value="active"'+((!s.status||s.status==='active')?' selected':'')+'>'+t('statusActive')+'</option><option value="internal"'+(s.status==='internal'?' selected':'')+'>'+t('statusInternal')+'</option><option value="cancelled"'+(s.status==='cancelled'?' selected':'')+'>'+t('statusCancelled')+'</option></select></div>';
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
      h+='<td><button class="toggle-required '+(p.required?'on':'off')+'" onclick="toggleRequired('+si+','+pi+')">'+(p.required?'Pakollinen':'Toivottu')+'</button></td>';
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

    // Aikataulutus (admin)
    h+='<div class="admin-only admin-block" style="margin-top:0.75rem;padding:0.75rem;background:#f8f9fa;border-radius:6px;border:1px solid var(--border)">';
    h+='<h3 style="font-size:0.9rem;margin-bottom:0.5rem;">Aikataulutus</h3>';
    if(scheduled){
      const dl=config.days.find(d=>d.day===scheduled.day);
      h+='<p style="font-size:0.85rem;margin-bottom:0.5rem;color:var(--text-muted)">Nyt: <strong>'+(dl?dl.label:'Päivä '+scheduled.day)+' '+scheduled.startTime+'–'+scheduled.endTime+'</strong>, '+(scheduled.roomFloor?scheduled.roomFloor+' ':'')+scheduled.roomName+'</p>';
    } else {
      h+='<p style="font-size:0.85rem;margin-bottom:0.5rem;color:var(--text-muted);font-style:italic">Ei vielä aikataulutettu</p>';
    }
    h+='<div class="form-row" style="margin-bottom:0.5rem">';
    h+='<select id="move-day-'+si+'" style="padding:0.35rem;border:1px solid var(--border);border-radius:4px;font-size:0.85rem" onchange="updateMoveRooms('+si+')">';
    config.days.forEach(d=>{h+='<option value="'+d.day+'"'+(scheduled&&scheduled.day===d.day?' selected':'')+'>'+d.label+'</option>';});
    h+='</select>';
    h+='<select id="move-time-'+si+'" style="padding:0.35rem;border:1px solid var(--border);border-radius:4px;font-size:0.85rem">';
    const moveSlots=buildTimeSlots();
    moveSlots.forEach(sl=>{const t=minToTime(sl);h+='<option value="'+t+'"'+(scheduled&&scheduled.startTime===t?' selected':'')+'>'+t+'</option>';});
    h+='</select>';
    h+='<select id="move-room-'+si+'" style="padding:0.35rem;border:1px solid var(--border);border-radius:4px;font-size:0.85rem;min-width:140px">';
    const moveDay=scheduled?scheduled.day:config.days[0].day;
    const maf=config.activeFloors;
    const dayRooms=rooms.filter(r=>(!r.availableDays||r.availableDays.includes(moveDay))&&(!maf||!maf.length||maf.includes(r.floor)));
    dayRooms.forEach(r=>{h+='<option value="'+r.id+'"'+(scheduled&&scheduled.room===r.id?' selected':'')+'>'+(r.floor?r.floor+' ':'')+ r.name+' ('+r.capacity+'P)</option>';});
    h+='</select>';
    h+='<button class="btn btn-primary" onclick="moveSession('+si+')">Siirrä manuaalisesti</button>';
    h+='<button class="btn btn-success" onclick="autoScheduleOne('+si+')">&#x21bb; Aikatauluta automaattisesti</button>';
    h+='</div>';
    h+='<div id="move-conflicts-'+si+'" style="font-size:0.8rem"></div>';
    h+='</div>';

    h+='<div class="session-card-actions" style="display:flex;gap:0.5rem;align-items:center;">';
    h+='<button class="btn '+(s.locked?'btn-primary':'btn-secondary')+'" onclick="toggleLock('+si+')">'+(s.locked?'\\ud83d\\udd12 Lukittu':'\\ud83d\\udd13 Lukitse aikataulu')+'</button>';
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

function updateMoveRooms(si){
  const dayVal=+document.getElementById('move-day-'+si).value;
  const sel=document.getElementById('move-room-'+si);
  const prev=sel.value;
  const uaf=config.activeFloors;
  const dr=rooms.filter(r=>(!r.availableDays||r.availableDays.includes(dayVal))&&(!uaf||!uaf.length||uaf.includes(r.floor)));
  sel.innerHTML=dr.map(r=>'<option value="'+r.id+'">'+(r.floor?r.floor+' ':'')+r.name+' ('+r.capacity+'P)</option>').join('');
  if(dr.some(r=>r.id===prev))sel.value=prev;
}

function moveSession(si){
  const s=sessions[si];
  const day=+document.getElementById('move-day-'+si).value;
  const startTime=document.getElementById('move-time-'+si).value;
  const roomId=document.getElementById('move-room-'+si).value;
  const endTime=minToTime(timeToMin(startTime)+s.duration);
  const room=rooms.find(r=>r.id===roomId);
  if(!room){alert('Neukkaria ei löydy');return;}

  const start=timeToMin(startTime), end=timeToMin(endTime);
  if(!canFit(start,s.duration)){alert('Sessio ei mahdu valittuun aikaan (ylittää päivän lopun tai osuu lounaalle)');return;}

  const ac=getAvailConflicts(s,start,end,day);
  const schedWithout=schedule.filter(x=>x.id!==s.id);
  const oc=getOverlapConflicts(s,start,end,day,schedWithout);
  const allC=[...ac,...oc];

  const reqConflicts=allC.filter(c=>c.requiredInThis);
  if(reqConflicts.length>0){
    const names=reqConflicts.map(c=>c.person+' ('+(c.type==='availability'?c.reason:'päällekkäin: '+c.otherSessionTopic)+')').join('\\n');
    if(!confirm('Pakollisilla osallistujilla on konflikteja:\\n\\n'+names+'\\n\\nSiirretäänkö silti?'))return;
  }

  const existing=schedule.findIndex(x=>x.id===s.id);
  const entry={id:s.id,topic:s.topic,owner:s.owner,ownerDomain:s.ownerDomain,day:day,startTime:startTime,endTime:endTime,room:roomId,roomName:room.name,roomFloor:room.floor||'',participantCount:s.participants.length,conflicts:allC};
  if(existing>=0)schedule[existing]=entry; else schedule.push(entry);

  conflicts=[];
  for(const sc of schedule){if(sc.conflicts&&sc.conflicts.length>0)conflicts.push({sessionId:sc.id,sessionTopic:sc.topic,conflicts:sc.conflicts});}

  const el=document.getElementById('move-conflicts-'+si);
  if(allC.length>0){
    el.innerHTML='<div style="margin-top:0.5rem;padding:0.5rem;background:var(--conflict-bg);border-radius:4px;"><strong>Konfliktit:</strong><ul style="margin:0.25rem 0 0 1rem;">'+allC.map(c=>'<li>'+c.person+' — '+(c.type==='availability'?c.reason:'päällekkäin: '+c.otherSessionTopic)+(c.requiredInThis?' <span class="badge required">PAKOLLINEN</span>':' <span class="badge optional">TOIVOTTU</span>')+'</li>').join('')+'</ul></div>';
  } else { el.innerHTML='<div style="margin-top:0.5rem;color:#27AE60;font-weight:600;">&#10003; Ei konflikteja</div>'; }

  buildDomainColors();
  document.getElementById('btn-conflicts').textContent='Päällekkäisyydet'+(conflicts.length?' ('+conflicts.reduce((n,c)=>n+c.conflicts.length,0)+')':'');
  document.getElementById('status-bar').innerHTML='<strong>'+schedule.length+'</strong>/'+sessions.length+' sessiota aikataulutettu · <strong>'+rooms.length+'</strong> neukkaria · <strong>'+config.days.length+'</strong> päivää · <strong>'+allParticipants().length+'</strong> henkilöä';
  showToast(s.topic+' siirretty!');
  renderSessions();
}

function autoScheduleOne(si){
  const s=sessions[si];
  if(!s.participants.length){alert('Sessiolla ei ole osallistujia — ei voi aikatauluttaa');return;}
  const schedWithout=schedule.filter(x=>x.id!==s.id);
  const slots=buildTimeSlots();
  let best=null, bestScore=Infinity;
  for(let day=1;day<=config.days.length;day++){
    for(const slot of slots){
      const end=slot+s.duration;
      if(!canFit(slot,s.duration))continue;
      const ac=getAvailConflicts(s,slot,end,day);
      if(ac.some(c=>c.requiredInThis))continue;
      const oc=getOverlapConflicts(s,slot,end,day,schedWithout);
      const all=[...ac,...oc];
      const ownerOL=oc.filter(c=>c.isOwnerInThis||c.isOwnerInOther).length;
      let pp=0;for(const p of s.participants){const pref=preferences.find(pr=>pr.person===p.name&&pr.type==='prefer-day');if(pref&&!pref.days.includes(day))pp++;}
      const sesPrefs2=preferences.filter(pr=>pr.type==='prefer-session-time'&&pr.sessionId===s.id);
      let hardBlock2=false;
      for(const sp of sesPrefs2){const md=sp.days.includes(day);const ps=sp.startTime?timeToMin(sp.startTime):null;const pe=sp.endTime?timeToMin(sp.endTime):null;const tok=(ps===null||slot>=ps)&&(pe===null||end<=pe);const fits=md&&tok;if(sp.hard&&!fits){hardBlock2=true;break;}if(!fits)pp+=5;}
      if(hardBlock2)continue;
      const score=ownerOL*10000+oc.filter(c=>c.requiredInThis).length*1000+all.filter(c=>!c.requiredInThis).length+pp*100;
      const afr=config.activeFloors;
      const dr=rooms.filter(r=>(!r.availableDays||r.availableDays.includes(day))&&(!afr||!afr.length||afr.includes(r.floor)));
      const sr=[...dr].sort((a,b)=>b.capacity-a.capacity);
      let room=null;
      for(const r of sr){if(r.capacity<s.participants.length)continue;if(!schedWithout.some(x=>x.day===day&&x.room===r.id&&timeToMin(x.startTime)<end&&timeToMin(x.endTime)>slot)){room=r;break;}}
      if(!room)for(const r of sr){if(!schedWithout.some(x=>x.day===day&&x.room===r.id&&timeToMin(x.startTime)<end&&timeToMin(x.endTime)>slot)){room=r;break;}}
      if(!room)continue;
      if(score<bestScore){bestScore=score;best={day,startTime:minToTime(slot),endTime:minToTime(end),room:room.id,roomName:room.name,roomFloor:room.floor||'',conflicts:all};}
      if(score===0)break;
    }
    if(best&&bestScore===0)break;
  }
  if(!best){alert('Ei löytynyt sopivaa aikaa sessiolle');return;}
  const existing=schedule.findIndex(x=>x.id===s.id);
  const entry={id:s.id,topic:s.topic,owner:s.owner,ownerDomain:s.ownerDomain,day:best.day,startTime:best.startTime,endTime:best.endTime,room:best.room,roomName:best.roomName,roomFloor:best.roomFloor,participantCount:s.participants.length,conflicts:best.conflicts};
  if(existing>=0)schedule[existing]=entry;else schedule.push(entry);
  conflicts=[];for(const sc of schedule){if(sc.conflicts&&sc.conflicts.length>0)conflicts.push({sessionId:sc.id,sessionTopic:sc.topic,conflicts:sc.conflicts});}
  const dl=config.days.find(d=>d.day===best.day);
  showToast(s.topic+' → '+(dl?dl.label:'Päivä '+best.day)+' '+best.startTime+', '+best.roomName);
  buildDomainColors();
  document.getElementById('btn-conflicts').textContent='Päällekkäisyydet'+(conflicts.length?' ('+conflicts.reduce((n,c)=>n+c.conflicts.length,0)+')':'');
  document.getElementById('status-bar').innerHTML='<strong>'+schedule.length+'</strong>/'+sessions.length+' sessiota aikataulutettu · <strong>'+rooms.length+'</strong> neukkaria · <strong>'+config.days.length+'</strong> päivää · <strong>'+allParticipants().length+'</strong> henkilöä';
  renderSessions();
}

function toggleLock(si){
  sessions[si].locked=!sessions[si].locked;
  const msg=sessions[si].locked?'\\ud83d\\udd12 Sessio lukittu — aikataulu säilyy seuraavassa ajossa':'\\ud83d\\udd13 Lukitus poistettu';
  showToast(msg);
  renderSessions();
}
function updateSession(si,field,val){sessions[si][field]=val;rebuildUI(true);}

function toggleRequired(si,pi){sessions[si].participants[pi].required=!sessions[si].participants[pi].required;rebuildUI(true);}

function updateParticipant(si,pi,field,val){sessions[si].participants[pi][field]=val;rebuildUI(true);}

function removeParticipant(si,pi){sessions[si].participants.splice(pi,1);rebuildUI(true);}

function addParticipant(si){
  const nameEl=document.getElementById('new-p-name-'+si);
  const domEl=document.getElementById('new-p-domain-'+si);
  const name=nameEl.value.trim(), domain=domEl.value.trim();
  if(!name)return;
  sessions[si].participants.push({name:name,domain:domain||sessions[si].ownerDomain,required:true});
  rebuildUI(true);
}

function addSession(){
  const id='session-new-'+Date.now();
  sessions.unshift({id:id,topic:'Uusi sessio',owner:'',ownerDomain:'',duration:60,priority:99,participants:[]});
  openSessionId=id;
  justAddedId=id;
  rebuildUI(true);
}

function removeSession(si){
  if(!confirm('Poistetaanko sessio "'+sessions[si].topic+'"?'))return;
  if(openSessionId===sessions[si].id)openSessionId=null;
  sessions.splice(si,1);
  rebuildUI(true);
}

// === ADMIN ACTIONS ===
function updateDay(i,val){config.days[i].date=val;rebuildUI(true);}
function updateDayLabel(i,val){config.days[i].label=val;rebuildUI(true);}
function addDay(){const n=config.days.length+1;config.days.push({day:n,date:'',label:'Päivä '+n});rebuildUI(true);}
function removeDay(i){config.days.splice(i,1);config.days.forEach((d,j)=>{d.day=j+1;});rebuildUI(true);}
function addRoom(){const n=rooms.length+1;rooms.push({id:'room-'+n,name:'Neukkari '+n,floor:'',capacity:10,availableDays:config.days.map(d=>d.day)});rebuildUI(true);}
function removeRoom(i){rooms.splice(i,1);rebuildUI(true);}
function addConstraint(){
  const p=document.getElementById('c-person').value,d=+document.getElementById('c-day').value,s=document.getElementById('c-start').value,e=document.getElementById('c-end').value,r=document.getElementById('c-reason').value;
  if(p&&d&&s&&e)constraints.push({person:p,day:d,startTime:s,endTime:e,reason:r});
  rebuildUI(true);
}
function removeConstraint(i){constraints.splice(i,1);rebuildUI(true);}
function addPreference(){
  const p=document.getElementById('pref-person').value;
  const days=[...document.querySelectorAll('.pref-day-cb:checked')].map(cb=>+cb.value);
  const r=document.getElementById('pref-reason').value;
  if(p&&days.length)preferences.push({person:p,type:'prefer-day',days:days,reason:r});
  rebuildUI(true);
}
function removePreference(i){preferences.splice(i,1);rebuildUI(true);}

// === GRID POPUP ===
function showBlockPopup(ev,id){
  ev.stopPropagation();
  const s=sessions.find(x=>x.id===id); if(!s)return;
  const sc=schedule.find(x=>x.id===id);
  const dc=domainColors[s.ownerDomain]||'#999';
  let h='<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">';
  h+='<div><span class="domain-badge" style="background:'+dc+'">'+s.ownerDomain+'</span></div>';
  h+='<button onclick="closeBlockPopup()" style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:var(--text-muted);padding:0 0.25rem;">\\u2715</button>';
  h+='</div>';
  h+='<div style="font-weight:600;font-size:1rem;margin-bottom:0.35rem;">'+topicText(s)+'</div>';
  if(sc){h+='<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.5rem;">\\u23f1 '+sc.startTime+'\\u2013'+sc.endTime+' \\u00b7 '+s.duration+' '+t('min')+' \\u00b7 \\ud83d\\udccd '+(sc.roomFloor?sc.roomFloor+' ':'')+sc.roomName+'</div>';}
  h+='<div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.5rem;">'+t('owner')+': <strong>'+s.owner+'</strong></div>';
  h+='<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.35rem;">\\ud83d\\udc65 '+s.participants.length+' '+t('ppl')+'</div>';
  h+='<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">';
  for(const p of s.participants){
    const col=nameColor(p.name);
    let cc='participant-chip';if(p.name===s.owner)cc+=' is-owner';if(!p.required)cc+=' nice-to-have';
    h+='<div class="'+cc+'"><span class="p-avatar" style="background:'+col+'">'+getInitials(p.name)+'</span><span>'+(p.name===s.owner?'\\ud83d\\udc51 ':'')+p.name+'</span></div>';
  }
  h+='</div>';
  const popup=document.getElementById('block-popup');
  popup.innerHTML=h;
  popup.style.display='block';
  document.getElementById('popup-overlay').style.display='block';
  const rect=ev.currentTarget.getBoundingClientRect();
  let left=rect.right+8, top=rect.top;
  if(left+400>window.innerWidth)left=rect.left-408;
  if(left<8)left=8;
  if(top+300>window.innerHeight)top=window.innerHeight-310;
  if(top<8)top=8;
  popup.style.left=left+'px'; popup.style.top=top+'px';
}
function closeBlockPopup(){
  document.getElementById('block-popup').style.display='none';
  document.getElementById('popup-overlay').style.display='none';
}

// === LOCAL STORAGE PERSISTENCE ===
const LS_KEY='sesonki-data';
const LS_VER_KEY='sesonki-build';
function saveToLocal(){
  localStorage.setItem(LS_KEY,JSON.stringify({constraints:constraints,preferences:preferences,sessions:sessions,config:config,rooms:rooms}));
  localStorage.setItem(LS_VER_KEY,BUILD_VERSION);
}
function loadFromLocal(){
  const savedVer=localStorage.getItem(LS_VER_KEY);
  if(savedVer!==BUILD_VERSION){localStorage.removeItem(LS_KEY);localStorage.removeItem(LS_VER_KEY);return false;}
  const raw=localStorage.getItem(LS_KEY);
  if(!raw)return false;
  try{
    const d=JSON.parse(raw);
    if(d.constraints)constraints=d.constraints;
    if(d.preferences)preferences=d.preferences;
    if(d.sessions)sessions=d.sessions;
    if(d.config)config=d.config;
    if(d.rooms)rooms=d.rooms;
    return true;
  }catch(e){return false;}
}
function clearLocalData(){
  localStorage.removeItem(LS_KEY);
  sessions=JSON.parse(document.getElementById('init-sessions').textContent);
  config=JSON.parse(document.getElementById('init-config').textContent);
  rooms=JSON.parse(document.getElementById('init-rooms').textContent);
  constraints=JSON.parse(document.getElementById('init-constraints').textContent);
  preferences=JSON.parse(document.getElementById('init-preferences').textContent);
  rebuildUI(true);
  showToast('Palautettu oletusdata');
}

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
  const files={'input.json':buildInputJson(),'rooms.json':buildRoomsJson(),'constraints.json':JSON.stringify(constraints,null,2),'preferences.json':JSON.stringify(preferences,null,2),'schedule.json':JSON.stringify({schedule:schedule,conflicts:conflicts},null,2)};
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
        else if(target==='preferences'){preferences=data;showToast('Toiveet tuotu ('+preferences.length+')');}
        rebuildUI(true);
      }catch(e){alert('Tiedoston luku epäonnistui: '+e.message);}
    };
    reader.readAsText(file);
  };
  input.click();
}

// === PASSWORD & MODE ===
const VIEW_HASH = '${createHash('sha256').update('b2bplanning').digest('hex')}';
const ADMIN_HASH = '${createHash('sha256').update('b2bplanningadmin').digest('hex')}';
let isAdmin = false;

async function sha256(str){
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function checkPw(){
  const val=document.getElementById('pw-input').value;
  const hash=await sha256(val);
  if(hash===ADMIN_HASH){isAdmin=true;sessionStorage.setItem('sesonki-mode','admin');unlock();}
  else if(hash===VIEW_HASH){isAdmin=false;sessionStorage.setItem('sesonki-mode','view');unlock();}
  else{document.getElementById('pw-error').style.display='block';document.getElementById('pw-input').value='';document.getElementById('pw-input').focus();}
}
function unlock(){
  document.getElementById('login-gate').style.display='none';
  document.getElementById('app-content').style.display='block';
  document.body.classList.add('has-bg');
  document.getElementById('lang-fi').classList.toggle('active',lang==='fi');
  document.getElementById('lang-en').classList.toggle('active',lang==='en');
  applyMode();
  rebuildUI(true);
}
function applyMode(){
  document.body.classList.toggle('is-admin',isAdmin);
}

// Load saved data from localStorage (persists across page reloads)
loadFromLocal();

// Auto-unlock if already authenticated this session
const savedMode=sessionStorage.getItem('sesonki-mode');
if(savedMode){isAdmin=savedMode==='admin';unlock();}

// === HEADER CLICK EASTER EGG (7 clicks → meeting ranking) ===
(function(){
  let clicks=0;let timer=null;
  const h=document.querySelector('header h1');
  if(!h)return;
  h.style.cursor='default';
  h.addEventListener('click',function(){
    clicks++;
    clearTimeout(timer);
    timer=setTimeout(function(){clicks=0;},2000);
    if(clicks>=7){
      clicks=0;
      const counts={};
      sessions.forEach(function(s){s.participants.forEach(function(p){counts[p.name]=(counts[p.name]||0)+1;});});
      const ranked=Object.entries(counts).sort(function(a,b){return b[1]-a[1];}).slice(0,10);
      const medals=['🥇','🥈','🥉'];
      let html='<div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;justify-content:center;align-items:center;" onclick="this.remove()">';
      html+='<div style="background:white;border-radius:16px;padding:2rem;max-width:420px;width:90%;text-align:center;" onclick="event.stopPropagation()">';
      html+='<h2 style="margin-bottom:1rem;">'+t('eggRankTitle')+'</h2>';
      html+='<p style="font-size:0.8rem;opacity:0.6;margin-bottom:1rem;">'+t('eggRankSub')+'</p>';
      ranked.forEach(function(r,i){
        const medal=medals[i]||(i+1+'.').padStart(3,' ');
        html+='<div style="display:flex;justify-content:space-between;padding:0.4rem 0.5rem;border-bottom:1px solid #eee;font-size:0.95rem;">';
        html+='<span>'+medal+' '+r[0]+'</span><span style="font-weight:700;">'+r[1]+' '+t('eggRankUnit')+'</span></div>';
      });
      html+='<p style="margin-top:1rem;font-size:0.75rem;opacity:0.5;">'+t('eggRankClose')+'</p>';
      html+='</div></div>';
      const el=document.createElement('div');el.innerHTML=html;document.body.appendChild(el.firstChild);
    }
  });
})();

// === THIS IS FINE EASTER EGG ===
let tifClicks=0;let tifTimer=null;
function thisIsFineClick(){
  tifClicks++;clearTimeout(tifTimer);tifTimer=setTimeout(function(){tifClicks=0;},2500);
  if(tifClicks>=5){
    tifClicks=0;
    const overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0);z-index:20000;display:flex;justify-content:center;align-items:center;cursor:pointer;transition:background 1.5s ease;';
    overlay.onclick=function(){overlay.style.opacity='0';overlay.style.transition='opacity 0.5s';setTimeout(function(){overlay.remove();},500);};
    const img=document.createElement('img');
    img.src='data:image/webp;base64,${memeBase64}';
    img.style.cssText='max-width:70vw;max-height:70vh;border-radius:12px;box-shadow:0 0 60px rgba(255,100,0,0.6);transform:scale(0.1);opacity:0;transition:transform 2s cubic-bezier(0.34,1.56,0.64,1),opacity 1.5s ease;';
    overlay.appendChild(img);
    document.body.appendChild(overlay);
    requestAnimationFrame(function(){
      overlay.style.background='rgba(0,0,0,0.85)';
      img.style.opacity='1';img.style.transform='scale(1)';
    });
  }
}

// === MATRIX EASTER EGG ===
(function(){
  let buf='';
  document.addEventListener('keypress',function(e){
    buf+=e.key.toLowerCase();
    if(buf.length>10)buf=buf.slice(-10);
    if(buf.endsWith('neo')){buf='';startMatrix();}
  });
  function startMatrix(){
    const canvas=document.createElement('canvas');
    canvas.style.cssText='position:fixed;inset:0;z-index:30000;pointer-events:none;';
    canvas.width=window.innerWidth;canvas.height=window.innerHeight;
    document.body.appendChild(canvas);
    const ctx=canvas.getContext('2d');
    const cols=Math.floor(canvas.width/14);
    const drops=Array(cols).fill(1);
    const chars='\\u30a2\\u30a4\\u30a6\\u30a8\\u30aa\\u30ab\\u30ad\\u30af\\u30b1\\u30b3\\u30b5\\u30b7\\u30b9\\u30bb\\u30bd\\u30bf\\u30c1\\u30c4\\u30c6\\u30c8ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let frame=0;
    const iv=setInterval(function(){
      ctx.fillStyle='rgba(0,0,0,0.05)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='#0f0';ctx.font='14px monospace';
      for(let i=0;i<drops.length;i++){
        const ch=chars[Math.floor(Math.random()*chars.length)];
        ctx.fillText(ch,i*14,drops[i]*14);
        if(drops[i]*14>canvas.height&&Math.random()>0.975)drops[i]=0;
        drops[i]++;
      }
      frame++;
      if(frame>200){clearInterval(iv);canvas.style.transition='opacity 1s';canvas.style.opacity='0';setTimeout(function(){canvas.remove();},1000);}
    },33);
    const toast=document.getElementById('toast');
    if(toast){toast.textContent='Wake up, Neo...';toast.style.color='#0f0';toast.style.background='#000';toast.classList.add('show');setTimeout(function(){toast.classList.remove('show');toast.style.color='';toast.style.background='';},3000);}
  }
})();

// === KONAMI CODE EASTER EGG ===
(function(){
  const seq=[38,38,40,40,37,39,37,39,66,65];
  let pos=0;
  let discoOn=false;
  let discoInterval=null;
  const discoAudio=new Audio('data:audio/mp3;base64,${discoMusicBase64}');
  discoAudio.loop=true;
  document.addEventListener('keydown',function(e){
    if(e.keyCode===seq[pos]){pos++;if(pos===seq.length){pos=0;toggleDisco();}}else{pos=e.keyCode===seq[0]?1:0;}
  });
  function toggleDisco(){
    discoOn=!discoOn;
    const h=document.querySelector('header h1');
    if(discoOn){
      if(h)h.dataset.origText=h.textContent;
      if(h)h.innerHTML=t('eggDiscoTitle');
      let hue=0;
      discoInterval=setInterval(function(){
        hue=(hue+15)%360;
        document.querySelectorAll('.list-card,.session-block').forEach(function(el,i){
          el.style.transition='background 0.3s';
          el.style.background='hsl('+((hue+i*30)%360)+',70%,85%)';
        });
        if(h)h.style.color='hsl('+hue+',80%,40%)';
      },200);
      discoAudio.currentTime=0;discoAudio.play().catch(function(){});
      var tt=document.getElementById('toast');
      if(tt){tt.textContent=t('eggDiscoOn');tt.classList.add('show');setTimeout(function(){tt.classList.remove('show');},2000);}
    }else{
      discoAudio.pause();discoAudio.currentTime=0;
      clearInterval(discoInterval);
      discoInterval=null;
      document.querySelectorAll('.list-card,.session-block').forEach(function(el){el.style.background='';el.style.transition='';});
      const h2=document.querySelector('header h1');
      if(h2&&h2.dataset.origText)h2.textContent=h2.dataset.origText;
      if(h2)h2.style.color='';
      var tt2=document.getElementById('toast');
      if(tt2){tt2.textContent=t('eggDiscoOff');tt2.classList.add('show');setTimeout(function(){tt2.classList.remove('show');},1500);}
    }
  }
})();
</script>
</body>
</html>`;

writeFileSync('ui/index.html', html, 'utf-8');
console.log('Generoitu → ui/index.html');
