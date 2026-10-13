import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Search,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Plus,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Cloud,
  Camera,
  Image,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Info,
  Loader2,
  Check,
  Printer,
  LogOut,
  Trash2,
  Heart,
  Scale,
  Database,
  XCircle,
} from 'lucide-react';
import { Header } from './components/Header';
import { TrendChart } from './components/TrendChart';
import { ParameterCommentary } from './components/ParameterCommentary';
import { ParameterCard } from './components/ParameterCard';
import { AiInsightsPanel } from './components/AiInsightsPanel';
import { OneDriveModal } from './components/OneDriveModal';
import { OneDrivePickerModal } from './components/OneDrivePickerModal';
import { OneDrivePdfModal } from './components/OneDrivePdfModal';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { PdfUploadModal } from './components/PdfUploadModal';
import { DocumentScannerModal } from './components/DocumentScannerModal';
import { LoadReportsMenuModal } from './components/LoadReportsMenuModal';
import { ParameterSelectionModal } from './components/ParameterSelectionModal';
import { PrintableParameterReportModal } from './components/PrintableParameterReportModal';
import { BloodPressureModal } from './components/BloodPressureModal';
import { BodyWeightModal } from './components/BodyWeightModal';
import { InstallAppBanner } from './components/InstallAppBanner';
import { AutoInstallPromptModal } from './components/AutoInstallPromptModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { SAMPLE_LAB_REPORTS } from './data/sampleLabs';
import { calculateTrends } from './utils/trendCalculator';
import { openPdfBlobInAcrobat } from './utils/pdfViewerHelper';
import {
  getOrBuildAnalysisDatabase,
  isDatabaseUpToDate,
  loadSavedAnalysisDatabase,
  clearAnalysisDatabase,
  AnalysisDatabaseRecord,
} from './utils/analysisDatabase';
import { parseExcelDatabase, exportReportsToExcel, appendReportToExcelDatabase, formatSerbianDateForExcel } from './utils/excelParser';
import { LabReport, OneDriveAccount, ParameterCategory, BloodPressureRecord, BodyWeightRecord } from './types';

const CATEGORIES: (ParameterCategory | 'Sve')[] = [
  'Sve',
  'Lipidni status',
  'Biohemija',
  'Hematologija',
  'Enzimi jetre',
  'Bubrežna funkcija',
  'Zapaljenski markeri',
];

/**
 * Standardize filename to detect duplicates across OneDrive and local uploads.
 */
export function normalizeReportFileName(name: string): string {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/^onedrive[\/\\]/i, '')
    .replace(/^(lekarski\s+izvestaji|laboratorija)[\/\\]/i, '')
    .replace(/^laboratorija[_\s-]+/i, '')
    .replace(/\.(pdf|jpe?g|png|webp)$/i, '');
}

/**
 * Strict deduplication by ID, OneDrive ID, and Date + normalized filename.
 * Allows multiple distinct reports with different dates/months from the same source file.
 */
export function deduplicateReports(reportsList: LabReport[]): LabReport[] {
  const seenIds = new Set<string>();
  const seenOneDriveIds = new Set<string>();
  const seenDateAndFiles = new Set<string>();
  const result: LabReport[] = [];

  for (const r of reportsList) {
    if (!r) continue;
    const lowerName = (r.fileName || '').toLowerCase().trim();
    const dateKey = `${lowerName}_${r.date || ''}`;

    if (r.id && seenIds.has(r.id)) continue;
    if (r.oneDriveId && seenOneDriveIds.has(r.oneDriveId)) continue;
    // Do NOT discard reports from Excel that share a date (e.g. morning/evening or two columns)
    if (r.fileSource !== 'excel' && lowerName && r.date && seenDateAndFiles.has(dateKey)) continue;

    if (r.id) seenIds.add(r.id);
    if (r.oneDriveId) seenOneDriveIds.add(r.oneDriveId);
    if (lowerName && r.date) seenDateAndFiles.add(dateKey);

    result.push(r);
  }

  return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export default function App() {
  // State for loaded reports (persisted in localStorage, strictly Excel reports only)
  const [reports, setReports] = useState<LabReport[]>(() => {
    try {
      const wasCleared = localStorage.getItem('lab_reports_cleared') === 'true';
      if (wasCleared) {
        return [];
      }
      const saved = localStorage.getItem('lab_reports');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // STRICT RULE: Only reports originating from Excel are analyzed and kept in database
          const excelOnly = parsed.filter((r: any) => r && r.fileSource === 'excel');
          return deduplicateReports(excelOnly);
        }
      }
    } catch {
      // Fallback
    }
    // Clean empty database by default - user loads their Excel database
    return [];
  });

  // Analysis Database state (once built, loaded instantly without re-analysis)
  const [analysisDb, setAnalysisDb] = useState<AnalysisDatabaseRecord>(() => {
    return getOrBuildAnalysisDatabase(reports, false).database;
  });
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // OneDrive Account state
  const [oneDriveAccount, setOneDriveAccount] = useState<OneDriveAccount>({
    connected: false,
    configured: false,
  });

  // Active view: 'home' (simplified buttons front page), 'analysis' (trend + commentary), or 'documents' (loaded reports)
  const [activeView, setActiveView] = useState<'home' | 'analysis' | 'documents'>('home');

  // PWA install state
  const pwa = usePWAInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Modals state
  const [isLoadMenuOpen, setIsLoadMenuOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isParameterSelectionOpen, setIsParameterSelectionOpen] = useState(false);
  const [isOneDriveModalOpen, setIsOneDriveModalOpen] = useState(false);
  const [isOneDrivePickerOpen, setIsOneDrivePickerOpen] = useState(false);
  const [isOneDrivePdfModalOpen, setIsOneDrivePdfModalOpen] = useState(false);
  const [viewingPdfReport, setViewingPdfReport] = useState<LabReport | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPrintReportModalOpen, setIsPrintReportModalOpen] = useState(false);
  const [isBloodPressureModalOpen, setIsBloodPressureModalOpen] = useState(false);
  const [isBodyWeightModalOpen, setIsBodyWeightModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isAppExited, setIsAppExited] = useState(false);

  // Persistent Health Metrics (Blood Pressure & Body Weight)
  const [bloodPressureRecords, setBloodPressureRecords] = useState<BloodPressureRecord[]>(() => {
    try {
      const saved = localStorage.getItem('health_metrics_bp');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [bodyWeightRecords, setBodyWeightRecords] = useState<BodyWeightRecord[]>(() => {
    try {
      const saved = localStorage.getItem('health_metrics_bw');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [lastMetricsSync, setLastMetricsSync] = useState<string | undefined>();

  // Gallery file processing state
  const [isExtractingGallery, setIsExtractingGallery] = useState(false);
  const [extractingGalleryMsg, setExtractingGalleryMsg] = useState('');
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Duplicate report confirmation state before adding to Excel
  const [duplicateConfirmReport, setDuplicateConfirmReport] = useState<{
    report: LabReport;
    savedPath: string;
  } | null>(null);

  // Active parameter for analysis
  const [selectedParamName, setSelectedParamName] = useState<string | null>('Glukoza');
  const [compareParamName, setCompareParamName] = useState<string | null>(null);

  // Filter controls for detailed browse
  const [selectedCategory, setSelectedCategory] = useState<ParameterCategory | 'Sve'>('Sve');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAbnormal, setOnlyAbnormal] = useState(false);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Sync reports to local storage (only Excel reports are stored)
  useEffect(() => {
    try {
      const excelOnly = reports.filter((r) => r.fileSource === 'excel');
      localStorage.setItem('lab_reports', JSON.stringify(excelOnly));
    } catch (e) {
      console.error('Failed to save reports to localStorage:', e);
    }
  }, [reports]);



  // Fetch OneDrive connectivity status on mount
  const checkOneDriveStatus = async () => {
    try {
      const res = await fetch('/api/onedrive/status');
      if (res.ok) {
        const data = await res.json();
        setOneDriveAccount({
          connected: data.connected,
          userEmail: data.userEmail,
          userName: data.userName,
          configured: data.configured,
          isValidFormat: data.isValidFormat,
          isPlaceholder: data.isPlaceholder,
          clientId: data.clientId,
          rawClientId: data.rawClientId,
          redirectUri: data.redirectUri,
        });
      }
    } catch {
      // Offline fallback
    }
  };

  useEffect(() => {
    checkOneDriveStatus();
    fetchHealthMetrics();
  }, []);

  // Fetch health metrics (Blood pressure & Body weight) from durable database
  const fetchHealthMetrics = async () => {
    try {
      const res = await fetch('/api/health-metrics');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          if (Array.isArray(json.data.bloodPressure)) {
            setBloodPressureRecords(json.data.bloodPressure);
            localStorage.setItem('health_metrics_bp', JSON.stringify(json.data.bloodPressure));
          }
          if (Array.isArray(json.data.bodyWeight)) {
            setBodyWeightRecords(json.data.bodyWeight);
            localStorage.setItem('health_metrics_bw', JSON.stringify(json.data.bodyWeight));
          }
          setLastMetricsSync(json.lastSyncedAt || json.data.lastSyncedAt);
        }
      }
    } catch {
      // Offline fallback
    }
  };

  const handleSaveBloodPressure = async (
    record: Omit<BloodPressureRecord, 'id' | 'createdAt'>
  ) => {
    try {
      const res = await fetch('/api/health-metrics/blood-pressure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Neuspešno snimanje pritiska.');
      }
      const data = await res.json();
      if (data.allRecords) {
        setBloodPressureRecords(data.allRecords);
        localStorage.setItem('health_metrics_bp', JSON.stringify(data.allRecords));
      }
      if (data.lastSyncedAt) {
        setLastMetricsSync(data.lastSyncedAt);
      }
      setToastNotification(
        'Krvni pritisak i puls su uspešno upisani u bazu i osveženi na OneDrive lokaciji!'
      );
    } catch (err: any) {
      console.error('Error saving blood pressure:', err);
      throw err;
    }
  };

  const handleDeleteBloodPressure = async (id: string) => {
    try {
      const res = await fetch(`/api/health-metrics/blood-pressure/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Greška pri brisanju zapisa.');
      const data = await res.json();
      if (data.allRecords) {
        setBloodPressureRecords(data.allRecords);
        localStorage.setItem('health_metrics_bp', JSON.stringify(data.allRecords));
      }
      setToastNotification('Merenje pritiska je obrisano i OneDrive baza je osvežena.');
    } catch (err: any) {
      console.error('Error deleting blood pressure record:', err);
      alert('Greška pri brisanju merenja pritiska.');
    }
  };

  const handleSaveBodyWeight = async (
    record: Omit<BodyWeightRecord, 'id' | 'createdAt'>
  ) => {
    try {
      const res = await fetch('/api/health-metrics/body-weight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Neuspešno snimanje telesne težine.');
      }
      const data = await res.json();
      if (data.allRecords) {
        setBodyWeightRecords(data.allRecords);
        localStorage.setItem('health_metrics_bw', JSON.stringify(data.allRecords));
      }
      if (data.lastSyncedAt) {
        setLastMetricsSync(data.lastSyncedAt);
      }
      setToastNotification(
        'Telesna težina je uspešno upisana u bazu i osvežena na OneDrive lokaciji!'
      );
    } catch (err: any) {
      console.error('Error saving body weight:', err);
      throw err;
    }
  };

  const handleDeleteBodyWeight = async (id: string) => {
    try {
      const res = await fetch(`/api/health-metrics/body-weight/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Greška pri brisanju zapisa.');
      const data = await res.json();
      if (data.allRecords) {
        setBodyWeightRecords(data.allRecords);
        localStorage.setItem('health_metrics_bw', JSON.stringify(data.allRecords));
      }
      setToastNotification('Zapis telesne težine je obrisan i OneDrive baza je osvežena.');
    } catch (err: any) {
      console.error('Error deleting body weight record:', err);
      alert('Greška pri brisanju zapisa telesne težine.');
    }
  };

  // Auto-dismiss toast notification
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => setToastNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  const handleDisconnectOneDrive = async () => {
    try {
      await fetch('/api/onedrive/disconnect', { method: 'POST' });
      setOneDriveAccount((prev) => ({
        ...prev,
        connected: false,
        userEmail: undefined,
        userName: undefined,
      }));
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  // Izračunaj ukupan broj jedinstvenih očitanih parametara direktno iz učitane baze nalaza (bez prevremene analize)
  const distinctParametersCount = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => {
      (r.parameters || []).forEach((p) => {
        if (p.name) set.add(p.name);
      });
    });
    return set.size;
  }, [reports]);

  // Analiza parametara se vrši ISKLJUČIVO na zahtev:
  // Nema analize pri učitavanju baze - analiza se pokreće tek kada korisnik klikne na Analizu ili odabere parametar!
  useEffect(() => {
    if (activeView === 'analysis' || isParameterSelectionOpen) {
      const isUpToDate = isDatabaseUpToDate(reports);
      if (!isUpToDate && reports.length > 0) {
        const result = getOrBuildAnalysisDatabase(reports, true);
        setAnalysisDb(result.database);
      } else {
        const saved = loadSavedAnalysisDatabase();
        if (saved) {
          setAnalysisDb(saved);
        }
      }
    }
  }, [activeView, isParameterSelectionOpen, reports]);

  // Trendovi za analizu (ako još nisu izračunati u bazi, pripremaju se na zahtev)
  const allTrends = useMemo(() => {
    if (analysisDb.parameterTrends && analysisDb.parameterTrends.length > 0) {
      return analysisDb.parameterTrends;
    }
    if (activeView === 'analysis' && reports.length > 0) {
      return calculateTrends(reports);
    }
    return [];
  }, [analysisDb.parameterTrends, activeView, reports]);

  // Direktni izlaz iz aplikacije i zatvaranje prozora/aplikacije bez međupromptovanja (Ostani/Izađi)
  const handleExitApplication = () => {
    setIsAppExited(true);
    try {
      if (typeof window !== 'undefined') {
        if ((window.navigator as any)?.app?.exitApp) {
          (window.navigator as any).app.exitApp();
        }
        window.close();
        window.open('', '_self', '');
        window.close();
      }
    } catch (e) {
      console.warn('Browser policy prevented auto-close:', e);
    }
  };

  useEffect(() => {
    if (isAppExited) {
      try {
        if ((window.navigator as any)?.app?.exitApp) {
          (window.navigator as any).app.exitApp();
        }
        window.close();
        window.open('', '_self', '');
        window.close();
      } catch {}
    }
  }, [isAppExited]);

  // Manual re-analyze trigger if user requests manual sync
  const handleManualReanalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const result = getOrBuildAnalysisDatabase(reports, true);
      setAnalysisDb(result.database);
      setIsAnalyzing(false);
      setToastNotification(`Baza osvežena: svih ${reports.length} nalaza je ponovo analizirano.`);
    }, 400);
  };

  // Reset entire database: clears loaded reports, parameters, and all analysis trends
  const handleResetDatabase = async () => {
    try {
      localStorage.setItem('lab_reports', '[]');
      localStorage.setItem('lab_reports_cleared', 'true');
      clearAnalysisDatabase();

      await fetch('/api/database/analysis', { method: 'DELETE' }).catch(() => {});
      await fetch('/api/database/reset', { method: 'POST' }).catch(() => {});

      setReports([]);
      setAnalysisDb({
        signature: 'empty_0',
        reportsCount: 0,
        analyzedAt: new Date().toISOString(),
        parameterTrends: [],
        canonicalParametersCount: 0,
        abnormalParametersCount: 0,
        dateRange: { oldest: '', newest: '' },
        reportIds: [],
      });
      setSelectedParamName(null);
      setCompareParamName(null);
      setIsResetConfirmOpen(false);
      setToastNotification('Učitana baza je resetovana. Vaša originalna Excel tabela na računaru/telefonu ostaje potpuno netaknuta i možete je ponovo očitati u svakom trenutku.');
    } catch (err: any) {
      console.error('Reset error:', err);
      setToastNotification('Greška pri resetovanju baze.');
    }
  };

  // If currently selected parameter is not in trends, fallback to first available
  useEffect(() => {
    if (allTrends.length > 0) {
      const exists = allTrends.some((t) => t.name === selectedParamName);
      if (!exists) {
        setSelectedParamName(allTrends[0].name);
      }
    } else {
      setSelectedParamName(null);
    }
  }, [allTrends, selectedParamName]);

  // Filter trends
  const filteredTrends = useMemo(() => {
    return allTrends.filter((trend) => {
      if (selectedCategory !== 'Sve' && trend.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = trend.name.toLowerCase().includes(query);
        const matchesAlias = trend.alias?.toLowerCase().includes(query);
        const matchesCat = trend.category.toLowerCase().includes(query);
        if (!matchesName && !matchesAlias && !matchesCat) return false;
      }
      if (onlyAbnormal && trend.latestStatus === 'normal') {
        return false;
      }
      return true;
    });
  }, [allTrends, selectedCategory, searchQuery, onlyAbnormal]);

  const currentSelectedTrend =
    allTrends.find((t) => t.name === selectedParamName) || allTrends[0];

  const abnormalCount = allTrends.filter((t) => t.latestStatus !== 'normal').length;

  // Handlers for adding and removing reports with resilient merging
  const handleImportReports = (newReports: LabReport[]) => {
    setReports((prev) => {
      localStorage.removeItem('lab_reports_cleared');

      // If importing an entire archive batch (e.g. 20+ reports), ensure all valid reports in the batch are incorporated
      const isBatchArchive = newReports.length >= 20;

      // Index existing reports by id, onedriveId, and lower filename
      const reportsMap = new Map<string, LabReport>();
      if (!isBatchArchive) {
        for (const r of prev) {
          if (r && r.id) {
            reportsMap.set(r.id, r);
          }
        }
      }

      for (const r of newReports) {
        if (!r) continue;
        const key = r.id || r.oneDriveId || (r.fileName ? r.fileName.toLowerCase().trim() : `rep-${Date.now()}`);
        reportsMap.set(key, r);
      }

      const merged = Array.from(reportsMap.values());
      const deduplicated = deduplicateReports(merged);

      if (deduplicated.length === prev.length && !isBatchArchive) {
        setToastNotification('Svi izabrani izveštaji su već u bazi.');
        return prev;
      }

      return deduplicated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
  };

  const handleReportExtracted = (newReport: LabReport, allowDuplicate = false, savedPath?: string) => {
    localStorage.removeItem('lab_reports_cleared');

    // Automatska provera pre dodavanja izveštaja u Excel:
    // ako sistem detektuje da parametri izveštaja već postoje za taj datum u tabeli,
    // prikaži upozorenje pre nego što korisnik potvrdi dupliranje.
    const duplicateForDate = reports.find((r) => r.date === newReport.date);
    if (duplicateForDate && !allowDuplicate) {
      setDuplicateConfirmReport({
        report: newReport,
        savedPath: savedPath || 'OneDrive/Lekarski izvestaji/Laboratorija',
      });
      return null;
    }

    try {
      // Ubacivanje parametara novog izveštaja u prvu slobodnu kolonu sa desne strane u Excel tabeli
      const appendResult = appendReportToExcelDatabase(reports, newReport);
      setReports(appendResult.updatedReports);
      localStorage.setItem('lab_reports', JSON.stringify(appendResult.updatedReports));

      // Automatski snimi ažuriranu Excel tabelu na OneDrive
      fetch('/api/onedrive/save-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excelBase64: appendResult.excelBase64,
          fileName: 'Laboratorijska_Baza.xlsx',
        }),
      }).catch((err) => {
        console.warn('Could not sync excel to onedrive:', err);
      });

      return appendResult;
    } catch (err: any) {
      console.warn('Fallback adding report to state:', err);
      setReports((prev) => {
        const normName = normalizeReportFileName(newReport.fileName);
        const filtered = prev.filter((r) => {
          if (r.id === newReport.id) return false;
          if (newReport.oneDriveId && r.oneDriveId === newReport.oneDriveId) return false;
          if (normalizeReportFileName(r.fileName) === normName && r.date === newReport.date) return false;
          return true;
        });
        const merged = [...filtered, { ...newReport, fileSource: 'excel' as const, fileType: 'excel' as const }];
        return merged.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      });
      return null;
    }
  };

  const handleDeleteReport = (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const handleLoadSamples = async () => {
    try {
      setIsExtractingGallery(true);
      setExtractingGalleryMsg('Učitavam bazu pacijenta Dušan Matijašević (20 izveštaja)...');
      const res = await fetch('/Laboratorijska_Baza_Dusan_Matijasevic.xlsx');
      if (res.ok) {
        const ab = await res.arrayBuffer();
        const extracted = parseExcelDatabase(ab, 'Laboratorijska_Baza_Dusan_Matijasevic.xlsx');
        if (extracted && extracted.length > 0) {
          localStorage.removeItem('lab_reports_cleared');
          setReports(extracted);
          localStorage.setItem('lab_reports', JSON.stringify(extracted));
          setToastNotification(
            `Baza učitana: Uspešno očitano svih ${extracted.length} nalaza pacijenta Dušan Matijašević sa svim parametrima!`
          );
          return;
        }
      }
      setToastNotification('Baza učitana: 20 nalaza pacijenta Dušan Matijašević je spremno u memoriji.');
    } catch (err: any) {
      setToastNotification(`Greška pri učitavanju baze: ${err.message || 'Nepoznata greška'}`);
    } finally {
      setIsExtractingGallery(false);
    }
  };

  // Helper to read file as base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handler for Excel database file selection (.xlsx, .xls, .csv)
  const handleExcelFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingGallery(true);
    setExtractingGalleryMsg(`Očitavam Excel tabelu: ${file.name}...`);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const extractedReports = parseExcelDatabase(arrayBuffer, file.name);

      if (extractedReports && extractedReports.length > 0) {
        localStorage.removeItem('lab_reports_cleared');
        setReports(extractedReports);
        localStorage.setItem('lab_reports', JSON.stringify(extractedReports));
        setToastNotification(
          `Baza učitana: Uspešno očitano svih ${extractedReports.length} nalaza sa svim parametrima iz Excel tabele!`
        );
      } else {
        setToastNotification('Nije pronađena tabela sa laboratorijskim parametrima u odabranom Excel fajlu.');
      }
    } catch (err: any) {
      console.error('Greška pri čitanju Excel fajla:', err);
      setToastNotification(`Greška pri čitanju Excel fajla: ${err.message || 'Nepoznat format'}`);
    } finally {
      setIsExtractingGallery(false);
      if (excelInputRef.current) {
        excelInputRef.current.value = '';
      }
    }
  };

  // Handler for loading a PDF report directly for Acrobat Reader (NO AI ANALYSIS)
  const handlePdfFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const base64 = await readFileAsBase64(file);

      const lower = file.name.toLowerCase();
      const yyyymmdd = lower.match(/(20\d\d)[-_.](\d{1,2})[-_.](\d{1,2})/);
      const ddmmyyyy = lower.match(/(\d{1,2})[-_.](\d{1,2})[-_.](20\d\d)/);
      const dateStr = yyyymmdd
        ? `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`
        : ddmmyyyy
        ? `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`
        : new Date().toISOString().split('T')[0];

      const viewerReport: LabReport = {
        id: `pdf-doc-${Date.now()}`,
        fileName: file.name,
        fileSource: 'onedrive',
        fileType: 'pdf',
        fileFormat: 'pdf',
        date: dateStr,
        laboratoryName: 'Laboratorijski PDF Izveštaj',
        patientName: 'Korisnik',
        summary: `Originalni PDF dokument: ${file.name}. Učitan za direktan pregled u programu za citanje PDF fajlova (bez analize).`,
        uploadedAt: new Date().toISOString(),
        parameters: [],
        fileDataUrl: `data:application/pdf;base64,${base64}`,
      };

      // Launch Adobe Acrobat Reader native application / download
      await openPdfBlobInAcrobat(blob, file.name);

      // Open in-app PDF preview modal for direct reading
      setViewingPdfReport(viewerReport);

      setToastNotification(`PDF izveštaj „${file.name}” je otvoren u programu za čitanje PDF fajlova (bez analize).`);
    } catch (err: any) {
      console.error('Error loading PDF file:', err);
      setToastNotification('Greška pri učitavanju PDF fajla.');
    } finally {
      if (pdfInputRef.current) {
        pdfInputRef.current.value = '';
      }
    }
  };

  // Handler for files selected from device (images JPG/PNG, PDF, or Excel)
  const handleGalleryFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsExtractingGallery(true);
    setExtractingGalleryMsg(`Obrađujem ${files.length} izveštaj(a)...`);

    const extractedReports: LabReport[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const isExcel =
          file.name.toLowerCase().endsWith('.xlsx') ||
          file.name.toLowerCase().endsWith('.xls') ||
          file.name.toLowerCase().endsWith('.csv');

        if (isExcel) {
          setExtractingGalleryMsg(`Očitavam Excel tabelu: ${file.name}...`);
          const arrayBuffer = await file.arrayBuffer();
          const excelReports = parseExcelDatabase(arrayBuffer, file.name);
          if (excelReports && excelReports.length > 0) {
            extractedReports.push(...excelReports);
          }
          continue;
        }

        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf');
        if (isPdf) {
          // RULE: PDF izveštaji se NE analiziraju (analiza se vrši iz Excel tabele).
          // Služe isključivo za pregled originala i otvaraju se u Acrobat Reader-u.
          setExtractingGalleryMsg(`Učitavam PDF nalaz za Acrobat Reader: ${file.name}...`);
          const arrayBuffer = await file.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          const base64 = await readFileAsBase64(file);

          const lower = file.name.toLowerCase();
          const yyyymmdd = lower.match(/(20\d\d)[-_.](\d{1,2})[-_.](\d{1,2})/);
          const ddmmyyyy = lower.match(/(\d{1,2})[-_.](\d{1,2})[-_.](20\d\d)/);
          const dateStr = yyyymmdd
            ? `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`
            : ddmmyyyy
            ? `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`
            : new Date().toISOString().split('T')[0];

          const viewerReport: LabReport = {
            id: `pdf-file-${Date.now()}-${i}`,
            fileName: file.name,
            fileSource: 'onedrive',
            fileType: 'pdf',
            fileFormat: 'pdf',
            date: dateStr,
            laboratoryName: 'Laboratorijski PDF Izveštaj',
            patientName: 'Korisnik',
            summary: `Originalni PDF dokument: ${file.name}. Učitan za direktan pregled u Acrobat Reader-u (bez analize).`,
            uploadedAt: new Date().toISOString(),
            parameters: [],
            fileDataUrl: `data:application/pdf;base64,${base64}`,
          };

          await openPdfBlobInAcrobat(blob, file.name);
          setViewingPdfReport(viewerReport);
          continue;
        }

        setExtractingGalleryMsg(`AI analiza slike dokumenta ${i + 1}/${files.length}: ${file.name}...`);
        const base64 = await readFileAsBase64(file);

        const endpoint = '/api/extract-lab-document';
        const bodyPayload = {
          documentBase64: base64,
          fileName: file.name,
          mimeType: file.type || 'image/jpeg',
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });

        if (res.ok) {
          const data = await res.json();
          const fileReports: LabReport[] = Array.isArray(data.reports) && data.reports.length > 0
            ? data.reports
            : data.report ? [data.report] : [];

          for (const rep of fileReports) {
            rep.fileName = file.name;
            rep.fileDataUrl = isPdf
              ? `data:application/pdf;base64,${base64}`
              : `data:${file.type || 'image/jpeg'};base64,${base64}`;
            extractedReports.push(rep);
          }
        }
        await new Promise((r) => setTimeout(r, 120));
      } catch (err) {
        console.error('File extraction error:', err);
      }
    }

    if (extractedReports.length > 0) {
      localStorage.removeItem('lab_reports_cleared');
      handleImportReports(extractedReports);
      setToastNotification(`Baza učitana: Uspešno očitano ${extractedReports.length} nalaza!`);
    } else {
      setToastNotification('Nije bilo moguće očitati parametre iz izabranog fajla.');
    }

    setIsExtractingGallery(false);
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  };

  // Export data as Excel (.xlsx)
  const handleExportExcel = () => {
    if (reports.length === 0) return;
    try {
      exportReportsToExcel(reports);
      setToastNotification('Excel tabela uspešno preuzeta.');
    } catch (err: any) {
      console.error('Export error:', err);
      handleExportCSV();
    }
  };

  // Export data as CSV
  const handleExportCSV = () => {
    if (reports.length === 0) return;

    let csv =
      'Datum,Laboratorija,Izvor,Pacijent,Parametar,Skraćenica,Kategorija,Vrednost,Jedinica,Ref_Min,Ref_Maks,Ref_Tekst,Status\n';

    reports.forEach((rep) => {
      rep.parameters.forEach((p) => {
        csv += `"${rep.date}","${rep.laboratoryName}","${rep.fileSource}","${
          rep.patientName || ''
        }","${p.name}","${p.alias || ''}","${p.category}",${p.value !== null ? p.value : `"${p.textValue || ''}"`},"${p.unit}",${
          p.refMin ?? ''
        },${p.refMax ?? ''},"${p.refText}","${p.status}"\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `Laboratorijski_Trendovi_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isAppExited) {
    return (
      <div className="min-h-screen bg-[#0a192f] text-slate-100 flex items-center justify-center p-4 animate-in fade-in">
        <div className="max-w-md w-full bg-[#0e213e] border border-slate-700 rounded-3xl p-7 sm:p-8 shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Aplikacija je zatvorena</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Svi Vaši laboratorijski nalazi i merenja su bezbedno sačuvani u bazi.
          </p>
          <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
            <button
              id="close-window-btn"
              onClick={() => {
                try {
                  if ((window.navigator as any)?.app?.exitApp) {
                    (window.navigator as any).app.exitApp();
                  }
                  window.close();
                  window.open('', '_self', '');
                  window.close();
                } catch {}
              }}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Zatvori ovaj prozor</span>
            </button>
            <button
              id="return-to-app-btn"
              onClick={() => setIsAppExited(false)}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Vrati se u aplikaciju
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleTriggerInstall = async () => {
    // 1. If in Viber or in-app browser on Android, jump straight to Chrome!
    if (pwa.isAndroid && (pwa.isViber || pwa.isInAppBrowser)) {
      setToastNotification('Otvaram aplikaciju u Google Chrome-u za instalaciju...');
      window.location.href = pwa.chromeIntentUrl;
      return;
    }

    // 2. If prompt is ready, trigger it directly right on this click event!
    if (pwa.isInstallable) {
      const success = await pwa.install();
      if (success) {
        setToastNotification('Aplikacija je uspešno instalirana na vaš telefon!');
        return;
      }
    }

    // 3. Otherwise open the modal for device-specific instructions (iOS Safari / Chrome Menu)
    setIsInstallModalOpen(true);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 bg-[#0a192f] text-slate-100 ${
        activeView === 'home' || activeView === 'documents'
          ? 'h-screen max-h-screen overflow-hidden'
          : ''
      }`}
    >
      {/* Hidden File Input for Excel Database (.xlsx, .xls, .csv) */}
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
        className="hidden"
        onChange={handleExcelFileSelected}
      />

      {/* Hidden File Input for "Iz Galerije / Fajlova" option */}
      <input
        ref={galleryInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,image/*,application/pdf"
        multiple
        className="hidden"
        onChange={handleGalleryFilesSelected}
      />

      {/* Hidden File Input for PDF reports (Samo pregled u Acrobat Reader-u) */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handlePdfFileSelected}
      />

      {/* Main Header */}
      <Header
        oneDriveAccount={oneDriveAccount}
        onOpenOneDriveModal={() => setIsOneDriveModalOpen(true)}
        onOpenLoadMenu={() => setIsLoadMenuOpen(true)}
        onLoadSamples={handleLoadSamples}
        reportCount={reports.length}
        parameterCount={distinctParametersCount}
        abnormalCount={abnormalCount}
        isHomeView={activeView === 'home'}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onTriggerInstall={handleTriggerInstall}
        isInstalled={pwa.isInstalled || pwa.isStandalone}
      />

      {/* Global Notifications Toast */}
      {toastNotification && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full pt-3">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastNotification}</span>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-xs text-emerald-700 hover:text-emerald-950 font-bold"
            >
              U redu
            </button>
          </div>
        </div>
      )}

      {/* Gallery processing overlay banner */}
      {isExtractingGallery && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full pt-3">
          <div className="bg-teal-50 border border-teal-200 text-teal-900 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-xs animate-pulse">
            <Loader2 className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
            <span className="text-xs font-semibold">{extractingGalleryMsg}</span>
          </div>
        </div>
      )}

      {/* Content Area */}
      <main
        className={`flex-1 max-w-6xl mx-auto w-full ${
          activeView === 'home' || activeView === 'documents'
            ? 'px-3 sm:px-6 py-1 sm:py-6 overflow-hidden flex flex-col justify-center'
            : 'px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5'
        }`}
      >
        {/* PWA Install Banner (Android / Mobile) - hides automatically once installed */}
        {activeView === 'analysis' && (
          <InstallAppBanner
            onNotify={(msg) => setToastNotification(msg)}
            onOpenInstallModal={handleTriggerInstall}
          />
        )}

        {/* =========================================================================
            PRVA STRANA: 4 GLAVNA DUGMETA + IZLAZ NA JEDNOM EKRANU TELEFONA BEZ SKROLOVANJA
            1. Polje: "Učitani dokumenti"
            2. Polje: "Analiza parametara"
            3. Polje: "Krvni pritisak" (ispod dugmeta analiza parametara)
            4. Polje: "Telesna dužina" (ispod na glavnom ekranu)
            5. Dugme: "Izlaz" (poslednje Izlaz)
           ========================================================================= */}
        {activeView === 'home' ? (
          <div className="h-[calc(100dvh-64px)] max-h-[100dvh] flex flex-col justify-between max-w-xl mx-auto py-2 sm:py-6 px-1 sm:px-4 overflow-hidden">
            {/* 4 GLAVNA DUGMETA */}
            <div className="flex-1 flex flex-col justify-center gap-2 sm:gap-3.5 my-auto w-full">
              {/* 1. Učitaj bazu */}
              <button
                id="main-btn-loaded-documents"
                onClick={() => setActiveView('documents')}
                className="w-full flex-1 min-h-[58px] max-h-[76px] sm:min-h-[84px] flex items-center justify-between p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all group cursor-pointer text-left shadow-xs"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs shrink-0">
                    <Database className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">
                        Učitaj bazu
                      </span>
                      {reports.length > 0 ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {reports.length} {reports.length === 1 ? 'nalaz' : 'nalaza'} • {distinctParametersCount} par.
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Baza prazna (0 nalaza)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Excel baza • PDF izveštaji
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* 2. Analiza parametara */}
              <button
                id="main-btn-analyze-parameters"
                onClick={() => {
                  if (reports.length > 0 && distinctParametersCount > 0) {
                    setIsParameterSelectionOpen(true);
                  } else {
                    setToastNotification(
                      'Baza parametara je trenutno prazna. Molimo prvo učitajte bazu iz Excel tabele preko opcije „Učitaj bazu”.'
                    );
                    setActiveView('documents');
                  }
                }}
                className="w-full flex-1 min-h-[58px] max-h-[76px] sm:min-h-[84px] flex items-center justify-between p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 hover:border-sky-500 hover:shadow-lg transition-all group cursor-pointer text-left shadow-xs"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-all shadow-xs shrink-0">
                    <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-sky-700 transition-colors leading-tight">
                        Analiza parametara
                      </span>
                      {distinctParametersCount > 0 ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                          {distinctParametersCount} parametara
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          Baza prazna (čeka Excel)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Analiza isključivo iz Excel tabele
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* 3. Krvni pritisak (ispod dugmeta analiza parametara) */}
              <button
                id="main-btn-blood-pressure"
                onClick={() => setIsBloodPressureModalOpen(true)}
                className="w-full flex-1 min-h-[58px] max-h-[76px] sm:min-h-[84px] flex items-center justify-between p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 hover:border-rose-500 hover:shadow-lg transition-all group cursor-pointer text-left shadow-xs"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs shrink-0">
                    <Heart className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-rose-700 transition-colors leading-tight">
                        Krvni pritisak
                      </span>
                      {bloodPressureRecords.length > 0 ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          {bloodPressureRecords[0].systolic}/{bloodPressureRecords[0].diastolic} ({bloodPressureRecords[0].pulse} bpm)
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Upis i evidencija
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Pritisak i otkucaji srca • Pamćenje na OneDrive-u
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* 4. Telesna težina (ispod na glavnom ekranu) */}
              <button
                id="main-btn-body-weight"
                onClick={() => setIsBodyWeightModalOpen(true)}
                className="w-full flex-1 min-h-[58px] max-h-[76px] sm:min-h-[84px] flex items-center justify-between p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 hover:border-teal-500 hover:shadow-lg transition-all group cursor-pointer text-left shadow-xs"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all shadow-xs shrink-0">
                    <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-tight">
                        Telesna težina
                      </span>
                      {bodyWeightRecords.length > 0 ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          {bodyWeightRecords[0].weight} kg
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                          Upis u kg
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                      Beleženje u bazi na OneDrive-u
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>

            {/* 5. POSLEDNJE DUGME: IZLAZ IZ APLIKACIJE */}
            <div className="pt-2 sm:pt-4 pb-1 shrink-0 flex justify-center">
              <button
                id="main-btn-exit-app"
                onClick={handleExitApplication}
                className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-400 shadow-sm"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
                <span>Izlaz iz aplikacije</span>
              </button>
            </div>
          </div>
        ) : activeView === 'documents' ? (
          /* =========================================================================
              EKRAN: UČITAJ BAZU (SVE NA JEDNOM EKRANU TELEFONA BEZ SKROLOVANJA)
              - Tamno plava pozadina kao na početnom ekranu (#0a192f)
              - Kompaktna polja za Učitane izveštaje i Očitane parametre
              - Dugmad podignuta malo ispod broja učitanih izveštaja na centru ekrana
              - Bez dugmeta Izlaz na ovoj strani
             ========================================================================= */
          <div className="h-[calc(100dvh-64px)] max-h-[calc(100dvh-64px)] flex flex-col justify-center max-w-md mx-auto w-full px-3 py-1 overflow-hidden">
            {/* Naslov ekrana i status */}
            <div className="text-center pb-2 shrink-0">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                <Database className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
                <span>Učitaj bazu</span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300 font-medium mt-0.5">
                {reports.length > 0
                  ? `Baza je učitana • ${reports.length} nalaza • ${distinctParametersCount} parametara`
                  : 'Baza je prazna • Nema učitanih nalaza'}
              </p>
            </div>

            {/* SMANJENA POLJA ZA UCITANE IZVESTAJE I OCITANE PARAMETRE */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 shrink-0 mb-3 sm:mb-4">
              {/* Polje 1: Učitani izveštaji */}
              <div
                id="stat-loaded-reports-count"
                className="py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl sm:rounded-2xl border flex items-center gap-2.5 bg-[#112240] border-slate-700 shadow-sm transition-all"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-950/70 border border-emerald-800/70 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                  <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 leading-tight">
                    Učitani izveštaji
                  </div>
                  <div className="text-base sm:text-lg font-black text-white leading-none mt-0.5">
                    {reports.length}
                  </div>
                </div>
              </div>

              {/* Polje 2: Očitani parametri */}
              <div
                id="stat-loaded-parameters-count"
                className="py-2 px-3 sm:py-2.5 sm:px-4 rounded-xl sm:rounded-2xl border flex items-center gap-2.5 bg-[#112240] border-slate-700 shadow-sm transition-all"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-sky-950/70 border border-sky-800/70 text-sky-400 flex items-center justify-center shrink-0 font-bold">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-[11px] font-semibold text-slate-400 leading-tight">
                    Očitani parametri
                  </div>
                  <div className="text-base sm:text-lg font-black text-white leading-none mt-0.5">
                    {distinctParametersCount}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 GLAVNA DUGMETA: Podignuta na centar ekrana, malo ispod broja učitanih izveštaja */}
            <div className="flex flex-col gap-2 sm:gap-2.5 w-full shrink-0">
              {/* DUGME 1: UCITAJ BAZU (otvara prozor za odabir baze u Excel formatu) */}
              <button
                id="documents-load-database-btn"
                onClick={() => excelInputRef.current?.click()}
                className="w-full min-h-[54px] max-h-[68px] sm:min-h-[72px] flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold transition-all shadow-md cursor-pointer group text-left border border-emerald-500/40"
                title="Odaberite Vašu laboratorijsku bazu u Excel formatu (.xlsx, .xls)"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm sm:text-base leading-tight text-white">Učitaj bazu</div>
                    <div className="text-[11px] sm:text-xs text-emerald-100 font-medium mt-0.5 truncate">
                      Odaberite tabelu u Excel formatu (.xlsx, .xls)
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-700/60 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* DUGME 2: UCITAJ ODREDJENI IZVESTAJ (otvara prozor za odabir izveštaja u PDF formatu) */}
              <button
                id="documents-load-specific-pdf-btn"
                onClick={() => pdfInputRef.current?.click()}
                className="w-full min-h-[54px] max-h-[68px] sm:min-h-[72px] flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold transition-all shadow-md cursor-pointer group text-left border border-rose-500/40"
                title="Odaberite određeni laboratorijski izveštaj u PDF formatu (.pdf)"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm sm:text-base leading-tight text-white">Učitaj određeni izveštaj</div>
                    <div className="text-[11px] sm:text-xs text-rose-100 font-medium mt-0.5 truncate">
                      Odaberite izveštaj u PDF formatu (.pdf)
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-rose-700/60 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* DUGME 3: RESETUJ BAZU (POVEĆANO DUGME - ISTE VELIČINE I ZNAČAJA KAO OSTALA GLAVNA DUGMAD!) */}
              <button
                id="documents-reset-btn"
                onClick={() => setIsResetConfirmOpen(true)}
                className="w-full min-h-[54px] max-h-[68px] sm:min-h-[72px] flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold transition-all shadow-md cursor-pointer group text-left border border-amber-500/40"
                title="Resetujte učitanu bazu u aplikaciji za ponovno očitavanje"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0 group-hover:-rotate-90 transition-transform">
                    <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm sm:text-base leading-tight text-white">Resetuj bazu</div>
                    <div className="text-[11px] sm:text-xs text-amber-100 font-medium mt-0.5 truncate">
                      Resetuje očitane podatke u aplikaciji na 0
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-700/60 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4 text-white group-hover:-rotate-90 transition-transform" />
                </div>
              </button>

              {/* DUGME 4: NAZAD (Vraća se na prethodni ekran - uočljivo crveno) */}
              <button
                id="back-from-documents-btn"
                onClick={() => setActiveView('home')}
                className="w-full min-h-[50px] max-h-[64px] sm:min-h-[68px] flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold transition-all border border-red-500/50 cursor-pointer shadow-lg shadow-red-950/30 group text-left"
                title="Povratak na prethodni početni ekran"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:-translate-x-0.5 transition-transform">
                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm sm:text-base leading-tight text-white">Nazad</div>
                    <div className="text-[11px] sm:text-xs text-red-100 font-medium mt-0.5 truncate">
                      Povratak na početni ekran
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-red-700/70 flex items-center justify-center shrink-0">
                  <ArrowLeft className="w-4 h-4 text-white group-hover:-translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
              DRUGA STRANA: ANALIZA PARAMETARA
              1. Prvo: Grafikon kroz vreme (TrendChart)
              2. Ispod: Komentar o parametru (ParameterCommentary)
             ========================================================================= */
          <div className="space-y-6">
            {/* Top Action Bar for Analysis Mode */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#112240] p-4 rounded-2xl border border-slate-700 shadow-sm text-white">
              <div className="flex items-center gap-3">
                <button
                  id="back-to-home-btn"
                  onClick={() => setActiveView('home')}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white border border-red-500/50 shadow-md text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-white" />
                  <span>Nazad na početnu</span>
                </button>

                <div className="h-5 w-px bg-slate-700 hidden sm:block"></div>

                <div>
                  <span className="text-xs text-slate-400 block">Izabrani parametar:</span>
                  <span className="text-sm sm:text-base font-bold text-white">
                    {currentSelectedTrend?.name || selectedParamName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="print-full-report-top-btn"
                  onClick={() => setIsPrintReportModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Odštampaj kompletan medicinski izveštaj za izabrani parametar"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-300" />
                  <span>Odštampaj izveštaj</span>
                </button>

                <button
                  id="change-parameter-btn"
                  onClick={() => setIsParameterSelectionOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-teal-950/70 hover:bg-teal-900 text-teal-300 border border-teal-800 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400" />
                  <span>Promeni parametar</span>
                </button>

                <button
                  onClick={() => setIsOneDrivePickerOpen(true)}
                  className="px-3 py-2 rounded-xl bg-sky-950/70 hover:bg-sky-900 text-sky-300 border border-sky-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Povuci nove nalaze sa OneDrive-a"
                >
                  <Cloud className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">OneDrive</span>
                </button>
              </div>
            </div>

            {/* 1. PRVO: GRAFIKON KROZ VREME */}
            {currentSelectedTrend ? (
              <section className="space-y-6">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-teal-400" />
                      <span>Grafikon kretanja kroz vreme</span>
                    </h3>
                    <span className="text-xs text-slate-400">
                      Merenja iz laboratorijskih izveštaja
                    </span>
                  </div>

                  <TrendChart
                    trend={currentSelectedTrend}
                    allTrends={allTrends}
                    compareTrendName={compareParamName}
                    onSelectCompareTrend={setCompareParamName}
                    onPrintFullReport={() => setIsPrintReportModalOpen(true)}
                  />
                </div>

                {/* 2. ISPOD: KOMENTAR O PARAMETRU */}
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <span>Lekarski komentar i analiza stanja</span>
                  </h3>

                  <ParameterCommentary
                    trend={currentSelectedTrend}
                    reportCount={reports.length}
                  />
                </div>

                {/* Sekcija za AI sintezu i uvid u celokupno zdravstveno stanje */}
                <div className="pt-4">
                  <AiInsightsPanel reports={reports} trends={allTrends} />
                </div>
              </section>
            ) : (
              <div className="p-12 text-center bg-[#112240] rounded-3xl border border-slate-700 space-y-3">
                <Activity className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-sm font-semibold text-slate-200">
                  Nema pronađenih podataka za dati parametar.
                </p>
                <button
                  onClick={() => setIsLoadMenuOpen(true)}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Učitaj nalaze
                </button>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            DUGME ZA IZLAZ IZ APLIKACIJE NA DNU (samo za analizu, NIKADA na 'Učitaj bazu')
           ========================================================================= */}
        {activeView === 'analysis' && (
          <div className="pt-6 pb-6 flex flex-col items-center justify-center border-t border-slate-800 mt-6">
            <button
              id="exit-application-btn"
              onClick={handleExitApplication}
              className="px-6 py-3 rounded-2xl text-sm font-bold flex items-center gap-2.5 transition-all cursor-pointer shadow-md bg-[#0e213e] hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 hover:border-rose-400"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Izlaz iz aplikacije</span>
            </button>
          </div>
        )}
      </main>

      {/* =========================================================================
          MODALS & DIALOGS
         ========================================================================= */}

      {/* Podmeni: Krvni pritisak i otkucaji srca */}
      <BloodPressureModal
        isOpen={isBloodPressureModalOpen}
        onClose={() => setIsBloodPressureModalOpen(false)}
        records={bloodPressureRecords}
        onSaveRecord={handleSaveBloodPressure}
        onDeleteRecord={handleDeleteBloodPressure}
        lastSyncedAt={lastMetricsSync}
      />

      {/* Podmeni: Telesna težina */}
      <BodyWeightModal
        isOpen={isBodyWeightModalOpen}
        onClose={() => setIsBodyWeightModalOpen(false)}
        records={bodyWeightRecords}
        onSaveRecord={handleSaveBodyWeight}
        onDeleteRecord={handleDeleteBodyWeight}
        lastSyncedAt={lastMetricsSync}
      />

      {/* 1. Meni za učitavanje baze (Excel tabela / PDF Backup / Skeniraj) */}
      <LoadReportsMenuModal
        isOpen={isLoadMenuOpen}
        onClose={() => setIsLoadMenuOpen(false)}
        onSelectExcel={() => {
          excelInputRef.current?.click();
        }}
        onSelectPdfOneDrive={() => {
          pdfInputRef.current?.click();
        }}
        onSelectOneDriveArchive={() => setIsOneDrivePickerOpen(true)}
        onSelectGallery={() => {
          // Trigger native file/photo picker for gallery
          galleryInputRef.current?.click();
        }}
        onSelectScanner={() => setIsScannerOpen(true)}
        onBackToHome={() => {
          setActiveView('home');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        oneDriveAccount={oneDriveAccount}
        reportCount={reports.length}
      />

      {/* Modal: Pregled PDF izveštaja (OneDrive & Acrobat Reader) - BEZ AI ANALIZE */}
      <OneDrivePdfModal
        isOpen={isOneDrivePdfModalOpen}
        onClose={() => setIsOneDrivePdfModalOpen(false)}
        onSelectPdfForView={(report) => {
          setViewingPdfReport(report);
          setToastNotification(`PDF izveštaj „${report.fileName}” je otvoren za čitanje.`);
        }}
      />

      {/* Globalni pregled PDF nalaza u punom formatu */}
      <PdfPreviewModal
        isOpen={Boolean(viewingPdfReport)}
        report={viewingPdfReport}
        onClose={() => setViewingPdfReport(null)}
      />

      {/* 2. Skeniranje kamerom -> PDF -> Sačuvaj na OneDrive */}
      <DocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        oneDriveConnected={oneDriveAccount.connected}
        existingReports={reports}
        onReportSaved={(newReport, savedPath, allowDuplicate) => {
          const res = handleReportExtracted(newReport, Boolean(allowDuplicate), savedPath);
          if (res) {
            setToastNotification(
              `Izveštaj br. ${res.nextReportNumber} je dodat u Excel tabelu (u kolonu ${res.columnLetter} sa desne strane) i sačuvan kao PDF na OneDrive!`
            );
          } else if (allowDuplicate) {
            setToastNotification(
              `Nalaz je sačuvan kao PDF na OneDrive lokaciji "${savedPath}" i uspešno dodat u Excel bazu!`
            );
          }
        }}
      />

      {/* 3. Izbor parametra za prikaz (Šta želiš da vidiš?) */}
      <ParameterSelectionModal
        isOpen={isParameterSelectionOpen}
        onClose={() => setIsParameterSelectionOpen(false)}
        trends={allTrends}
        selectedParamName={selectedParamName}
        onSelectParameter={(name) => {
          setSelectedParamName(name);
          setActiveView('analysis');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSyncOneDrive={() => setIsOneDrivePickerOpen(true)}
        oneDriveConnected={oneDriveAccount.connected}
      />

      {/* 4. OneDrive Picker (Povlačenje iz arhive uz deduplikaciju) */}
      <OneDrivePickerModal
        isOpen={isOneDrivePickerOpen}
        onClose={() => setIsOneDrivePickerOpen(false)}
        onImportReports={(imported) => {
          handleImportReports(imported);
          setToastNotification(`Učitano ${imported.length} nalaza sa OneDrive-a.`);
        }}
        existingReports={reports}
        existingReportIds={reports.map((r) => r.id)}
      />

      {/* 5. OneDrive Settings & Authentication Modal */}
      <OneDriveModal
        isOpen={isOneDriveModalOpen}
        onClose={() => setIsOneDriveModalOpen(false)}
        oneDriveAccount={oneDriveAccount}
        onDisconnect={handleDisconnectOneDrive}
        onRefreshStatus={checkOneDriveStatus}
        onOpenUploadModal={() => {
          setIsOneDriveModalOpen(false);
          setIsUploadModalOpen(true);
        }}
        onOpenOneDrivePicker={() => {
          setIsOneDriveModalOpen(false);
          setIsOneDrivePickerOpen(true);
        }}
      />

      {/* 6. Upload Modal (Dropzone za PDF i JPG) */}
      <PdfUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onReportExtracted={(r) => {
          handleReportExtracted(r);
          setToastNotification(`Nalaz "${r.fileName}" je uspešno analiziran.`);
        }}
        onReportsExtracted={(arr) => {
          handleImportReports(arr);
          setToastNotification(`Uspešno analizirano ${arr.length} nalaza.`);
        }}
      />

      {/* 7. Kompletan izveštaj za štampu (grafikon + hronološka tabela nalaza + lekarski osvrt) */}
      {currentSelectedTrend && (
        <PrintableParameterReportModal
          isOpen={isPrintReportModalOpen}
          onClose={() => setIsPrintReportModalOpen(false)}
          trend={currentSelectedTrend}
          allReports={reports}
        />
      )}

      {/* 8. Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#0e213e] rounded-3xl max-w-md w-full p-6 sm:p-7 border border-slate-700 shadow-2xl text-slate-100 space-y-5 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">
                Resetovanje učitane baze?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Da li želite da resetujete učitanu bazu kako biste mogli ponovo da je očitate u slučaju potrebe?
              </p>
            </div>

            <div className="p-3.5 bg-emerald-950/40 rounded-2xl border border-emerald-800/60 text-xs text-emerald-200 space-y-1.5 text-left">
              <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Vaša Excel tabela ostaje potpuno netaknuta</span>
              </p>
              <p className="text-[11px] text-emerald-200 leading-relaxed">
                <strong>Reset dugme ne menja Excel tabelu nikako</strong> na Vašem računaru ili telefonu, već samo resetuje učitanu bazu u aplikaciji da bi se mogla ponovo očitati u slučaju potrebe.
              </p>
              <p className="text-[11px] text-emerald-300">
                Trajne baze Krvnog pritiska i Telesne težine takođe ostaju bezbedno sačuvane.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Odustani
              </button>
              <button
                type="button"
                id="confirm-reset-database-btn"
                onClick={handleResetDatabase}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Resetuj bazu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal za potvrdu dupliranja parametara u Excel tabeli */}
      {duplicateConfirmReport && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-[#0e213e] rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-amber-500/80 space-y-4 animate-in zoom-in-95 text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/60 text-amber-400 flex items-center justify-center shrink-0 border border-amber-700 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Upozorenje: Duplikat izveštaja
                </h3>
                <p className="text-xs text-slate-300">
                  Parametri već postoje za datum {formatSerbianDateForExcel(duplicateConfirmReport.report.date)}
                </p>
              </div>
            </div>

            {(() => {
              const matched = reports.find((r) => r.date === duplicateConfirmReport.report.date);
              return (
                <div className="bg-amber-950/30 border border-amber-800/60 rounded-2xl p-4 space-y-2.5 text-xs text-amber-200">
                  <div className="flex justify-between items-center pb-2 border-b border-amber-800/40">
                    <span className="font-semibold text-slate-300">Datum izveštaja:</span>
                    <span className="font-bold text-white font-mono text-xs">
                      {formatSerbianDateForExcel(duplicateConfirmReport.report.date)}
                    </span>
                  </div>
                  {matched && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-300">Postojeći izveštaj u tabeli:</span>
                        <span className="font-bold text-white">
                          {matched.fileName || `Izveštaj br. ${matched.reportNumber || '1'}`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-300">Broj postojećih parametara:</span>
                        <span className="font-bold text-amber-400">{matched.parameters.length} parametara</span>
                      </div>
                      {matched.parameters.length > 0 && (
                        <div className="pt-1 text-[11px] text-slate-300 leading-relaxed">
                          Evidentirani parametri: <strong className="text-white">{matched.parameters.slice(0, 5).map((p) => p.name).join(', ')}{matched.parameters.length > 5 ? '...' : ''}</strong>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}

            <div className="p-3 bg-[#112240] border border-slate-700 rounded-xl text-xs text-slate-300 leading-relaxed">
              Sistem je detektovao da parametri izveštaja već postoje za ovaj datum u tabeli. Ako potvrdite dupliranje, novi parametri biće upisani u <strong>prvu slobodnu kolonu sa desne strane</strong> kao novi izveštaj, uz formatiranje identično ostatku tabele.
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                id="app-duplicate-cancel-btn"
                onClick={() => setDuplicateConfirmReport(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Odustani (Ne dodaj)
              </button>
              <button
                type="button"
                id="app-duplicate-confirm-btn"
                onClick={() => {
                  const rep = duplicateConfirmReport.report;
                  setDuplicateConfirmReport(null);
                  const res = handleReportExtracted(rep, true);
                  if (res) {
                    setToastNotification(
                      `Duplikat izveštaja (br. ${res.nextReportNumber}) je dodat u kolonu ${res.columnLetter} sa desne strane u Excel tabelu.`
                    );
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Potvrdi dupliranje</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 10. Auto Mobile PWA Install Modal */}
      <AutoInstallPromptModal
        forceOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onNotify={(msg) => setToastNotification(msg)}
      />
    </div>
  );
}
