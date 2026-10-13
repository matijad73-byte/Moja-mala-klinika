import { LabReport, ParameterTrend, TrendDataPoint, ParameterCategory, ParameterStatus } from '../types';

const CYRILLIC_TO_LATIN: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'ђ': 'dj', 'е': 'e', 'ж': 'z',
  'з': 'z', 'и': 'i', 'ј': 'j', 'к': 'k', 'л': 'l', 'љ': 'lj', 'м': 'm', 'н': 'n',
  'њ': 'nj', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'ћ': 'c', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'c', 'џ': 'dz', 'ш': 's',
};

export function normalizeString(str: string): string {
  if (!str) return '';
  const lower = str.toLowerCase();
  const latinized = lower
    .split('')
    .map((c) => CYRILLIC_TO_LATIN[c] || c)
    .join('');

  return latinized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[čć]/g, 'c')
    .replace(/[đ]/g, 'dj')
    .replace(/[š]/g, 's')
    .replace(/[ž]/g, 'z')
    .trim();
}

/**
 * Robust clinical parser for reference interval text (e.g. "3.10 - 5.20", "< 3.30", "> 1.03", "od 49 do 106")
 */
export function parseReferenceRange(
  refText: string | undefined | null,
  existingMin?: number | null,
  existingMax?: number | null
): { refMin: number | null; refMax: number | null; refText: string } {
  let min: number | null = existingMin !== undefined && existingMin !== null && !isNaN(Number(existingMin)) ? Number(existingMin) : null;
  let max: number | null = existingMax !== undefined && existingMax !== null && !isNaN(Number(existingMax)) ? Number(existingMax) : null;
  const rawText = String(refText || '').trim();

  if (min !== null && max !== null) {
    return { refMin: min, refMax: max, refText: rawText || `${min} - ${max}` };
  }

  if (!rawText) {
    return { refMin: min, refMax: max, refText: min !== null && max !== null ? `${min} - ${max}` : '' };
  }

  const clean = rawText.replace(',', '.');

  // Pattern A: Two boundaries separated by hyphen, dash, or "do" (e.g. "3.10 - 5.20", "0.39 - 0.50", "49-106", "od 3.9 do 6.1")
  const rangeMatch = clean.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:-|–|—|do)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (rangeMatch) {
    const pMin = parseFloat(rangeMatch[1]);
    const pMax = parseFloat(rangeMatch[2]);
    if (!isNaN(pMin) && !isNaN(pMax)) {
      min = min !== null ? min : pMin;
      max = max !== null ? max : pMax;
      return { refMin: min, refMax: max, refText: rawText };
    }
  }

  // Pattern B: Upper boundary only ("< 5.20", "<= 3.30", "do 38", "max 41")
  const upperMatch = clean.match(/(?:<|<=|do|max|ispod)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (upperMatch) {
    const pMax = parseFloat(upperMatch[1]);
    if (!isNaN(pMax)) {
      max = max !== null ? max : pMax;
      return { refMin: min, refMax: max, refText: rawText };
    }
  }

  // Pattern C: Lower boundary only ("> 1.03", ">= 1.03", "preko 1.0", "min 1.03")
  const lowerMatch = clean.match(/(?:>|>=|preko|min|iznad)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (lowerMatch) {
    const pMin = parseFloat(lowerMatch[1]);
    if (!isNaN(pMin)) {
      min = min !== null ? min : pMin;
      return { refMin: min, refMax: max, refText: rawText };
    }
  }

  return { refMin: min, refMax: max, refText: rawText };
}

/**
 * Deep Clinical Status Evaluator
 * Evaluates physiological state based on parameter nature and lab bounds.
 */
export function calculateParameterStatus(
  val: number,
  refMin: number | null,
  refMax: number | null,
  canonicalKey: string
): ParameterStatus {
  // Protective lipid fraction (HDL): lower is alarming, higher is cardioprotective
  if (canonicalKey === 'hdl_holesterol') {
    const minThreshold = refMin !== null ? refMin : 1.03;
    if (val < minThreshold) return 'low';
    return 'normal';
  }

  // One-sided upper limit markers (Triglycerides, LDL, AST, ALT, GGT, CRP, SE, Bilirubin, IA, FR, Uric Acid)
  const isUpperBoundaryOnly =
    canonicalKey === 'ldl_holesterol' ||
    canonicalKey === 'non_hdl_holesterol' ||
    canonicalKey === 'vldl_holesterol' ||
    canonicalKey === 'trigliceridi' ||
    canonicalKey === 'indeks_ateroskleroze' ||
    canonicalKey === 'faktor_rizika' ||
    canonicalKey === 'ast' ||
    canonicalKey === 'alt' ||
    canonicalKey === 'ggt' ||
    canonicalKey === 'alp' ||
    canonicalKey === 'ldh' ||
    canonicalKey === 'crp' ||
    canonicalKey === 'direktni_bilirubin' ||
    canonicalKey === 'ukupni_bilirubin' ||
    canonicalKey === 'mokracna_kiselina';

  if (isUpperBoundaryOnly && refMax !== null) {
    if (val > refMax) return 'high';
    if (refMin !== null && refMin > 0 && val < refMin) return 'low';
    return 'normal';
  }

  // Standard two-sided physiological boundaries
  if (refMax !== null && val > refMax) return 'high';
  if (refMin !== null && val < refMin) return 'low';

  return 'normal';
}

/**
 * Standardize parameter names, keys, and categories with complete clinical precision.
 * Crucial: Non-HDL, VLDL, and Indices are evaluated BEFORE generic Cholesterol.
 */
export function getCanonicalParameter(
  rawName: string,
  rawAlias?: string,
  rawCategory?: ParameterCategory
): {
  canonicalKey: string;
  name: string;
  alias: string;
  category: ParameterCategory;
} {
  const norm = normalizeString(rawName);
  const normAlias = normalizeString(rawAlias || '');

  // 0. Urin i sediment urina: ako je parametar pod kategorijom Urin ili naziv sadrži urin/sediment
  // Obezbeđuje da parametri urina (Leukociti, Eritrociti, Glukoza, Proteini...) ne prepišu istoimene parametre iz krvi!
  if (rawCategory === 'Urin' || norm.includes('urin') || norm.includes('sediment')) {
    if (norm.includes('leukocit')) {
      return {
        canonicalKey: 'urin_leukociti',
        name: 'Leukociti (urin)',
        alias: 'LEU (u)',
        category: 'Urin',
      };
    }
    if (norm.includes('eritrocit')) {
      return {
        canonicalKey: 'urin_eritrociti',
        name: 'Eritrociti (urin)',
        alias: 'ERY (u)',
        category: 'Urin',
      };
    }
    if (norm.includes('glukoz')) {
      return {
        canonicalKey: 'urin_glukoza',
        name: 'Glukoza (urin)',
        alias: 'GLU (u)',
        category: 'Urin',
      };
    }
    if (norm.includes('protein') || norm.includes('belancevin') || norm.includes('bjelancevin')) {
      return {
        canonicalKey: 'urin_proteini',
        name: 'Proteini (urin)',
        alias: 'PRO (u)',
        category: 'Urin',
      };
    }
    if (norm.includes('bilirubin')) {
      return {
        canonicalKey: 'urin_bilirubin',
        name: 'Bilirubin (urin)',
        alias: 'BIL (u)',
        category: 'Urin',
      };
    }
    if (norm.includes('urobilinogen')) {
      return {
        canonicalKey: 'urin_urobilinogen',
        name: 'Urobilinogen (urin)',
        alias: 'UBG',
        category: 'Urin',
      };
    }
    if (norm.includes('keton') || norm.includes('aceton')) {
      return {
        canonicalKey: 'urin_ketoni',
        name: 'Ketoni (urin)',
        alias: 'KET',
        category: 'Urin',
      };
    }
    if (norm.includes('nitrit')) {
      return {
        canonicalKey: 'urin_nitriti',
        name: 'Nitriti (urin)',
        alias: 'NIT',
        category: 'Urin',
      };
    }
    if (norm.includes('specificna') || norm.includes('specifična') || norm.includes('gustin') || norm.includes('tezina') || norm.includes('težina')) {
      return {
        canonicalKey: 'urin_specificna_tezina',
        name: 'Specifična težina (urin)',
        alias: 'SG',
        category: 'Urin',
      };
    }
    if (norm.includes('reakcija') || norm === 'ph' || norm.includes('ph')) {
      return {
        canonicalKey: 'urin_ph',
        name: 'Reakcija (pH urina)',
        alias: 'pH',
        category: 'Urin',
      };
    }
    if (norm.includes('izgled')) {
      return {
        canonicalKey: 'urin_izgled',
        name: 'Izgled urina',
        alias: 'Izgled',
        category: 'Urin',
      };
    }
    if (norm.includes('boja')) {
      return {
        canonicalKey: 'urin_boja',
        name: 'Boja urina',
        alias: 'Boja',
        category: 'Urin',
      };
    }
    if (norm.includes('bakterij')) {
      return {
        canonicalKey: 'urin_bakterije',
        name: 'Bakterije (urin)',
        alias: 'Bakt',
        category: 'Urin',
      };
    }
    if (norm.includes('epitel')) {
      return {
        canonicalKey: 'urin_epitelne_celije',
        name: 'Epitelne ćelije (urin)',
        alias: 'Epitel',
        category: 'Urin',
      };
    }
    if (norm.includes('kristal') || norm.includes('oksalat')) {
      return {
        canonicalKey: 'urin_kristali',
        name: 'Kristali (urin)',
        alias: 'Kristali',
        category: 'Urin',
      };
    }
    if (norm.includes('sluz') || norm.includes('mucus')) {
      return {
        canonicalKey: 'urin_sluz',
        name: 'Sluz (urin)',
        alias: 'Sluz',
        category: 'Urin',
      };
    }
  }

  // 1. Non-HDL Cholesterol (MUST be checked before HDL to prevent partial match)
  if (
    norm.includes('non-hdl') ||
    norm.includes('non hdl') ||
    norm.includes('ne-hdl') ||
    norm.includes('ne hdl') ||
    normAlias === 'non-hdl' ||
    normAlias === 'nonhdl'
  ) {
    return {
      canonicalKey: 'non_hdl_holesterol',
      name: 'Non-HDL Holesterol',
      alias: 'Non-HDL',
      category: 'Lipidni status',
    };
  }

  // 2. VLDL Cholesterol (MUST be checked before Total Cholesterol)
  if (norm.includes('vldl') || normAlias === 'vldl') {
    return {
      canonicalKey: 'vldl_holesterol',
      name: 'VLDL Holesterol',
      alias: 'VLDL',
      category: 'Lipidni status',
    };
  }

  // 3. Indeks ateroskleroze (IA = LDL/HDL)
  if (
    norm.includes('indeks ater') ||
    norm.includes('aterogen') ||
    normAlias === 'ia' ||
    norm.includes('ldl/hdl') ||
    norm.includes('ldl / hdl')
  ) {
    return {
      canonicalKey: 'indeks_ateroskleroze',
      name: 'Indeks ateroskleroze',
      alias: 'IA',
      category: 'Lipidni status',
    };
  }

  // 4. Faktor rizika (FR = Ukupni Holesterol / HDL)
  if (
    norm.includes('faktor riz') ||
    normAlias === 'fr' ||
    norm.includes('chol/hdl') ||
    norm.includes('chol / hdl') ||
    norm.includes('hol/hdl') ||
    norm.includes('hol / hdl')
  ) {
    return {
      canonicalKey: 'faktor_rizika',
      name: 'Faktor rizika',
      alias: 'FR',
      category: 'Lipidni status',
    };
  }

  // 5. HDL Cholesterol (Check before total cholesterol, strictly excluding non-hdl and vldl)
  if (
    !norm.includes('non') &&
    !norm.includes('vldl') &&
    (norm.includes('hdl') ||
      normAlias === 'hdl' ||
      norm.includes('alfa-lipo') ||
      norm.includes('alfa lipo') ||
      norm.includes('alpha-lipo'))
  ) {
    return {
      canonicalKey: 'hdl_holesterol',
      name: 'HDL Holesterol',
      alias: 'HDL',
      category: 'Lipidni status',
    };
  }

  // 6. LDL Cholesterol (Check before total cholesterol)
  if (
    !norm.includes('vldl') &&
    (norm.includes('ldl') ||
      normAlias === 'ldl' ||
      norm.includes('beta-lipo') ||
      norm.includes('beta lipo'))
  ) {
    return {
      canonicalKey: 'ldl_holesterol',
      name: 'LDL Holesterol',
      alias: 'LDL',
      category: 'Lipidni status',
    };
  }

  // 7. Triglycerides
  if (
    norm.includes('triglic') ||
    norm.includes('trig') ||
    normAlias === 'trig' ||
    normAlias === 'tg' ||
    norm === 'tg'
  ) {
    return {
      canonicalKey: 'trigliceridi',
      name: 'Trigliceridi',
      alias: 'TRIG',
      category: 'Lipidni status',
    };
  }

  // 8. Total Cholesterol (Strictly ensures bilirubin, proteins, or fractions aren't swallowed)
  if (
    !norm.includes('bilirubin') &&
    !norm.includes('protein') &&
    !norm.includes('hdl') &&
    !norm.includes('ldl') &&
    !norm.includes('vldl') &&
    !norm.includes('non') &&
    (norm.includes('holesterol') ||
      norm.includes('chol') ||
      normAlias === 'chol' ||
      norm === 'hol' ||
      norm === 's-hol' ||
      (norm.includes('ukup') && (norm.includes('hol') || norm.includes('lip') || norm.includes('holest'))))
  ) {
    return {
      canonicalKey: 'ukupni_holesterol',
      name: 'Ukupni Holesterol',
      alias: 'CHOL',
      category: 'Lipidni status',
    };
  }

  // 9. Glucose / Šećer
  if (norm.includes('glukoz') || norm.includes('secer') || normAlias === 'glu') {
    return {
      canonicalKey: 'glukoza',
      name: 'Glukoza',
      alias: 'GLU',
      category: 'Biohemija',
    };
  }

  // 10. HbA1c (Tromesečni šećer)
  if (norm.includes('hba1c') || norm.includes('glikozilirani')) {
    return {
      canonicalKey: 'hba1c',
      name: 'HbA1c',
      alias: 'HbA1c',
      category: 'Biohemija',
    };
  }

  // 11. AST / SGOT
  if (norm.includes('ast') || norm.includes('sgot') || normAlias === 'ast') {
    return {
      canonicalKey: 'ast',
      name: 'AST (SGOT)',
      alias: 'AST',
      category: 'Enzimi jetre',
    };
  }

  // 12. ALT / SGPT
  if (norm.includes('alt') || norm.includes('sgpt') || normAlias === 'alt') {
    return {
      canonicalKey: 'alt',
      name: 'ALT (SGPT)',
      alias: 'ALT',
      category: 'Enzimi jetre',
    };
  }

  // 13. GGT (Gama GT)
  if (
    norm.includes('ggt') ||
    norm.includes('gama') ||
    norm.includes('gamma') ||
    normAlias === 'ggt' ||
    norm.includes('γ-gt')
  ) {
    return {
      canonicalKey: 'ggt',
      name: 'GGT',
      alias: 'GGT',
      category: 'Enzimi jetre',
    };
  }

  // 14. Alkalna fosfataza (ALP)
  if (norm.includes('alkalna') || norm.includes('fosfataza') || normAlias === 'alp' || normAlias === 'af') {
    return {
      canonicalKey: 'alp',
      name: 'Alkalna fosfataza (ALP)',
      alias: 'ALP',
      category: 'Enzimi jetre',
    };
  }

  // 15. LDH
  if (norm.includes('ldh') || norm.includes('laktat dehidrogenaza') || normAlias === 'ldh') {
    return {
      canonicalKey: 'ldh',
      name: 'LDH',
      alias: 'LDH',
      category: 'Enzimi jetre',
    };
  }

  // 16. Direct Bilirubin
  if (norm.includes('bilirubin') && (norm.includes('direkt') || normAlias === 'dbil')) {
    return {
      canonicalKey: 'direktni_bilirubin',
      name: 'Direktni bilirubin',
      alias: 'DBIL',
      category: 'Enzimi jetre',
    };
  }

  // 17. Total Bilirubin (If report says "Bilirubin" or "Ukupni bilirubin")
  if (norm.includes('bilirubin')) {
    return {
      canonicalKey: 'ukupni_bilirubin',
      name: 'Ukupni bilirubin',
      alias: 'TBIL',
      category: 'Enzimi jetre',
    };
  }

  // 18. Urea / BUN
  if (norm.includes('urea') || norm.includes('bun') || normAlias === 'urea') {
    return {
      canonicalKey: 'urea',
      name: 'Urea',
      alias: 'UREA',
      category: 'Bubrežna funkcija',
    };
  }

  // 19. Creatinine / Kreatinin
  if (norm.includes('kreatinin') || norm.includes('crea') || normAlias === 'crea') {
    return {
      canonicalKey: 'kreatinin',
      name: 'Kreatinin',
      alias: 'CREA',
      category: 'Bubrežna funkcija',
    };
  }

  // 20. Uric acid / Mokraćna kiselina
  if (
    norm.includes('mokracna') ||
    norm.includes('uricum') ||
    norm.includes('urat') ||
    normAlias === 'uric' ||
    normAlias === 'ua'
  ) {
    return {
      canonicalKey: 'mokracna_kiselina',
      name: 'Mokraćna kiselina',
      alias: 'Urat',
      category: 'Bubrežna funkcija',
    };
  }

  // 21. CRP (C-Reaktivni Protein)
  if (norm.includes('crp') || norm.includes('reaktivni protein') || normAlias === 'crp') {
    return {
      canonicalKey: 'crp',
      name: 'CRP (C-Reaktivni Protein)',
      alias: 'CRP',
      category: 'Zapaljenski markeri',
    };
  }

  // 22. Sedimentation / SE
  if (
    norm.includes('sedimentac') ||
    norm.includes('se ') ||
    norm === 'se' ||
    normAlias === 'se' ||
    norm.includes('brzina sed')
  ) {
    return {
      canonicalKey: 'se',
      name: 'Sedimentacija (SE)',
      alias: 'SE',
      category: 'Hematologija',
    };
  }

  // 23. Leukocytes / WBC
  if (norm.includes('leukocit') || norm.includes('wbc') || norm.includes('bela krvna') || normAlias === 'wbc') {
    return {
      canonicalKey: 'leukociti',
      name: 'Leukociti (WBC)',
      alias: 'WBC',
      category: 'Hematologija',
    };
  }

  // 24. Erythrocytes / RBC
  if (norm.includes('eritrocit') || norm.includes('rbc') || norm.includes('crvena krvna') || normAlias === 'rbc') {
    return {
      canonicalKey: 'eritrociti',
      name: 'Eritrociti (RBC)',
      alias: 'RBC',
      category: 'Hematologija',
    };
  }

  // 25. Hemoglobin
  if (norm.includes('hemoglobin') || norm.includes('hgb') || normAlias === 'hgb' || normAlias === 'hb') {
    return {
      canonicalKey: 'hemoglobin',
      name: 'Hemoglobin (HGB)',
      alias: 'HGB',
      category: 'Hematologija',
    };
  }

  // 26. Hematocrit
  if (norm.includes('hematokrit') || norm.includes('hct') || normAlias === 'hct') {
    return {
      canonicalKey: 'hematokrit',
      name: 'Hematokrit (HCT)',
      alias: 'HCT',
      category: 'Hematologija',
    };
  }

  // 27. Platelets / Trombociti
  if (norm.includes('trombocit') || norm.includes('plt') || normAlias === 'plt') {
    return {
      canonicalKey: 'trombociti',
      name: 'Trombociti (PLT)',
      alias: 'PLT',
      category: 'Hematologija',
    };
  }

  // 28. MCV
  if (norm === 'mcv' || normAlias === 'mcv' || norm.includes('prosecni volumen')) {
    return { canonicalKey: 'mcv', name: 'MCV', alias: 'MCV', category: 'Hematologija' };
  }

  // 29. MCH
  if (norm === 'mch' || normAlias === 'mch') {
    return { canonicalKey: 'mch', name: 'MCH', alias: 'MCH', category: 'Hematologija' };
  }

  // 30. MCHC
  if (norm === 'mchc' || normAlias === 'mchc') {
    return { canonicalKey: 'mchc', name: 'MCHC', alias: 'MCHC', category: 'Hematologija' };
  }

  // 31. RDW
  if (norm.includes('rdw') || normAlias === 'rdw') {
    return { canonicalKey: 'rdw', name: 'RDW', alias: 'RDW', category: 'Hematologija' };
  }

  // 32. Iron / Gvožđe
  if (
    norm.includes('gvozdj') ||
    norm.includes('gvozd') ||
    norm.includes('iron') ||
    normAlias === 'fe' ||
    norm === 'fe' ||
    norm === 's-fe' ||
    norm.includes('serumsko gvozd')
  ) {
    return {
      canonicalKey: 'fe',
      name: 'Gvožđe (Fe)',
      alias: 'Fe',
      category: 'Biohemija',
    };
  }

  // 33. Ferritin
  if (norm.includes('feritin') || norm.includes('ferritin')) {
    return {
      canonicalKey: 'feritin',
      name: 'Feritin',
      alias: 'Feritin',
      category: 'Biohemija',
    };
  }

  // 34. Potassium / Kalijum
  if (norm.includes('kalijum') || normAlias === 'k' || norm === 'k' || norm === 's-k') {
    return {
      canonicalKey: 'kalijum',
      name: 'Kalijum',
      alias: 'K',
      category: 'Elektroliti',
    };
  }

  // 35. Sodium / Natrijum
  if (norm.includes('natrijum') || normAlias === 'na' || norm === 'na' || norm === 's-na') {
    return {
      canonicalKey: 'natrijum',
      name: 'Natrijum',
      alias: 'Na',
      category: 'Elektroliti',
    };
  }

  // 36. Calcium / Kalcijum
  if (norm.includes('kalcijum') || normAlias === 'ca' || norm === 'ca' || norm === 's-ca') {
    return {
      canonicalKey: 'kalcijum',
      name: 'Kalcijum',
      alias: 'Ca',
      category: 'Elektroliti',
    };
  }

  // 37. Magnesium / Magnezijum
  if (norm.includes('magnezijum') || normAlias === 'mg' || norm === 'mg' || norm === 's-mg') {
    return {
      canonicalKey: 'magnezijum',
      name: 'Magnezijum',
      alias: 'Mg',
      category: 'Elektroliti',
    };
  }

  // 38. Chlorides / Hloridi
  if (norm.includes('hlorid') || normAlias === 'cl' || norm === 'cl') {
    return {
      canonicalKey: 'hloridi',
      name: 'Hloridi',
      alias: 'Cl',
      category: 'Elektroliti',
    };
  }

  // 39. TSH
  if (norm.includes('tsh') || normAlias === 'tsh') {
    return {
      canonicalKey: 'tsh',
      name: 'TSH',
      alias: 'TSH',
      category: 'Hormoni',
    };
  }

  // 40. FT4
  if (norm.includes('ft4') || normAlias === 'ft4') {
    return {
      canonicalKey: 'ft4',
      name: 'FT4',
      alias: 'FT4',
      category: 'Hormoni',
    };
  }

  // 41. FT3
  if (norm.includes('ft3') || normAlias === 'ft3') {
    return {
      canonicalKey: 'ft3',
      name: 'FT3',
      alias: 'FT3',
      category: 'Hormoni',
    };
  }

  // 42. Vitamin D
  if (norm.includes('vitamin d') || norm.includes('vit d') || norm.includes('25-oh')) {
    return {
      canonicalKey: 'vitamin_d',
      name: 'Vitamin D (25-OH)',
      alias: 'Vit D',
      category: 'Biohemija',
    };
  }

  // 43. Vitamin B12
  if (norm.includes('b12') || norm.includes('vitamin b12')) {
    return {
      canonicalKey: 'vitamin_b12',
      name: 'Vitamin B12',
      alias: 'B12',
      category: 'Biohemija',
    };
  }

  // Fallback: clean trimmed name
  const fallbackKey = norm.replace(/[^a-z0-9]/g, '_');
  return {
    canonicalKey: fallbackKey || rawName.toLowerCase(),
    name: rawName.trim(),
    alias: rawAlias?.trim() || '',
    category: rawCategory || 'Biohemija',
  };
}

/**
 * Calculates whether an increase in a parameter is clinically favorable (protective/recovering)
 * or unfavorable (increasing risk/inflammation/organ stress).
 */
export function evaluateTrendMeaning(
  canonicalKey: string,
  direction: 'up' | 'down' | 'stable',
  latestStatus: ParameterStatus,
  previousStatus?: ParameterStatus
): 'improving' | 'worsening' | 'stable' {
  if (direction === 'stable') return 'stable';

  // Favorable when rising (cardioprotective marker HDL)
  if (canonicalKey === 'hdl_holesterol') {
    if (direction === 'up') return 'improving';
    if (direction === 'down') return 'worsening';
    return 'stable';
  }

  // Hematologic markers recovering towards normal
  const isOxygenTransport =
    canonicalKey === 'hemoglobin' ||
    canonicalKey === 'eritrociti' ||
    canonicalKey === 'fe' ||
    canonicalKey === 'feritin';

  if (isOxygenTransport) {
    if (previousStatus === 'low' && direction === 'up') return 'improving';
    if (latestStatus === 'normal' && previousStatus === 'low') return 'improving';
    if (direction === 'down' && latestStatus === 'low') return 'worsening';
  }

  // Normalizing transition
  if (latestStatus === 'normal' && previousStatus && previousStatus !== 'normal') {
    return 'improving';
  }
  if (latestStatus !== 'normal' && previousStatus === 'normal') {
    return 'worsening';
  }

  // Unfavorable when rising (Lipids, Enzymes, Waste products, Inflammatory markers)
  const isUnfavorableWhenRising =
    canonicalKey === 'ldl_holesterol' ||
    canonicalKey === 'ukupni_holesterol' ||
    canonicalKey === 'trigliceridi' ||
    canonicalKey === 'non_hdl_holesterol' ||
    canonicalKey === 'vldl_holesterol' ||
    canonicalKey === 'indeks_ateroskleroze' ||
    canonicalKey === 'faktor_rizika' ||
    canonicalKey === 'glukoza' ||
    canonicalKey === 'hba1c' ||
    canonicalKey === 'ast' ||
    canonicalKey === 'alt' ||
    canonicalKey === 'ggt' ||
    canonicalKey === 'alp' ||
    canonicalKey === 'ldh' ||
    canonicalKey === 'ukupni_bilirubin' ||
    canonicalKey === 'direktni_bilirubin' ||
    canonicalKey === 'urea' ||
    canonicalKey === 'kreatinin' ||
    canonicalKey === 'mokracna_kiselina' ||
    canonicalKey === 'crp' ||
    canonicalKey === 'se';

  if (isUnfavorableWhenRising) {
    return direction === 'down' ? 'improving' : 'worsening';
  }

  return 'stable';
}

export function calculateTrends(reports: LabReport[]): ParameterTrend[] {
  if (!reports || reports.length === 0) return [];

  // Sort reports chronologically (oldest to newest)
  const sortedReports = [...reports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Map to group parameter data by canonical key
  const parameterMap = new Map<
    string,
    {
      canonicalKey: string;
      name: string;
      alias?: string;
      category: ParameterCategory;
      unit: string;
      refMin: number | null;
      refMax: number | null;
      refText: string;
      dataPoints: TrendDataPoint[];
    }
  >();

  sortedReports.forEach((report) => {
    // 1. Clinical Preprocessing: Harmonize lipid panel parameters for this report
    // Deep Thinking: Ukupni Holesterol is biochemically the sum of fractions (HDL + LDL + VLDL).
    const reportParams = report.parameters.map((p) => ({ ...p }));

    let chol = reportParams.find((p) => {
      const c = getCanonicalParameter(p.name, p.alias, p.category);
      return c.canonicalKey === 'ukupni_holesterol';
    });
    let ldl = reportParams.find((p) => {
      const c = getCanonicalParameter(p.name, p.alias, p.category);
      return c.canonicalKey === 'ldl_holesterol';
    });
    let hdl = reportParams.find((p) => {
      const c = getCanonicalParameter(p.name, p.alias, p.category);
      return c.canonicalKey === 'hdl_holesterol';
    });
    const trig = reportParams.find((p) => {
      const c = getCanonicalParameter(p.name, p.alias, p.category);
      return c.canonicalKey === 'trigliceridi';
    });

    // Golden Rule 1: Ukupni Holesterol is ALWAYS the sum and MUST be greater than LDL and HDL!
    // Golden Rule 1: Ukupni Holesterol is ALWAYS the sum and MUST be greater than LDL and HDL!
    // If LDL > Ukupni, they were swapped by OCR or table alignment:
    if (chol && ldl && chol.value !== null && ldl.value !== null && ldl.value > chol.value) {
      const tempVal = chol.value;
      chol.value = ldl.value;
      ldl.value = tempVal;

      const tempRef = chol.refText;
      chol.refText = ldl.refText;
      ldl.refText = tempRef;

      chol.status = chol.value > 5.20 ? 'high' : 'normal';
      ldl.status = ldl.value > 3.30 ? 'high' : 'normal';
    }

    // Golden Rule 2: Ukupni Holesterol MUST be greater than HDL:
    if (chol && hdl && chol.value !== null && hdl.value !== null && hdl.value > chol.value) {
      const tempVal = chol.value;
      chol.value = hdl.value;
      hdl.value = tempVal;
    }

    // Golden Rule 3: UKUPAN HOLESTEROL JE ZBIR FRAKCIJA: HDL + LDL (+ VLDL)
    // If Total is smaller than the sum of HDL and LDL, harmonize Total to the exact sum
    if (chol && hdl && ldl && chol.value !== null && hdl.value !== null && ldl.value !== null) {
      const vldl = trig && trig.value !== null && trig.value > 0 ? Math.round((trig.value / 2.2) * 100) / 100 : 0;
      const minExpectedTotal = Math.round((hdl.value + ldl.value + vldl) * 100) / 100;

      if (chol.value < (hdl.value + ldl.value - 0.1)) {
        chol.value = minExpectedTotal;
        chol.status = chol.value > 5.20 ? 'high' : 'normal';
      } else if (ldl.value + hdl.value > (chol.value + 0.25)) {
        // If LDL was misread or oversized relative to Total and HDL
        const calcLdl = Math.round(Math.max(0.5, chol.value - hdl.value - vldl) * 100) / 100;
        ldl.value = calcLdl;
        ldl.status = ldl.value > 3.30 ? 'high' : 'normal';
      }
    }

    // Golden Rule 4: Friedewald synthesis if LDL is missing but Total and HDL are present
    if (chol && hdl && (!ldl || ldl.value === null) && chol.value !== null && hdl.value !== null) {
      const vldl = trig && trig.value !== null ? Math.round((trig.value / 2.2) * 100) / 100 : 0.6;
      const calcLdl = Math.round((chol.value - hdl.value - vldl) * 100) / 100;
      if (calcLdl > 0.5) {
        reportParams.push({
          id: `${report.id}-synthesized-ldl`,
          name: 'LDL Holesterol',
          alias: 'LDL',
          category: 'Lipidni status',
          value: calcLdl,
          unit: 'mmol/L',
          refMin: null,
          refMax: 3.30,
          refText: '< 3.30',
          status: calcLdl > 3.30 ? 'high' : 'normal',
          notes: 'Izračunat LDL holesterol (Friedewald-ova formula)',
        });
      }
    }

    // Golden Rule 5: Total Cholesterol is sum if HDL and LDL are present but Total was omitted
    if ((!chol || chol.value === null) && ldl && hdl && ldl.value !== null && hdl.value !== null) {
      const vldl = trig && trig.value !== null ? Math.round((trig.value / 2.2) * 100) / 100 : 0.7;
      const calcChol = Math.round((hdl.value + ldl.value + vldl) * 100) / 100;
      reportParams.push({
        id: `${report.id}-synthesized-chol`,
        name: 'Ukupni Holesterol',
        alias: 'CHOL',
        category: 'Lipidni status',
        value: calcChol,
        unit: 'mmol/L',
        refMin: 3.10,
        refMax: 5.20,
        refText: '3.10 - 5.20',
        status: calcChol > 5.20 ? 'high' : 'normal',
        notes: 'Izračunat ukupan holesterol (zbir frakcija)',
      });
    }

    // Golden Rule 6: Recalculate or add Indeks ateroskleroze and Faktor rizika
    let ia = reportParams.find((p) => {
      const c = getCanonicalParameter(p.name, p.alias, p.category);
      return c.canonicalKey === 'indeks_ateroskleroze';
    });
    let fr = reportParams.find((p) => {
      const c = getCanonicalParameter(p.name, p.alias, p.category);
      return c.canonicalKey === 'faktor_rizika';
    });

    if (ldl && hdl && ldl.value !== null && hdl.value !== null && hdl.value > 0) {
      const calcIa = Math.round((ldl.value / hdl.value) * 100) / 100;
      if (!ia) {
        reportParams.push({
          id: `${report.id}-synthesized-ia`,
          name: 'Indeks ateroskleroze',
          alias: 'IA',
          category: 'Lipidni status',
          value: calcIa,
          unit: '',
          refMin: null,
          refMax: 3.00,
          refText: '< 3.00',
          status: calcIa > 3.00 ? 'high' : 'normal',
        });
      } else {
        ia.value = calcIa;
        ia.status = calcIa > 3.00 ? 'high' : 'normal';
      }
    }

    if (chol && hdl && chol.value !== null && hdl.value !== null && hdl.value > 0) {
      const calcFr = Math.round((chol.value / hdl.value) * 100) / 100;
      if (!fr) {
        reportParams.push({
          id: `${report.id}-synthesized-fr`,
          name: 'Faktor rizika',
          alias: 'FR',
          category: 'Lipidni status',
          value: calcFr,
          unit: '',
          refMin: null,
          refMax: 4.00,
          refText: '< 4.00',
          status: calcFr > 4.00 ? 'high' : 'normal',
        });
      } else {
        fr.value = calcFr;
        fr.status = calcFr > 4.00 ? 'high' : 'normal';
      }
    }

    reportParams.forEach((param) => {
      const canonical = getCanonicalParameter(param.name, param.alias, param.category);
      const key = canonical.canonicalKey;

      // Deeply calibrate reference boundaries
      const refParsed = parseReferenceRange(param.refText, param.refMin, param.refMax);

      // Clean value to strictly enforce null for unmeasured or 0 values
      const cleanVal =
        param.value === null || param.value === undefined || param.value === 0
          ? null
          : param.value;

      // Deeply verify status
      const accurateStatus =
        cleanVal !== null
          ? calculateParameterStatus(
              cleanVal,
              refParsed.refMin,
              refParsed.refMax,
              key
            )
          : 'normal';

      let entry = parameterMap.get(key);

      if (!entry) {
        entry = {
          canonicalKey: key,
          name: canonical.name,
          alias: canonical.alias || param.alias,
          category: canonical.category,
          unit: param.unit,
          refMin: refParsed.refMin,
          refMax: refParsed.refMax,
          refText: refParsed.refText,
          dataPoints: [],
        };
        parameterMap.set(key, entry);
      } else {
        // Backfill richer reference boundaries if previously missing
        if (entry.refMin === null && refParsed.refMin !== null) entry.refMin = refParsed.refMin;
        if (entry.refMax === null && refParsed.refMax !== null) entry.refMax = refParsed.refMax;
        if (!entry.refText && refParsed.refText) entry.refText = refParsed.refText;
        if (!entry.alias && (canonical.alias || param.alias)) {
          entry.alias = canonical.alias || param.alias;
        }
      }

      // Format human-friendly date (e.g. 15.01.2024)
      const d = new Date(report.date);
      const formattedDate = !isNaN(d.getTime())
        ? `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
        : report.date;

      // Prevent duplicate points from the same report or identical timestamp
      const isDuplicate = entry.dataPoints.some(
        (p) => p.reportId === report.id || (p.date === report.date && p.labName === report.laboratoryName)
      );

      if (!isDuplicate) {
        entry.dataPoints.push({
          date: report.date,
          formattedDate,
          value: cleanVal,
          textValue: param.textValue || (cleanVal === null ? 'Nije rađeno' : undefined),
          unit: param.unit,
          status: accurateStatus,
          reportId: report.id,
          labName: report.laboratoryName,
          refMin: refParsed.refMin,
          refMax: refParsed.refMax,
          refText: refParsed.refText,
        });
      }
    });
  });

  const trends: ParameterTrend[] = [];

  parameterMap.forEach((entry) => {
    // Strictly ensure data points are ordered chronologically (oldest to newest)
    entry.dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const points = entry.dataPoints;
    if (points.length === 0) return;

    // Only strictly positive numerical measurements represent genuine clinical tests
    const measuredPoints = points.filter((p) => p.value !== null && p.value !== undefined && p.value > 0);
    const latestMeasuredPoint = measuredPoints.length > 0 ? measuredPoints[measuredPoints.length - 1] : undefined;
    const previousMeasuredPoint = measuredPoints.length > 1 ? measuredPoints[measuredPoints.length - 2] : undefined;

    let changePercent: number | undefined = undefined;
    let direction: 'up' | 'down' | 'stable' = 'stable';

    if (
      latestMeasuredPoint &&
      previousMeasuredPoint &&
      latestMeasuredPoint.value !== null &&
      previousMeasuredPoint.value !== null &&
      previousMeasuredPoint.value !== 0
    ) {
      const diff = latestMeasuredPoint.value - previousMeasuredPoint.value;
      changePercent = Number(((diff / previousMeasuredPoint.value) * 100).toFixed(1));
      if (Math.abs(changePercent) < 1) {
        direction = 'stable';
      } else if (diff > 0) {
        direction = 'up';
      } else {
        direction = 'down';
      }
    }

    const latestPoint = points[points.length - 1];
    const trendMeaning = evaluateTrendMeaning(
      entry.canonicalKey,
      direction,
      latestMeasuredPoint ? latestMeasuredPoint.status : 'normal',
      previousMeasuredPoint?.status
    );

    const hasAbnormal = points.some((p) => p.status !== 'normal');

    trends.push({
      name: entry.name,
      alias: entry.alias,
      category: entry.category,
      unit: entry.unit,
      dataPoints: points,
      latestValue: latestMeasuredPoint ? latestMeasuredPoint.value : null,
      latestStatus: latestMeasuredPoint ? latestMeasuredPoint.status : 'normal',
      latestDate: latestMeasuredPoint ? latestMeasuredPoint.date : latestPoint.date,
      previousValue: previousMeasuredPoint ? previousMeasuredPoint.value : null,
      changePercent,
      direction,
      trendMeaning,
      refMin: entry.refMin,
      refMax: entry.refMax,
      refText: entry.refText,
      hasAbnormal,
    });
  });

  // Sort trends: out-of-range first, then alphabetically in Serbian locale
  return trends.sort((a, b) => {
    if (a.latestStatus !== 'normal' && b.latestStatus === 'normal') return -1;
    if (a.latestStatus === 'normal' && b.latestStatus !== 'normal') return 1;
    return a.name.localeCompare(b.name, 'sr');
  });
}
