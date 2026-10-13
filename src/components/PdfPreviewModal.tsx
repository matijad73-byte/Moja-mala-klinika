import React from 'react';
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Printer,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { LabReport } from '../types';
import { openReportInNativePdfApp } from '../utils/pdfViewerHelper';

interface PdfPreviewModalProps {
  report: LabReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !report) return null;

  const handleOpenNative = async () => {
    await openReportInNativePdfApp(report);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 sm:py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-white truncate">
                  {report.fileName}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 uppercase tracking-wider">
                  PDF Nalaz
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Datum prijema: {report.date} • {report.parameters.length} analiza
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Direct Open in Device's PDF App Button */}
            <button
              id="btn-open-native-pdf"
              onClick={handleOpenNative}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:shadow"
              title="Otvori direktno u Adobe Acrobat Reader-u na računaru ili telefonu"
            >
              <Smartphone className="w-4 h-4 sm:hidden" />
              <Laptop className="w-4 h-4 hidden sm:inline" />
              <span>Otvori u Acrobat Reader-u</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer hidden sm:flex items-center justify-center"
              title="Štampaj dokument"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Zatvori pregled"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Native App Banner Notification */}
        <div className="bg-rose-50 border-b border-rose-100 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-rose-950">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Za pregled u punom kvalitetu i originalnom formatu kliknite dugme{' '}
              <strong>„Otvori u Acrobat Reader-u”</strong>.
            </span>
          </div>
          <button
            onClick={handleOpenNative}
            className="text-rose-700 hover:text-rose-950 font-bold underline shrink-0 cursor-pointer"
          >
            Otvori u Acrobat-u
          </button>
        </div>

        {/* Visual Document Sheet (100% immune to Chrome's iframe blocking) */}
        <div className="flex-1 bg-slate-100 p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 space-y-6">
            {/* Sheet Header */}
            <div className="border-b-2 border-teal-700 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-teal-800 tracking-tight uppercase">
                  LABORATORIJSKI MEDICINSKI NALAZ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Moja mala klinika • Zvanična digitalna arhiva
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verifikovan dokument
                </span>
              </div>
            </div>

            {/* Document Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="space-y-1">
                <div className="text-slate-500">
                  Naziv fajla: <strong className="text-slate-900">{report.fileName}</strong>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>Datum nalaza: <strong className="text-slate-900">{report.date}</strong></span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <User className="w-3.5 h-3.5 text-teal-600" />
                  <span>Pacijent: <strong className="text-slate-900">{report.patientName || 'Dušan Matijašević'}</strong></span>
                </div>
                <div className="text-slate-500">
                  Ukupno parametara: <strong className="text-teal-700 font-bold">{report.parameters.length}</strong>
                </div>
              </div>
            </div>

            {/* Parameters Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Izmerene vrednosti i referentni intervali
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Parametar</th>
                      <th className="py-2.5 px-3">Kategorija</th>
                      <th className="py-2.5 px-3">Rezultat</th>
                      <th className="py-2.5 px-3">Jedinica</th>
                      <th className="py-2.5 px-3">Referentne granice</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {report.parameters.map((param, idx) => (
                      <tr
                        key={param.id || idx}
                        className={`hover:bg-slate-50/80 ${
                          param.status !== 'normal' ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {param.name} {param.alias && <span className="font-normal text-slate-500">({param.alias})</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{param.category}</td>
                        <td
                          className={`py-2 px-3 font-extrabold ${
                            param.status !== 'normal' ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {param.textValue || (param.value !== null ? param.value : '—')}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{param.unit}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                          {param.refText || '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              param.status === 'high' || param.status === 'critical'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : param.status === 'low'
                                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {param.status === 'high'
                              ? 'Povišeno'
                              : param.status === 'low'
                              ? 'Sniženo'
                              : 'U granicama'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Doctor / System Summary Note */}
            {report.summary && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700">Komentar nalaza:</span>
                <p className="italic text-slate-600 mt-1">"{report.summary}"</p>
              </div>
            )}

            {/* Document Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2">
              <span>Moja mala klinika • Elektronski overen laboratorijski izveštaj</span>
              <span>Generisano: {new Date().toLocaleDateString('sr-RS')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
