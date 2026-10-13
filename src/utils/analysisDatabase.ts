import { LabReport, ParameterTrend } from '../types';
import { calculateTrends } from './trendCalculator';

const STORAGE_KEY = 'lab_analysis_database_v4_null_unmeasured_chronology';

export interface AnalysisDatabaseRecord {
  signature: string;
  reportsCount: number;
  analyzedAt: string;
  parameterTrends: ParameterTrend[];
  canonicalParametersCount: number;
  abnormalParametersCount: number;
  dateRange: {
    oldest: string;
    newest: string;
  };
  reportIds: string[];
}

/**
 * Generates a stable signature / checksum for a set of lab reports.
 * Changes whenever reports are added, removed, or modified.
 */
export function computeReportsSignature(reports: LabReport[]): string {
  if (!reports || reports.length === 0) return 'empty_0';

  // Sort reports by ID so order does not affect signature
  const sorted = [...reports].sort((a, b) => a.id.localeCompare(b.id));
  const elements = sorted.map(
    (r) => `${r.id}:${r.date}:${r.parameters?.length || 0}:${r.fileName}`
  );

  return `sig_${reports.length}_${elements.join('|')}`;
}

/**
 * Loads the saved analysis database from storage if present.
 */
export function loadSavedAnalysisDatabase(): AnalysisDatabaseRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray(parsed.parameterTrends) &&
      typeof parsed.signature === 'string'
    ) {
      return parsed as AnalysisDatabaseRecord;
    }
  } catch (err) {
    console.warn('[AnalysisDatabase] Failed to parse saved database:', err);
  }
  return null;
}

/**
 * Saves the analysis database to persistent storage.
 */
export function saveAnalysisDatabase(record: AnalysisDatabaseRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    // Also sync to server in background for durable persistence
    fetch('/api/database/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(() => {
      // Ignore background sync errors
    });
  } catch (err) {
    console.error('[AnalysisDatabase] Failed to save database to localStorage:', err);
  }
}

export function clearAnalysisDatabase(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    fetch('/api/database/analysis', {
      method: 'DELETE',
    }).catch(() => {});
  } catch (err) {
    console.error('[AnalysisDatabase] Failed to clear database:', err);
  }
}

/**
 * Checks if the existing analysis database is up-to-date with current reports.
 */
export function isDatabaseUpToDate(reports: LabReport[]): boolean {
  // STRICT RULE: Only Excel reports are analyzed
  const excelReports = (reports || []).filter((r) => r && r.fileSource === 'excel');
  if (excelReports.length === 0) return true;
  const currentSig = computeReportsSignature(excelReports);
  const saved = loadSavedAnalysisDatabase();
  return saved !== null && saved.signature === currentSig && saved.reportsCount === excelReports.length;
}

/**
 * Core Database Engine:
 * - If analysis database exists and matches reports signature, loads instantly from the database without re-analyzing.
 * - ONLY when a new report is added (or reports change) does it perform re-analysis for all reports and update the database.
 * - STRICT MEDICAL RULE: ONLY reports originating from Excel tables (fileSource === 'excel') are analyzed.
 *   PDF reports are view-only and never analyzed or included in trends.
 */
export function getOrBuildAnalysisDatabase(
  reports: LabReport[],
  forceReanalyze: boolean = false
): {
  database: AnalysisDatabaseRecord;
  reanalyzed: boolean;
} {
  // STRICT RULE: Only analyze data from Excel tables
  const excelReports = (reports || []).filter((r) => r && r.fileSource === 'excel');

  if (excelReports.length === 0) {
    return {
      database: {
        signature: 'empty_0',
        reportsCount: 0,
        analyzedAt: new Date().toISOString(),
        parameterTrends: [],
        canonicalParametersCount: 0,
        abnormalParametersCount: 0,
        dateRange: { oldest: '', newest: '' },
        reportIds: [],
      },
      reanalyzed: false,
    };
  }

  const currentSignature = computeReportsSignature(excelReports);

  if (!forceReanalyze) {
    const saved = loadSavedAnalysisDatabase();
    if (
      saved &&
      saved.signature === currentSignature &&
      saved.reportsCount === excelReports.length
    ) {
      // CACHE HIT: Instant retrieval, no re-analysis executed
      return {
        database: saved,
        reanalyzed: false,
      };
    }
  }

  // RE-ANALYSIS: Run comprehensive parameter analysis across all Excel reports
  const sortedReports = [...excelReports].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const parameterTrends = calculateTrends(sortedReports);
  const abnormalCount = parameterTrends.filter((t) => t.latestStatus !== 'normal').length;

  const dates = sortedReports.map((r) => r.date).filter(Boolean);
  const oldestDate = dates.length > 0 ? dates[0] : '';
  const newestDate = dates.length > 0 ? dates[dates.length - 1] : '';

  const newRecord: AnalysisDatabaseRecord = {
    signature: currentSignature,
    reportsCount: sortedReports.length,
    analyzedAt: new Date().toISOString(),
    parameterTrends,
    canonicalParametersCount: parameterTrends.length,
    abnormalParametersCount: abnormalCount,
    dateRange: {
      oldest: oldestDate,
      newest: newestDate,
    },
    reportIds: sortedReports.map((r) => r.id),
  };

  saveAnalysisDatabase(newRecord);

  return {
    database: newRecord,
    reanalyzed: true,
  };
}
