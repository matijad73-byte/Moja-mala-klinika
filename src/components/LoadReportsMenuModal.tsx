import React from 'react';
import {
  X,
  Camera,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  FileUp,
  Database,
  ShieldCheck,
} from 'lucide-react';
import { OneDriveAccount } from '../types';

interface LoadReportsMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExcel?: () => void;
  onSelectPdfOneDrive?: () => void;
  onSelectOneDriveArchive?: () => void;
  onSelectGallery?: () => void;
  onSelectScanner: () => void;
  onBackToHome?: () => void;
  oneDriveAccount?: OneDriveAccount;
  reportCount?: number;
}

export const LoadReportsMenuModal: React.FC<LoadReportsMenuModalProps> = ({
  isOpen,
  onClose,
  onSelectExcel,
  onSelectPdfOneDrive,
  onSelectOneDriveArchive,
  onSelectGallery,
  onSelectScanner,
  onBackToHome,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="load-reports-menu-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#0e213e] text-slate-100 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-[#0a192f]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Učitaj bazu</h2>
            </div>
            <p className="text-xs text-slate-400">
              Analiza rezultata vrši se iz Excel tabele • PDF služi kao backup
            </p>
          </div>
          <button
            id="close-load-menu-btn"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Fields */}
        <div className="p-5 sm:p-6 space-y-3">
          {/* Polje 1: GLAVNA BAZA */}
          <button
            id="opt-upload-excel"
            onClick={() => {
              onClose();
              if (onSelectExcel) {
                onSelectExcel();
              } else if (onSelectGallery) {
                onSelectGallery();
              }
            }}
            className="w-full text-left p-3.5 rounded-2xl border-2 border-emerald-400 hover:border-emerald-600 hover:bg-emerald-50/50 bg-emerald-50/20 transition-all group flex items-center justify-between gap-3 shadow-xs hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-all shadow-xs">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                Učitaj Bazu (Excel tabelu)
              </span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
              Glavna baza
            </span>
          </button>

          {/* Polje 2: Dugme Učitaj PDF */}
          <button
            id="opt-upload-pdf-onedrive"
            onClick={() => {
              onClose();
              if (onSelectPdfOneDrive) {
                onSelectPdfOneDrive();
              }
            }}
            className="w-full text-left p-3.5 rounded-2xl border-2 border-rose-300 hover:border-rose-500 hover:bg-rose-50/30 bg-white transition-all group flex items-center justify-between gap-3 shadow-xs hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-all shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-rose-800 transition-colors block">
                  Učitaj PDF
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Učitavanje PDF nalaza sa diska isključivo na zahtev (samo pregled)
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 shrink-0 self-start sm:self-center mt-0.5 sm:mt-0">
              PDF sa diska
            </span>
          </button>

          {/* Polje 3: Skeniraj novi izveštaj kamerom */}
          <button
            id="opt-scan-camera"
            onClick={() => {
              onClose();
              if (onSelectScanner) {
                onSelectScanner();
              }
            }}
            className="w-full text-left p-3.5 rounded-2xl border-2 border-teal-300 hover:border-teal-500 hover:bg-teal-50/40 bg-white transition-all group flex items-center justify-between gap-3 shadow-xs hover:shadow-md cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-all shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-teal-800 transition-colors block">
                  Skeniraj novi izveštaj
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Kamera • Više strana • PDF na OneDrive
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200 shrink-0 self-start sm:self-center mt-0.5 sm:mt-0">
              Kamera & PDF
            </span>
          </button>

          {/* Dugme: Nazad na početnu stranu */}
          <div className="pt-1.5">
            <button
              id="load-menu-back-to-home-btn"
              onClick={() => {
                onClose();
                if (onBackToHome) {
                  onBackToHome();
                }
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md border border-red-500/40"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>Nazad na početnu stranu</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-center text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Analiziraju se isključivo podaci iz Vaše Excel tabele</span>
          </div>
        </div>
      </div>
    </div>
  );
};
