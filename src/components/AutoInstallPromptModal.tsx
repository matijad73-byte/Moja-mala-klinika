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
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
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
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  // Auto-open on mobile / in-app browser unless already installed as standalone PWA
  useEffect(() => {
    if (isStandalone) {
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed') === 'true';
      if (!isDismissed || forceOpen) {
        setIsOpen(true);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [isStandalone, forceOpen, isMobile, isInAppBrowser, isViber]);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setInstalledSuccess(false);
      setIsInstalling(false);
    }
  }, [forceOpen]);

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
    setIsInstalling(true);
    try {
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
    } catch (err) {
      console.warn('Install error:', err);
    } finally {
      setIsInstalling(false);
    }

    // If native prompt was not yet fired or supported in this browser
    if (isViber || isInAppBrowser) {
      if (onNotify) onNotify('Ugrađeni pregledač blokira instalaciju. Otvorite u Google Chrome-u.');
    } else if (isIOS) {
      setShowManualGuide(true);
      if (onNotify) onNotify('Dodirnite dugme Deli u Safariju, pa „Dodaj na početni ekran”.');
    } else {
      setShowManualGuide(true);
      if (onNotify) onNotify('Potvrdite instalaciju u Chrome-u (ili izaberite „Instaliraj aplikaciju” u meniju).');
    }
  };

  const handleCopyLink = async () => {
    try {
      if (typeof window !== 'undefined') {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        if (onNotify) onNotify('Link aplikacije je kopiran u privremenu memoriju!');
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch {
      // Fallback
    }
  };

  // Android Chrome Intent URL to jump directly out of Viber/Facebook/WhatsApp into Google Chrome
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
                Moja mala klinika – Brz pristup sa početnog ekrana telefona
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {installedSuccess ? (
            <div className="p-5 bg-emerald-950/80 border-2 border-emerald-500 rounded-2xl flex items-center gap-3.5 text-emerald-200 text-xs shadow-lg animate-in zoom-in-95">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <strong className="block text-base text-white font-black mb-1">
                  Aplikacija je uspešno instalirana!
                </strong>
                <span className="text-xs text-emerald-200 leading-relaxed">
                  Ikonica je postavljena na Vaš početni ekran. Sada možete otvarati aplikaciju direktno sa telefona jednim dodirom, kao i svaku drugu aplikaciju.
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* UPOZORENJE I POMOĆ AKO JE OTVORENO IZ VIBERA / IN-APP PREGLEDAČA */}
              {(isViber || isInAppBrowser) && (
                <div className="p-4 bg-amber-950/40 border-2 border-amber-500/80 rounded-2xl text-amber-200 text-xs space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>Otvorili ste link iz Vibera ili chat aplikacije</span>
                  </div>
                  <p className="text-amber-200 leading-relaxed">
                    Ugrađeni pregledač u Viberu blokira instalaciju. Da biste instalirali aplikaciju jednim dodirom, pređite u <strong>Google Chrome</strong>.
                  </p>

                  {/* Dugme za direktan prelazak u Chrome na Androidu */}
                  {isAndroid && (
                    <a
                      href={chromeIntentUrl}
                      className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition-colors text-center cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-950" />
                      <span>Otvori u Google Chrome pregledaču</span>
                    </a>
                  )}

                  <div className="font-semibold text-amber-200 bg-amber-900/50 p-2.5 rounded-xl border border-amber-700/60 flex items-start gap-2">
                    <MoreVertical className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Ili u Viberu dodirnite tri tačkice u gornjem desnom uglu <strong>(⋮)</strong> i izaberite <strong>„Otvori u Chrome-u”</strong> (Open in Chrome).
                    </span>
                  </div>
                </div>
              )}

              {/* GLAVNO DUGME ZA INSTALACIJU – UVEK VIDLJIVO I PROMINENTNO */}
              <div className="space-y-2">
                <button
                  id="modal-btn-install-phone"
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-400 active:scale-[0.99] text-slate-950 font-black text-base flex flex-col items-center justify-center gap-1 shadow-xl shadow-teal-500/25 transition-all cursor-pointer group disabled:opacity-75"
                >
                  <div className="flex items-center gap-2.5">
                    {isInstalling ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-slate-950" />
                    ) : (
                      <Download className="w-6 h-6 text-slate-950 group-hover:scale-110 transition-transform" />
                    )}
                    <span className="text-base font-black tracking-tight">
                      {isInstalling ? 'Povezivanje sa pregledačem...' : 'Instaliraj na telefon'}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-950/80">
                    Jedan dodir – direktna instalacija na početni ekran
                  </span>
                </button>

                <p className="text-[11px] text-center text-slate-400">
                  Nema potrebe za ručnim odlaskom u meni pregledača – pritisnite dugme iznad.
                </p>
              </div>

              {/* KORISNO DUGME ZA KOPIRANJE LINKA / OTVARANJE */}
              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Link je kopiran!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>Kopiraj link aplikacije</span>
                    </>
                  )}
                </button>

                {isAndroid && !isInAppBrowser && (
                  <a
                    href={chromeIntentUrl}
                    className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Otvara u aplikaciji Chrome"
                  >
                    <ExternalLink className="w-4 h-4 text-teal-300" />
                    <span>Chrome</span>
                  </a>
                )}
              </div>

              {/* OPACIONO / SKLOPIVO UPUTSTVO ZA RUČNI UNOS (AKO PREGLEDAČ TRAŽI POTVRDU) */}
              <div className="pt-1">
                <button
                  onClick={() => setShowManualGuide(!showManualGuide)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer border border-slate-800"
                >
                  <span className="flex items-center gap-1.5">
                    <MoreVertical className="w-3.5 h-3.5 text-teal-400" />
                    <span>Pomoć i ručni koraci ako pregledač traži meni</span>
                  </span>
                  {showManualGuide ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {showManualGuide && (
                  <div className="mt-2.5 bg-[#112240] border border-slate-700 p-4 rounded-2xl space-y-3 text-xs text-slate-300 animate-in fade-in duration-150">
                    {!isIOS ? (
                      <div className="space-y-2.5">
                        <div className="font-bold text-white text-xs flex items-center gap-2">
                          <MoreVertical className="w-4 h-4 text-teal-400" />
                          <span>Koraci u Google Chrome meni pregledaču:</span>
                        </div>
                        <ol className="space-y-2 text-slate-300 pl-1">
                          <li className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-teal-950 border border-teal-800 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                              1
                            </span>
                            <span>
                              Dodirnite meni sa tri tačkice u gornjem desnom uglu <strong>(⋮)</strong> u Chrome-u.
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-teal-950 border border-teal-800 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                              2
                            </span>
                            <span>
                              Izaberite opciju <strong>„Instaliraj aplikaciju”</strong> (ili „Dodaj na početni ekran”).
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-teal-950 border border-teal-800 text-teal-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                              3
                            </span>
                            <span>
                              Potvrdite dodirom na <strong>„Instaliraj”</strong>.
                            </span>
                          </li>
                        </ol>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="font-bold text-amber-300 text-xs flex items-center gap-2">
                          <Compass className="w-4 h-4 text-amber-400" />
                          <span>Uputstvo za iPhone / iPad (Safari):</span>
                        </div>
                        <ol className="space-y-2 text-slate-300 pl-1">
                          <li className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                              1
                            </span>
                            <span>
                              Dodirnite ikonu <strong>„Deli”</strong> (kvadrat sa strelicom 📤 na donjoj traci Safarija).
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                              2
                            </span>
                            <span>
                              Izaberite opciju <PlusSquare className="inline w-3.5 h-3.5 text-amber-300 mb-0.5" /> <strong>„Dodaj na početni ekran”</strong> (Add to Home Screen).
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-4 h-4 rounded-full bg-amber-950 border border-amber-800 text-amber-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                              3
                            </span>
                            <span>
                              U gornjem desnom uglu pritisnite <strong>„Dodaj”</strong> (Add).
                            </span>
                          </li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3 Prednosti instalacije */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-[#112240] p-2.5 rounded-xl border border-slate-700/80">
                  <Sparkles className="w-4 h-4 mx-auto mb-1 text-teal-400" />
                  <span className="block text-[11px] font-bold text-white">1-Dodir</span>
                  <span className="text-[10px] text-slate-400">Sa ekrana</span>
                </div>
                <div className="bg-[#112240] p-2.5 rounded-xl border border-slate-700/80">
                  <Smartphone className="w-4 h-4 mx-auto mb-1 text-sky-400" />
                  <span className="block text-[11px] font-bold text-white">Ceo ekran</span>
                  <span className="text-[10px] text-slate-400">Kao prava app</span>
                </div>
                <div className="bg-[#112240] p-2.5 rounded-xl border border-slate-700/80">
                  <Download className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                  <span className="block text-[11px] font-bold text-white">Brzo</span>
                  <span className="text-[10px] text-slate-400">Bez kucanja adrese</span>
                </div>
              </div>

              {/* Sekundarno dugme za zatvaranje */}
              <div className="pt-1">
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
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
