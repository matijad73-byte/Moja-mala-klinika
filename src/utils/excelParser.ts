import * as XLSX from 'xlsx';
import { LabReport, LabParameter, ParameterCategory, ParameterStatus } from '../types';
import { getCanonicalParameter, calculateParameterStatus } from './trendCalculator';

/**
 * Standard clinical defaults for common laboratory parameters when units or references
 * are not provided in the Excel file.
 */
const CLINICAL_DEFAULTS: Record<
  string,
  { unit: string; refMin: number | null; refMax: number | null; refText: string; category: ParameterCategory }
> = {
  glukoza: { unit: 'mmol/L', refMin: 3.89, refMax: 6.1, refText: '3.89 - 6.10', category: 'Biohemija' },
  ukupni_holesterol: { unit: 'mmol/L', refMin: null, refMax: 5.2, refText: '< 5.20', category: 'Lipidni status' },
  hdl_holesterol: { unit: 'mmol/L', refMin: 1.03, refMax: null, refText: '> 1.03', category: 'Lipidni status' },
  ldl_holesterol: { unit: 'mmol/L', refMin: null, refMax: 3.3, refText: '< 3.30', category: 'Lipidni status' },
  trigliceridi: { unit: 'mmol/L', refMin: null, refMax: 1.7, refText: '< 1.70', category: 'Lipidni status' },
  vldl_holesterol: { unit: 'mmol/L', refMin: null, refMax: 0.85, refText: '< 0.85', category: 'Lipidni status' },
  non_hdl_holesterol: { unit: 'mmol/L', refMin: null, refMax: 3.8, refText: '< 3.80', category: 'Lipidni status' },
  indeks_ateroskleroze: { unit: 'indeks', refMin: null, refMax: 3.0, refText: '< 3.00', category: 'Lipidni status' },
  faktor_rizika: { unit: 'faktor', refMin: null, refMax: 4.5, refText: '< 4.50', category: 'Lipidni status' },
  leukociti: { unit: '10^9/L', refMin: 4.0, refMax: 10.0, refText: '4.00 - 10.00', category: 'Hematologija' },
  eritrociti: { unit: '10^12/L', refMin: 3.86, refMax: 5.08, refText: '3.86 - 5.08', category: 'Hematologija' },
  hemoglobin: { unit: 'g/L', refMin: 119, refMax: 157, refText: '119 - 157', category: 'Hematologija' },
  hematokrit: { unit: 'L/L', refMin: 0.35, refMax: 0.47, refText: '0.35 - 0.47', category: 'Hematologija' },
  trombociti: { unit: '10^9/L', refMin: 140, refMax: 440, refText: '140 - 440', category: 'Hematologija' },
  mcv: { unit: 'fL', refMin: 83.0, refMax: 97.2, refText: '83.0 - 97.2', category: 'Hematologija' },
  mch: { unit: 'pg', refMin: 27.4, refMax: 33.9, refText: '27.4 - 33.9', category: 'Hematologija' },
  mchc: { unit: 'g/L', refMin: 320, refMax: 345, refText: '320 - 345', category: 'Hematologija' },
  rdw: { unit: '%', refMin: 9.0, refMax: 15.0, refText: '9.0 - 15.0', category: 'Hematologija' },
  ast: { unit: 'U/L', refMin: null, refMax: 35, refText: '< 35', category: 'Enzimi jetre' },
  alt: { unit: 'U/L', refMin: null, refMax: 45, refText: '< 45', category: 'Enzimi jetre' },
  ggt: { unit: 'U/L', refMin: null, refMax: 55, refText: '< 55', category: 'Enzimi jetre' },
  alp: { unit: 'U/L', refMin: 35, refMax: 105, refText: '35 - 105', category: 'Enzimi jetre' },
  ukupni_bilirubin: { unit: 'umol/L', refMin: null, refMax: 21.0, refText: '< 21.0', category: 'Enzimi jetre' },
  direktni_bilirubin: { unit: 'umol/L', refMin: null, refMax: 5.1, refText: '< 5.1', category: 'Enzimi jetre' },
  urea: { unit: 'mmol/L', refMin: 2.8, refMax: 8.3, refText: '2.80 - 8.30', category: 'Bubrežna funkcija' },
  kreatinin: { unit: 'umol/L', refMin: 44, refMax: 97, refText: '44 - 97', category: 'Bubrežna funkcija' },
  mokracna_kiselina: { unit: 'umol/L', refMin: 140, refMax: 340, refText: '140 - 340', category: 'Bubrežna funkcija' },
  crp: { unit: 'mg/L', refMin: null, refMax: 5.0, refText: '< 5.0', category: 'Zapaljenski markeri' },
  se: { unit: 'mm/h', refMin: null, refMax: 20, refText: '< 20', category: 'Hematologija' },
  fe: { unit: 'umol/L', refMin: 6.6, refMax: 26.0, refText: '6.6 - 26.0', category: 'Biohemija' },
  feritin: { unit: 'ug/L', refMin: 13, refMax: 150, refText: '13 - 150', category: 'Biohemija' },
  kalijum: { unit: 'mmol/L', refMin: 3.5, refMax: 5.1, refText: '3.50 - 5.10', category: 'Elektroliti' },
  natrijum: { unit: 'mmol/L', refMin: 136, refMax: 145, refText: '136 - 145', category: 'Elektroliti' },
  kalcijum: { unit: 'mmol/L', refMin: 2.15, refMax: 2.55, refText: '2.15 - 2.55', category: 'Elektroliti' },
  magnezijum: { unit: 'mmol/L', refMin: 0.66, refMax: 1.07, refText: '0.66 - 1.07', category: 'Elektroliti' },
  tsh: { unit: 'uIU/mL', refMin: 0.27, refMax: 4.2, refText: '0.27 - 4.20', category: 'Hormoni' },
  ft4: { unit: 'pmol/L', refMin: 12.0, refMax: 22.0, refText: '12.0 - 22.0', category: 'Hormoni' },
  ft3: { unit: 'pmol/L', refMin: 3.1, refMax: 6.8, refText: '3.1 - 6.8', category: 'Hormoni' },
  vitamin_d: { unit: 'nmol/L', refMin: 75, refMax: 250, refText: '75 - 250', category: 'Biohemija' },
  vitamin_b12: { unit: 'pmol/L', refMin: 145, refMax: 569, refText: '145 - 569', category: 'Biohemija' },
};

const ROMAN_MONTH_MAP: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12,
};

const SERBIAN_MONTH_MAP: Record<string, number> = {
  jan: 1, januar: 1, january: 1,
  feb: 2, februar: 2, february: 2,
  mar: 3, mart: 3, march: 3,
  apr: 4, april: 4,
  maj: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  avg: 8, avgust: 8, august: 8,
  sep: 9, sept: 9, septembar: 9, september: 9,
  okt: 10, oktobar: 10, october: 10,
  nov: 11, novembar: 11, november: 11,
  dec: 12, decembar: 12, december: 12,
};

/**
 * Parses dates in various formats (Serbian DD.MM.YYYY, 2-digit years, spaces, Roman numerals,
 * Serbian month words, ISO YYYY-MM-DD, Excel serials, etc.)
 */
export function parseDateToISO(rawVal: any): string | null {
  if (rawVal === undefined || rawVal === null) return null;

  // If already a JS Date
  if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
    // XLSX date code cells are converted to UTC midnight
    const uy = rawVal.getUTCFullYear();
    const um = rawVal.getUTCMonth() + 1;
    const ud = rawVal.getUTCDate();
    if (uy > 1990 && uy < 2100) {
      return `${uy}-${String(um).padStart(2, '0')}-${String(ud).padStart(2, '0')}`;
    }
    const ly = rawVal.getFullYear();
    const lm = rawVal.getMonth() + 1;
    const ld = rawVal.getDate();
    return `${ly}-${String(lm).padStart(2, '0')}-${String(ld).padStart(2, '0')}`;
  }

  // If Excel serial number (e.g. 44197 -> ~2021) whether number or numeric string
  const numSerial = typeof rawVal === 'number' ? rawVal : Number(String(rawVal).trim());
  if (!isNaN(numSerial) && numSerial > 25000 && numSerial < 65000) {
    try {
      const dateObj = XLSX.SSF.parse_date_code(numSerial);
      if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
        const y = String(dateObj.y).padStart(4, '0');
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // Fallback
    }
  }

  let str = String(rawVal).trim();
  if (!str) return null;

  // Remove common prefixes/suffixes like "Datum:", "Nalaz", "od", "god.", "godina", "g."
  str = str.replace(/^(datum|nalaz|kontrola|od|izvestaj)\s*:?\s*/i, '');
  str = str.replace(/\b(god|godina|g)\.?$/i, '').trim();

  // Format 1: ISO YYYY-MM-DD (with optional spaces)
  const isoMatch = str.match(/\b(\d{4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})\b/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Format 2: Serbian DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY (supports spaces and 2-digit years)
  // e.g. "15.01.2021", "15. 01. 2021.", "15.1.24", "15/5/23"
  const dmyMatch = str.match(/\b(\d{1,2})\s*[./\-]\s*(\d{1,2})\s*[./\-]\s*(\d{2,4})\b/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    let yNum = parseInt(dmyMatch[3], 10);
    if (yNum < 100) {
      yNum = yNum < 70 ? 2000 + yNum : 1900 + yNum;
    }
    return `${yNum}-${m}-${d}`;
  }

  // Format 3: Roman numeral month: 15. V 2023 or 15.V.2023 or 12.XII.22
  const romanMatch = str.match(/\b(\d{1,2})\s*[./\-\s]\s*([IVXLCDMivxlcdm]+)\s*[./\-\s]\s*(\d{2,4})\b/);
  if (romanMatch) {
    const d = romanMatch[1].padStart(2, '0');
    const romanKey = romanMatch[2].toLowerCase();
    const mNum = ROMAN_MONTH_MAP[romanKey];
    if (mNum) {
      let yNum = parseInt(romanMatch[3], 10);
      if (yNum < 100) {
        yNum = yNum < 70 ? 2000 + yNum : 1900 + yNum;
      }
      return `${yNum}-${String(mNum).padStart(2, '0')}-${d}`;
    }
  }

  // Format 4: Serbian/English month names: 15. maj 2023 or 15-maj-2023
  const wordMatch = str.match(/\b(\d{1,2})\s*[./\-\s]\s*([a-žA-Ž]{3,})\s*[./\-\s]\s*(\d{2,4})\b/);
  if (wordMatch) {
    const d = wordMatch[1].padStart(2, '0');
    const wordKey = wordMatch[2].toLowerCase();
    const mNum = SERBIAN_MONTH_MAP[wordKey];
    if (mNum) {
      let yNum = parseInt(wordMatch[3], 10);
      if (yNum < 100) {
        yNum = yNum < 70 ? 2000 + yNum : 1900 + yNum;
      }
      return `${yNum}-${String(mNum).padStart(2, '0')}-${d}`;
    }
  }

  // Format 5: Month-Year format: MM/YYYY or MM.YYYY or MM/YY or MM.YY
  const myMatch = str.match(/\b(\d{1,2})\s*[./\-]\s*(\d{2,4})\b/);
  if (myMatch) {
    const m = myMatch[1].padStart(2, '0');
    let yNum = parseInt(myMatch[2], 10);
    if (yNum < 100) yNum = yNum < 70 ? 2000 + yNum : 1900 + yNum;
    const mNum = parseInt(m, 10);
    if (mNum >= 1 && mNum <= 12) {
      return `${yNum}-${m}-01`;
    }
  }

  // Format 6: Month name + Year: "maj 2021", "jun 2022", "jan 24"
  const wordYearMatch = str.match(/\b([a-žA-Ž]{3,})\s*[./\-\s]\s*(\d{2,4})\b/);
  if (wordYearMatch) {
    const wordKey = wordYearMatch[1].toLowerCase();
    const mNum = SERBIAN_MONTH_MAP[wordKey];
    if (mNum) {
      let yNum = parseInt(wordYearMatch[2], 10);
      if (yNum < 100) yNum = yNum < 70 ? 2000 + yNum : 1900 + yNum;
      return `${yNum}-${String(mNum).padStart(2, '0')}-01`;
    }
  }

  // Try standard Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1990 && parsed.getFullYear() < 2100) {
    const py = parsed.getFullYear();
    const pm = String(parsed.getMonth() + 1).padStart(2, '0');
    const pd = String(parsed.getDate()).padStart(2, '0');
    return `${py}-${pm}-${pd}`;
  }

  return null;
}

/**
 * Cleans numerical measurement strings (e.g. "5,82" -> 5.82, "< 0.1" -> 0.1)
 */
export function cleanNumericValue(raw: any): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'number') {
    return isNaN(raw) ? null : raw;
  }

  let s = String(raw).trim();
  if (!s || s === '-' || s === '/' || s.startsWith('#')) return null;

  const lower = s.toLowerCase();
  if (
    lower === 'n/a' ||
    lower === 'na' ||
    lower.includes('nije rađen') ||
    lower.includes('nije radjen') ||
    lower.includes('nije rađeno') ||
    lower.includes('nije radjeno') ||
    lower.includes('nema podatak') ||
    lower.includes('nedostaj')
  ) {
    return null;
  }

  // Replace comma with dot
  s = s.replace(',', '.');

  // Strip common prefixes like '<', '>', '~', '=', 'H', 'L', '*'
  s = s.replace(/^[<>=~HL*]+\s*/i, '');
  s = s.replace(/[HL*]+$/i, '').trim();

  // Extract first floating-point number
  const match = s.match(/-?\d+(?:\.\d+)?/);
  if (match) {
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Parses reference interval text (e.g. "3.89 - 6.10" or "< 5.2" or "> 1.03")
 */
export function parseRefLimits(rawRef: any): { refMin: number | null; refMax: number | null; refText: string } {
  if (!rawRef) return { refMin: null, refMax: null, refText: '' };
  const text = String(rawRef).trim();
  if (!text) return { refMin: null, refMax: null, refText: '' };

  const norm = text.replace(',', '.');

  // Case: "3.89 - 6.10" or "3.89 to 6.10"
  const rangeMatch = norm.match(/(\d+(?:\.\d+)?)\s*(?:-|to|do)\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    return {
      refMin: parseFloat(rangeMatch[1]),
      refMax: parseFloat(rangeMatch[2]),
      refText: text,
    };
  }

  // Case: "< 5.2" or "<= 5.2"
  const maxMatch = norm.match(/<=\s*(\d+(?:\.\d+)?)|<\s*(\d+(?:\.\d+)?)/);
  if (maxMatch) {
    const maxVal = parseFloat(maxMatch[1] || maxMatch[2]);
    return {
      refMin: null,
      refMax: maxVal,
      refText: text,
    };
  }

  // Case: "> 1.03" or ">= 1.03"
  const minMatch = norm.match(/>=\s*(\d+(?:\.\d+)?)|>\s*(\d+(?:\.\d+)?)/);
  if (minMatch) {
    const minVal = parseFloat(minMatch[1] || minMatch[2]);
    return {
      refMin: minVal,
      refMax: null,
      refText: text,
    };
  }

  return { refMin: null, refMax: null, refText: text };
}

/**
 * Ensures lipid panel biochemical integrity across extracted parameters:
 * Ukupni Holesterol = HDL + LDL + Trigliceridi / 2.2
 */
export function enforceLipidIntegrity(parameters: LabParameter[]): LabParameter[] {
  const result = [...parameters];

  const cholIndex = result.findIndex((p) => p.name === 'Ukupni Holesterol' || p.alias === 'CHOL');
  const hdlIndex = result.findIndex((p) => p.name === 'HDL Holesterol' || p.alias === 'HDL');
  const ldlIndex = result.findIndex((p) => p.name === 'LDL Holesterol' || p.alias === 'LDL');
  const trigIndex = result.findIndex((p) => p.name === 'Trigliceridi' || p.alias === 'TRIG');

  const hdl = hdlIndex >= 0 ? result[hdlIndex].value : null;
  const ldl = ldlIndex >= 0 ? result[ldlIndex].value : null;
  const trig = trigIndex >= 0 ? result[trigIndex].value : null;

  // 1. If HDL, LDL, and Trigliceridi exist, but Total Cholesterol is missing: compute it
  if (cholIndex === -1 && hdl !== null && ldl !== null) {
    const vldl = trig !== null ? trig / 2.2 : 0;
    const computedTotal = Number((hdl + ldl + vldl).toFixed(2));
    result.push({
      id: `param-auto-chol-${Date.now()}`,
      name: 'Ukupni Holesterol',
      alias: 'CHOL',
      category: 'Lipidni status',
      value: computedTotal,
      unit: 'mmol/L',
      refMin: null,
      refMax: 5.2,
      refText: '< 5.20',
      status: computedTotal > 5.2 ? 'high' : 'normal',
      notes: `Izračunato kao zbir frakcija: HDL (${hdl}) + LDL (${ldl})${trig !== null ? ` + VLDL (${Number(vldl.toFixed(2))})` : ''}`,
    });
  }

  // 2. Add or update VLDL if Trigliceridi exists
  const vldlIndex = result.findIndex((p) => p.name === 'VLDL Holesterol' || p.alias === 'VLDL');
  if (vldlIndex === -1 && trig !== null) {
    const vldlVal = Number((trig / 2.2).toFixed(2));
    result.push({
      id: `param-auto-vldl-${Date.now()}`,
      name: 'VLDL Holesterol',
      alias: 'VLDL',
      category: 'Lipidni status',
      value: vldlVal,
      unit: 'mmol/L',
      refMin: null,
      refMax: 0.85,
      refText: '< 0.85',
      status: vldlVal > 0.85 ? 'high' : 'normal',
      notes: `VLDL frakcija izračunata prema Friedewald-u (Trigliceridi ${trig} / 2.2)`,
    });
  }

  // 3. Add Indeks ateroskleroze (LDL / HDL) if missing
  const iaIndex = result.findIndex((p) => p.name === 'Indeks ateroskleroze' || p.alias === 'IA');
  if (iaIndex === -1 && ldl !== null && hdl !== null && hdl > 0) {
    const iaVal = Number((ldl / hdl).toFixed(2));
    result.push({
      id: `param-auto-ia-${Date.now()}`,
      name: 'Indeks ateroskleroze',
      alias: 'IA',
      category: 'Lipidni status',
      value: iaVal,
      unit: 'indeks',
      refMin: null,
      refMax: 3.0,
      refText: '< 3.00',
      status: iaVal > 3.0 ? 'high' : 'normal',
      notes: `Odnos LDL/HDL aterogenog rizika (${ldl} / ${hdl})`,
    });
  }

  // 4. Add Faktor rizika (Ukupan / HDL) if missing
  const frIndex = result.findIndex((p) => p.name === 'Faktor rizika' || p.alias === 'FR');
  const totalCholVal = cholIndex >= 0 ? result[cholIndex].value : hdl !== null && ldl !== null ? hdl + ldl + (trig ? trig / 2.2 : 0) : null;
  if (frIndex === -1 && totalCholVal !== null && hdl !== null && hdl > 0) {
    const frVal = Number((totalCholVal / hdl).toFixed(2));
    result.push({
      id: `param-auto-fr-${Date.now()}`,
      name: 'Faktor rizika',
      alias: 'FR',
      category: 'Lipidni status',
      value: frVal,
      unit: 'faktor',
      refMin: null,
      refMax: 4.5,
      refText: '< 4.50',
      status: frVal > 4.5 ? 'high' : 'normal',
      notes: `Ukupni rizik: Ukupan holesterol / HDL (${Number(totalCholVal.toFixed(2))} / ${hdl})`,
    });
  }

  return result;
}

let cachedExcelGrid: any[][] | null = null;

export function getCachedExcelGrid(): any[][] | null {
  if (cachedExcelGrid) return cachedExcelGrid;
  try {
    const saved = localStorage.getItem('lab_excel_grid');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedExcelGrid = parsed;
        return parsed;
      }
    }
  } catch {}
  return null;
}

export function setCachedExcelGrid(grid: any[][]): void {
  cachedExcelGrid = grid;
  try {
    localStorage.setItem('lab_excel_grid', JSON.stringify(grid));
  } catch {}
}

/**
 * Core Parser: Reads an Excel buffer (XLSX, XLS, CSV) and extracts all parameters and dates.
 * Seamlessly handles:
 * - Orientation A: Rows are Parameters, Columns are Dates (Standard Serbian lab summary)
 * - Orientation B: Rows are Dates, Columns are Parameters
 * - Orientation C: Long table format (Datum, Parametar, Vrednost, Jedinica, Ref)
 */
export function parseExcelDatabase(buffer: ArrayBuffer | Uint8Array, fileName: string): LabReport[] {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
  });

  const allReportsByDate = new Map<string, LabReport>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet || !sheet['!ref']) continue;

    // Get 2D grid of raw values (blankrows: true preserves 1-to-1 Excel row indices)
    const grid: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      blankrows: true,
    });

    if (!grid || grid.length < 2) continue;

    // Detect orientation
    const orientation = detectOrientation(grid);

    if (orientation === 'horizontal_dates') {
      setCachedExcelGrid(grid);
      parseHorizontalDatesSheet(grid, fileName, sheetName, allReportsByDate);
    } else if (orientation === 'vertical_dates') {
      parseVerticalDatesSheet(grid, fileName, sheetName, allReportsByDate);
    } else if (orientation === 'flat_records') {
      parseFlatRecordsSheet(grid, fileName, sheetName, allReportsByDate);
    } else {
      // Fallback: try horizontal first, then vertical
      setCachedExcelGrid(grid);
      parseHorizontalDatesSheet(grid, fileName, sheetName, allReportsByDate);
      if (allReportsByDate.size === 0) {
        parseVerticalDatesSheet(grid, fileName, sheetName, allReportsByDate);
      }
    }
  }

  // Convert map to sorted array (strictly preserve genuine parameters from Excel without injecting artificial ones)
  const reportsList = Array.from(allReportsByDate.values());

  return reportsList.sort((a, b) => {
    if (a.reportNumber !== undefined && b.reportNumber !== undefined) {
      return Number(a.reportNumber) - Number(b.reportNumber);
    }
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

export function parseReportNumberFromCell(cellVal: any): number | null {
  if (cellVal === undefined || cellVal === null) return null;
  // If it's a date or date serial code, it is NOT a report number
  if (parseDateToISO(cellVal) !== null) return null;

  if (typeof cellVal === 'number') {
    // Report numbers are integer indices (1..1000), not decimals like 5.2 and not serial dates
    if (!Number.isInteger(cellVal)) return null;
    if (cellVal > 0 && cellVal < 2000) return cellVal;
    return null;
  }
  const str = String(cellVal).trim();
  if (!str) return null;

  // If text contains "Br. 1" or "Izveštaj 1" or "Nalaz 1"
  const prefixMatch = str.match(/(?:br\.?|izveštaj|izvestaj|nalaz|broj|r\.br\.?)\s*(\d+)/i);
  if (prefixMatch) {
    const n = parseInt(prefixMatch[1], 10);
    return !isNaN(n) && n > 0 && n < 2000 ? n : null;
  }

  // If it contains dots or slashes like 15.01.2021 or 5.2, not a pure report number
  if (/[./\-]/.test(str)) {
    return null;
  }

  const lower = str.toLowerCase();
  if (
    lower.includes('prosek') ||
    lower.includes('ukupno') ||
    lower.includes('napomen') ||
    lower.includes('komentar') ||
    lower.includes('razlik') ||
    lower.includes('min') ||
    lower.includes('max') ||
    lower === 'jedinica' ||
    lower === 'referentne' ||
    lower === 'parametar' ||
    lower === 'analiza'
  ) {
    return null;
  }

  const m = str.match(/^(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    return !isNaN(n) && n > 0 && n < 2000 ? n : null;
  }
  return null;
}

/**
 * Detects whether the sheet has dates in columns (horizontal), dates in rows (vertical), or long table.
 */
function detectOrientation(grid: any[][]): 'horizontal_dates' | 'vertical_dates' | 'flat_records' | 'unknown' {
  if (!grid || grid.length < 2) return 'unknown';

  const row0 = grid[0] || [];
  const row0Texts = row0.map((c) => String(c || '').toLowerCase().trim());

  // 1. Flat records check: contains "datum" and ("paramet" or "naziv") and ("vrednost" or "rezultat")
  const hasDatumCol = row0Texts.some((t) => t.includes('datum') || t.includes('date'));
  const hasParamCol = row0Texts.some((t) => t.includes('param') || t.includes('analiz') || t.includes('naziv'));
  const hasValueCol = row0Texts.some((t) => t.includes('rezult') || t.includes('vredn') || t.includes('value'));
  if (hasDatumCol && hasParamCol && hasValueCol) {
    return 'flat_records';
  }

  // 2. Check if Column 0 or Column 1 has typical lab parameter names down the rows (Classic Horizontal Layout)
  const keyParams = ['glukoza', 'holesterol', 'hdl', 'ldl', 'triglicerid', 'leukocit', 'eritrocit', 'hemoglobin', 'ast', 'alt', 'ggt', 'urea', 'kreatinin', 'crp', 'fe', 'gvozdje', 'trombocit'];
  let paramNamesInCol0 = 0;
  let paramNamesInCol1 = 0;
  for (let r = 0; r < Math.min(grid.length, 35); r++) {
    const c0 = String(grid[r]?.[0] || '').toLowerCase().trim();
    const c1 = String(grid[r]?.[1] || '').toLowerCase().trim();
    if (keyParams.some((k) => c0.includes(k))) paramNamesInCol0++;
    if (keyParams.some((k) => c1.includes(k))) paramNamesInCol1++;
  }

  if (paramNamesInCol0 >= 2 || paramNamesInCol1 >= 2) {
    return 'horizontal_dates';
  }

  // 3. Check if Row 0 has parameter names across columns (Vertical Dates Layout)
  const paramHitsInRow0 = row0Texts.filter((t) => keyParams.some((k) => t.includes(k))).length;
  if (paramHitsInRow0 >= 2) {
    return 'vertical_dates';
  }

  // 4. Check for dates across columns in Row 0, 1, or 2 (Horizontal Layout)
  let datesInRow0 = 0;
  for (let c = 1; c < Math.min(row0.length, 60); c++) {
    if (parseDateToISO(row0[c])) datesInRow0++;
  }
  if (datesInRow0 >= 1) {
    return 'horizontal_dates';
  }

  const row1 = grid[1] || [];
  let datesInRow1 = 0;
  for (let c = 1; c < Math.min(row1.length, 60); c++) {
    if (parseDateToISO(row1[c])) datesInRow1++;
  }
  if (datesInRow1 >= 1) {
    return 'horizontal_dates';
  }

  // 5. Check for dates down Column 0 or Column 1 (Vertical Dates Layout)
  let datesInCol0 = 0;
  for (let r = 1; r < Math.min(grid.length, 15); r++) {
    if (parseDateToISO(grid[r]?.[0])) datesInCol0++;
  }
  if (datesInCol0 >= 2) {
    return 'vertical_dates';
  }

  return 'horizontal_dates';
}

/**
 * Detects whether a string is a laboratory category / section header
 * (e.g. "Hematologija", "Biohemija", "Lipidni status", "Enzimi jetre", etc.)
 */
function isCategoryHeader(text: string): ParameterCategory | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  if (!lower) return null;
  if (
    lower.startsWith('hematolog') ||
    lower.includes('krvna slika') ||
    lower.includes('leukocitarna') ||
    lower.includes('koagulac') ||
    lower.includes('hemostaz')
  ) {
    return 'Hematologija';
  }
  if (
    lower.startsWith('biohemij') ||
    lower.includes('glikoreg') ||
    lower.includes('mineral') ||
    lower.includes('protein') ||
    lower.includes('imunolog') ||
    lower.includes('vitamin')
  ) {
    return 'Biohemija';
  }
  if (lower.startsWith('lipid') || lower.includes('lipidni status') || lower.includes('masnoće') || lower.includes('masnoce')) {
    return 'Lipidni status';
  }
  if (lower.startsWith('enzim') || lower.includes('jetr')) {
    return 'Enzimi jetre';
  }
  if (
    lower.startsWith('bubreg') ||
    lower.startsWith('bubrež') ||
    lower.includes('bubrezna') ||
    lower.includes('bubrežna')
  ) {
    return 'Bubrežna funkcija';
  }
  if (lower.startsWith('elektrolit')) {
    return 'Elektroliti';
  }
  if (lower.startsWith('hormon') || lower.includes('tiroid') || lower.includes('stit')) {
    return 'Hormoni';
  }
  if (lower.startsWith('zapalj') || lower.includes('inflam')) {
    return 'Zapaljenski markeri';
  }
  if (lower.startsWith('urin') || lower.includes('mokrać') || lower.includes('mokrac') || lower.includes('sediment')) {
    return 'Urin';
  }
  return null;
}

/**
 * Checks whether a column is a summary, statistics, notes, or calculation column
 * (such as "Prosek", "Min", "Max", "Trend", "Razlika", "Napomena") rather than a real medical report.
 */
function isSummaryOrMetaColumn(grid: any[][], colIdx: number, headerRowsCount: number): boolean {
  const summaryRegex = /^(prosek|prosjek|average|mean|min|max|minimaln|maksimaln|razlik|trend|delta|promen|komentar|napomen|opis|ukupno|total|referentn|jedinic|status|zakljucak|ocena)/i;
  for (let r = 0; r < Math.min(grid.length, headerRowsCount); r++) {
    const cell = String(grid[r]?.[colIdx] || '').trim();
    if (cell && summaryRegex.test(cell)) {
      return true;
    }
  }
  return false;
}

/**
 * Detects whether a string in Column A is an informational row, header, footer, or note
 * that should NEVER be treated as a lab parameter.
 */
function isIgnoredRow(text: string): boolean {
  if (!text) return true;
  const l = text.toLowerCase().trim();
  if (
    l.startsWith('napomen') ||
    l.startsWith('ukupno') ||
    l.startsWith('total') ||
    l.startsWith('prosek') ||
    l.startsWith('prosjek') ||
    l.startsWith('average') ||
    l.startsWith('mean') ||
    l.startsWith('min') ||
    l.startsWith('max') ||
    l.startsWith('komentar') ||
    l.startsWith('razlika') ||
    l.startsWith('trend') ||
    l.startsWith('delta') ||
    l.startsWith('opis') ||
    l.startsWith('zakljucak') ||
    l.startsWith('status') ||
    l.startsWith('lekar') ||
    l.startsWith('potpis') ||
    l.startsWith('tehnicar') ||
    l.startsWith('overio') ||
    l.startsWith('laboratorija') ||
    l.startsWith('pacijent') ||
    l.startsWith('jmbg') ||
    l.startsWith('godiste') ||
    l.startsWith('uputna') ||
    l.includes('broj izvešt') ||
    l.includes('broj izvest') ||
    l.includes('br. izvešt') ||
    l.includes('br. izvest') ||
    l.includes('identifikator') ||
    l.includes('period') ||
    l.includes('tacan datum') ||
    l.includes('tačan datum') ||
    l.includes('datum nalaza') ||
    l.includes('datum uzork') ||
    l === 'parametar' ||
    l === 'analiza' ||
    l === 'naziv analize' ||
    l === 'parametar / analiza' ||
    l === 'referentne vrednosti' ||
    l === 'referentne vrijednosti' ||
    l === 'ref. vrednosti' ||
    l === 'ref vrednosti' ||
    l === 'jedinica' ||
    l === 'jedinice' ||
    l === 'jedinica mere'
  ) {
    return true;
  }
  return false;
}

/**
 * Orientation A: Rows are parameters, columns are reports/dates.
 * Reads the ENTIRE table: all reports/columns and all parameters without skipping any data.
 * Adheres strictly to the user definition:
 * - Columns A, B, C: Parameter/Analysis & Category, Reference values, Units
 * - Columns D..W (and beyond): Individual reports for patient Dušan Matijašević
 *   Row 2: Report ID (Izvestaj 1, Izvestaj 2, ..., Izvestaj 20)
 *   Row 3: Period (e.g. "Januar 2017.")
 *   Row 4: Exact date of finding (e.g. "26.01.2017.")
 *   Rows 5..end: Measured parameter values. Missing values ("nije rađena analiza") are skipped.
 */
function parseHorizontalDatesSheet(
  grid: any[][],
  fileName: string,
  sheetName: string,
  outMap: Map<string, LabReport>
) {
  let maxCol = 0;
  for (let r = 0; r < grid.length; r++) {
    maxCol = Math.max(maxCol, (grid[r] || []).length);
  }
  if (maxCol < 2 || grid.length < 2) return;

  // 1. Identifikacija prve kolone sa izveštajima (firstDataCol)
  // Prve 3 kolone (A, B, C) definišu kontekst parametra (Parametar/Analiza, Referentne vrednosti, Jedinice)
  // Kolone od D nadalje (indeks 3..) predstavljaju pojedinačne medicinske izveštaje
  let firstDataCol = 3;
  if (firstDataCol >= maxCol) {
    firstDataCol = -1;
    for (let c = 1; c < maxCol; c++) {
      let hasDateInHeader = false;
      for (let r = 0; r < Math.min(grid.length, 5); r++) {
        if (parseDateToISO(grid[r]?.[c]) !== null) {
          hasDateInHeader = true;
          break;
        }
      }
      if (hasDateInHeader) {
        firstDataCol = c;
        break;
      }
    }
    if (firstDataCol === -1) firstDataCol = Math.min(1, maxCol - 1);
  }

  // 2. Pronalaženje redova zaglavlja za izveštaje (Identifikator, Period, Datum)
  // Standardno prema specifikaciji:
  // Red 2 (indeks 1): Jedinstveni identifikator (Izvestaj 1, Izvestaj 2, ...)
  // Red 3 (indeks 2): Period (npr. "Januar 2017.")
  // Red 4 (indeks 3): Tačan datum nalaza (npr. "26.01.2017.")
  // Redovi 5 do kraja (indeks 4..): Izmerene vrednosti parametara
  let repIdRow = -1;
  let periodRow = -1;
  let dateRow = -1;

  for (let r = 0; r < Math.min(grid.length, 6); r++) {
    let repIdHits = 0;
    let periodHits = 0;
    let dateHits = 0;
    for (let c = firstDataCol; c < maxCol; c++) {
      const val = grid[r]?.[c];
      if (val === undefined || val === null) continue;
      const strVal = String(val).trim();
      if (!strVal) continue;

      if (parseReportNumberFromCell(val) !== null || /izvestaj|izveštaj|nalaz/i.test(strVal)) {
        repIdHits++;
      }
      if (
        /(?:januar|februar|mart|april|maj|juni?|juli?|avgust|septembar|oktobar|novembar|decembar)\s*\d{4}/i.test(strVal) ||
        /^(?:0?[1-9]|1[0-2])\s*[./\-]\s*(?:19|20)\d{2}\.?$/.test(strVal)
      ) {
        periodHits++;
      }
      if (parseDateToISO(val) !== null) {
        dateHits++;
      }
    }

    if (repIdHits >= 1 && repIdRow === -1) {
      repIdRow = r;
    }
    if (periodHits >= 1 && periodRow === -1 && r !== repIdRow) {
      periodRow = r;
    }
    if (dateHits >= 1 && dateRow === -1 && r !== repIdRow && r !== periodRow) {
      dateRow = r;
    }
  }

  // Određivanje startParamRow
  let startParamRow = 4; // Excel row 5 (0-indexed 4)
  if (repIdRow >= 0 || periodRow >= 0 || dateRow >= 0) {
    startParamRow = Math.max(repIdRow, periodRow, dateRow) + 1;
  } else {
    // Fallback: dinamička pretraga reda sa nazivima parametara
    const keyParamSnippets = ['glukoz', 'holest', 'leukoc', 'urea', 'kreatinin', 'ast', 'alt', 'crp', 'eritroc'];
    for (let r = 0; r < Math.min(grid.length, 10); r++) {
      const text0 = String(grid[r]?.[0] || '').toLowerCase().trim();
      if (keyParamSnippets.some((k) => text0.includes(k))) {
        startParamRow = r;
        break;
      }
    }
  }

  // 3. Preuzimanje SVIH kolona izveštaja od firstDataCol do maxCol - 1
  const reportColumns: {
    colIdx: number;
    repNum: number;
    dateStr: string;
    periodStr: string;
    title: string;
  }[] = [];

  for (let c = firstDataCol; c < maxCol; c++) {
    // 1. Isključi kolone koje su zbirne statistike, proseci, komentari ili napomene
    if (isSummaryOrMetaColumn(grid, c, startParamRow)) {
      continue;
    }

    const rawId = repIdRow >= 0 ? grid[repIdRow]?.[c] : null;
    const rawPeriod = periodRow >= 0 ? grid[periodRow]?.[c] : null;
    const rawDate = dateRow >= 0 ? grid[dateRow]?.[c] : null;

    // Proveri da li kolona ima eksplicitni identifikator izveštaja (Izvestaj 1, Nalaz 1, 1..)
    const repNumFromId = parseReportNumberFromCell(rawId);
    const hasExplicitId =
      repNumFromId !== null ||
      /(?:izve[sš]taj|nalaz|r\.?\s*br\.?)\s*\d*/i.test(String(rawId || ''));

    // Proveri da li ima validan datum ili period
    const parsedDate = parseDateToISO(rawDate);
    const parsedPeriodDate = parseDateToISO(rawPeriod);
    const hasValidDate = parsedDate !== null || parsedPeriodDate !== null;

    // Izbroj stvarna numerička laboratorijska merenja u ovoj koloni
    let numericMeasurements = 0;
    for (let r = startParamRow; r < grid.length; r++) {
      if (cleanNumericValue(grid[r]?.[c]) !== null) {
        numericMeasurements++;
      }
    }

    // Autentična kolona izveštaja MORA:
    // 1. Imati identifikator izveštaja ILI validan datum u zaglavlju
    // 2. I imati najmanje 2 stvarna numerička laboratorijska merenja u redovima parametara!
    if ((!hasExplicitId && !hasValidDate) || numericMeasurements < 2) {
      continue;
    }

    let repNum = repNumFromId;
    if (repNum === null) {
      repNum = reportColumns.length + 1;
    }

    const titleStr = rawId ? String(rawId).trim() : `Izveštaj ${repNum}`;
    const formattedTitle = /^\d+$/.test(titleStr) ? `Izveštaj ${titleStr}` : titleStr;
    const periodStr = rawPeriod ? String(rawPeriod).trim() : '';

    let finalDate = parsedDate || parsedPeriodDate;
    if (!finalDate) {
      for (let r = 0; r < startParamRow; r++) {
        const d = parseDateToISO(grid[r]?.[c]);
        if (d) {
          finalDate = d;
          break;
        }
      }
    }
    if (!finalDate) {
      finalDate = `2017-01-${String(Math.min(repNum, 28)).padStart(2, '0')}`;
    }

    reportColumns.push({
      colIdx: c,
      repNum,
      dateStr: finalDate,
      periodStr,
      title: formattedTitle,
    });
  }

  if (reportColumns.length === 0) return;

  // 4. Prolazak kroz SVE redove parametara (Redovi 5 do kraja)
  let currentCategory: ParameterCategory = 'Biohemija';

  for (let r = startParamRow; r < grid.length; r++) {
    const row = grid[r];
    if (!row || row.length === 0) continue;

    const col0Text = String(row[0] || '').trim();
    if (!col0Text) continue;

    // Preskoči informativne / zbirne / zaglavne redove
    if (isIgnoredRow(col0Text)) {
      continue;
    }

    // Proveri da li je red sekcija/kategorija (npr. Hematologija, Biohemija)
    const detectedCat = isCategoryHeader(col0Text);

    // Izbroj stvarna merenja u ovom redu za očitane izveštaje
    let rowMeasurements = 0;
    for (const repCol of reportColumns) {
      if (cleanNumericValue(row[repCol.colIdx]) !== null) {
        rowMeasurements++;
      }
    }

    // Ako red nema numeričkih merenja ni u jednom izveštaju:
    // To je naslov sekcije ili prazan red - NIKADA ne kreirati parametar!
    if (rowMeasurements === 0) {
      if (detectedCat) {
        currentCategory = detectedCat;
      }
      continue;
    }

    // Ako je eksplicitni naslov kategorije, postavi trenutnu kategoriju i preskoči
    if (detectedCat && (col0Text.toUpperCase() === col0Text || col0Text.length <= 25)) {
      currentCategory = detectedCat;
      continue;
    }

    // Parametar: Kolona A = Naziv, Kolona B = Ref. vrednosti, Kolona C = Jedinice
    const rawParamName = col0Text;
    const refColVal = String(row[1] || '').trim();
    const unitColVal = String(row[2] || '').trim();

    const canon = getCanonicalParameter(rawParamName);
    const defaults = CLINICAL_DEFAULTS[canon.canonicalKey];

    const refParsed = parseRefLimits(refColVal);
    const refMin = refParsed.refMin !== null ? refParsed.refMin : defaults?.refMin ?? null;
    const refMax = refParsed.refMax !== null ? refParsed.refMax : defaults?.refMax ?? null;
    const refText = refParsed.refText || refColVal || defaults?.refText || '-';
    const unit = unitColVal || defaults?.unit || 'mmol/L';

    // Očitavanje izmerene vrednosti za svaki pojedinačni izveštaj (Kolone D..W)
    for (const repCol of reportColumns) {
      const rawVal = row[repCol.colIdx];
      if (rawVal === undefined || rawVal === null) continue;

      const strVal = String(rawVal).trim().toLowerCase();
      // Vrijednost "nije rađena analiza" označava nedostajući podatak za taj datum
      if (
        !strVal ||
        strVal === '-' ||
        strVal === '/' ||
        strVal === 'n/a' ||
        strVal === 'na' ||
        strVal.includes('nije rađen') ||
        strVal.includes('nije radjen') ||
        strVal.includes('nije rađeno') ||
        strVal.includes('nije radjeno') ||
        strVal.includes('nema podatak') ||
        strVal.includes('nedostaj')
      ) {
        continue;
      }

      const numVal = cleanNumericValue(rawVal);
      if (numVal === null) continue;

      const status: ParameterStatus = calculateParameterStatus(numVal, refMin, refMax, canon.canonicalKey);

      const parameter: LabParameter = {
        id: `param-${canon.canonicalKey}-${repCol.dateStr}-col${repCol.colIdx}-r${r}`,
        name: canon.name,
        alias: canon.alias,
        category: (currentCategory as ParameterCategory) || canon.category || defaults?.category || 'Biohemija',
        value: numVal,
        unit: unit,
        refMin,
        refMax,
        refText,
        status,
      };

      const reportKey = `${sheetName}_col_${repCol.colIdx}`;
      let report = outMap.get(reportKey);
      if (!report) {
        report = {
          id: `excel-report-${sheetName}-col-${repCol.colIdx}-${repCol.dateStr}`,
          fileName: repCol.title,
          reportNumber: repCol.repNum,
          fileSource: 'excel',
          fileType: 'excel',
          date: repCol.dateStr,
          period: repCol.periodStr,
          laboratoryName:
            sheetName !== 'Sheet1' && sheetName !== 'Sheet 1'
              ? `Excel Baza (${sheetName})`
              : 'Laboratorijski izveštaj',
          patientName: 'Dušan Matijašević',
          summary: `${repCol.title} (${repCol.periodStr || repCol.dateStr}) za pacijenta Dušan Matijašević.`,
          parameters: [],
          uploadedAt: new Date().toISOString(),
          fileFormat: 'xlsx',
        };
        outMap.set(reportKey, report);
      }

      const existingIdx = report.parameters.findIndex((p) => p.name === parameter.name);
      if (existingIdx >= 0) {
        report.parameters[existingIdx] = parameter;
      } else {
        report.parameters.push(parameter);
      }
    }
  }
}

/**
 * Orientation B: Rows are dates, columns are parameters.
 * Example:
 * [Datum] | [Glukoza] | [Ukupni Holesterol] | [HDL] | [LDL] | [Trigliceridi] | ...
 */
function parseVerticalDatesSheet(
  grid: any[][],
  fileName: string,
  sheetName: string,
  outMap: Map<string, LabReport>
) {
  const headerRow = grid[0] || [];
  let dateColIdx = -1;

  for (let c = 0; c < headerRow.length; c++) {
    const title = String(headerRow[c] || '').toLowerCase().trim();
    if (title.includes('datum') || title.includes('date')) {
      dateColIdx = c;
      break;
    }
  }

  // If not labeled "datum", look at first column of rows 1..N
  if (dateColIdx === -1) {
    if (parseDateToISO(grid[1]?.[0])) dateColIdx = 0;
    else if (parseDateToISO(grid[1]?.[1])) dateColIdx = 1;
  }

  if (dateColIdx === -1) dateColIdx = 0;

  // Build parameter column mapping
  const paramColumns: { colIdx: number; name: string; alias: string; category: ParameterCategory; key: string }[] = [];
  for (let c = 0; c < headerRow.length; c++) {
    if (c === dateColIdx) continue;
    const rawName = String(headerRow[c] || '').trim();
    if (!rawName) continue;

    const canon = getCanonicalParameter(rawName);
    paramColumns.push({
      colIdx: c,
      name: canon.name,
      alias: canon.alias,
      category: canon.category,
      key: canon.canonicalKey,
    });
  }

  // Iterate over date rows
  for (let r = 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row || row.length === 0) continue;

    const dateStr = parseDateToISO(row[dateColIdx]) || parseDateToISO(row[1]) || `2024-01-${String(r).padStart(2, '0')}`;

    // Key by ROW INDEX so that duplicate dates across different rows are never lost!
    const reportKey = `${sheetName}_row_${r}`;
    let report = outMap.get(reportKey);
    if (!report) {
      const repNum = r;
      const repTitle = `Izveštaj br. ${repNum}`;
      report = {
        id: `excel-report-${sheetName}-row-${r}-${dateStr}`,
        fileName: repTitle,
        reportNumber: repNum,
        fileSource: 'excel',
        fileType: 'excel',
        date: dateStr,
        laboratoryName: sheetName !== 'Sheet1' ? `Excel Baza (${sheetName})` : 'Laboratorijski izveštaj',
        patientName: 'Dušan Matijašević',
        summary: `Laboratorijski ${repTitle} od ${dateStr} za pacijenta Dušan Matijašević.`,
        parameters: [],
        uploadedAt: new Date().toISOString(),
        fileFormat: 'xlsx',
      };
      outMap.set(reportKey, report);
    }

    for (const pCol of paramColumns) {
      const rawVal = row[pCol.colIdx];
      const numVal = cleanNumericValue(rawVal);
      if (numVal === null) continue;

      const defaults = CLINICAL_DEFAULTS[pCol.key];
      const refMin = defaults?.refMin ?? null;
      const refMax = defaults?.refMax ?? null;
      const refText = defaults?.refText || '-';
      const unit = defaults?.unit || 'mmol/L';
      const status: ParameterStatus = calculateParameterStatus(numVal, refMin, refMax, pCol.key);

      const parameter: LabParameter = {
        id: `param-${pCol.key}-${dateStr}-${pCol.colIdx}-${r}`,
        name: pCol.name,
        alias: pCol.alias,
        category: pCol.category || defaults?.category || 'Biohemija',
        value: numVal,
        unit,
        refMin,
        refMax,
        refText,
        status,
      };

      const existingIdx = report.parameters.findIndex((p) => p.name === parameter.name);
      if (existingIdx >= 0) {
        report.parameters[existingIdx] = parameter;
      } else {
        report.parameters.push(parameter);
      }
    }
  }
}

/**
 * Orientation C: Long table format (one measurement per row)
 * [Datum] | [Parametar] | [Rezultat] | [Jedinica] | [Ref. vrednosti]
 */
function parseFlatRecordsSheet(
  grid: any[][],
  fileName: string,
  sheetName: string,
  outMap: Map<string, LabReport>
) {
  const headerRow = grid[0] || [];
  const headerTexts = headerRow.map((c) => String(c || '').toLowerCase().trim());

  const dateIdx = headerTexts.findIndex((t) => t.includes('datum') || t.includes('date'));
  const paramIdx = headerTexts.findIndex((t) => t.includes('param') || t.includes('analiz') || t.includes('naziv'));
  const valIdx = headerTexts.findIndex((t) => t.includes('rezult') || t.includes('vredn') || t.includes('value'));
  const unitIdx = headerTexts.findIndex((t) => t.includes('jedin') || t.includes('unit'));
  const refIdx = headerTexts.findIndex((t) => t.includes('ref') || t.includes('granic') || t.includes('norm'));

  if (dateIdx === -1 || paramIdx === -1 || valIdx === -1) return;

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;

    const dateStr = parseDateToISO(row[dateIdx]);
    const rawParam = String(row[paramIdx] || '').trim();
    const numVal = cleanNumericValue(row[valIdx]);

    if (!dateStr || !rawParam || numVal === null) continue;

    const canon = getCanonicalParameter(rawParam);
    const defaults = CLINICAL_DEFAULTS[canon.canonicalKey];

    let unit = (unitIdx >= 0 && row[unitIdx] ? String(row[unitIdx]).trim() : '') || defaults?.unit || 'mmol/L';
    let refMin = defaults?.refMin ?? null;
    let refMax = defaults?.refMax ?? null;
    let refText = defaults?.refText || '-';

    if (refIdx >= 0 && row[refIdx]) {
      const parsedRef = parseRefLimits(row[refIdx]);
      if (parsedRef.refText) {
        refText = parsedRef.refText;
        refMin = parsedRef.refMin ?? refMin;
        refMax = parsedRef.refMax ?? refMax;
      }
    }

    const status: ParameterStatus = calculateParameterStatus(numVal, refMin, refMax, canon.canonicalKey);

    const parameter: LabParameter = {
      id: `param-${canon.canonicalKey}-${dateStr}-${r}`,
      name: canon.name,
      alias: canon.alias,
      category: canon.category || defaults?.category || 'Biohemija',
      value: numVal,
      unit,
      refMin,
      refMax,
      refText,
      status,
    };

    let report = outMap.get(dateStr);
    if (!report) {
      report = {
        id: `excel-report-${dateStr}`,
        fileName: fileName,
        fileSource: 'excel',
        fileType: 'excel',
        date: dateStr,
        laboratoryName: sheetName !== 'Sheet1' ? `Excel Baza (${sheetName})` : 'Laboratorijski izveštaj',
        patientName: 'Dušan Matijašević',
        summary: `Laboratorijski nalaz od ${dateStr} za pacijenta Dušan Matijašević.`,
        parameters: [],
        uploadedAt: new Date().toISOString(),
        fileFormat: 'xlsx',
      };
      outMap.set(dateStr, report);
    }

    const existingIdx = report.parameters.findIndex((p) => p.name === parameter.name);
    if (existingIdx >= 0) {
      report.parameters[existingIdx] = parameter;
    } else {
      report.parameters.push(parameter);
    }
  }
}

/**
 * Convert 0-indexed column number to Excel column letter (0 -> 'A', 1 -> 'B', 3 -> 'D', 26 -> 'AA'...)
 */
export function colIndexToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Format date to Serbian style commonly used in laboratory tables (DD.MM.YYYY.)
 */
export function formatSerbianDateForExcel(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}.`;
  }
  return dateStr;
}

export interface AppendReportResult {
  updatedReports: LabReport[];
  updatedGrid: any[][];
  workbook: XLSX.WorkBook;
  excelBase64: string;
  nextReportNumber: number;
  columnLetter: string;
}

export interface DuplicateCheckResult {
  hasDuplicateDate: boolean;
  existingReport: LabReport | null;
  overlappingParams: string[];
  allExistingParamsCount: number;
  newParamsCount: number;
}

/**
 * Checks if a report with the same date already exists in the database
 * and determines which parameters overlap between them.
 */
export function checkDuplicateReportInDatabase(
  existingReports: LabReport[],
  newReport: LabReport
): DuplicateCheckResult {
  if (!newReport.date || existingReports.length === 0) {
    return {
      hasDuplicateDate: false,
      existingReport: null,
      overlappingParams: [],
      allExistingParamsCount: 0,
      newParamsCount: newReport.parameters?.length || 0,
    };
  }

  const cleanNewDate = newReport.date.trim();
  const existing = existingReports.find((r) => (r.date || '').trim() === cleanNewDate);

  if (!existing) {
    return {
      hasDuplicateDate: false,
      existingReport: null,
      overlappingParams: [],
      allExistingParamsCount: 0,
      newParamsCount: newReport.parameters?.length || 0,
    };
  }

  // Find overlapping parameters by name, canonical key, or alias
  const existingKeys = new Set<string>();
  existing.parameters.forEach((p) => {
    existingKeys.add(p.name.toLowerCase().trim());
    const canon = getCanonicalParameter(p.name);
    if (canon.canonicalKey) existingKeys.add(canon.canonicalKey.toLowerCase());
    if (p.alias) existingKeys.add(p.alias.toLowerCase().trim());
  });

  const overlapping: string[] = [];
  (newReport.parameters || []).forEach((p) => {
    const canon = getCanonicalParameter(p.name);
    if (
      existingKeys.has(p.name.toLowerCase().trim()) ||
      (canon.canonicalKey && existingKeys.has(canon.canonicalKey.toLowerCase())) ||
      (p.alias && existingKeys.has(p.alias.toLowerCase().trim()))
    ) {
      overlapping.push(p.name);
    }
  });

  return {
    hasDuplicateDate: true,
    existingReport: existing,
    overlappingParams: overlapping,
    allExistingParamsCount: existing.parameters.length,
    newParamsCount: newReport.parameters?.length || 0,
  };
}

/**
 * Updates an existing report for a date in-place within the Excel database.
 * Does not create a duplicate column; instead merges/updates values in the existing column.
 */
export function updateReportInExcelDatabase(
  currentReports: LabReport[],
  existingReportId: string,
  newReport: LabReport,
  existingGrid?: any[][] | null
): AppendReportResult {
  const existingIndex = currentReports.findIndex(
    (r) => r.id === existingReportId || r.date === newReport.date
  );

  if (existingIndex === -1) {
    return appendReportToExcelDatabase(currentReports, newReport, existingGrid);
  }

  const existingReport = currentReports[existingIndex];
  const reportNumber =
    existingReport.reportNumber !== undefined ? existingReport.reportNumber : existingIndex + 1;

  // Merge parameters: update existing with new measured values, append any new parameters
  const mergedParams = [...existingReport.parameters];
  (newReport.parameters || []).forEach((newP) => {
    const canonNew = getCanonicalParameter(newP.name);
    const pIdx = mergedParams.findIndex((oldP) => {
      if (oldP.name.toLowerCase() === newP.name.toLowerCase()) return true;
      const canonOld = getCanonicalParameter(oldP.name);
      return canonOld.canonicalKey === canonNew.canonicalKey;
    });

    if (pIdx >= 0) {
      mergedParams[pIdx] = {
        ...mergedParams[pIdx],
        value: newP.value,
        status: newP.status,
        unit: newP.unit || mergedParams[pIdx].unit,
        refText: newP.refText || mergedParams[pIdx].refText,
      };
    } else {
      mergedParams.push(newP);
    }
  });

  const updatedReport: LabReport = {
    ...existingReport,
    parameters: enforceLipidIntegrity(mergedParams),
    summary: newReport.summary || existingReport.summary,
    uploadedAt: new Date().toISOString(),
  };

  const updatedReports = [...currentReports];
  updatedReports[existingIndex] = updatedReport;

  // Update in Excel grid
  let grid: any[][] = [];
  const baseGrid = existingGrid || getCachedExcelGrid();

  if (baseGrid && baseGrid.length >= 2) {
    grid = baseGrid.map((r) => (Array.isArray(r) ? [...r] : []));

    let reportNumRowIdx = 1;
    let maxRepNumCount = 0;
    for (let r = 0; r < Math.min(grid.length, 3); r++) {
      let cnt = 0;
      for (let c = 3; c < (grid[r] || []).length; c++) {
        if (parseReportNumberFromCell(grid[r][c]) !== null) cnt++;
      }
      if (cnt > maxRepNumCount) {
        maxRepNumCount = cnt;
        reportNumRowIdx = r;
      }
    }
    const dateRowIdx = reportNumRowIdx === 0 ? 1 : 0;

    // Find the column corresponding to this existing report
    let targetColIdx = -1;
    for (let c = 3; c < (grid[0] || []).length; c++) {
      const colNum = parseReportNumberFromCell(grid[reportNumRowIdx]?.[c]);
      const colDate = parseDateToISO(grid[dateRowIdx]?.[c]);
      if (colNum === reportNumber || (colDate && colDate === existingReport.date)) {
        targetColIdx = c;
        break;
      }
    }

    if (targetColIdx !== -1) {
      const placedParams = new Set<string>();
      const startParamRow = Math.max(reportNumRowIdx + 1, dateRowIdx + 1, 2);

      for (let r = startParamRow; r < grid.length; r++) {
        const paramNameInRow = String(grid[r][0] || '').trim();
        if (!paramNameInRow) continue;

        const rowCanon = getCanonicalParameter(paramNameInRow);
        const match = updatedReport.parameters.find((p) => {
          if (p.name.toLowerCase() === paramNameInRow.toLowerCase()) return true;
          const pCanon = getCanonicalParameter(p.name);
          return pCanon.canonicalKey === rowCanon.canonicalKey;
        });

        if (match) {
          grid[r][targetColIdx] = match.value;
          placedParams.add(match.name);
        }
      }

      // Check if new parameters need rows
      for (const p of updatedReport.parameters) {
        if (!placedParams.has(p.name)) {
          const newRow: any[] = new Array(grid[0].length).fill('');
          newRow[0] = p.name;
          newRow[1] = p.unit || '';
          newRow[2] = p.refText || '-';
          newRow[targetColIdx] = p.value;
          grid.push(newRow);
          placedParams.add(p.name);
        }
      }
    }
  }

  if (grid.length < 2) {
    const allSorted = [...updatedReports].sort((a, b) => {
      if (a.reportNumber !== undefined && b.reportNumber !== undefined) {
        return Number(a.reportNumber) - Number(b.reportNumber);
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const paramMap = new Map<string, { name: string; unit: string; refText: string }>();
    allSorted.forEach((r) => {
      r.parameters.forEach((p) => {
        if (!paramMap.has(p.name)) {
          paramMap.set(p.name, {
            name: p.name,
            unit: p.unit || '',
            refText: p.refText || '-',
          });
        }
      });
    });

    const row1 = [
      'Parametar',
      'Jedinica',
      'Referentne vrednosti',
      ...allSorted.map((r) => formatSerbianDateForExcel(r.date)),
    ];
    const row2 = [
      'Broj izveštaja',
      '',
      '',
      ...allSorted.map((r, i) => (r.reportNumber !== undefined ? r.reportNumber : i + 1)),
    ];

    grid = [row1, row2];

    Array.from(paramMap.values()).forEach((pInfo) => {
      const row: any[] = [pInfo.name, pInfo.unit, pInfo.refText];
      allSorted.forEach((r) => {
        const match = r.parameters.find((p) => p.name === pInfo.name);
        row.push(match ? match.value : '');
      });
      grid.push(row);
    });
  }

  setCachedExcelGrid(grid);

  const ws = XLSX.utils.aoa_to_sheet(grid);
  ws['!cols'] = [
    { wch: 28 },
    { wch: 12 },
    { wch: 18 },
    ...Array(Math.max(1, (grid[0] || []).length - 3)).fill({ wch: 15 }),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laboratorija');
  const excelBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

  const lastColIdx = (grid[0] || []).length - 1;
  const columnLetter = colIndexToLetter(lastColIdx);

  return {
    updatedReports,
    updatedGrid: grid,
    workbook: wb,
    excelBase64,
    nextReportNumber: Number(reportNumber) || (existingIndex + 1),
    columnLetter,
  };
}

/**
 * Appends a newly scanned/extracted lab report into the Excel database.
 * Places the parameters in the first free column on the right side.
 * Layout strictly follows:
 * - Columns A, B, C: Parameter Name, Unit, Reference Limits
 * - Row 1: Report dates (Columns D, E, F...)
 * - Row 2: Report numbers (1, 2, 3...)
 * - Rows 3+: Measured values for each parameter row
 */
export function appendReportToExcelDatabase(
  currentReports: LabReport[],
  newReport: LabReport,
  existingGrid?: any[][] | null
): AppendReportResult {
  // 1. Determine next sequential report number
  const maxNum = currentReports.reduce((m, r) => Math.max(m, Number(r.reportNumber) || 0), 0);
  const nextReportNumber = maxNum > 0 ? maxNum + 1 : (currentReports.length + 1);

  // 2. Prepare standardized report object
  const cleanReportDate = newReport.date || new Date().toISOString().split('T')[0];
  const preparedReport: LabReport = {
    ...newReport,
    id: `excel-report-${cleanReportDate}-${nextReportNumber}-${Date.now()}`,
    reportNumber: nextReportNumber,
    fileName: `Izveštaj br. ${nextReportNumber}`,
    fileSource: 'excel',
    fileType: 'excel',
    date: cleanReportDate,
    uploadedAt: new Date().toISOString(),
  };

  // 3. Grid manipulation: insert into first free column on the right side
  let grid: any[][] = [];
  const baseGrid = existingGrid || getCachedExcelGrid();

  if (baseGrid && baseGrid.length >= 2) {
    grid = baseGrid.map((r) => (Array.isArray(r) ? [...r] : []));

    // Find row with report numbers (Row 2 = index 1 in 0-based indexing)
    let reportNumRowIdx = 1;
    let maxRepNumCount = 0;
    for (let r = 0; r < Math.min(grid.length, 3); r++) {
      let cnt = 0;
      for (let c = 3; c < (grid[r] || []).length; c++) {
        if (parseReportNumberFromCell(grid[r][c]) !== null) cnt++;
      }
      if (cnt > maxRepNumCount) {
        maxRepNumCount = cnt;
        reportNumRowIdx = r;
      }
    }

    // Date row (Row 1 = index 0)
    let dateRowIdx = reportNumRowIdx === 0 ? 1 : 0;

    // Find first free column on the right side
    let maxCol = 3;
    for (let r = 0; r < grid.length; r++) {
      if (grid[r] && grid[r].length > maxCol) {
        maxCol = grid[r].length;
      }
    }
    const newColIdx = maxCol;

    // Pad all rows up to newColIdx
    for (let r = 0; r < grid.length; r++) {
      if (!grid[r]) grid[r] = [];
      while (grid[r].length < newColIdx) {
        grid[r].push('');
      }
    }

    // Set Date in Row 1 of the new column
    grid[dateRowIdx][newColIdx] = formatSerbianDateForExcel(preparedReport.date);

    // Set Report Number in Row 2 of the new column
    grid[reportNumRowIdx][newColIdx] = nextReportNumber;

    // Track which parameters have been placed
    const placedParams = new Set<string>();
    const startParamRow = Math.max(reportNumRowIdx + 1, dateRowIdx + 1, 2);

    for (let r = startParamRow; r < grid.length; r++) {
      const paramNameInRow = String(grid[r][0] || '').trim();
      if (!paramNameInRow) {
        grid[r][newColIdx] = '';
        continue;
      }

      const rowCanon = getCanonicalParameter(paramNameInRow);
      const match = preparedReport.parameters.find((p) => {
        if (p.name.toLowerCase() === paramNameInRow.toLowerCase()) return true;
        const pCanon = getCanonicalParameter(p.name);
        if (pCanon.canonicalKey === rowCanon.canonicalKey) return true;
        if (p.alias && p.alias.toLowerCase() === paramNameInRow.toLowerCase()) return true;
        return false;
      });

      if (match) {
        grid[r][newColIdx] = match.value;
        placedParams.add(match.name);
      } else {
        grid[r][newColIdx] = '';
      }
    }

    // Append any newly discovered parameters in this report as new rows at the bottom
    for (const p of preparedReport.parameters) {
      if (!placedParams.has(p.name)) {
        const newRow: any[] = new Array(newColIdx + 1).fill('');
        newRow[0] = p.name;
        newRow[1] = p.unit || '';
        newRow[2] = p.refText || '-';
        newRow[newColIdx] = p.value;
        grid.push(newRow);
        placedParams.add(p.name);
      }
    }
  } else {
    // Construct clean grid conforming to user's table standard:
    // Columns A, B, C = Parameter, Unit, Ref Limits
    // Row 1 = Dates
    // Row 2 = Report Numbers
    // Rows 3+ = Parameter Values
    const allSorted = [...currentReports, preparedReport].sort((a, b) => {
      if (a.reportNumber !== undefined && b.reportNumber !== undefined) {
        return Number(a.reportNumber) - Number(b.reportNumber);
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const paramMap = new Map<string, { name: string; unit: string; refText: string }>();
    allSorted.forEach((r) => {
      r.parameters.forEach((p) => {
        if (!paramMap.has(p.name)) {
          paramMap.set(p.name, {
            name: p.name,
            unit: p.unit || '',
            refText: p.refText || '-',
          });
        }
      });
    });

    // Row 1: Headers & Dates
    const row1 = ['Parametar', 'Jedinica', 'Referentne vrednosti', ...allSorted.map((r) => formatSerbianDateForExcel(r.date))];
    // Row 2: Report numbers
    const row2 = ['Broj izveštaja', '', '', ...allSorted.map((r, i) => (r.reportNumber !== undefined ? r.reportNumber : (i + 1)))];

    grid = [row1, row2];

    Array.from(paramMap.values()).forEach((pInfo) => {
      const row: any[] = [pInfo.name, pInfo.unit, pInfo.refText];
      allSorted.forEach((r) => {
        const match = r.parameters.find((p) => p.name === pInfo.name);
        row.push(match ? match.value : '');
      });
      grid.push(row);
    });
  }

  // Update in-memory & localStorage grid
  setCachedExcelGrid(grid);

  // Build XLSX workbook
  const ws = XLSX.utils.aoa_to_sheet(grid);
  ws['!cols'] = [
    { wch: 28 }, // Kolona A: Parametar
    { wch: 12 }, // Kolona B: Jedinica
    { wch: 18 }, // Kolona C: Referentne vrednosti
    ...Array(Math.max(1, (grid[0] || []).length - 3)).fill({ wch: 15 }),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laboratorija');
  const excelBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

  // Update reports list
  const existingFiltered = currentReports.filter((r) => r.id !== preparedReport.id);
  const updatedReports = [...existingFiltered, preparedReport].sort((a, b) => {
    if (a.reportNumber !== undefined && b.reportNumber !== undefined) {
      return Number(a.reportNumber) - Number(b.reportNumber);
    }
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const lastColIdx = (grid[0] || []).length - 1;
  const columnLetter = colIndexToLetter(lastColIdx);

  return {
    updatedReports,
    updatedGrid: grid,
    workbook: wb,
    excelBase64,
    nextReportNumber,
    columnLetter,
  };
}

/**
 * Exports current reports database into a clean, professional Excel (.xlsx) spreadsheet.
 * Layout strictly matches the user's table:
 * - Columns A, B, C: Parameter, Unit, Reference Limits
 * - Row 1: Report dates
 * - Row 2: Report numbers (1, 2, 3...)
 * - Rows 3+: Parameter values
 */
export function exportReportsToExcel(reports: LabReport[], exportFileName?: string) {
  if (reports.length === 0) return;

  const cachedGrid = getCachedExcelGrid();
  let wb: XLSX.WorkBook;

  if (cachedGrid && cachedGrid.length >= 2) {
    const ws = XLSX.utils.aoa_to_sheet(cachedGrid);
    ws['!cols'] = [
      { wch: 28 }, // Kolona A
      { wch: 12 }, // Kolona B
      { wch: 18 }, // Kolona C
      ...Array(Math.max(1, (cachedGrid[0] || []).length - 3)).fill({ wch: 15 }),
    ];
    wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laboratorija');
  } else {
    const sortedReports = [...reports].sort((a, b) => {
      if (a.reportNumber !== undefined && b.reportNumber !== undefined) {
        return Number(a.reportNumber) - Number(b.reportNumber);
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const paramMap = new Map<string, { name: string; unit: string; refText: string }>();
    sortedReports.forEach((rep) => {
      rep.parameters.forEach((p) => {
        if (!paramMap.has(p.name)) {
          paramMap.set(p.name, {
            name: p.name,
            unit: p.unit || '',
            refText: p.refText || '-',
          });
        }
      });
    });

    const row1 = ['Parametar / Analiza', 'Referentne vrednosti', 'Jedinice', ...sortedReports.map((_, i) => '')];
    const row2 = ['Identifikator izveštaja', '', '', ...sortedReports.map((r, i) => (r.fileName && r.fileName.startsWith('Izve') ? r.fileName : `Izvestaj ${r.reportNumber !== undefined ? r.reportNumber : (i + 1)}`))];
    const row3 = ['Period', '', '', ...sortedReports.map((r) => r.period || formatSerbianMonth(r.date))];
    const row4 = ['Tačan datum nalaza', '', '', ...sortedReports.map((r) => formatSerbianDateForExcel(r.date))];

    const rows: any[][] = [row1, row2, row3, row4];

    Array.from(paramMap.values()).forEach((pInfo) => {
      const row: any[] = [pInfo.name, pInfo.refText, pInfo.unit];
      for (const rep of sortedReports) {
        const match = rep.parameters.find((p) => p.name === pInfo.name);
        row.push(match ? match.value : 'nije rađena analiza');
      }
      rows.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 28 }, // Kolona A: Parametar / Analiza
      { wch: 20 }, // Kolona B: Referentne vrednosti
      { wch: 14 }, // Kolona C: Jedinice
      ...sortedReports.map(() => ({ wch: 15 })),
    ];

    wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laboratorija');
  }

  const finalName = exportFileName || `Laboratorijska_Baza_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, finalName);
}
