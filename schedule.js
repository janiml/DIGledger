// DIG Ledger schedule support: reads a Lightning Bolt "schedule view" CSV export
// and works out each day's point target from where you sat.
(function (root) {
  'use strict';

  const BONUS_PER_POINT = 5;

  // Minimal CSV reader that handles quoted fields.
  function parseCsv(text) {
    const rows = []; let row = [], cell = '', q = false;
    text = String(text || '').replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

  // Returns { dates, names, byName: { name: { 'YYYY-MM-DD': [assignment, ...] } } }
  function parseSchedule(text) {
    const rows = parseCsv(text);
    const hi = rows.findIndex(r => r.some(c => /^\d{4}-\d{2}-\d{2}$/.test(clean(c))));
    if (hi < 0) throw new Error('No dates found. Export the schedule view from Lightning Bolt as CSV.');
    const header = rows[hi];
    const cols = []; header.forEach((c, i) => { if (/^\d{4}-\d{2}-\d{2}$/.test(clean(c))) cols.push([i, clean(c)]); });
    const byName = {};
    for (const r of rows.slice(hi + 1)) {
      const assignment = clean(r[0]);
      if (!assignment || /^[-\s]+$/.test(assignment)) continue;
      for (const [i, d] of cols) {
        const who = clean(r[i]);
        if (!who || /^-+$/.test(who)) continue;
        const days = byName[who] = byName[who] || {};
        (days[d] = days[d] || []).push(assignment);
      }
    }
    return { dates: cols.map(c => c[1]), names: Object.keys(byName).sort(), byName };
  }

  // Assignments that never carry a reading target on their own.
  const OFF = /^(FREE|OFF|REMOTE|IN OFFICE)$|\(OFF\)|^WEG\b|^PA\b/;
  // Extra duties that sit on top of a reading shift and don't change its target.
  const EXTRA = /^(BACKUP CALL|2ND BACKUP|CANCER CONF)/;

  // Department targets: most shifts 200; LC Mammo / LC Hosp 175; NFR Hosp 125;
  // weekend (WE) and holiday (HOL) 225; NFR IR 0.
  function defaultTarget(assignment) {
    const u = clean(assignment).toUpperCase();
    if (OFF.test(u) || EXTRA.test(u)) return null;
    if (/\bIR\b/.test(u)) return 0;
    if (/^LC (MAMMO|HOSP)\b/.test(u)) return 175;
    if (/^NFR HOSP\b/.test(u)) return 125;
    if (/^(WE|HOL)\b/.test(u)) return 225;
    return 200;
  }

  // The day's target: the highest target among that day's reading assignments.
  // overrides: { assignment: target } set by the user in Settings.
  function dayTarget(assignments, overrides) {
    let best = null, label = null;
    for (const a of assignments || []) {
      const t = overrides && clean(a) in overrides ? overrides[clean(a)] : defaultTarget(a);
      if (t == null || t === '') continue;
      if (best == null || Number(t) > best) { best = Number(t); label = clean(a); }
    }
    return best == null ? null : { target: best, assignment: label };
  }

  function bonus(points, target) {
    if (target == null) return { over: 0, dollars: 0 };
    const over = Math.max(0, (points || 0) - target);
    return { over, dollars: over * BONUS_PER_POINT };
  }

  const api = { parseCsv, parseSchedule, defaultTarget, dayTarget, bonus, BONUS_PER_POINT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DIGSchedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
