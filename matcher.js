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
    mra_neck_wo: [5, 'MR Angio Neck W/O'],
    mra_head: [5, 'MR Angio Head'],
    cta_head: [5, 'CT Angio Head'],
    mr_orbits_face_neck_wc: [5, 'MR Orbits/Face/Neck W/'],
    mr_orbits_face_neck_wwo: [7, 'MR Orbits/Face/Neck W/ and W/O'],
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
    us_breast_biopsy: [20, 'US Breast biopsy'],
    path_addendum: [0, 'Pathology addendum'],

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
    u = u.replace(/\bMRA\b/g, 'MR MRA');
    u = u.replace(/\bLDCT\b/g, 'CT LDCT');
    // The worklist cuts "NECK" to "NEC" in long names ("CT ANGIO HEAD AND NEC W PERF").
    u = u.replace(/\bHEAD\s*(AND|&|\/|\+)?\s*NECK?\b/g, 'HEAD AND NECK');
    // Sometimes it cuts the name right after "AND" ("CT ANGIO HEAD AND", "CT ANGIO HEAD AND N W").
    // A dangling AND after HEAD can only be "and neck".
    u = u.replace(/\bHEAD\s*(?:AND|&|\+)\s*(?:NE?)?(?=\s*(?:$|(?:W|WO|WWO|WC|PERF\w*)\b))/g, 'HEAD AND NECK');
    // "CT STROKE ANGIO HEAD+NECK" is a CTA: the word STROKE sits between CT and ANGIO.
    u = u.replace(/\bCT\s+(STROKE|CODE\s*STROKE|STAT)\s+ANGIO(GRAM|GRAPHY)?\b/g, 'CTA $1');
    // VUC = vascular ultrasound on this worklist.
    u = u.replace(/\bVUC\b/g, 'US VUC');
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
    if (/^\s*UNREADABLE\b/i.test(exam)) return { ask: 'Couldn\'t read the exam name. Check this accession on the screen.' };
    const u = normalize(exam);
    if (!u) return { ask: 'No exam text' };

    // Procedures and biopsies first
    if (has(u, MR) && has(u, /BREAST/) && has(u, /BIOP/)) return { key: 'mr_breast_biopsy' };
    if (has(u, /PARACENT|THORACENT/)) return { key: 'para_thora' };
    if (has(u, CT) && has(u, /GUIDED|BIOP|DRAIN|ABLAT|ASPIR/)) return { key: 'ct_guided' };
    if (has(u, MAMMO) && has(u, /POST\s*-?\s*BIOP|POST\s*PROC/)) return { key: 'mm_post_biopsy' };
    if (has(u, /LOC\s*WIRE|WIRE\s*LOC|NEEDLE\s*LOC|LOCALIZ|STEREO/) || (has(u, MAMMO) && has(u, /BIOP/))) return { key: 'mg_biopsy_loc' };
    if (has(u, US) && has(u, /BREAST/) && has(u, /BIOP|ASPIR|\bFNA\b/)) return { key: 'us_breast_biopsy' };
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
      // Stroke CTA ("CT STROKE ANGIO") is the head and neck angiogram.
      if (has(u, /STROKE/)) return { key: 'cta_head_neck' };
      if (has(u, /HEAD|BRAIN|\bCOW\b|WILLIS/) && !has(u, /VENO/)) return { key: 'cta_head' };
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
      if (has(u, /\bMRA\b|ANGIO/)) {
        if (has(u, /NECK/) && !has(u, /HEAD|BRAIN/) && has(u, /\bWO\b/) && !has(u, WWO)) return { key: 'mra_neck_wo' };
        if (has(u, /HEAD|BRAIN|\bCOW\b|WILLIS/) && !has(u, /NECK/)) return { key: 'mra_head' };
        return { ask: 'MR angiography is not on the chart' };
      }
      if (has(u, /BREAST/)) return { key: 'mr_breast' };
      if (has(u, /PROSTATE|RECT|PELVI?C?\s*SOFT|PELVIS|PELVIC/)) return { key: 'mr_pelvis' };
      if (has(u, /BRACH/)) return { key: 'mr_brach_plex' };
      if (has(u, /ORBIT|FACE|FACIAL|NECK/) && !has(u, /SPINE|CERVICAL/)) {
        if (has(u, WWO)) return { key: 'mr_orbits_face_neck_wwo' };
        if (has(u, /\bWO\b/)) return { key: 'mr_wo' };
        return { key: 'mr_orbits_face_neck_wc' };
      }
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
    if (has(u, /\b(XR|DX|CR|X\s*-?\s*RAY|RADIOGRAPH)\b/)) return { key: has(u, /BILAT|\bBI\b|BOTH/) && !has(u, /\b(LEFT|RIGHT|LT|RT|LET|LFT|RGT)\b/) ? 'xray_bilat' : 'xray' };

    return { ask: 'Not on the chart' };
  }

  const MODALITY_START = /\b(CTA|CT|MRI|MRA|MR|US|VUC|MM|MG|MAMMO|XR|DX|CR|NM|PET|FL|IR|RF)\b/;
  // Accession numbers look like A000002157426H; OCR often swaps 0 for O/Q/D.
  const ACCESSION = /\bA[0-9A-Z]{0,5}\d{6,}[A-Z]{0,3}\b/;
  const DATE = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/;
  // The worklist's second line per exam: "CT - SPINE/LUMBER", "MR - HEAD", "Unknown - Unknown".
  const CATEGORY = /^\W*(CT|MR|US|XR|NM|MM|MG|FL|IR|DX|CR|PET)\s*[-–—~]\s*[A-Z]/;
  const CATEGORY_XR = /^\W*[X32*%]R\s*[-–—~]\s*[A-Z]/;
  const DATE_TIME = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b(?:\s+(\d{1,2})[:.](\d{2})(?::\d{2})?(?:\s*([AaPp])\.?[Mm]?\b)?)?/g;
  // Minutes after midnight, or null when no time was read.
  function clock(h, m, ap) {
    if (h == null) return null;
    h = Number(h); m = Number(m);
    if (ap) { ap = ap.toUpperCase(); if (ap === 'P' && h < 12) h += 12; if (ap === 'A' && h === 12) h = 0; }
    return h < 24 && m < 60 ? h * 60 + m : null;
  }

  // Repair accession numbers the text reader mangles on screen photos: the leading A read as 4 or
  // dropped, and look-alike letters inside the 12 digits ("S" for 5, "O"/"D" for 0, "B" for 8).
  // Only applied to tokens shaped like this worklist's accessions (A + 12 digits starting 000 + 1-3 letters).
  const TO_DIGIT = { O: '0', D: '0', Q: '0', U: '0', I: '1', L: '1', '|': '1', Z: '2', S: '5', G: '6', T: '7', B: '8' };
  function fixAccessions(line) {
    // A stray space inside the number ("400000354167 1H", "00000354 1800LC").
    line = String(line).replace(/(\b[A-Z4-9]?[0-9ODQU]{4,}\d+)\s(\d{1,8}[A-Z0-9]{0,3}\b)/g, (m, a, b) => (a + b).length >= 13 && (a + b).length <= 16 ? a + b : m);
    return line.replace(/\S{12,18}/g, (tok) => {
      const t = tok.toUpperCase().replace(/[^A-Z0-9|]/g, '');
      // The leading A is often misread (4, 6, R...) or dropped; try with and without the first character.
      for (const body0 of [t[0] !== '0' ? t.slice(1) : null, t].filter(Boolean)) {
        let body = body0;
        // A final H read as 4: thirteen characters and no letters at the end.
        if (/^.{12}4$/.test(body)) body = body.slice(0, 12) + 'H';
        if (body.length < 13 || body.length > 15) continue;
        const zone = body.slice(0, 12), suffix = body.slice(12);
        // Accessions here start with five zeros; letters there are misread zeros.
        const head = zone.slice(0, 5).replace(/[A-Z|]/g, '0');
        // The sixth digit is 3 on this worklist's numbers; S/B/E there is a misread 3.
        const rest = zone.slice(5, 6).replace(/[SBE]/, '3').replace(/[A-Z|]/g, (ch) => TO_DIGIT[ch] || ch) + zone.slice(6).replace(/[A-Z|]/g, (ch) => TO_DIGIT[ch] || ch);
        const digits = head + rest;
        if (head !== '00000' || !/^\d{12}$/.test(digits) || !/^[A-Z]{1,3}$/.test(suffix)) continue;
        if ((zone.slice(5).match(/\d/g) || []).length < 5) continue;
        return 'A' + digits + suffix;
      }
      return tok;
    });
  }

  function cleanAccession(a) {
    const m = String(a).toUpperCase().match(/^A([0-9A-Z]{0,5}?)(\d{6,})([A-Z]*)$/);
    if (!m) return String(a).toUpperCase();
    return 'A' + m[1].replace(/[^0-9]/g, '0') + m[2] + m[3];
  }

  function validIso(s) { const [y, m, d] = s.split('-').map(Number); return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000; }
  function daysBetween(a, b) { const t = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((t(b) - t(a)) / 86400000); }

  function isoDate(m) {
    let mo = String(m[1]); if (mo.length === 2 && Number(mo) > 12) mo = mo.replace(/[4779]/g, '1');
    // A year past next year is a misread last digit ("2028" for 2026).
    let y = m[3]; const now = new Date().getFullYear(); if (Number(y) > now + 1) y = String(now);
    return y + '-' + mo.padStart(2, '0') + '-' + String(m[2]).padStart(2, '0');
  }

  // Parse OCR text of a worklist screenshot into exam rows.
  // Returns {rows:[{exam, accession, examDate, signedDate, ageDays}], workDate}
  // OCR sometimes drops the spaces in an exam name ("CTANGIOHEADANDNECK"). Split long glued words
  // back into known worklist words; leave the word alone if it doesn't split cleanly.
  const VOCAB = ['SCREENING','LOW','DOSE','LUNG','HEPATOBILIARY','THYROID','SOFT','TISSUE','RENAL','FLUOROSCOPY','ESOPHOGRAM','BARIUM','SWALLOW','MODIFIED','GUIDED','THORACENTESIS','PARACENTESIS','CVC','REMOVAL','TUNNEL','PORT','UPPER','GI','EXTREMITY','NONVASCULAR','PELVIC','EF','WO','ABDOMEN','ANGIOGRAM','ANGIO','AND','ANKLE','AORTA','BILAT','BIOPSY','BRAIN','BREAST','CERVICAL','CHEST','COMPLETE','CON','CONTRAST','CTA','CT','DIAGNOSTIC','ELBOW','EXTREMITY','HEAD','HIP','KNEE','LEFT','LIMITED','LOWER','LUMBAR','MAMMO','MRA','MRI','MR','NECK','ORBITS','PELVIS','PE','RIGHT','SCREENING','SHOULDER','SINUS','SPINE','STONE','THORACIC','TOMO','UPPER','US','VENOGRAM','WITHOUT','WITH','WO','WRIST','W','BI'];
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

  function fixXr(u) {
    // "USABDOMEN", "NMHEPATOBILIARY", "CTLUNG", "FLFLUOROSCOPY", "IRCVC": split the modality off.
    u = u.replace(/(^|[^A-Z])(CT|MR|US|NM|FL|IR|MG|MM|VUC)(?=(ABD|ANGIO|BREAST|BRAIN|CHEST|CERV|CVC|DUPLEX|ELBOW|ESOPH|EXTREM|FLUORO|GUIDED|HEAD|HEPATO|KNEE|LUMBAR|LUNG|NECK|PELVI|RENAL|SCREEN|SHOULDER|SOFT|SPINE|THORA|THYROID|UPPER|VENOUS|BARIUM|BONE|CAROTID|DOPPLER|PARACENT|BIOPSY|DRAIN|TUNNEL|PORT|PICC|LOWER|OB|SCROT|TESTI|UTER|RETRO|TRANS|AORTA|STROKE|ORBIT|FACE|SINUS|PET)[A-Z]{0,30})/g, '$1$2 ');
    u = u.replace(/\b[A-Z]{10,}\b/g, unglue);
    return u.replace(/(^|[^A-Z])[X*%A]R(?=(CHEST|FOOT|HAND|KNEE|WRIST|ANKLE|HIP|SHOULDER|ELBOW|SPINE|PELVIS|ABD|KUB|FEMUR|TIB|HUMER|FOREARM|FINGER|TOE|SKULL|RIB|NECK|SINUS|FACE)|\b)/g, '$1XR ');
  }
  // An exam name at the start of a row: a modality word followed by a real word.
  const EXAM_START = /(?:^|[^A-Z])((?:CTA|CT|MRI|MRA|MR|US|VUC|MM|MG|XR|NM|PET|FL|IR)\s+)(?=[A-Z<]{2,})/;
  // Words that turn up when an exam name wraps onto a second line.
  const CONT_WORDS = new Set(['AND','NECK','HEAD','CON','CONTRAST','WO','W','DOSE','LOW','MODIFIED','SWALLOW','BARIUM','PORT','RIGHT','LEFT','BILAT','NONVASCULAR','VASCULAR','LIMITED','PERF','PERFUSION','WITH','WITHOUT','CHEST','ABDOMEN','PELVIS','SPINE','ORBITS','FACE','VIEWS','VIEW','MIN','1V','2V','3V','4V','PE','RUNOFF','STONE','PROTOCOL','ENTEROGRAPHY','UROGRAM','CHOLANGIOGRAM','COMPLETE']);
  function continuation(line) {
    let u = String(line || '').toUpperCase();
    if (!u.trim() || ACCESSION.test(u) || CATEGORY.test(u) || CATEGORY_XR.test(u) || EXAM_START.test(u.slice(0, 30))) return '';
    // Skip leftovers of the patient column (MRN digits, "(... MTX)") at the start.
    u = u.replace(/^\W*(?:\S*[\d()]\S*\s+)*/, (m) => m.replace(/[^\s]/g, ' '));
    const chunk = u.trim().split(/\s{2,}|\s(?=\S*\d\S*\/)/)[0];
    const words = chunk.split(/\s+/).flatMap(w => CONT_WORDS.has(w) ? [w] : splitTwo(w));
    if (!words.length || words.length > 4 || words.some(w => !CONT_WORDS.has(w))) return '';
    if (words.length === 1 && words[0] === 'COMPLETE') return '';
    return words.join(' ');
  }
  function splitTwo(w) {
    for (let k = 1; k < w.length; k++) if (CONT_WORDS.has(w.slice(0, k)) && CONT_WORDS.has(w.slice(k))) return [w.slice(0, k), w.slice(k)];
    return [w];
  }

  // Mend dates the reader garbles: a date run into its time ("11/9/20265:45"), a dot for the
  // space ("11/9/2026.4:40"), and slashes read as 1, 7 or 9 ("411912026", "11797/2026" → 11/9/2026).
  function fixDates(s) {
    s = String(s).replace(/(\b|\/)(20\d{2})[._]*(?=\d{1,2}[:.]\d{2})/g, '$1$2 ').replace(/(20\d{2})[._]+(?=\d{1,2}[:.]\d{2})/g, '$1 ');
    return s.replace(/(?<![\d\/])([0-9\/|]{4,7})(20\d{2})\b/g, (m, P, y) => {
      if (/^\d{1,2}\/\d{1,2}\/$/.test(P)) return m;
      const one = (c) => /[1479]/.test(c) ? '1' : c;
      const mo = '1' + (/[012]/.test(P[1]) ? P[1] : one(P[1]));
      // Too blurry to repair: mark it so the row borrows the date the other rows show.
      const blurry = '0/0/' + y;
      if (!/[147]/.test(P[0]) || Number(mo) > 12) return blurry;
      const sep = /[\/179|]/;
      const day = sep.test(P[2]) ? P.slice(3, -1) : P.slice(2, -1);
      if (!sep.test(P[P.length - 1]) || !/^\d{1,2}$/.test(day) || Number(day) < 1 || Number(day) > 31) return blurry;
      return mo + '/' + Number(day) + '/' + y;
    });
  }

  function stampsIn(s) {
    s = fixDates(s);
    return [...String(s).matchAll(DATE_TIME)].map(m => ({ d: isoDate(m), t: clock(m[4], m[5], m[6]),
        marked: !!m[6] || (m[4] != null && (Number(m[4]) > 12 || Number(m[4]) === 0 || /^0\d/.test(m[4]))) }))
      .map(x => /-00-00$/.test(x.d) ? Object.assign(x, { d: '?' }) : x).filter(x => x.d === '?' || validIso(x.d))
      .sort((a, b) => a.d < b.d ? -1 : a.d > b.d ? 1 : (a.t ?? -1) - (b.t ?? -1));
  }

  function parseWorklist(text) {
    const lines = String(text || '').split(/\r?\n/).map(fixAccessions);
    const used = new Set();
    const rows = [];
    // The list's Start/End Date filter sits above the first row. When both are the same day,
    // that is the day everything on the list was signed.
    let firstRow = lines.findIndex(l => ACCESSION.test(l.toUpperCase()));
    // Rows start below the column header ("Exam  Accession  RIS Status ..."), or at the first accession.
    const hdr = lines.findIndex(l => /\bEXAM\b/i.test(l) && /ACCESS|STATUS|JOB/i.test(l));
    const firstExam = hdr >= 0 ? hdr + 1 : (firstRow >= 0 ? Math.max(0, firstRow - 1) : 0);
    if (firstRow < 0 && hdr >= 0) firstRow = hdr + 1;
    const headDates = stampsIn(lines.slice(0, firstRow < 0 ? lines.length : firstRow).join('\n')).map(s => s.d);
    const listDate = headDates.length && headDates.every(d => d === headDates[0]) ? headDates[0] : null;
    const dateCounts = {};
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      let line = lines[i];
      let acc = line.toUpperCase().match(ACCESSION);
      let noAcc = false;
      if (!acc) {
        // No readable accession: find the row by its exam name instead. The exam starts with a
        // modality word near the start of the line and runs until the next column.
        const L = fixXr(line.toUpperCase());
        if (i < firstExam || CATEGORY.test(L) || CATEGORY_XR.test(L)) continue;
        const m = L.match(EXAM_START);
        if (!m || m.index > 30) continue;
        if (!/(ABD|ANGIO|BREAST|BRAIN|HEAD|CHEST|SPINE|NECK|PELV|RENAL|KIDNEY|THYROID|LUNG|KNEE|HIP|FOOT|HAND|WRIST|ANKLE|SHOULDER|ELBOW|KUB|FLUORO|ESOPH|BARIUM|GI\b|HEPATO|BONE|CAROTID|VENOUS|DOPPLER|EXTREM|SOFT|SCROT|UTER|OB\b|ORBIT|FACE|SINUS|AORTA|STROKE|MAMMO|SCREEN|BIOPSY|DRAIN|THORA|PARACENT|CVC|PICC|PORT|TUNNEL)/.test(L.slice(m.index, m.index + 60))) continue;
        const start = m.index + m[1].length;
        const rest = L.slice(start);
        const cut = rest.search(/\s{2,}|\s[-—–=_]*\S*\d\S{4,}|\sCOMPLETE\b|\sADDEND|\s\d{1,2}\/\d/);
        const end = start + (cut < 0 ? rest.length : cut);
        // The accession may sit on the next line on a tilted photo.
        const nx = (lines[i + 1] || '').toUpperCase(), nacc = nx.match(ACCESSION);
        if (nacc && !EXAM_START.test(nx.slice(0, nacc.index)) && !/[A-Z]{3,}/.test(nx.slice(0, nacc.index).replace(/\b(COMPLETE|SIGNED|STAT|NORMAL)\b/g, ''))) {
          used.add(i + 1);
          line = L.slice(0, end) + ' ' + nx.slice(nacc.index) + '  ' + L.slice(end);
          acc = line.match(ACCESSION);
        } else {
          line = L; noAcc = true;
          acc = Object.assign([''], { index: end });
        }
      }
      const before = fixXr(line.slice(0, acc.index).toUpperCase().replace(/[A-Z]{10,}/g, unglue));
      // Patient names come first ("LAST, FIRST"); the exam starts at the first modality word after the comma.
      const commaAt = before.indexOf(',');
      const searchFrom = commaAt >= 0 ? commaAt + 1 : 0;
      let tail = before.slice(searchFrom);
      let mod = tail.match(MODALITY_START);
      const nextU = (lines[i + 1] || '').toUpperCase();
      if (!mod) {
        // The photo's left edge clipped the modality ("LUMBAR SPINE WO CON"). The line below
        // carries the category ("CT - SPINE/LUMBER"), which names it.
        const cat = nextU.match(CATEGORY);
        const words = tail.replace(/[^A-Z ]/g, ' ').trim();
        if (cat && /[A-Z]{3,}.*\s[A-Z]{2,}/.test(words)) { tail = (/^ANGIO/.test(words) ? 'CT' : cat[1]) + ' ' + words; mod = tail.match(MODALITY_START); }
        else if (!/[A-Z]{3,}/.test(words)) {
          // Nothing before the accession: on a tilted photo the exam name can land on the line just
          // below or above. Use it if it reads as an exam name (not a category line) and isn't taken.
          for (const k of [i + 1, i - 1]) {
            const L = (lines[k] || '').toUpperCase();
            if (k < 0 || used.has(k) || ACCESSION.test(L) || CATEGORY.test(L)) continue;
            const m = L.match(MODALITY_START);
            if (!m || !/^\W*$/.test(L.slice(0, m.index).replace(/[A-Z]{1,2}\b/g, ''))) continue;
            tail = L.slice(m.index).split(/\s{2,}|\s\d/)[0]; mod = tail.match(MODALITY_START); used.add(k); break;
          }
        }
      }
      let unreadable = false, partial = false;
      // An angiogram whose "CT" was clipped off the edge of the photo.
      if (!mod && /^\W*ANGIO\b/.test(tail.trim())) { tail = 'CT ' + tail.trim().replace(/\bMECK\b/g, 'NECK'); mod = tail.match(MODALITY_START); partial = true; }
      if (!mod) {
        // The accession is clear but the exam name isn't. Keep the row (so it isn't silently lost)
        // with whatever letters survived, and let the reader pick its points.
        const bits = (tail.match(/[A-Z]{3,}/g) || []).filter(w => !/^(COMPLETE|SIGNED|STAT|NORMAL|FIOLA|FRANK)$/.test(w)).join(' ');
        tail = 'UNREADABLE ' + bits; mod = { index: 0 }; unreadable = true;
      }
      let exam = tail.slice(mod.index).replace(/[^A-Z0-9\/<>&+\- .()]/g, ' ').replace(/\s+/g, ' ').trim();
      // An exam that wraps ("CT CERVICAL SPINE WO" / "CON") — pull a short continuation word from the next line.
      // A long exam name wraps onto the next line ("CT ABDOMEN PELVIS W" / "CON",
      // "US SOFT TISSUE HEAD" / "AND NECK", "CT LUNG SCREENING LOW" / "DOSE").
      if (!used.has(i + 1)) { const more = continuation(lines[i + 1]); if (more) exam += ' ' + more; }
      // Dates for this row: on the same line after the accession, or on the line below it
      // (the worklist shows the exam date and time under the accession number).
      const nextLine = lines[i + 1] && !ACCESSION.test(lines[i + 1].toUpperCase()) ? lines[i + 1] : '';
      // The status column says "Addendum" when the report was amended (e.g. pathology results).
      const addendum = /ADDEN/i.test(line.slice(acc.index + acc[0].length) + ' ' + nextLine);
      // A row spans two lines: the exam date sits under the accession, and some layouts also show
      // the signed date and time ("Job State") on the first line. Take the dates from both lines.
      const around = line.slice(acc.index + acc[0].length) + '  ' + nextLine;
      let stamps = stampsIn(around);
      // One date on each line: the first line's is the signed date (Job State), the second line's
      // is the exam date. Put them in that order whatever their times say.
      const s1 = stampsIn(line.slice(acc.index + acc[0].length)), s2 = stampsIn(nextLine);
      if (s1.length === 1 && s2.length === 1 && (s2[0].d === '?' || s1[0].d === '?' || s2[0].d <= s1[0].d)) stamps = [s2[0], s1[0]];
      let examDate = null, signedDate = null, signedTime = null, oneDate = false;
      if (stamps.length > 1) {
        // Both dates on the row: the earlier is the exam, the later is when it was signed.
        examDate = stamps[0].d; signedDate = stamps[stamps.length - 1].d; signedTime = stamps[stamps.length - 1].t;
        // "11/9/2026 1:23" with its "pm" wrapped onto the line below: find the loose am/pm.
        const last = stamps[stamps.length - 1];
        if (!last.marked && signedTime != null) {
          const loose = around.toUpperCase().replace(/\d{1,2}[:.]\d{2}\s*[AP]\.?M\b/g, ' ').match(/(?:^|\s)([AP])\.?M(?=\s|$)/);
          if (loose) { let hh = Math.floor(signedTime / 60) % 12; if (loose[1] === 'P') hh += 12; signedTime = hh * 60 + signedTime % 60; }
          else signedTime = null;
        }
      } else if (stamps.length === 1) {
        // One date on the row is the exam date; the list's date filter is the day it was signed.
        examDate = stamps[0].d;
        signedDate = listDate && listDate >= examDate ? listDate : examDate;
        oneDate = !listDate;
      } else signedDate = listDate;
      const ageDays = examDate && signedDate && examDate !== '?' && signedDate !== '?' ? daysBetween(examDate, signedDate) : null;
      rows.push({ noAcc, unreadable, partial, oneDate, exam, accession: noAcc ? '' : cleanAccession(acc[0]), examDate, signedDate, signedTime, ageDays, addendum });
    }
    // A row where the signed date wasn't read has only its exam date. When the other rows on the
    // photo show when they were signed, this one was signed then too, not on its exam date.
    // Blurry dates ('?') borrow from the rest of the photo: the list's date filter, or the date
    // most rows were signed. A blurry exam date is taken as the signed date (no late bonus guessed).
    {
      const c = {}; let best = null, bn = 0;
      rows.forEach(r => { if (r.signedDate && r.signedDate !== '?') c[r.signedDate] = (c[r.signedDate] || 0) + 1; });
      for (const d in c) if (c[d] > bn) { bn = c[d]; best = d; }
      const fill = listDate || best;
      rows.forEach(r => {
        if (r.signedDate === '?' || !r.signedDate) r.signedDate = fill;
        if (r.examDate === '?') r.examDate = r.signedDate;
        if (r.examDate && r.signedDate && r.examDate > r.signedDate) r.examDate = r.signedDate;
        r.ageDays = r.examDate && r.signedDate ? daysBetween(r.examDate, r.signedDate) : null;
      });
    }
    const full = {}; let main = null, mainN = 0;
    rows.forEach(r => { if (!r.oneDate && r.examDate && r.signedDate && r.examDate !== r.signedDate || (!r.oneDate && r.signedTime != null)) full[r.signedDate] = (full[r.signedDate] || 0) + 1; });
    for (const d in full) if (full[d] > mainN) { mainN = full[d]; main = d; }
    // No signed dates anywhere on the photo: most exams are read the day they're done, so the
    // most common date is the reading day, and older exams were read then too.
    if (!main && !listDate) {
      const ex = {}; rows.forEach(r => { if (r.examDate) ex[r.examDate] = (ex[r.examDate] || 0) + 1; });
      for (const d in ex) if (ex[d] > mainN) { mainN = ex[d]; main = d; }
      if (mainN < 2) main = null;
    }
    if (main) rows.forEach(r => {
      if (r.oneDate && r.examDate && main >= r.examDate) { r.signedDate = main; r.signedTime = null; r.ageDays = daysBetween(r.examDate, main); }
    });
    rows.forEach(r => { if (r.signedDate) dateCounts[r.signedDate] = (dateCounts[r.signedDate] || 0) + 1; });
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
    // Last six digits plus the letters: the leading digits are the ones the reader garbles most.
    return m ? m[1].slice(-6) + m[2] : String(a || '').toUpperCase();
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

  // Breast biopsies and loc wires: the procedure counts when it's read the same day or the day after.
  // The pathology addendum, written once results are back (usually 4+ days later), counts 0.
  const BREAST_PROC_KEYS = ['mg_biopsy_loc', 'us_breast_biopsy', 'mr_breast_biopsy'];
  function procedureRule(key, ageDays, addendum) {
    if (!BREAST_PROC_KEYS.includes(key)) return null;
    if (addendum) return 'addendum';
    if (ageDays == null || ageDays <= 1) return 'procedure';
    if (ageDays >= 4) return 'addendum';
    return 'ask';
  }

  // A plain non-contrast CT orbits can be a pre-MRI metal screen (1) or read for disease (3);
  // the worklist name doesn't say which, so the reader is asked. Contrast studies are always disease.
  function orbitsNeedsAsk(exam) {
    if (classify(exam).key !== 'ct_orbits') return false;
    return !has(normalize(exam), WC);
  }

  const api = { fixAccessions, orbitsNeedsAsk, BREAST_PROC_KEYS, procedureRule, ACCESSION, linkedKey, LATE_DAYS, LATE_BONUS, HARDWARE_BONUS, SPINE_CT_KEYS, daysBetween, DEFAULT_POINTS, normalize, classify, parseWorklist, cleanAccession, accessionKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DIGMatcher = api;
})(typeof window !== 'undefined' ? window : globalThis);
