import React from 'react';
import {
  Activity,
  Cloud,
  FolderSync,
  Sparkles,
  Database,
  RotateCcw,
  Smartphone,
} from 'lucide-react';
import { OneDriveAccount } from '../types';

interface HeaderProps {
  oneDriveAccount: OneDriveAccount;
  onOpenOneDriveModal: () => void;
  onOpenLoadMenu?: () => void;
  onLoadSamples: () => void;
  reportCount: number;
  parameterCount: number;
  abnormalCount: number;
  isHomeView?: boolean;
  onOpenInstallModal?: () => void;
  isInstalled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  oneDriveAccount,
  onOpenOneDriveModal,
  onOpenLoadMenu,
  onLoadSamples,
  reportCount,
  parameterCount,
  abnormalCount,
  isHomeView = false,
  onOpenInstallModal,
  isInstalled = false,
}) => {
  return (
    <header
      className="sticky top-0 z-30 transition-colors bg-[#0a192f] border-b border-slate-800 shadow-sm"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-3">
          {/* Brand & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Moja mala klinika
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-teal-950/60 text-teal-300 border-teal-800">
                  <Sparkles className="w-3 h-3 text-teal-500" />
                  Medicinski Nalazi
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                Praćenje zdravstvenih trendova i laboratorijskih parametara kroz vreme
              </p>
            </div>
          </div>

          {/* Right Controls: OneDrive Status & Stats */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Stats Pill */}
            {reportCount > 0 && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border bg-[#112240] border-slate-700 text-slate-300">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    <strong className="text-white">
                      {reportCount}
                    </strong>{' '}
                    nalaza (svi analizirani)
                  </span>
                </div>
                <span className="text-slate-400">•</span>
                <span>
                  <strong className="text-white">
                    {parameterCount}
                  </strong>{' '}
                  parametara u bazi
                </span>
                {abnormalCount > 0 && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-amber-400 bg-amber-950/50 border border-amber-800/60 px-1.5 py-0.5 rounded-md text-[11px]">
                      {abnormalCount} van granica
                    </span>
                  </>
                )}
              </div>
            )}

            {/* OneDrive Account Button */}
            <button
              id="header-onedrive-status-btn"
              onClick={onOpenOneDriveModal}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer bg-sky-950/60 text-sky-300 border-sky-800 hover:bg-sky-900/60"
              title={oneDriveAccount.connected ? 'OneDrive nalog je povezan' : 'OneDrive nalog'}
            >
              <Cloud className="w-4 h-4 text-sky-400 fill-sky-400/20" />
              <span className="hidden sm:inline">OneDrive</span>
            </button>

            {/* Install on phone button - shown only if not installed */}
            {!isInstalled && onOpenInstallModal && (
              <button
                id="header-install-app-btn"
                onClick={onOpenInstallModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs bg-teal-600 hover:bg-teal-500 text-white border-teal-500"
                title="Instalirajte aplikaciju na telefon"
              >
                <Smartphone className="w-4 h-4 text-teal-200" />
                <span className="hidden sm:inline">Instaliraj na telefon</span>
                <span className="sm:hidden">Instaliraj</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
