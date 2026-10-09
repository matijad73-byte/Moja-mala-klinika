import React, { useRef } from 'react';
import {
  X,
  Cloud,
  FileText,
  ExternalLink,
  Upload,
  ArrowLeft,
} from 'lucide-react';
import { LabReport } from '../types';
import { openPdfBlobInAcrobat } from '../utils/pdfViewerHelper';

interface OneDrivePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPdfForView: (report: LabReport) => void;
  onOpenAcrobatDirectly?: (report: LabReport) => void;
}

export const OneDrivePdfModal: React.FC<OneDrivePdfModalProps> = ({
  isOpen,
  onClose,
  onSelectPdfForView,
}) => {
  const localPdfInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Direct link to OneDrive web
  const handleOpenOneDriveWeb = () => {
    window.open('https://onedrive.live.com', '_blank', 'noopener,noreferrer');
  };

  // Extract date from filename if possible
  const deduceDateFromFilename = (fileName: string): string => {
    const lower = fileName.toLowerCase();
    const yyyymmdd = lower.match(/(20\d\d)[-_.](\d{1,2})[-_.](\d{1,2})/);
    if (yyyymmdd) {
      return `${yyyymmdd[1]}-${yyyymmdd[2].padStart(2, '0')}-${yyyymmdd[3].padStart(2, '0')}`;
    }
    const ddmmyyyy = lower.match(/(\d{1,2})[-_.](\d{1,2})[-_.](20\d\d)/);
    if (ddmmyyyy) {
      return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
  };

  // Handler for user picking a PDF directly from their device (or OneDrive local folder)
  const handleLocalPdfSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
      });

      const dateStr = deduceDateFromFilename(file.name);

      // Create a viewer report object - STRICTLY WITHOUT AI ANALYSIS
      const viewerReport: LabReport = {
        id: `pdf-local-${Date.now()}`,
        fileName: file.name,
        fileSource: 'onedrive',
        fileType: 'pdf',
        fileFormat: 'pdf',
        date: dateStr,
        laboratoryName: 'OneDrive Laboratorijski Izveštaj',
        patientName: 'Korisnik',
        summary: `Originalni PDF dokument: ${file.name}. Učitan za direktan pregled u Acrobat Reader-u (bez analize).`,
        uploadedAt: new Date().toISOString(),
        parameters: [],
        fileDataUrl: base64,
      };

      // 1. Immediately trigger Acrobat Reader native open / download
      await openPdfBlobInAcrobat(blob, file.name);

      // 2. Open PDF Preview Modal
      onSelectPdfForView(viewerReport);

      // 3. Close this picker
      onClose();
    } catch (err: any) {
      console.error('Error loading local PDF:', err);
    } finally {
      if (localPdfInputRef.current) {
        localPdfInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Učitaj PDF
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-rose-500/30 text-rose-200 uppercase tracking-wider">
                  Samo pregled
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Učitavanje izveštaja se ne analizira
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Opcije: Otvori i Izaberi */}
        <div className="p-5 sm:p-6 space-y-3.5 bg-white">
          {/* Opcija 1: Otvori link na OneDrive */}
          <button
            id="btn-open-onedrive-web-link"
            onClick={handleOpenOneDriveWeb}
            className="w-full p-4 rounded-2xl bg-sky-50/70 hover:bg-sky-100/70 border-2 border-sky-300 hover:border-sky-500 text-slate-800 text-left flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs hover:shadow-md group"
            title="Otvori OneDrive na Microsoft portalu (onedrive.live.com)"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <Cloud className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-sky-800 transition-colors block">
                  Otvori link na OneDrive
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Otvara OneDrive portal u novom prozoru
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-sky-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Opcija 2: Izaberi PDF sa diska / telefona */}
          <input
            ref={localPdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleLocalPdfSelect}
          />
          <button
            id="btn-choose-local-pdf"
            onClick={() => localPdfInputRef.current?.click()}
            className="w-full p-4 rounded-2xl bg-rose-50/70 hover:bg-rose-100/70 border-2 border-rose-300 hover:border-rose-500 text-slate-800 text-left flex items-center justify-between gap-3 transition-all cursor-pointer shadow-xs hover:shadow-md group"
            title="Izaberi PDF fajl sa računara ili telefona"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-rose-800 transition-colors block">
                  Izaberi PDF sa diska / telefona
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Otvara dokument direktno u Acrobat Reader-u
                </p>
              </div>
            </div>
            <FileText className="w-4 h-4 text-rose-600 shrink-0 group-hover:scale-110 transition-transform" />
          </button>

          {/* Dugme za zatvaranje */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Zatvori</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
