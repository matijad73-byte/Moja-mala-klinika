import React, { useState, useRef } from 'react';
import {
  X,
  FileUp,
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  UploadCloud,
  FolderUp,
} from 'lucide-react';
import { LabReport } from '../types';

interface PdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportExtracted?: (report: LabReport) => void;
  onReportsExtracted?: (reports: LabReport[]) => void;
}

export const PdfUploadModal: React.FC<PdfUploadModalProps> = ({
  isOpen,
  onClose,
  onReportExtracted,
  onReportsExtracted,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

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

  const processFiles = async (files: File[]) => {
    const supportedFiles = files.filter((f) => {
      const name = f.name.toLowerCase();
      return (
        f.type === 'application/pdf' ||
        f.type.startsWith('image/') ||
        name.endsWith('.pdf') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.png') ||
        name.endsWith('.webp')
      );
    });

    if (supportedFiles.length === 0) {
      setError('Molimo Vas izaberite validne laboratorijske nalaze u PDF ili JPG/PNG formatu slike.');
      return;
    }

    setProcessing(true);
    setError(null);
    setTotalCount(supportedFiles.length);
    setProcessedCount(0);

    const extractedReports: LabReport[] = [];

    try {
      for (let i = 0; i < supportedFiles.length; i++) {
        const file = supportedFiles[i];
        setProcessedCount(i + 1);
        setStatusMessage(
          `[${i + 1}/${supportedFiles.length}] Gemini AI analizira: ${file.name}...`
        );

        const fileBase64 = await readFileAsBase64(file);

        const response = await fetch('/api/extract-lab-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentBase64: fileBase64,
            fileName: file.name,
            mimeType: file.type || undefined,
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          const fileReports: LabReport[] = Array.isArray(data.reports) && data.reports.length > 0
            ? data.reports
            : data.report ? [data.report] : [];

          for (const rep of fileReports) {
            rep.fileName = file.name;
            extractedReports.push(rep);
            if (onReportExtracted) {
              onReportExtracted(rep);
            }
          }
        } else {
          console.warn(`Could not extract ${file.name}:`, data.error);
        }
      }

      if (extractedReports.length > 0) {
        if (onReportsExtracted) {
          onReportsExtracted(extractedReports);
        }
        setStatusMessage(`Uspešno obrađeno ${extractedReports.length} nalaza!`);
        setTimeout(() => {
          onClose();
          setProcessing(false);
          setStatusMessage('');
        }, 800);
      } else {
        throw new Error('AI nije uspeo da ekstrahuje podatke iz odabranih dokumenata.');
      }
    } catch (err: any) {
      console.error('Batch extraction error:', err);
      setError(err.message || 'Došlo je do greške pri obradi laboratorijskih nalaza.');
      setProcessing(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <FileUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Učitaj PDF i Foto (JPG/PNG) Nalaze</h2>
              <p className="text-xs text-slate-500">
                Direktno iz OneDrive foldera ili lokalnog diska — podržani digitalni PDF-ovi i fotografije izveštaja
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone */}
        <div className="p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf,image/jpeg,.jpg,.jpeg,image/png,.png,image/webp,.webp"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !processing && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-teal-500 bg-teal-50/50 scale-[1.01]'
                : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50'
            } ${processing ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              Prevucite PDF ili JPG/PNG fotografije ovde ili <span className="text-teal-600 underline">kliknite za izbor</span>
            </p>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Podržani formati: <strong>PDF</strong>, fotografije nalaza (<strong>JPG</strong>, <strong>PNG</strong>).
              U dijaloškom prozoru možete izabrati <strong>više nalaza odjednom</strong> (čak i starije nalaze iz raznih laboratorija).
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
              <FolderUp className="w-4 h-4 text-slate-500" />
              <span>Višestruki odabir • PDF & Fotografije nalaza</span>
            </div>
          </div>

          {/* Processing animation */}
          {processing && (
            <div className="mt-4 p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 space-y-2">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-teal-600 animate-spin shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold">{statusMessage}</p>
                  <p className="text-[11px] text-teal-700">
                    Obrada laboratorijskih analiza i generisanje trendova u toku...
                  </p>
                </div>
              </div>
              {totalCount > 1 && (
                <div className="w-full bg-teal-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(processedCount / totalCount) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Greška pri analizi:</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Ekstrakcija pomoću Google Gemini 3.8 Flash
            </span>
            <span>Maksimalno 50MB po fajlu</span>
          </div>
        </div>
      </div>
    </div>
  );
};
