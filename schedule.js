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

  // People on the export who don't use the ledger (PAs, locums, office staff); left out of the name list.
  const HIDDEN_NAMES = ['B Patel', 'Bossier', 'Coughlin', 'Johnson', 'Kardos', 'Landauer', 'Locum 1', 'Vistelle', 'Hardin'];
  const hiddenSet = new Set(HIDDEN_NAMES.map(n => n.toLowerCase()));
  const isListed = (name) => !hiddenSet.has(clean(name).toLowerCase());

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
    for (const n of Object.keys(byName)) if (!isListed(n)) delete byName[n];
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

  // Shift hours from the assignment name, e.g. "SHIFT 5-1" -> {start:17, end:25} (end past 24 = next morning).
  // Starts of 6-11 are morning, 12 is noon, 1-5 afternoon; "MIDNIGHT" shifts start at night.
  function shiftHours(assignment) {
    const u = clean(assignment).toUpperCase();
    const m = u.match(/(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?/);
    if (!m) return null;
    let s = Number(m[1]) + (m[2] ? Number(m[2]) / 60 : 0);
    const e0 = Number(m[3]) + (m[4] ? Number(m[4]) / 60 : 0);
    if (/MIDNIGHT|NIGHT|NOC/.test(u)) { if (s < 12) s += 12; }
    else if (s >= 1 && s < 6) s += 12;
    let e = e0; while (e <= s) e += 12;
    return { start: s, end: e };
  }

  function addDays(isoDay, n) { const [y, mo, d] = isoDay.split('-').map(Number); const t = new Date(Date.UTC(y, mo - 1, d + n)); return t.toISOString().slice(0, 10); }

  // The reading shift on a day that has hours (ignores off days and extra duties).
  function readingShift(assignments, overrides) {
    let best = null;
    for (const a of assignments || []) {
      const t = overrides && clean(a) in overrides ? overrides[clean(a)] : defaultTarget(a);
      if (t == null) continue;
      // Assignments without hours in the name (e.g. DIC MAMMO) are daytime work.
      const hrs = shiftHours(a) || { start: 8, end: 17 };
      if (!best || hrs.end > best.end) best = Object.assign({ assignment: clean(a) }, hrs);
    }
    return best;
  }

  // Which day an exam counts toward. Work signed after midnight on an overnight shift counts
  // toward the day the shift started. signedTime is minutes after midnight, or null if unknown.
  function creditDay(signedDate, signedTime, days, overrides) {
    if (!signedDate || !days) return signedDate;
    const prev = addDays(signedDate, -1);
    const night = readingShift(days[prev], overrides);
    if (!night || night.end <= 24) return signedDate;
    const endMin = (night.end - 24) * 60;
    const today = readingShift(days[signedDate], overrides);
    if (signedTime != null) {
      // Signed by the end of the overnight shift (with an hour of slack, but never into today's own shift).
      const cutoff = today ? Math.max(endMin, Math.min(endMin + 60, today.start * 60)) : endMin + 60;
      return signedTime <= cutoff ? prev : signedDate;
    }
    // No time on the row: if there's no shift of its own that day, it belongs to last night.
    return today ? signedDate : prev;
  }

  const api = { HIDDEN_NAMES, isListed, shiftHours, readingShift, creditDay, addDays, parseCsv, parseSchedule, defaultTarget, dayTarget, bonus, BONUS_PER_POINT };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DIGSchedule = api;
})(typeof window !== 'undefined' ? window : globalThis);
