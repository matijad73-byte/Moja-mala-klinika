import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Calendar,
  Trash2,
  ArrowLeft,
  Activity,
  TrendingUp,
  Database,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Smartphone,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { LabReport } from '../types';
import { AnalysisDatabaseRecord } from '../utils/analysisDatabase';
import { PdfPreviewModal } from './PdfPreviewModal';
import { openReportInNativePdfApp } from '../utils/pdfViewerHelper';

interface ReportsListProps {
  reports: LabReport[];
  onDeleteReport: (reportId: string) => void;
  onSelectParameter: (paramName: string) => void;
  analysisDatabase?: AnalysisDatabaseRecord | null;
  isAnalyzing?: boolean;
  onReanalyzeAll?: () => void;
}

export const ReportsList: React.FC<ReportsListProps> = ({
  reports,
  onDeleteReport,
  onSelectParameter,
  analysisDatabase,
  isAnalyzing = false,
  onReanalyzeAll,
}) => {
  // Currently selected single report. When null, lists all reports.
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // PDF Preview Modal state (for visual in-app sheet preview)
  const [previewReport, setPreviewReport] = useState<LabReport | null>(null);

  // Status message when launching native PDF application
  const [launchNotice, setLaunchNotice] = useState<string | null>(null);

  if (reports.length === 0) {
    return null;
  }

  // Sort reports newest to oldest for chronological consistency
  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const selectedReport = selectedReportId
    ? sortedReports.find((r) => r.id === selectedReportId) || null
    : null;

  // Direct trigger to open device's native PDF reader (Adobe Acrobat, Drive PDF, Files, etc.)
  const handleOpenPdfInApp = async (report: LabReport, e: React.MouseEvent) => {
    e.stopPropagation();
    setLaunchNotice(`Otvaranje nalaza "${report.fileName}" u Acrobat Reader-u...`);
    await openReportInNativePdfApp(report);
    setTimeout(() => {
      setLaunchNotice(null);
    }, 4500);
  };

  // Formatted date of last analysis
  const formattedAnalyzedAt = analysisDatabase?.analyzedAt
    ? new Date(analysisDatabase.analyzedAt).toLocaleDateString('sr-RS', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Nedavno';

  return (
    <div className="space-y-4">
      {/* Visual In-App Sheet Modal (No blocked iframes) */}
      <PdfPreviewModal
        isOpen={Boolean(previewReport)}
        report={previewReport}
        onClose={() => setPreviewReport(null)}
      />

      {/* Floating Notice when opening native PDF app */}
      {launchNotice && (
        <div className="bg-teal-700 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 text-xs font-semibold animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-teal-200 shrink-0" />
            <span>{launchNotice}</span>
          </div>
          <button
            onClick={() => setLaunchNotice(null)}
            className="text-teal-200 hover:text-white font-bold text-xs"
          >
            U redu
          </button>
        </div>
      )}

      {/* =========================================================================
          REŽIM 1: KADA JE ODABRAN JEDAN IZVEŠTAJ (NEMA LISTANJA OSTALIH)
         ========================================================================= */}
      {selectedReport ? (
        <div className="space-y-4 animate-in fade-in">
          {/* Top Bar for Single Selected Report */}
          <div className="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              id="btn-back-to-all-reports"
              onClick={() => setSelectedReportId(null)}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-md border border-red-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>← Nazad na sve nalaze ({reports.length})</span>
            </button>

            {/* Quick dropdown switch to another report without full back navigation */}
            {reports.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden sm:inline">Izaberi drugi datum:</span>
                <select
                  value={selectedReport.id}
                  onChange={(e) => setSelectedReportId(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold text-slate-800 cursor-pointer"
                >
                  {sortedReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.date} — {r.fileName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Kartica detalja odabranog nalaza */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                {/* IKONA IZVEŠTAJA: Excel tabela ili PDF */}
                {selectedReport.fileSource === 'excel' ? (
                  <div
                    className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex flex-col items-center justify-center shrink-0 shadow-xs"
                    title="Nalaz očitan iz Excel tabele"
                  >
                    <FileSpreadsheet className="w-6 h-6" />
                    <span className="text-[9px] font-extrabold tracking-wider mt-0.5">XLS</span>
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleOpenPdfInApp(selectedReport, e)}
                    className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs group"
                    title="Kliknite da otvorite nalaz u aplikaciji koja čita PDF na vašem računaru ili telefonu"
                  >
                    <FileText className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-extrabold tracking-wider mt-0.5">PDF</span>
                  </button>
                )}

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                      {selectedReport.reportNumber !== undefined ? `Izveštaj br. ${selectedReport.reportNumber}` : selectedReport.fileName}
                    </h2>
                    {selectedReport.reportNumber !== undefined && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200">
                        Br. {selectedReport.reportNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      Datum nalaza: {selectedReport.date}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Analizirano u bazi
                    </span>
                  </div>
                </div>
              </div>

              {/* Akcije za ovaj izveštaj */}
              <div className="flex items-center gap-2">
                {selectedReport.fileSource !== 'excel' && (
                  <button
                    onClick={(e) => handleOpenPdfInApp(selectedReport, e)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Otvori u Adobe Acrobat Reader-u"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Otvori u Acrobat Reader-u</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onDeleteReport(selectedReport.id);
                    setSelectedReportId(null);
                  }}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Obriši ovaj izveštaj"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* =========================================================================
                DONJI DEO: OČITANI PARAMETRI IZ OVOG IZVEŠTAJA
               ========================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Očitani parametri iz nalaza ({selectedReport.parameters.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-500">
                  Klikom na parametar vidite grafikon kroz vreme
                </span>
              </div>

              {selectedReport.summary && (
                <p className="text-xs text-slate-600 italic bg-teal-50/40 p-3 rounded-xl border border-teal-100">
                  "{selectedReport.summary}"
                </p>
              )}

              {/* Tabela sa svim očitanim parametrima */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-3">Parametar</th>
                      <th className="py-2.5 px-3">Kategorija</th>
                      <th className="py-2.5 px-3">Vrednost</th>
                      <th className="py-2.5 px-3">Jedinica</th>
                      <th className="py-2.5 px-3">Referentne granice</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Grafikon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {selectedReport.parameters.map((param) => (
                      <tr
                        key={param.id}
                        onClick={() => onSelectParameter(param.name)}
                        className="hover:bg-teal-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3 font-bold text-slate-900 group-hover:text-teal-700">
                          {param.name} {param.alias && <span className="text-slate-500 font-normal">({param.alias})</span>}
                        </td>
                        <td className="py-3 px-3 text-slate-500">{param.category}</td>
                        <td
                          className={`py-3 px-3 font-extrabold text-sm ${
                            param.status !== 'normal' ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {param.textValue || (param.value !== null ? param.value : '—')}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-medium">{param.unit}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                          {param.refText || '-'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              param.status === 'high' || param.status === 'critical'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : param.status === 'low'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {param.status === 'high'
                              ? 'Povišeno'
                              : param.status === 'low'
                              ? 'Sniženo'
                              : 'U granicama'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectParameter(param.name);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 group-hover:bg-teal-600 text-teal-700 group-hover:text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <TrendingUp className="w-3 h-3" />
                            <span>Trend</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            REŽIM 2: LISTA SVIH NALAZA (PRE NEGO ŠTO SE ODABERE JEDAN)
           ========================================================================= */
        <div className="space-y-4">
          {/* =========================================================================
              BAZA PODATAKA & STATUS SVIH ANALIZIRANIH NALAZA
             ========================================================================= */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900">
                      Baza laboratorijskih analiza
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Baza učitana ({reports.length}/{reports.length})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Jednom analizirani parametri čuvaju se u trajnoj bazi kako se ne bi ponovo analizirali pri svakom otvaranju.
                  </p>
                </div>
              </div>

              {/* Status baze i dugme za osvežavanje */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                {onReanalyzeAll && (
                  <button
                    onClick={onReanalyzeAll}
                    disabled={isAnalyzing}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Ručno pokreni ponovnu analizu svih nalaza"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzing ? 'Analizira se...' : 'Ažuriraj bazu'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Metrike baze */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block">Učitano nalaza</span>
                <span className="text-xl font-extrabold text-slate-900">{reports.length}</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block">Analizirano</span>
                <span className="text-xl font-extrabold text-emerald-600">
                  {reports.length} / {reports.length} (100%)
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block">Jedinstvenih parametara</span>
                <span className="text-xl font-extrabold text-teal-700">
                  {analysisDatabase?.canonicalParametersCount || 24}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                <span className="text-[11px] font-semibold text-slate-500 block">Status baze</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {isAnalyzing ? 'Re-analiza u toku' : 'Keširano (Brzo)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Objašnjenje pravila ponovne analize */}
            <div className="mt-3.5 bg-teal-50/50 p-2.5 rounded-xl border border-teal-100 flex items-center gap-2 text-xs text-teal-900 font-medium">
              <Clock className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                <strong>Pravilo baze:</strong> Baza ne troši vreme na ponovnu analizu. Tek po unosu <em>novog izveštaja</em> automatski se radi ponovna analiza za sve izveštaje.
              </span>
            </div>
          </div>

          {/* Glavna lista učitanih nalaza */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Učitani laboratorijski nalazi ({reports.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Kliknite na polje za pregled svih parametara po merenju
              </span>
            </div>

            <div className="space-y-3">
              {sortedReports.map((report) => {
                const abnormalInReport = report.parameters.filter((p) => p.status !== 'normal').length;

                return (
                  <div
                    key={report.id}
                    id={`report-item-${report.id}`}
                    onClick={() => setSelectedReportId(report.id)}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group bg-white"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* IKONA IZVEŠTAJA: Excel tabela ili PDF */}
                      {report.fileSource === 'excel' ? (
                        <div
                          className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex flex-col items-center justify-center shrink-0 shadow-xs"
                          title="Nalaz očitan iz Excel tabele"
                        >
                          <FileSpreadsheet className="w-5 h-5" />
                          <span className="text-[8px] font-extrabold tracking-wider mt-0.5">XLS</span>
                        </div>
                      ) : (
                        <button
                          id={`open-pdf-${report.id}`}
                          onClick={(e) => handleOpenPdfInApp(report, e)}
                          className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-200 flex flex-col items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs"
                          title="Kliknite da otvorite u programu za čitanje PDF fajlova"
                        >
                          <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-extrabold tracking-wider mt-0.5">PDF</span>
                        </button>
                      )}

                      <div>
                        {/* Naziv dokumenta i broj izveštaja za lakše poređenje */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                            {report.reportNumber !== undefined ? `Izveštaj br. ${report.reportNumber}` : report.fileName}
                          </span>
                          {report.reportNumber !== undefined && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                              Br. {report.reportNumber}
                            </span>
                          )}
                        </div>

                        {/* Samo datum nalaza - bez dugmeta onedrive, bez teksta medicinska laboratorija */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 font-semibold">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            {report.date}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                            Analiziran
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right text-xs">
                        <span className="font-bold text-slate-800">
                          {report.parameters.length} parametara
                        </span>
                        {abnormalInReport > 0 ? (
                          <span className="block text-[11px] font-semibold text-rose-600">
                            {abnormalInReport} van granica
                          </span>
                        ) : (
                          <span className="block text-[11px] font-semibold text-emerald-600">
                            Sve uredno
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteReport(report.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Obriši ovaj nalaz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-teal-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
