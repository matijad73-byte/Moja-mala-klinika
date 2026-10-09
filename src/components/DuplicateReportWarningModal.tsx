import React from 'react';
import {
  AlertTriangle,
  RefreshCw,
  Copy,
  X,
  Calendar,
  FileText,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { LabReport } from '../types';

interface DuplicateReportWarningModalProps {
  isOpen: boolean;
  newReport: LabReport | null;
  existingReport: LabReport | null;
  overlappingParams: string[];
  onConfirmUpdate: () => void;
  onConfirmDuplicate: () => void;
  onCancel: () => void;
}

export const DuplicateReportWarningModal: React.FC<DuplicateReportWarningModalProps> = ({
  isOpen,
  newReport,
  existingReport,
  overlappingParams,
  onConfirmUpdate,
  onConfirmDuplicate,
  onCancel,
}) => {
  if (!isOpen || !newReport || !existingReport) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}.`;
    }
    return dateStr;
  };

  const formattedDate = formatDate(newReport.date);
  const existingRepTitle =
    existingReport.reportNumber !== undefined
      ? `Izveštaj br. ${existingReport.reportNumber}`
      : existingReport.fileName;

  return (
    <div
      id="duplicate-report-warning-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border-2 border-amber-300 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-amber-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Upozorenje: Postojeći datum
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 uppercase tracking-wider">
                  Moguće dupliranje
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                U Excel tabeli već postoje upisani parametri za ovaj datum
              </p>
            </div>
          </div>
          <button
            id="close-duplicate-warning-btn"
            onClick={onCancel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Info Card: Date and Existing Report */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Datum laboratorijskog nalaza:
              </span>
              <span className="text-sm font-extrabold text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-2xs font-mono">
                {formattedDate}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Već upisano u tabeli:
              </span>
              <span className="text-xs font-bold text-emerald-800">
                {existingRepTitle} ({existingReport.parameters.length} parametara)
              </span>
            </div>
          </div>

          {/* Overlapping parameters details */}
          {overlappingParams.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  Parametri koji se već nalaze u tabeli ({overlappingParams.length}):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 bg-amber-50/50 rounded-xl border border-amber-200/80">
                {overlappingParams.map((paramName) => (
                  <span
                    key={paramName}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 shadow-2xs"
                  >
                    {paramName}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Question explanation */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Izaberite da li želite da <strong>ažurirate/dopunite</strong> postojeći izveštaj u njegovoj koloni, ili da potvrdite <strong>dupliranje</strong> i dodate nalaz kao novu kolonu sa desne strane tabele (npr. ukoliko ste istog dana imali dva odvojena uzorkovanja).
            </span>
          </div>

          {/* Action Choice Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* Opcija 1: Ažuriraj postojeći nalaz (Preporučeno) */}
            <button
              id="btn-confirm-update-existing"
              onClick={onConfirmUpdate}
              className="w-full p-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-left flex items-center justify-between gap-3 transition-all shadow-md hover:shadow-lg cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-white block">
                    Ažuriraj postojeći izveštaj
                  </span>
                  <p className="text-[11px] text-teal-100 mt-0.5">
                    Osvežava vrednosti u postojećoj koloni za datum {formattedDate} (bez dupliranja kolone)
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-white text-teal-800 shrink-0">
                Preporučeno
              </span>
            </button>

            {/* Opcija 2: Potvrdi dupliranje (Dodaj kao novu kolonu) */}
            <button
              id="btn-confirm-duplicate-new-column"
              onClick={onConfirmDuplicate}
              className="w-full p-3.5 rounded-2xl bg-white hover:bg-amber-50/70 border-2 border-amber-300 hover:border-amber-500 text-slate-800 text-left flex items-center justify-between gap-3 transition-all shadow-xs hover:shadow-md cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  <Copy className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors block">
                    Dodaj u novu kolonu (dupliraj)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ubacuje parametre u novu kolonu na desnoj strani tabele kao zaseban izveštaj
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Otkaži unos izveštaja</span>
          </button>
        </div>
      </div>
    </div>
  );
};
