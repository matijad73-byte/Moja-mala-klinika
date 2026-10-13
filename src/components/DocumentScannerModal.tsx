import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  RotateCw,
  Check,
  FileText,
  Cloud,
  Folder,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  Upload,
  Sliders,
  Crop,
  Layers,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { LabReport } from '../types';
import { formatSerbianDateForExcel } from '../utils/excelParser';

interface ScannedPage {
  id: string;
  rawImage: string;
  processedImage: string;
  rotation: number;
  filterMode: 'ocr' | 'enhanced' | 'original';
}

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSaved: (report: LabReport, savedPath: string, allowDuplicate?: boolean) => void;
  oneDriveConnected: boolean;
  existingReports?: LabReport[];
}

const SERBIAN_MONTHS = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
];

export function getStandardScanFileName(dateStr: string, useMonthName = true): string {
  if (!dateStr) dateStr = new Date().toISOString().split('T')[0];
  const parts = dateStr.split('-');
  const year = parts[0] || '2026';
  const monthNum = parseInt(parts[1] || '1', 10);
  const monthIndex = Math.max(0, Math.min(11, monthNum - 1));
  const monthStr = useMonthName ? SERBIAN_MONTHS[monthIndex] : String(monthNum).padStart(2, '0');
  return `Laboratorija_${monthStr}_${year}.pdf`;
}

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen,
  onClose,
  onReportSaved,
  existingReports = [],
}) => {
  // Multi-page state
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Camera stream
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scanning & processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string | null>(null);

  // Optical enhancement settings (per page)
  const [filterMode, setFilterMode] = useState<'ocr' | 'enhanced' | 'original'>('ocr');
  const [autoEdgeCrop, setAutoEdgeCrop] = useState<boolean>(true);
  const [contrastLevel, setContrastLevel] = useState<number>(1.45);
  const [brightnessLevel, setBrightnessLevel] = useState<number>(1.12);
  const [edgeMargin, setEdgeMargin] = useState<number>(3); // percentage cropped from paper borders
  const [showEdgeControls, setShowEdgeControls] = useState<boolean>(false);

  // OneDrive destination info:
  // "OneDrive\Lekarski izvestaji\Laboratorija"
  const DEFAULT_FOLDER = 'OneDrive\\Lekarski izvestaji\\Laboratorija';
  const [documentDate, setDocumentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [fileName, setFileName] = useState<string>(() => getStandardScanFileName(new Date().toISOString().split('T')[0], true));

  // Duplicate detection state
  const [showDuplicateConfirmModal, setShowDuplicateConfirmModal] = useState<boolean>(false);
  const [duplicateConfirmed, setDuplicateConfirmed] = useState<boolean>(false);

  // Check if report with this date already exists in the database
  const duplicateMatch = existingReports.find((r) => r.date === documentDate);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-update fileName when documentDate changes if user hasn't custom typed something completely different
  useEffect(() => {
    if (fileName.startsWith('Laboratorija_')) {
      setFileName(getStandardScanFileName(documentDate, true));
    }
    setDuplicateConfirmed(false);
  }, [documentDate]);

  // Camera start / stop lifecycle
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPages([]);
      setActivePageIndex(0);
      setIsCameraActive(true);
      setCameraError(null);
      setIsProcessing(false);
      setSavedSuccessMsg(null);
      setShowDuplicateConfirmModal(false);
      setDuplicateConfirmed(false);
      return;
    }

    if (isCameraActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, isCameraActive]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera nije podržana u ovom okruženju.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Pristup kameri je odbijen. Dozvolite kameru ili pritisnite opciju za izbor slike nalaza sa uređaja.'
          : 'Kamera se ne može direktno otvoriti u ovom okruženju. Možete fotografisati ili izabrati sliku nalaza sa uređaja.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Optical enhancement: Cleans paper, eliminates shadows, makes text high contrast black & white
  const applyImageProcessing = useCallback(
    async (
      imgSrc: string,
      rot: number,
      mode: 'ocr' | 'enhanced' | 'original',
      cropPercent: number,
      contrast: number,
      brightness: number
    ): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(imgSrc);
            return;
          }

          const isRotated = rot === 90 || rot === 270;
          const origW = img.width;
          const origH = img.height;
          canvas.width = isRotated ? origH : origW;
          canvas.height = isRotated ? origW : origH;

          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rot * Math.PI) / 180);
          ctx.drawImage(img, -origW / 2, -origH / 2);
          ctx.restore();

          let finalCanvas = canvas;
          if (cropPercent > 0) {
            const cropCanvas = document.createElement('canvas');
            const cropCtx = cropCanvas.getContext('2d');
            if (cropCtx) {
              const cropX = Math.round((canvas.width * cropPercent) / 100);
              const cropY = Math.round((canvas.height * cropPercent) / 100);
              const targetW = canvas.width - cropX * 2;
              const targetH = canvas.height - cropY * 2;

              cropCanvas.width = targetW;
              cropCanvas.height = targetH;
              cropCtx.drawImage(
                canvas,
                cropX,
                cropY,
                targetW,
                targetH,
                0,
                0,
                targetW,
                targetH
              );
              finalCanvas = cropCanvas;
            }
          }

          if (mode !== 'original') {
            const finalCtx = finalCanvas.getContext('2d');
            if (finalCtx) {
              const imgData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
              const data = imgData.data;

              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                let lum = 0.299 * r + 0.587 * g + 0.114 * b;

                if (mode === 'ocr') {
                  // High readability OCR scan filter:
                  // turns paper background pure white and letters solid dark
                  lum = lum * brightness;
                  lum = ((lum / 255 - 0.5) * contrast + 0.5) * 255;
                  lum = Math.min(255, Math.max(0, lum));

                  if (lum > 135) {
                    lum = Math.min(255, lum * 1.35);
                  } else {
                    lum = Math.max(0, lum * 0.65);
                  }

                  data[i] = lum;
                  data[i + 1] = lum;
                  data[i + 2] = lum;
                } else if (mode === 'enhanced') {
                  data[i] = Math.min(255, Math.max(0, ((r / 255 - 0.5) * contrast + 0.5) * 255 * brightness));
                  data[i + 1] = Math.min(255, Math.max(0, ((g / 255 - 0.5) * contrast + 0.5) * 255 * brightness));
                  data[i + 2] = Math.min(255, Math.max(0, ((b / 255 - 0.5) * contrast + 0.5) * 255 * brightness));
                }
              }

              finalCtx.putImageData(imgData, 0, 0);
            }
          }

          resolve(finalCanvas.toDataURL('image/jpeg', 0.94));
        };
        img.src = imgSrc;
      });
    },
    []
  );

  // Capture current video frame and add as a new page
  const handleCapturePage = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.95);

    const processed = await applyImageProcessing(
      rawDataUrl,
      0,
      filterMode,
      autoEdgeCrop ? edgeMargin : 0,
      contrastLevel,
      brightnessLevel
    );

    const newPage: ScannedPage = {
      id: `scan-page-${Date.now()}-${pages.length + 1}`,
      rawImage: rawDataUrl,
      processedImage: processed,
      rotation: 0,
      filterMode,
    };

    const newPages = [...pages, newPage];
    setPages(newPages);
    setActivePageIndex(newPages.length - 1);
    setIsCameraActive(false);
    stopCamera();
  };

  // Upload image file fallback
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUrl = reader.result as string;
      const processed = await applyImageProcessing(
        rawDataUrl,
        0,
        filterMode,
        autoEdgeCrop ? edgeMargin : 0,
        contrastLevel,
        brightnessLevel
      );

      const newPage: ScannedPage = {
        id: `scan-page-${Date.now()}-${pages.length + 1}`,
        rawImage: rawDataUrl,
        processedImage: processed,
        rotation: 0,
        filterMode,
      };

      const newPages = [...pages, newPage];
      setPages(newPages);
      setActivePageIndex(newPages.length - 1);
      setIsCameraActive(false);
      stopCamera();
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Switch to camera to scan another page (Multi-page support)
  const handleAddNewPage = () => {
    setIsCameraActive(true);
  };

  // Rotate currently active page
  const handleRotateActivePage = async () => {
    if (pages.length === 0) return;
    const page = pages[activePageIndex];
    if (!page) return;

    const newRot = (page.rotation + 90) % 360;
    const newProcessed = await applyImageProcessing(
      page.rawImage,
      newRot,
      page.filterMode,
      autoEdgeCrop ? edgeMargin : 0,
      contrastLevel,
      brightnessLevel
    );

    const updatedPages = [...pages];
    updatedPages[activePageIndex] = {
      ...page,
      rotation: newRot,
      processedImage: newProcessed,
    };
    setPages(updatedPages);
  };

  // Delete currently active page
  const handleDeleteActivePage = (indexToDelete: number) => {
    const updated = pages.filter((_, idx) => idx !== indexToDelete);
    setPages(updated);
    if (updated.length === 0) {
      setIsCameraActive(true);
      setActivePageIndex(0);
    } else {
      setActivePageIndex(Math.max(0, indexToDelete - 1));
    }
  };

  // Update filter mode for active page
  const handleChangeFilterMode = async (mode: 'ocr' | 'enhanced' | 'original') => {
    setFilterMode(mode);
    if (pages.length === 0) return;
    const page = pages[activePageIndex];
    if (!page) return;

    const newProcessed = await applyImageProcessing(
      page.rawImage,
      page.rotation,
      mode,
      autoEdgeCrop ? edgeMargin : 0,
      contrastLevel,
      brightnessLevel
    );

    const updatedPages = [...pages];
    updatedPages[activePageIndex] = {
      ...page,
      filterMode: mode,
      processedImage: newProcessed,
    };
    setPages(updatedPages);
  };

  // Check duplicates and save all pages as a multi-page PDF on OneDrive and run analysis
  const handleSaveToOneDriveAndAnalyze = async () => {
    if (pages.length === 0) return;

    // Automatic check before adding report to Excel:
    // If system detects parameters already exist for that date in the table,
    // display warning modal before user confirms duplication!
    if (duplicateMatch && !duplicateConfirmed) {
      setShowDuplicateConfirmModal(true);
      return;
    }

    await executeSaveToOneDrive(Boolean(duplicateMatch));
  };

  const executeSaveToOneDrive = async (isDuplicateConfirmed: boolean) => {
    if (pages.length === 0) return;

    setIsProcessing(true);
    setSavedSuccessMsg(null);

    try {
      setProcessStep(`1/4: Priprema ${pages.length} skenirane strane i optimizacija čitljivosti...`);
      await new Promise((r) => setTimeout(r, 200));

      setProcessStep('2/4: Generisanje standardizovanog višestraničnog A4 PDF dokumenta...');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const printableW = pageWidth - margin * 2;
      const printableH = pageHeight - margin * 2;

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        const pageImgData = pages[i].processedImage || pages[i].rawImage;
        const img = new Image();
        img.src = pageImgData;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const imgAspect = img.width / img.height;
        let targetW = printableW;
        let targetH = targetW / imgAspect;

        if (targetH > printableH) {
          targetH = printableH;
          targetW = targetH * imgAspect;
        }

        const posX = margin + (printableW - targetW) / 2;
        const posY = margin + (printableH - targetH) / 2;

        pdf.addImage(pageImgData, 'JPEG', posX, posY, targetW, targetH, undefined, 'FAST');
      }

      const pdfBase64 = pdf.output('datauristring');

      // Final clean PDF file name per requirement: Laboratorija_mesec_godina.pdf
      let cleanPdfName = fileName.trim();
      if (!cleanPdfName) {
        cleanPdfName = getStandardScanFileName(documentDate, true);
      }
      if (!cleanPdfName.toLowerCase().endsWith('.pdf')) {
        cleanPdfName = `${cleanPdfName}.pdf`;
      }

      setProcessStep('3/4: Snimanje PDF fajla na OneDrive (Lekarski izvestaji/Laboratorija)...');
      const res = await fetch('/api/onedrive/save-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentBase64: pdfBase64,
          fileName: cleanPdfName,
          folderPath: DEFAULT_FOLDER,
          date: documentDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Greška pri čuvanju dokumenta na OneDrive.');
      }

      setProcessStep('4/4: Uspešno arhivirano na OneDrive!');
      setSavedSuccessMsg(
        `Nalaz sa ${pages.length} ${pages.length === 1 ? 'stranom' : 'strane'} je uspešno sačuvan kao „${cleanPdfName}” na lokaciji "${data.targetPath || DEFAULT_FOLDER}"!`
      );

      if (data.report) {
        onReportSaved(data.report, data.targetPath || DEFAULT_FOLDER, isDuplicateConfirmed);
      }

      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Error saving multi-page scan:', err);
      alert(err.message || 'Došlo je do greške pri obradi skeniranog dokumenta.');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const activePage = pages[activePageIndex];

  return (
    <div
      id="document-scanner-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Skeniraj novi laboratorijski nalaz
                </h2>
                {pages.length > 0 && (
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                    {pages.length} {pages.length === 1 ? 'strana' : 'strane'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Kamera • Više strana • Korekcija čitljivosti • PDF na OneDrive
              </p>
            </div>
          </div>
          <button
            id="close-scanner-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {savedSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-900 text-xs shadow-xs">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{savedSuccessMsg}</span>
            </div>
          )}

          {/* MODE A: LIVE CAMERA SCANNER */}
          {isCameraActive ? (
            <div className="space-y-3.5">
              <div className="relative aspect-4/3 sm:aspect-16/10 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner">
                {cameraError ? (
                  <div className="p-6 text-center text-slate-300 space-y-3 max-w-sm">
                    <AlertCircle className="w-9 h-9 mx-auto text-amber-400" />
                    <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 mx-auto transition-colors cursor-pointer shadow-xs"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Fotografiši ili izaberi sliku nalaza</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-full object-cover"
                    />

                    {/* Framing guide */}
                    <div className="absolute inset-5 sm:inset-8 pointer-events-none border border-white/40 rounded-xl">
                      <div className="absolute -top-1.5 -left-1.5 w-7 h-7 border-t-4 border-l-4 border-teal-400 rounded-tl-lg shadow-sm"></div>
                      <div className="absolute -top-1.5 -right-1.5 w-7 h-7 border-t-4 border-r-4 border-teal-400 rounded-tr-lg shadow-sm"></div>
                      <div className="absolute -bottom-1.5 -left-1.5 w-7 h-7 border-b-4 border-l-4 border-teal-400 rounded-bl-lg shadow-sm"></div>
                      <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 border-b-4 border-r-4 border-teal-400 rounded-br-lg shadow-sm"></div>

                      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-xs text-white text-[11px] px-3.5 py-1 rounded-full font-bold shadow-sm flex items-center gap-1.5">
                        <Crop className="w-3.5 h-3.5 text-teal-300" />
                        <span>Skeniranje strane {pages.length + 1} • Poravnajte dokument</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Shutter button */}
              {!cameraError && (
                <div className="flex items-center justify-center gap-4 pt-1">
                  <button
                    id="capture-document-btn"
                    onClick={handleCapturePage}
                    className="w-18 h-18 rounded-full bg-teal-600 hover:bg-teal-500 text-white p-1 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all border-4 border-teal-200 cursor-pointer"
                    title={`Slikaj stranu ${pages.length + 1}`}
                  >
                    <Camera className="w-8 h-8" />
                  </button>
                </div>
              )}

              {/* Upload fallback and back button if pages already exist */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                {pages.length > 0 && (
                  <button
                    onClick={() => {
                      setIsCameraActive(false);
                      stopCamera();
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-bold px-3 py-1.5 rounded-lg bg-slate-100 transition-colors"
                  >
                    Odustani i vrati se na skenirane strane ({pages.length})
                  </button>
                )}

                <div className="ml-auto">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Izaberi sliku strane sa uređaja</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* MODE B: REVIEW & MULTI-PAGE MANAGEMENT */
            <div className="space-y-4">
              {/* Multi-page Thumbnail strip */}
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-x-auto py-1">
                  {pages.map((p, idx) => (
                    <button
                      key={p.id}
                      onClick={() => setActivePageIndex(idx)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        activePageIndex === idx
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Strana {idx + 1}</span>
                    </button>
                  ))}
                </div>

                {/* Add Next Page Button */}
                <button
                  id="add-next-page-btn"
                  onClick={handleAddNewPage}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-2xs"
                  title="Skeniraj sledeću stranu istog izveštaja"
                >
                  <Plus className="w-4 h-4 text-teal-700" />
                  <span>Dodaj stranu ({pages.length + 1})</span>
                </button>
              </div>

              {/* Active Page Image Preview with Filters */}
              {activePage && (
                <div className="space-y-3">
                  <div className="relative aspect-4/3 sm:aspect-16/10 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200 shadow-inner">
                    <img
                      src={activePage.processedImage || activePage.rawImage}
                      alt={`Skenirana strana ${activePageIndex + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />

                    {/* Floating controls on preview */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/75 p-1.5 rounded-xl backdrop-blur-xs shadow-md">
                      <button
                        onClick={handleRotateActivePage}
                        className="p-2 text-white hover:text-teal-300 rounded-lg hover:bg-white/10 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title="Rotiraj stranu za 90°"
                      >
                        <RotateCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Rotiraj</span>
                      </button>
                      <button
                        onClick={() => handleDeleteActivePage(activePageIndex)}
                        className="p-2 text-rose-300 hover:text-rose-100 rounded-lg hover:bg-rose-500/20 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                        title="Obriši ovu stranu"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Obriši</span>
                      </button>
                    </div>

                    <div className="absolute top-3 left-3 bg-black/75 text-white px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-xs">
                      Strana {activePageIndex + 1} od {pages.length}
                    </div>
                  </div>

                  {/* Filter selector for readability */}
                  <div className="bg-teal-50/60 rounded-2xl p-3.5 border border-teal-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                        <Sparkles className="w-4 h-4 text-teal-700" />
                        <span>Filter čitljivosti dokumenta</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowEdgeControls(!showEdgeControls)}
                        className="text-[11px] font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>{showEdgeControls ? 'Sakrij podešavanja ivica' : 'Podešavanje ivica i kontrasta'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleChangeFilterMode('ocr')}
                        className={`py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          activePage.filterMode === 'ocr'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-teal-100/50 border border-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>OCR (Čist papir)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChangeFilterMode('enhanced')}
                        className={`py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          activePage.filterMode === 'enhanced'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-teal-100/50 border border-slate-200'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Boje i pečati</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChangeFilterMode('original')}
                        className={`py-2 px-2.5 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          activePage.filterMode === 'original'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-teal-100/50 border border-slate-200'
                        }`}
                      >
                        <span>Izvorni snimak</span>
                      </button>
                    </div>

                    {showEdgeControls && (
                      <div className="p-3 bg-white rounded-xl border border-teal-200/80 space-y-3 text-xs animate-in fade-in">
                        <div className="flex items-center justify-between">
                          <label className="text-slate-700 font-medium flex items-center gap-1.5">
                            <Crop className="w-3.5 h-3.5 text-teal-600" />
                            <span>Ispravljanje & odsecanje senki sa ivica:</span>
                          </label>
                          <span className="font-mono text-teal-700 font-bold">{edgeMargin}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="12"
                          step="1"
                          value={edgeMargin}
                          onChange={(e) => {
                            setEdgeMargin(Number(e.target.value));
                            setAutoEdgeCrop(true);
                          }}
                          className="w-full accent-teal-600 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Destination on OneDrive: Exact location OneDrive\Lekarski izvestaji\Laboratorija */}
              {/* Naziv treba da bude kao kod ostalih Laboratorija_mesec_godina */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <Cloud className="w-4 h-4 text-sky-600" />
                    <span>OneDrive lokacija i naziv PDF fajla</span>
                  </div>
                  <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">
                    A4 PDF • {pages.length} {pages.length === 1 ? 'strana' : 'strane'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                      <Folder className="w-3.5 h-3.5 text-slate-400" />
                      Fascikla na OneDrive-u:
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={DEFAULT_FOLDER}
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-700 font-mono text-[11px] cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-medium mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Naziv PDF fajla:
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-slate-700 font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Datum izveštaja (mesec i godina se automatski upisuju u naziv):
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFileName(getStandardScanFileName(documentDate, true))}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                          title="Format: Laboratorija_Septembar_2026.pdf"
                        >
                          Naziv sa imenom meseca
                        </button>
                        <button
                          type="button"
                          onClick={() => setFileName(getStandardScanFileName(documentDate, false))}
                          className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700"
                          title="Format: Laboratorija_09_2026.pdf"
                        >
                          Naziv sa brojem meseca
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      value={documentDate}
                      onChange={(e) => setDocumentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />

                    {/* Proaktivno upozorenje ako već postoje parametri za izabrani datum */}
                    {duplicateMatch && (
                      <div className="mt-2 p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 text-xs space-y-1 animate-in fade-in">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Upozorenje: Već postoje parametri za datum {formatSerbianDateForExcel(documentDate)}!</span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          U Excel tabeli već postoji {duplicateMatch.fileName || `Izveštaj br. ${duplicateMatch.reportNumber || '1'}`} sa {duplicateMatch.parameters.length} evidentiranih parametara. Pre dodavanja u Excel biće zatražena Vaša potvrda za dupliranje.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>
                    Fajl se snima kao PDF na OneDrive u fasciklu gde su ostali izveštaji pod nazivom <strong>{fileName}</strong>.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/80">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 active:bg-red-700 text-white shadow-md border border-red-500/40 transition-all cursor-pointer"
          >
            Nazad na početnu stranu
          </button>

          {!isCameraActive && pages.length > 0 && (
            <button
              id="confirm-save-scan-btn"
              disabled={isProcessing}
              onClick={handleSaveToOneDriveAndAnalyze}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{processStep || 'Obrađujem dokument...'}</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Snimi kao PDF na OneDrive ({pages.length} {pages.length === 1 ? 'strana' : 'strane'})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* DIALOG ZA AUTOMATSKO UPOZORENJE I POTVRDU DUPLIRANJA PRE DODAVANJA U EXCEL */}
      {showDuplicateConfirmModal && duplicateMatch && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-amber-300 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300 shadow-xs">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Upozorenje: Duplikat izveštaja
                </h3>
                <p className="text-xs text-slate-500">
                  Parametri već postoje za datum {formatSerbianDateForExcel(documentDate)}
                </p>
              </div>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-2.5 text-xs text-amber-950">
              <div className="flex justify-between items-center pb-2 border-b border-amber-200/80">
                <span className="font-semibold text-slate-600">Datum izveštaja:</span>
                <span className="font-bold text-slate-900 font-mono text-xs">{formatSerbianDateForExcel(documentDate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-600">Postojeći izveštaj u tabeli:</span>
                <span className="font-bold text-slate-900">{duplicateMatch.fileName || `Izveštaj br. ${duplicateMatch.reportNumber || '1'}`}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-600">Broj postojećih parametara:</span>
                <span className="font-bold text-amber-800">{duplicateMatch.parameters.length} parametara</span>
              </div>
              {duplicateMatch.parameters.length > 0 && (
                <div className="pt-1 text-[11px] text-slate-600 leading-relaxed">
                  Evidentirani parametri: <strong className="text-slate-800">{duplicateMatch.parameters.slice(0, 5).map((p) => p.name).join(', ')}{duplicateMatch.parameters.length > 5 ? '...' : ''}</strong>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
              Sistem je detektovao da parametri izveštaja već postoje za ovaj datum u tabeli. Ako potvrdite dupliranje, novi skenirani parametri biće upisani u <strong>prvu slobodnu kolonu sa desne strane</strong> kao novi izveštaj, uz formatiranje identično ostatku tabele.
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                id="duplicate-modal-cancel-btn"
                onClick={() => setShowDuplicateConfirmModal(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Odustani (Promeni datum)
              </button>
              <button
                type="button"
                id="duplicate-modal-confirm-btn"
                onClick={() => {
                  setShowDuplicateConfirmModal(false);
                  setDuplicateConfirmed(true);
                  executeSaveToOneDrive(true);
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
    </div>
  );
};
