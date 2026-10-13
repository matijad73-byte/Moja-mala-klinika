import React, { useRef } from 'react';
import {
  Printer,
  X,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  User,
  Stethoscope,
  Info,
} from 'lucide-react';
import { ParameterTrend, LabReport } from '../types';
import { getCanonicalParameter } from '../utils/trendCalculator';

interface PrintableParameterReportProps {
  isOpen: boolean;
  onClose: () => void;
  trend: ParameterTrend;
  allReports: LabReport[];
}

export const PrintableParameterReportModal: React.FC<PrintableParameterReportProps> = ({
  isOpen,
  onClose,
  trend,
  allReports,
}) => {
  if (!isOpen) return null;

  // Filter and sort reports that contain this parameter using canonical matching
  const targetCanonicalKey = getCanonicalParameter(trend.name, trend.alias, trend.category).canonicalKey;

  const reportsWithParam = allReports
    .map((r) => {
      const param = r.parameters.find(
        (p) => getCanonicalParameter(p.name, p.alias, p.category).canonicalKey === targetCanonicalKey
      );
      return { report: r, param };
    })
    .filter((item) => item.param !== undefined)
    .sort((a, b) => new Date(a.report.date).getTime() - new Date(b.report.date).getTime());

  const handlePrint = () => {
    window.print();
  };

  const isAbnormal = trend.latestStatus !== 'normal';

  return (
    <div
      id="printable-report-modal"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Action Bar (screen only) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Kompletan izveštaj za štampu: {trend.name}
              </h3>
              <p className="text-[11px] text-slate-300">
                Sadrži hronologiju svih merenja, referentne granice, laboratorije i stručni osvrt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Odštampaj izveštaj</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Zatvori"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            ACTUAL PRINTABLE DOCUMENT AREA (Styled for clean A4 printing)
           ========================================================================= */}
        <div
          id="printable-document-content"
          className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-slate-900 text-sm space-y-6 print:p-0 print:space-y-4"
        >
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-black text-lg">
                  L
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase">
                    Medicinski Laboratorijski Izveštaj
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Hronološko praćenje biohemijskog parametra
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div>
                  <span className="text-slate-500">Pacijent:</span>{' '}
                  <strong className="text-slate-900">Dušan Matijašević</strong>
                </div>
                <div>
                  <span className="text-slate-500">Broj analiza u bazi:</span>{' '}
                  <strong className="text-slate-900">{trend.dataPoints.length}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Vremenski raspon:</span>{' '}
                  <strong className="text-slate-900">
                    {trend.dataPoints[0]?.formattedDate} —{' '}
                    {trend.dataPoints[trend.dataPoints.length - 1]?.formattedDate}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Datum štampe:</span>{' '}
                  <strong className="text-slate-900">
                    {new Date().toLocaleDateString('sr-RS')}
                  </strong>
                </div>
              </div>
            </div>

            {/* Target Parameter Focus Badge */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:text-right min-w-[200px]">
              <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                Izabrani parametar za analizu
              </span>
              <div className="text-lg font-black text-slate-900 mt-0.5">
                {trend.name} {trend.alias ? `(${trend.alias})` : ''}
              </div>
              <div className="text-xs text-slate-600 font-medium mt-0.5">
                Kategorija: <strong>{trend.category}</strong>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Ref. interval:{' '}
                <strong className="text-slate-900">
                  {trend.refText || `${trend.refMin || 0} - ${trend.refMax || 0}`} {trend.unit}
                </strong>
              </div>
            </div>
          </div>

          {/* Key Summary Stat Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
              <span className="text-[11px] text-slate-500 block">Poslednje merenje</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900">
                  {trend.latestValue}
                </span>
                <span className="text-xs font-semibold text-slate-500">{trend.unit}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-xs">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    trend.latestStatus === 'high' || trend.latestStatus === 'critical'
                      ? 'bg-rose-100 text-rose-800'
                      : trend.latestStatus === 'low'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {trend.latestStatus === 'high'
                    ? 'Povišeno'
                    : trend.latestStatus === 'low'
                    ? 'Sniženo'
                    : 'Uredno'}
                </span>
                <span className="text-slate-500 text-[11px]">
                  ({trend.dataPoints[trend.dataPoints.length - 1]?.formattedDate})
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
              <span className="text-[11px] text-slate-500 block">Kretanje (Trend)</span>
              <div className="flex items-center gap-1.5 mt-1">
                {trend.direction === 'up' && (
                  <TrendingUp className="w-5 h-5 text-rose-600" />
                )}
                {trend.direction === 'down' && (
                  <TrendingDown className="w-5 h-5 text-emerald-600" />
                )}
                {trend.direction === 'stable' && (
                  <Minus className="w-5 h-5 text-slate-500" />
                )}
                <span className="text-base font-bold text-slate-900">
                  {trend.direction === 'up'
                    ? 'Rastući trend'
                    : trend.direction === 'down'
                    ? 'Opadajući trend'
                    : 'Stabilno'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {trend.changePercent !== undefined
                  ? `${trend.changePercent > 0 ? '+' : ''}${trend.changePercent}% u odnosu na pretposlednji`
                  : 'Prvo zabeleženo merenje'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
              <span className="text-[11px] text-slate-500 block">Raspon merenih vrednosti</span>
              {(() => {
                const numericVals = trend.dataPoints
                  .map((p) => p.value)
                  .filter((v): v is number => v !== null && v !== undefined && !isNaN(v) && v > 0);
                const minVal = numericVals.length > 0 ? Math.min(...numericVals) : '—';
                const maxVal = numericVals.length > 0 ? Math.max(...numericVals) : '—';
                return (
                  <div className="text-base font-bold text-slate-900 mt-1">
                    Min: {minVal} {trend.unit} — Maks: {maxVal} {trend.unit}
                  </div>
                );
              })()}
              <p className="text-[11px] text-slate-500 mt-1">
                Ukupno u bazi: {trend.dataPoints.length} nalaza
              </p>
            </div>
          </div>

          {/* Chronological Table of All Measurements */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Activity className="w-3.5 h-3.5 text-teal-700" />
              <span>Hronološka tabela svih merenja ({trend.name})</span>
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">Datum</th>
                    <th className="py-2.5 px-3">Ustanova / Laboratorija</th>
                    <th className="py-2.5 px-3 text-right">Izmerena vrednost</th>
                    <th className="py-2.5 px-3">Referentni interval</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Napomena</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportsWithParam.map(({ report, param }, idx) => {
                    const isHigh = param?.status === 'high' || param?.status === 'critical';
                    const isLow = param?.status === 'low';
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isHigh
                            ? 'bg-rose-50/40'
                            : isLow
                            ? 'bg-amber-50/40'
                            : idx % 2 === 0
                            ? 'bg-white'
                            : 'bg-slate-50/30'
                        }`}
                      >
                        <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          {new Date(report.date).toLocaleDateString('sr-RS')}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{report.laboratoryName}</td>
                        <td className="py-2 px-3 text-right font-black text-slate-900 whitespace-nowrap">
                          {param && param.value !== null
                            ? `${param.value} ${param.unit || trend.unit}`
                            : (param?.textValue || 'Nije rađeno')}
                        </td>
                        <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                          {param?.refText || trend.refText || `${trend.refMin || 0} - ${trend.refMax || 0}`} {param?.unit || trend.unit}
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {param?.value === null ? (
                            <span className="font-medium text-slate-500">Nije rađeno</span>
                          ) : isHigh ? (
                            <span className="font-bold text-rose-700">Povišeno</span>
                          ) : isLow ? (
                            <span className="font-bold text-amber-700">Sniženo</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">Uredno</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                          {param?.notes || (report.fileName.includes('Vizim') ? 'Vizim arhivski nalaz' : '')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clinical Interpretation & Recommendations */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-teal-700" />
              <span>Komentar i preporuka za lekara</span>
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              Ovaj dokument predstavlja sistematizovan hronološki pregled parametra{' '}
              <strong>{trend.name}</strong> iz više različitih laboratorijskih ustanova.
              {isAbnormal ? (
                <span>
                  {' '}
                  Poslednja vrednost od{' '}
                  <strong>
                    {trend.latestValue} {trend.unit}
                  </strong>{' '}
                  odstupa od referentnih vrednosti, te se preporučuje razgovor sa ordinirajućim lekarom
                  i eventualna kontrola ili dopunska dijagnostika u zavisnosti od kliničke slike.
                </span>
              ) : (
                <span>
                  {' '}
                  Najnovija vrednost se nalazi unutar referentnog intervala, uz praćenu stabilnost u
                  poslednjim merenjima.
                </span>
              )}
            </p>
          </div>

          {/* Doctor Signature Line (for printing) */}
          <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs">
            <div>
              <span className="text-slate-500">Mesto i datum:</span>
              <div className="mt-1 font-semibold text-slate-800">
                Beograd, {new Date().toLocaleDateString('sr-RS')}
              </div>
            </div>

            <div className="text-right">
              <span className="text-slate-500">Potpis i faksimil lekara:</span>
              <div className="mt-6 border-b border-slate-400 w-48 ml-auto"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
