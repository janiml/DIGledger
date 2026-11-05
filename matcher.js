/* DIG Ledger — exam matching and worklist parsing.
   Pure functions, no DOM. Shared by the app and the test script. */
(function (root) {
  'use strict';

  // Point values from the department chart (Nov 2026 revision).
  // key -> [points, label]. The app lets the user edit these numbers.
  const DEFAULT_POINTS = {
    xray: [1, 'Xray'],
    us_dvt: [1, 'US DVT / venous / vein mapping'],
    us_aorta: [1, 'US Aorta'],
    nm_lympho: [1, 'NM Lymphoscintigraphy'],
    nm_gastric: [1, 'NM Gastric emptying'],
    or_fluoro: [1, 'OR Fluoro'],
    ct_orbits_metal: [1, 'CT Orbits for metal'],
    mammo_addendum_self: [1, 'Mammo addendum (self)'],
    mm_post_biopsy: [1, 'MM Post biopsy'],

    xray_bilat: [2, 'Xray bilateral'],
    ct_head: [2, 'CT Head'],
    us_body: [2, 'US Body'],
    us_breast: [2, 'US Breast'],
    us_breast_linked_uni: [12, 'US Breast one side + linked diag mammo'],
    us_breast_linked_bi: [14, 'US Breast both sides + linked diag mammo'],
    nm_general: [2, 'Nuc Med'],
    ct_calcium: [2, 'CT Cardiac calcium score'],

    xray_bone_survey: [3, 'Xray Bone survey'],
    ct_spine: [3, 'CT Spine'],
    ct_pelvis: [3, 'CT Pelvis'],
    ct_face: [3, 'CT Face / Sinus'],
    ct_orbits: [3, 'CT Orbits'],
    ct_head_perfusion: [3, 'CT Head perfusion'],
    ct_head_wwo: [3, 'CT Head W/ and W/O'],
    ct_ext_wo: [3, 'CT Extremity/joint W/O contrast, no hardware'],
    us_thyroid: [3, 'US Thyroid'],
    us_pelvis: [3, 'US Pelvis'],
    us_ob: [3, 'US Pregnancy / OB'],
    us_scrotum: [3, 'US Scrotum'],
    us_arterial: [3, 'US Arterial'],
    ct_stroke: [3, 'Stroke CT'],
    fluoro_pa: [3, 'Fluoro done by PA'],

    mammo_screening: [4, 'Screening mammo'],
    mammo_addendum_other: [4, 'Mammo addendum (another)'],

    ct_chest: [5, 'CT Chest'],
    ct_lung_screening: [5, 'CT Lung screening (low dose)'],
    ct_abd: [5, 'CT Abd'],
    ct_abd_pelv: [5, 'CT Abd & Pelv'],
    ct_pe: [5, 'CT PE'],
    ct_neck: [5, 'CT Neck'],
    ct_tevar_chest: [5, 'TEVAR (chest only)'],
    ct_myelo: [5, 'CT Myelogram'],
    ct_ext_wc: [5, 'CT Extremity/joint W/ contrast, or hardware'],
    mr_wo: [5, 'MR Body/Brain/Joint/Spine W/O'],
    mr_brain_wc: [5, 'MR Brain W/ contrast only'],
    fluoro_physician: [5, 'Fluoro by physician (incl. read)'],
    nm_special: [5, 'NM Octreoscan / Renal Lasix / Gallium'],
    para_thora: [5, 'Paracentesis / Thoracentesis'],

    ct_abd_wwo: [7, 'CT Abd W/ and W/O'],
    ct_abd_pelv_wwo: [7, 'CT Abd & Pelv W/ and W/O'],
    ct_urogram: [7, 'CT Urogram'],
    ct_orbits_wwo: [7, 'CT Orbits W/ and W/O'],
    ct_spine_wwo: [7, 'CT Spine W/ and W/O'],
    ct_hires_chest: [7, 'Hi-res Chest CT'],
    ct_ext_wwo: [7, 'CT Extremity/joint W/ and W/O'],
    cta_abd_pelv: [7, 'CTA Abd/Pelv'],
    cta_gi_bleed: [7, 'CTA GI bleed'],
    cta_watchman: [7, 'CTA Watchman'],
    mammo_diagnostic: [10, 'MG Diagnostic'],
    mr_brain_wwo: [7, 'MR Brain W/ and W/O'],
    mr_spine_wwo: [7, 'MR Spine W/ and W/O'],
    mr_brach_plex: [7, 'MR Brachial plexus'],
    mr_abd_wwo: [7, 'MR Abd W/ and W/O'],
    mr_joint_wwo: [7, 'MR Joint W/ and W/O'],
    ct_iac: [7, 'CT IAC'],
    arthrogram: [7, 'CT/MR Arthrogram'],

    cta_aorta: [10, 'CTA Aorta'],
    cta_cap: [10, 'CTA Chest/Abd/Pelv'],
    cta_coronary: [10, 'CTA Coronary arteries'],
    cta_head_neck: [10, 'CTA Head and Neck'],
    mr_breast: [10, 'MR Breast'],
    mr_pelvis: [10, 'MR Pelvic soft tissue / Prostate / Rectum'],
    pet_ct: [10, 'PET CT'],
    us_procedure: [10, 'US Procedure'],

    ct_tevar_cap: [12, 'TEVAR (Chest/Abd/Pelv)'],
    ct_tavr: [12, 'CT TAVR'],
    cta_runoff: [12, 'CTA Runoff'],

    ct_colonography: [15, 'CT Virtual colonography'],

    ct_guided: [20, 'CT Guided procedure'],
    mg_biopsy_loc: [20, 'MG Biopsy / Needle loc'],

    mr_breast_biopsy: [25, 'MR Breast biopsy'],
  };

  // Normalize an exam description so OCR noise and RIS spelling variants match.
  function normalize(s) {
    let u = (' ' + String(s || '') + ' ').toUpperCase();
    u = u.replace(/[|‘’'"“”—–_~`]/g, ' ');
    u = u.replace(/HEAD\s*[\/I1L!]\s*BRAIN/g, 'HEAD BRAIN');
    u = u.replace(/\bCT\s*ANGIO(GRAM|GRAPHY)?\b/g, 'CTA');
    // OCR often glues the contrast code onto the body part: "BRAINW WO", "SPINEWO", "VENOGRAMW".
    u = u.replace(/\b(BRAIN|HEAD|NECK|FACE|ORBITS?|SINUS(?:ES)?|IACS?|PITUITARY|SPINE|CHEST|ABDOMEN|ABD|PELVIS|EXTREMITY|JOINT|KNEE|SHOULDER|HIP|ANKLE|WRIST|ELBOW|VENOGRAM|ANGIOGRAM)(W\s*\/?\s*O|W)(?=[\s\/&+]|$)/g, '$1 $2');
    u = u.replace(/\bW\s*\/?\s*(AND|&|\+)\s*W\s*\/?\s*O\b|\bWITH\s*(AND|&)\s*WITHOUT\b/g, ' WWO ');
    // "W WO", "W/WO", "W/W/O"
    u = u.replace(/\bW\s*\/?\s*W\s*\/?\s*O\b/g, ' WWO ');
    // Reversed order: "WO W", "WO/W", "W/O & W/", "WITHOUT AND WITH"
    u = u.replace(/\bW\s*\/?\s*O\s*(?:AND|&|\+|\/)?\s*W\b\s*\/?|\bWITHOUT\s*(?:AND|&)\s*WITH\b/g, ' WWO ');
    u = u.replace(/\bW\s*\/\s*O\b|\bWITHOUT\b/g, ' WO ');
    u = u.replace(/\bWO\s*\(?\s*C[O0]N(TRAST)?\b/g, ' WO ');
    u = u.replace(/\bW\s*\/?\s*\(?\s*C[O0]N(TRAST)?\b|\bWITH\s*C[O0]N(TRAST)?\b/g, ' WC ');
    u = u.replace(/\bMRI\b/g, 'MR');
    u = u.replace(/\bLDCT\b/g, 'CT LDCT');
    return u.replace(/\s+/g, ' ').trim();
  }

  const has = (u, re) => re.test(u);
  const WWO = /\bWWO\b/;
  const WC = /\bWC\b/;
  const CT = /\bCT\b/;
  const MR = /\bMR\b/;
  const US = /\b(US|ULTRASOUND)\b/;
  const MAMMO = /\b(MM|MG|MAMMO|MAMMOGRAM|TOMO)\b/;
  const EXT = /\b(EXTREM\w*|KNEE|ANKLE|FOOT|FEET|SHOULDER|ELBOW|WRIST|HAND|HIP|FEMUR|TIB\w*|FIB\w*|HUMER\w*|FOREARM|LEG|ARM|JOINT|FINGER|TOE|HEEL|CALCAN\w*|THUMB)\b/;

  // Returns {key} for a confident match, or {ask: reason} when the chart can't decide it.
  function classify(exam) {
    const u = normalize(exam);
    if (!u) return { ask: 'No exam text' };

    // Procedures and biopsies first
    if (has(u, MR) && has(u, /BREAST/) && has(u, /BIOP/)) return { key: 'mr_breast_biopsy' };
    if (has(u, /PARACENT|THORACENT/)) return { key: 'para_thora' };
    if (has(u, CT) && has(u, /GUIDED|BIOP|DRAIN|ABLAT|ASPIR/)) return { key: 'ct_guided' };
    if (has(u, MAMMO) && has(u, /POST\s*-?\s*BIOP|POST\s*PROC/)) return { key: 'mm_post_biopsy' };
    if (has(u, /LOC\s*WIRE|WIRE\s*LOC|NEEDLE\s*LOC|LOCALIZ|STEREO/) || (has(u, MAMMO) && has(u, /BIOP/))) return { key: 'mg_biopsy_loc' };
    if (has(u, US) && has(u, /BIOP|ASPIR|\bFNA\b|DRAIN|GUIDED|INJECT|PROCEDURE/)) return { key: 'us_procedure' };

    // Cardiac / vascular CT
    if (has(u, /COLONOGRAPH|VIRTUAL\s*COLON/)) return { key: 'ct_colonography' };
    if (has(u, /\bTAVR\b|\bTAVI\b/)) return { key: 'ct_tavr' };
    if (has(u, /\bTEVAR\b/)) return { key: has(u, /ABD|PELV/) ? 'ct_tevar_cap' : 'ct_tevar_chest' };
    if (has(u, /RUN\s*-?\s*OFF/)) return { key: 'cta_runoff' };
    if (has(u, /CORONARY|\bCCTA\b/)) return { key: 'cta_coronary' };
    if (has(u, /CALCIUM|\bCA\s*SCORE|CAC\b/)) return { key: 'ct_calcium' };
    if (has(u, /WATCHMAN|\bLAA\b|ATRIAL\s*APPEND/)) return { key: 'cta_watchman' };
    if (has(u, /GI\s*BLEED/)) return { key: 'cta_gi_bleed' };
    if (has(u, /\bCTA\b/)) {
      if (has(u, /CHEST/) && has(u, /ABD|PELV/)) return { key: 'cta_cap' };
      if (has(u, /AORT/)) return { key: 'cta_aorta' };
      if (has(u, /NECK/)) return { key: 'cta_head_neck' };
      if (has(u, /ABD|PELV/)) return { key: 'cta_abd_pelv' };
      if (has(u, /CHEST|\bPE\b|PULM/)) return { key: 'ct_pe' };
      return { ask: 'CTA of this region is not on the chart' };
    }

    if (has(u, /\bPET\b/)) return { key: 'pet_ct' };
    if (has(u, /ARTHRO/)) return { key: 'arthrogram' };

    // CT
    if (has(u, CT)) {
      if (has(u, /\bIAC\b|INTERNAL\s*AUD/)) return { key: 'ct_iac' };
      if (has(u, /UROGRAM|\bCTU\b/)) return { key: 'ct_urogram' };
      if (has(u, /HI\s*-?\s*RES|HIGH\s*RES|\bHRCT\b/)) return { key: 'ct_hires_chest' };
      if (has(u, /STROKE/)) return { key: 'ct_stroke' };
      if (has(u, /PERFUSION/)) return { key: 'ct_head_perfusion' };
      if (has(u, /MYELO/)) return { key: 'ct_myelo' };
      if (has(u, /CHEST/) && has(u, /ABD|PELV/)) return { ask: 'CT Chest/Abd/Pelv (non-angio) is not on the chart' };
      if (has(u, /ABD/) && has(u, /PELV/) || has(u, /STONE/)) return { key: has(u, WWO) ? 'ct_abd_pelv_wwo' : 'ct_abd_pelv' };
      if (has(u, /ABD/)) return { key: has(u, WWO) ? 'ct_abd_wwo' : 'ct_abd' };
      if (has(u, /\bPE\b|PULM\w*\s*EMBOL/)) return { key: 'ct_pe' };
      if (has(u, /LUNG|CHEST|THORAX/) && has(u, /SCREE\s*N|LOW\s*-?\s*DOSE|\bLDCT\b|\bLCS\b/)) return { key: 'ct_lung_screening' };
      if (has(u, /CHEST|THORAX/)) return { key: 'ct_chest' };
      if (has(u, /ORBIT/)) {
        if (has(u, /METAL|FOREIGN|\bFB\b|MRI\s*CLEAR|PRE\s*-?\s*MR/)) return { key: 'ct_orbits_metal' };
        return { key: has(u, WWO) ? 'ct_orbits_wwo' : 'ct_orbits' };
      }
      if (has(u, /SPINE|CERVICAL|THORACIC|LUMBAR|\b[CTL]\s*-?\s*SPINE\b/)) return { key: has(u, WWO) ? 'ct_spine_wwo' : 'ct_spine' };
      if (has(u, /HEAD|BRAIN/)) return { key: has(u, WWO) ? 'ct_head_wwo' : 'ct_head' };
      if (has(u, /NECK/)) return { key: 'ct_neck' };
      if (has(u, /FACE|FACIAL|SINUS|MAXILLO|MANDIB|TEMPORAL/)) return { key: 'ct_face' };
      if (has(u, /PELV/)) return { key: 'ct_pelvis' };
      if (has(u, EXT)) {
        if (has(u, WWO)) return { key: 'ct_ext_wwo' };
        if (has(u, WC) || has(u, /HARDWARE|\bMARS\b|METAL/)) return { key: 'ct_ext_wc' };
        return { key: 'ct_ext_wo' };
      }
      return { ask: 'CT exam not on the chart' };
    }

    // MR
    if (has(u, MR)) {
      if (has(u, /\bMRA\b|ANGIO/)) return { ask: 'MR angiography is not on the chart' };
      if (has(u, /BREAST/)) return { key: 'mr_breast' };
      if (has(u, /PROSTATE|RECT|PELVI?C?\s*SOFT|PELVIS|PELVIC/)) return { key: 'mr_pelvis' };
      if (has(u, /BRACH/)) return { key: 'mr_brach_plex' };
      if (has(u, /HEAD|BRAIN/)) return { key: has(u, WWO) ? 'mr_brain_wwo' : has(u, WC) ? 'mr_brain_wc' : 'mr_wo' };
      if (has(u, /SPINE|CERVICAL|THORACIC|LUMBAR/)) return { key: has(u, WWO) ? 'mr_spine_wwo' : 'mr_wo' };
      if (has(u, /ABD|LIVER|MRCP|PANCREA|RENAL|KIDNEY|ADRENAL|ENTERO/)) return { key: has(u, WWO) ? 'mr_abd_wwo' : 'mr_wo' };
      if (has(u, EXT)) return { key: has(u, WWO) ? 'mr_joint_wwo' : 'mr_wo' };
      return { ask: 'MR exam not on the chart' };
    }

    // Mammo
    if (has(u, MAMMO) || has(u, /MAMMO/)) {
      if (has(u, /ADDEND/)) return { ask: 'Mammo addendum: 1 pt for your own, 4 for another reader' };
      if (has(u, /DIAG/)) return { key: 'mammo_diagnostic' };
      if (has(u, /SCREE\s*N|TOMO/)) return { key: 'mammo_screening' };
      return { ask: 'Mammo exam type unclear' };
    }

    // US
    if (has(u, US)) {
      if (has(u, /BREAST/)) return { key: 'us_breast' };
      if (has(u, /\bOB\b|PREG|FETAL|NUCHAL|\bBPP\b|GESTAT/)) return { key: 'us_ob' };
      if (has(u, /THYROID|PARATHY|NECK/)) return { key: 'us_thyroid' };
      if (has(u, /SCROT|TESTI/)) return { key: 'us_scrotum' };
      if (has(u, /PELV|TRANSVAG|ENDOVAG|UTER|OVAR/)) return { key: 'us_pelvis' };
      if (has(u, /DVT|VENOUS|\bVEIN/)) return { key: 'us_dvt' };
      if (has(u, /ARTER|CAROTID|\bABI\b/)) return { key: 'us_arterial' };
      if (has(u, /AORT/)) return { key: 'us_aorta' };
      if (has(u, /ABD|RENAL|KIDNEY|RETRO|LIVER|GALL|\bRUQ\b|SPLEEN|BLADDER|SOFT\s*TISSUE|APPEND|PYLOR/)) return { key: 'us_body' };
      return { ask: 'US exam not on the chart' };
    }

    // Nuclear medicine
    if (has(u, /\bNM\b|NUC\s*MED|SCINT|\bSPECT\b|\bHIDA\b|\bMUGA\b/)) {
      if (has(u, /OCTREO|LASIX|GALLIUM/)) return { key: 'nm_special' };
      if (has(u, /LYMPH/)) return { key: 'nm_lympho' };
      if (has(u, /GASTRIC/)) return { key: 'nm_gastric' };
      return { key: 'nm_general' };
    }

    // Fluoro
    if (has(u, /FLUORO|\bFL\b|\bRF\b|C\s*-?\s*ARM/)) {
      if (has(u, /\bOR\b|C\s*-?\s*ARM|INTRAOP/)) return { key: 'or_fluoro' };
      return { ask: 'Fluoro: 3 pts if done by a PA, 5 if by a physician' };
    }

    // Xray
    if (has(u, /BONE\s*SURVEY|SKELETAL\s*SURVEY/)) return { key: 'xray_bone_survey' };
    if (has(u, /\b(XR|DX|CR|X\s*-?\s*RAY|RADIOGRAPH)\b/)) return { key: has(u, /BILAT|\bBI\b|BOTH/) ? 'xray_bilat' : 'xray' };

    return { ask: 'Not on the chart' };
  }

  const MODALITY_START = /\b(CTA|CT|MRI|MRA|MR|US|MM|MG|MAMMO|XR|DX|CR|NM|PET|FL|IR|RF)\b/;
  // Accession numbers look like A000002157426H; OCR often swaps 0 for O/Q/D.
  const ACCESSION = /\bA[0-9A-Z]{0,5}\d{6,}[A-Z]{0,3}\b/;
  const DATE = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/;
  const DATE_TIME = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b(?:\s+(\d{1,2})[:.](\d{2})(?::\d{2})?(?:\s*([AaPp])\.?[Mm]?\b)?)?/g;
  // Minutes after midnight, or null when no time was read.
  function clock(h, m, ap) {
    if (h == null) return null;
    h = Number(h); m = Number(m);
    if (ap) { ap = ap.toUpperCase(); if (ap === 'P' && h < 12) h += 12; if (ap === 'A' && h === 12) h = 0; }
    return h < 24 && m < 60 ? h * 60 + m : null;
  }

  function cleanAccession(a) {
    const m = String(a).toUpperCase().match(/^A([0-9A-Z]{0,5}?)(\d{6,})([A-Z]*)$/);
    if (!m) return String(a).toUpperCase();
    return 'A' + m[1].replace(/[^0-9]/g, '0') + m[2] + m[3];
  }

  function validIso(s) { const [y, m, d] = s.split('-').map(Number); return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000; }
  function daysBetween(a, b) { const t = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((t(b) - t(a)) / 86400000); }

  function isoDate(m) {
    let mo = String(m[1]); if (mo.length === 2 && Number(mo) > 12 && /[47]/.test(mo[0])) mo = '1' + mo[1];
    return m[3] + '-' + mo.padStart(2, '0') + '-' + String(m[2]).padStart(2, '0');
  }

  // Parse OCR text of a worklist screenshot into exam rows.
  // Returns {rows:[{exam, accession, examDate, signedDate, ageDays}], workDate}
  // OCR sometimes drops the spaces in an exam name ("CTANGIOHEADANDNECK"). Split long glued words
  // back into known worklist words; leave the word alone if it doesn't split cleanly.
  const VOCAB = ['ABDOMEN','ANGIOGRAM','ANGIO','AND','ANKLE','AORTA','BILAT','BIOPSY','BRAIN','BREAST','CERVICAL','CHEST','COMPLETE','CON','CONTRAST','CTA','CT','DIAGNOSTIC','ELBOW','EXTREMITY','HEAD','HIP','KNEE','LEFT','LIMITED','LOWER','LUMBAR','MAMMO','MRA','MRI','MR','NECK','ORBITS','PELVIS','PE','RIGHT','SCREENING','SHOULDER','SINUS','SPINE','STONE','THORACIC','TOMO','UPPER','US','VENOGRAM','WITHOUT','WITH','WO','WRIST','W','BI'];
  function unglue(word) {
    if (word.length < 10 || !/^[A-Z]+$/.test(word)) return word;
    const memo = {};
    const go = (i) => {
      if (i === word.length) return [];
      if (i in memo) return memo[i];
      for (const v of VOCAB) if (word.startsWith(v, i)) { const rest = go(i + v.length); if (rest) return memo[i] = [v, ...rest]; }
      return memo[i] = null;
    };
    const parts = go(0);
    return parts ? parts.join(' ') : word;
  }

  function stampsIn(s) {
    return [...String(s).matchAll(DATE_TIME)].map(m => ({ d: isoDate(m), t: clock(m[4], m[5], m[6]) })).filter(x => validIso(x.d))
      .sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : (a.t ?? -1) - (b.t ?? -1));
  }

  function parseWorklist(text) {
    const lines = String(text || '').split(/\r?\n/);
    const rows = [];
    // The list's Start/End Date filter sits above the first row. When both are the same day,
    // that is the day everything on the list was signed.
    const firstRow = lines.findIndex(l => ACCESSION.test(l.toUpperCase()));
    const headDates = stampsIn(lines.slice(0, firstRow < 0 ? lines.length : firstRow).join('\n')).map(s => s.d);
    const listDate = headDates.length && headDates.every(d => d === headDates[0]) ? headDates[0] : null;
    const dateCounts = {};
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const acc = line.toUpperCase().match(ACCESSION);
      if (!acc) continue;
      const before = line.slice(0, acc.index).toUpperCase().replace(/[A-Z]{10,}/g, unglue);
      // Patient names come first ("LAST, FIRST"); the exam starts at the first modality word after the comma.
      const commaAt = before.indexOf(',');
      const searchFrom = commaAt >= 0 ? commaAt + 1 : 0;
      const tail = before.slice(searchFrom);
      const mod = tail.match(MODALITY_START);
      if (!mod) continue;
      let exam = tail.slice(mod.index).replace(/[^A-Z0-9\/<>&+\- .()]/g, ' ').replace(/\s+/g, ' ').trim();
      // An exam that wraps ("CT CERVICAL SPINE WO" / "CON") — pull a short continuation word from the next line.
      const next = (lines[i + 1] || '').toUpperCase();
      const cont = next.match(/^\W*(?:[A-Z]\W{0,3})?\s*(CON|CONTRAST|W\/O CON|WO CON)\b/);
      if (cont && /\b(WO|W|W\/O)$/.test(exam)) exam += ' CON';
      // Dates for this row: on the same line after the accession, or on the line below it
      // (the worklist shows the exam date and time under the accession number).
      let stamps = stampsIn(line.slice(acc.index + acc[0].length));
      if (!stamps.length && lines[i + 1] && !ACCESSION.test(lines[i + 1].toUpperCase())) stamps = stampsIn(lines[i + 1]);
      let examDate = null, signedDate = null, signedTime = null;
      if (stamps.length > 1) {
        // Both dates on the row: the earlier is the exam, the later is when it was signed.
        examDate = stamps[0].d; signedDate = stamps[stamps.length - 1].d; signedTime = stamps[stamps.length - 1].t;
      } else if (stamps.length === 1) {
        // One date on the row is the exam date; the list's date filter is the day it was signed.
        examDate = stamps[0].d;
        signedDate = listDate && listDate >= examDate ? listDate : examDate;
      } else signedDate = listDate;
      const ageDays = examDate && signedDate ? daysBetween(examDate, signedDate) : null;
      if (signedDate) dateCounts[signedDate] = (dateCounts[signedDate] || 0) + 1;
      rows.push({ exam, accession: cleanAccession(acc[0]), examDate, signedDate, signedTime, ageDays });
    }
    let workDate = listDate, best = 0;
    if (!workDate) for (const d in dateCounts) if (dateCounts[d] > best) { best = dateCounts[d]; workDate = d; }
    if (!workDate) {
      const any = String(text || '').match(DATE);
      if (any) workDate = isoDate(any);
    }
    return { rows, workDate };
  }

  // Key used to spot the same exam across overlapping screenshots, tolerant of OCR noise in the leading zeros.
  function accessionKey(a) {
    const m = String(a || '').toUpperCase().match(/(\d{6,})([A-Z]*)$/);
    return m ? m[1].slice(-9) + m[2] : String(a || '').toUpperCase();
  }

  const LATE_DAYS = 3, LATE_BONUS = 1, HARDWARE_BONUS = 2;
  const SPINE_CT_KEYS = ['ct_spine', 'ct_spine_wwo'];
  // A breast ultrasound with the blue linked-exam box carries its diagnostic mammogram:
  // one side 12 points, both sides 14. Biopsies and other linked exams are left as they are.
  function linkedKey(exam) {
    const u = normalize(exam);
    if (/BIOP|ASPIR|\bFNA\b|LOC\s*WIRE|WIRE\s*LOC|LOCALIZ|STEREO/.test(u)) return null;
    const usBreast = /\bUS\b|ULTRASOUND|SONO/.test(u) && /BREAST/.test(u);
    if (usBreast) {
      if (/BILAT|BOTH|\bB\/?L\b|\bBI\b/.test(u)) return 'us_breast_linked_bi';
      if (/LEFT|RIGHT|\bLT\b|\bRT\b/.test(u)) return 'us_breast_linked_uni';
      return 'ask';
    }
    // A diagnostic mammogram with the box: the linked ultrasound isn't on the list, so ask its side.
    if (classify(exam).key === 'mammo_diagnostic') return 'ask';
    return null;
  }

  const api = { ACCESSION, linkedKey, LATE_DAYS, LATE_BONUS, HARDWARE_BONUS, SPINE_CT_KEYS, daysBetween, DEFAULT_POINTS, normalize, classify, parseWorklist, cleanAccession, accessionKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DIGMatcher = api;
})(typeof window !== 'undefined' ? window : globalThis);
