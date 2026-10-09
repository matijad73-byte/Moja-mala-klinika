import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  X,
  Sparkles,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AutoInstallPromptModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
  onNotify?: (msg: string) => void;
}

export const AutoInstallPromptModal: React.FC<AutoInstallPromptModalProps> = ({
  forceOpen = false,
  onClose,
  onNotify,
}) => {
  const {
    isInstallable,
    isInstalled,
    isStandalone,
    isAndroid,
    isIOS,
    isMobile,
    isInAppBrowser,
    isViber,
    install,
  } = usePWAInstall();

  const [isOpen, setIsOpen] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [attemptedNative, setAttemptedNative] = useState(false);

  // Auto-open on mobile / in-app browser unless already installed as standalone PWA
  useEffect(() => {
    if (isStandalone) {
      setIsOpen(false);
      return;
    }

    // Auto-open on phone / tablet / in-app browser (Viber, WhatsApp, etc.)
    const timer = setTimeout(() => {
      const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
      // Automatically pop up if not dismissed this session, or if forceOpen is true
      if (!isDismissed || forceOpen) {
        setIsOpen(true);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [isStandalone, forceOpen, isMobile, isInAppBrowser, isViber]);

  // When forceOpen prop changes to true
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setInstalledSuccess(false);
    }
  }, [forceOpen]);

  // If running in standalone mode (already installed and opened from home screen icon), don't show
  if (isStandalone || (!forceOpen && isInstalled)) {
    return null;
  }

  if (!isOpen && !forceOpen) {
    return null;
  }

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    if (onClose) onClose();
  };

  const handleInstallClick = async () => {
    setAttemptedNative(true);
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstalledSuccess(true);
        if (onNotify) onNotify('Aplikacija je uspešno instalirana na vaš telefon!');
        setTimeout(() => {
          setIsOpen(false);
          if (onClose) onClose();
        }, 1800);
        return;
      }
    }
    // If native prompt wasn't available or was dismissed, inform user
    if (onNotify) {
      onNotify('Pratite uputstvo u nastavku za dodavanje aplikacije na početni ekran.');
    }
  };

  // Android Chrome Intent URL to jump directly out of Viber into Google Chrome
  const chromeIntentUrl =
    typeof window !== 'undefined'
      ? `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`
      : '#';

  return (
    <div
      id="auto-pwa-install-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-[#0e213e] text-slate-100 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-teal-900 via-sky-900 to-[#0a192f] p-5 text-white relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Zatvori"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner shrink-0">
              <Smartphone className="w-6 h-6 text-teal-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white tracking-tight">
                  Instalacija na telefon
                </h3>
                <span className="bg-teal-400/20 text-teal-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-teal-400/30">
                  Mobilna app
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-0.5">
                Moja mala klinika – Laboratorijski nalazi i zdravstveni trendovi
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {installedSuccess ? (
            <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-200 text-xs shadow-2xs animate-in zoom-in-95">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <strong className="block text-sm text-white">Uspešno instalirano!</strong>
                <span>Aplikacija je dodata na vaš početni ekran. Možete je otvoriti direktno sa ekrana telefona kao i svaku drugu aplikaciju.</span>
              </div>
            </div>
          ) : (
            <>
              {/* UPOZORENJE I POMOĆ AKO JE OTVORENO IZ VIBERA */}
              {(isViber || isInAppBrowser) && (
                <div className="p-4 bg-amber-950/40 border-2 border-amber-500/80 rounded-2xl text-amber-200 text-xs space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Otvorili ste link iz Vibera!</span>
                  </div>
                  <p className="text-amber-200 leading-relaxed">
                    Viber otvara linkove u svom privremenom pregledaču koji ne dozvoljava direktno čuvanje aplikacije na ekran. Za instalaciju, otvorite link u <strong>Google Chrome-u</strong> (ili Safariju).
                  </p>

                  {/* Dugme za direktan prelazak u Chrome na Androidu */}
                  {isAndroid && (
                    <a
                      href={chromeIntentUrl}
                      className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors text-center"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Otvori direktno u Google Chrome-u</span>
                    </a>
                  )}

                  <div className="font-semibold text-amber-200 bg-amber-900/50 p-2.5 rounded-xl border border-amber-700/60 flex items-start gap-2">
                    <MoreVertical className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      U Viberu dodirnite tri tačkice u gornjem desnom uglu <strong>(⋮)</strong> i izaberite <strong>„Otvori u Chrome-u”</strong> (ili Safariju).
                    </span>
                  </div>
                </div>
              )}

              {/* GLAVNO DUGME ZA INSTALACIJU NA TELEFON */}
              <button
                id="pwa-prompt-install-now-btn"
                onClick={handleInstallClick}
                className="w-full py-4 px-5 rounded-2xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-teal-600/30 transition-all cursor-pointer group"
              >
                <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Instaliraj aplikaciju na telefon</span>
              </button>

              {/* UPUTSTVO ZA ANDROID (Google Chrome) */}
              {!isIOS && (
                <div className="bg-[#112240] border border-slate-700 p-4 rounded-2xl space-y-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2 font-bold text-white text-sm">
                    <MoreVertical className="w-4 h-4 text-teal-400" />
                    <span>Uputstvo za Android (Google Chrome):</span>
                  </div>
                  <ol className="space-y-2 text-slate-300 pl-1">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-teal-950 border border-teal-800 text-teal-300 font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </span>
                      <span>
                        Dodirnite meni sa tri tačkice u gornjem desnom uglu <strong>(⋮)</strong> u Google Chrome-u.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-teal-950 border border-teal-800 text-teal-300 font-bold flex items-center justify-center shrink-0 text-xs">
                        2
                      </span>
                      <span>
                        Izaberite opciju <strong>„Instaliraj aplikaciju”</strong> (Install app) — ovo instalira pravu aplikaciju na ceo ekran (a ne običnu prečicu pretraživača).
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-teal-950 border border-teal-800 text-teal-300 font-bold flex items-center justify-center shrink-0 text-xs">
                        3
                      </span>
                      <span>
                        Potvrdite pritiskom na <strong>„Instaliraj”</strong>. Ikonica aplikacije se automatski pojavljuje na vašem telefonu!
                      </span>
                    </li>
                  </ol>
                </div>
              )}

              {/* UPUTSTVO ZA IPHONE / IPAD (Safari) */}
              {isIOS && (
                <div className="bg-amber-950/40 border border-amber-800 p-4 rounded-2xl space-y-2.5 text-xs text-amber-200">
                  <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span>Uputstvo za iPhone / iPad (Safari):</span>
                  </div>
                  <ol className="space-y-2 text-slate-300 pl-1">
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-900 text-amber-300 font-bold flex items-center justify-center shrink-0 text-xs">
                        1
                      </span>
                      <span>
                        Dodirnite ikonu <strong>„Deli”</strong> (kvadrat sa strelicom nagore 📤 na donjoj traci Safarija).
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-900 text-amber-300 font-bold flex items-center justify-center shrink-0 text-xs">
                        2
                      </span>
                      <span>
                        U meniju izaberite <PlusSquare className="inline w-3.5 h-3.5 text-amber-300 mb-0.5" /> <strong>„Dodaj na početni ekran” (Add to Home Screen)</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-amber-900 text-amber-300 font-bold flex items-center justify-center shrink-0 text-xs">
                        3
                      </span>
                      <span>
                        U gornjem desnom uglu pritisnite <strong>„Dodaj”</strong>. Aplikacija je spremna na vašem ekranu!
                      </span>
                    </li>
                  </ol>
                </div>
              )}

              {/* 3 Prednosti instalacije */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-[#112240] p-2.5 rounded-xl border border-slate-700">
                  <Sparkles className="w-4 h-4 mx-auto mb-1 text-teal-400" />
                  <span className="block text-[11px] font-bold text-white">1-Dodir</span>
                  <span className="text-[10px] text-slate-400">Sa ekrana</span>
                </div>
                <div className="bg-[#112240] p-2.5 rounded-xl border border-slate-700">
                  <Smartphone className="w-4 h-4 mx-auto mb-1 text-sky-400" />
                  <span className="block text-[11px] font-bold text-white">Ceo ekran</span>
                  <span className="text-[10px] text-slate-400">Kao prava app</span>
                </div>
                <div className="bg-[#112240] p-2.5 rounded-xl border border-slate-700">
                  <Download className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
                  <span className="block text-[11px] font-bold text-white">Brzo</span>
                  <span className="text-[10px] text-slate-400">Bez pretraživača</span>
                </div>
              </div>

              {/* Sekundarno dugme */}
              <div className="pt-1">
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                >
                  Nastavi u pregledaču
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
