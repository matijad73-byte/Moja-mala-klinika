import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  X,
  Sparkles,
  MoreVertical,
  PlusSquare,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppBannerProps {
  onNotify?: (msg: string) => void;
  onOpenInstallModal?: () => void;
}

export const InstallAppBanner: React.FC<InstallAppBannerProps> = ({
  onNotify,
  onOpenInstallModal,
}) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Once installed or running in standalone mode, the banner is hidden
  if (isInstalled || isStandalone || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success && onNotify) {
        onNotify('Aplikacija je uspešno instalirana na vaš telefon!');
      }
    } else if (onOpenInstallModal) {
      onOpenInstallModal();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {/* Top Banner / Install Card */}
      <div className="bg-gradient-to-r from-teal-900 via-sky-900 to-[#0a192f] text-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-teal-500/30 shadow-md relative overflow-hidden animate-in fade-in slide-in-from-top-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0 shadow-inner">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-tight">
                  Instalirajte aplikaciju na telefon
                </span>
                <span className="bg-teal-400/20 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-400/30">
                  Mobilna app
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Brz pristup sa početnog ekrana bez kucanja adrese. Nakon instalacije, ovo obaveštenje se automatski uklanja.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {/* Install Button */}
            <button
              id="btn-install-pwa"
              onClick={handleInstallClick}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md hover:shadow-teal-500/30 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Instaliraj na telefon</span>
            </button>

            {/* Dismiss X */}
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Zatvori ovo obaveštenje"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Manual Step Guide Modal if prompt is not triggered natively */}
      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuideModal(false);
          }}
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Smartphone className="w-5 h-5 text-teal-600" />
                <span>Instalacija na telefon</span>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="font-bold text-slate-900">Uputstvo za iPhone / iPad (Safari):</div>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-600">
                  <li>Dodirnite ikonu <strong>„Deli”</strong> (kvadrat sa strelicom na dnu ekrana).</li>
                  <li>Izaberite <PlusSquare className="inline w-3.5 h-3.5 text-slate-700 mb-0.5" /> <strong>„Dodaj na početni ekran” (Add to Home Screen)</strong>.</li>
                  <li>U gornjem desnom uglu pritisnite <strong>„Dodaj”</strong>.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MoreVertical className="w-4 h-4 text-teal-600" />
                  <span>Uputstvo za Android (Chrome):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-600">
                  <li>U gornjem desnom uglu Chrome-a dodirnite tri tačkice <strong>(⋮)</strong>.</li>
                  <li>Izaberite opciju <strong>„Instaliraj aplikaciju”</strong> (ili <strong>„Dodaj na početni ekran”</strong>).</li>
                  <li>Potvrdite dodirom na <strong>„Instaliraj”</strong>.</li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Razumem
            </button>
          </div>
        </div>
      )}
    </>
  );
};
