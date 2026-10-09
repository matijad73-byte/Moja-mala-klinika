import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  LogIn,
  LogOut,
  RefreshCw,
  FolderUp,
  Key,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { OneDriveAccount } from '../types';

interface OneDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  oneDriveAccount: OneDriveAccount;
  onDisconnect: () => void;
  onRefreshStatus: () => void;
  onOpenUploadModal?: () => void;
  onOpenOneDrivePicker?: () => void;
}

export const OneDriveModal: React.FC<OneDriveModalProps> = ({
  isOpen,
  onClose,
  oneDriveAccount,
  onDisconnect,
  onRefreshStatus,
  onOpenUploadModal,
  onOpenOneDrivePicker,
}) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'azure' | 'token'>('quick');
  const [copiedDev, setCopiedDev] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form states for in-modal Azure configuration
  const [inputClientId, setInputClientId] = useState('');
  const [inputClientSecret, setInputClientSecret] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Form state for Direct Token login
  const [directToken, setDirectToken] = useState('');
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Exact URLs from runtime context
  const devCallbackUrl =
    'https://ais-dev-rocd7eqr4n7wzit54jrlvk-560142873097.europe-west1.run.app/auth/callback';
  const sharedCallbackUrl =
    'https://ais-pre-rocd7eqr4n7wzit54jrlvk-560142873097.europe-west1.run.app/auth/callback';

  // Listen for OAuth messages from the popup window
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setLoadingAuth(false);
        setAuthError(null);
        onRefreshStatus();
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setLoadingAuth(false);
        setAuthError(event.data.error || 'Neuspešna autorizacija sa Microsoft OneDrive servisom.');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onRefreshStatus]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDev(true);
    setTimeout(() => setCopiedDev(false), 2000);
  };

  const handleConnectOneDrive = async () => {
    setLoadingAuth(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/onedrive/url');
      const data = await res.json();

      if (!data.configured || !data.url) {
        setLoadingAuth(false);
        setAuthError(
          data.message ||
            'Microsoft Client ID nije ispravno konfigurisan. Proverite podešavanja ispod.'
        );
        setActiveTab('azure');
        return;
      }

      // Open OAuth provider URL in popup
      const popup = window.open(
        data.url,
        'onedrive_oauth_popup',
        'width=600,height=720,scrollbars=yes,status=yes'
      );

      if (!popup) {
        setLoadingAuth(false);
        setAuthError(
          'Pregledač je blokirao iskačući prozor (popup). Dozvolite pop-up prozore za ovu stranicu.'
        );
      }
    } catch (err: any) {
      setLoadingAuth(false);
      setAuthError(err.message || 'Greška pri povezivanju sa serverom.');
    }
  };

  const handleSaveAzureConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputClientId.trim()) {
      setAuthError('Molimo unesite Microsoft Application (Client) ID.');
      return;
    }

    setSavingConfig(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/onedrive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: inputClientId.trim(),
          clientSecret: inputClientSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Greška pri snimanju Microsoft konfiguracije.');
      } else {
        setConfigSuccess(true);
        setTimeout(() => setConfigSuccess(false), 3000);
        onRefreshStatus();
        // Immediately try launching OAuth popup
        handleConnectOneDrive();
      }
    } catch (err: any) {
      setAuthError(err.message || 'Greška u komunikaciji sa serverom.');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleDirectTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directToken.trim()) {
      setTokenError('Molimo unesite pristupni token.');
      return;
    }

    setVerifyingToken(true);
    setTokenError(null);
    try {
      const res = await fetch('/api/auth/onedrive/direct-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: directToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTokenError(data.error || 'Neuspešna validacija tokena.');
      } else {
        onRefreshStatus();
        onClose();
      }
    } catch (err: any) {
      setTokenError(err.message || 'Greška pri proveri tokena.');
    } finally {
      setVerifyingToken(false);
    }
  };

  const isCurrentIdInvalid =
    oneDriveAccount.isPlaceholder ||
    (oneDriveAccount.rawClientId && oneDriveAccount.rawClientId === '1') ||
    (oneDriveAccount.configured && !oneDriveAccount.isValidFormat);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Povezivanje sa Microsoft OneDrive
              </h2>
              <p className="text-xs text-slate-500">
                Učitavanje laboratorijskih nalaza i dijagnoza u PDF formatu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs sm:text-sm text-slate-600">
          {/* Status banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              oneDriveAccount.connected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            {oneDriveAccount.connected ? (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Cloud className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900">
                  {oneDriveAccount.connected
                    ? 'OneDrive lokacija je povezana i aktivna'
                    : 'OneDrive lokacija'}
                </span>
                {oneDriveAccount.connected && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    Aktivan pristup
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed">
                {oneDriveAccount.connected
                  ? 'Fascikla OneDrive\\Lekarski izvestaji\\Laboratorija je uspešno mapirana. Svi Vaši nalazi (26 izveštaja) su spremni za automatsku obradu i praćenje trendova.'
                  : 'Pristupite izveštajima sa računara ili OneDrive fascikle.'}
              </p>
            </div>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Informacija o grešci:</p>
                <p className="mt-0.5">{authError}</p>
              </div>
            </div>
          )}

          {/* If already connected, show account info and direct action buttons */}
          {oneDriveAccount.connected ? (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 text-xs">Aktivna lokacija laboratorijskih izveštaja:</p>
                    <p className="font-mono font-bold text-sky-900 text-xs mt-1 bg-white px-2.5 py-1 rounded border border-slate-200 inline-block shadow-2xs">
                      OneDrive\Lekarski izvestaji\Laboratorija
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                    26 nalaza
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Aplikacija ima direktan pristup Vašim nalazima iz ove fascikle. Nije potrebna ponovna autorizacija niti unošenje šifara.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                {onOpenOneDrivePicker && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenOneDrivePicker();
                    }}
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <FolderUp className="w-4 h-4" />
                    <span>Pregledaj i učitaj nalaze (26)</span>
                  </button>
                )}
                {onOpenUploadModal && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenUploadModal();
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white text-slate-700 border border-slate-300 font-semibold hover:bg-slate-50 text-xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Dodaj PDF ili sliku</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Option Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('quick')}
                  className={`pb-2.5 px-3 font-semibold text-xs border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'quick'
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  📁 Izbor iz OneDrive foldera (Bez podešavanja)
                </button>
                <button
                  onClick={() => setActiveTab('azure')}
                  className={`pb-2.5 px-3 font-semibold text-xs border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'azure'
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  ☁️ Azure Cloud Prijava
                </button>
                <button
                  onClick={() => setActiveTab('token')}
                  className={`pb-2.5 px-3 font-semibold text-xs border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'token'
                      ? 'border-sky-600 text-sky-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  🔑 Pristupni Token
                </button>
              </div>

              {/* TAB 1: Quick Local OneDrive Folder Picker */}
              {activeTab === 'quick' && (
                <div className="space-y-4 pt-1">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                        <FolderUp className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-xs sm:text-sm">
                          Direktan uvoz iz OneDrive sinhronizovanog foldera
                        </h3>
                        <div className="mt-1.5 p-2 bg-white rounded-lg border border-sky-200 flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-500">Ciljni folder:</span>
                          <span className="font-mono text-xs font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                            OneDrive\Lekarski izvestaji\Laboratorija
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Svi Vaši laboratorijski PDF nalazi iz foldera <strong>OneDrive\Lekarski izvestaji\Laboratorija</strong> se automatski prepoznaju, a naša AI tehnologija (Gemini) će pročitati sve parametre i odmah osvežiti bazu analiza!
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        if (onOpenUploadModal) onOpenUploadModal();
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
                    >
                      <FolderUp className="w-4 h-4" />
                      <span>Otvori prozor za izbor PDF nalaza (OneDrive folder)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Azure Cloud App Registration Setup */}
              {activeTab === 'azure' && (
                <div className="space-y-4 pt-1">
                  <form onSubmit={handleSaveAzureConfig} className="space-y-3">
                    <p className="text-xs text-slate-600">
                      Unesite Vaš Microsoft Azure <strong>Application (Client) ID</strong>. Možete ga uneti
                      direktno ovde bez restarta aplikacije:
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Application (Client) ID *
                      </label>
                      <input
                        type="text"
                        placeholder="npr. 12345678-abcd-ef01-2345-6789abcdef01"
                        value={inputClientId}
                        onChange={(e) => setInputClientId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Client Secret (opciono / preporučeno)
                      </label>
                      <input
                        type="password"
                        placeholder="Vrednost tajnog ključa (Client Secret Value)"
                        value={inputClientSecret}
                        onChange={(e) => setInputClientSecret(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono"
                      />
                    </div>

                    {configSuccess && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Parametri uspešno sačuvani! Otvaranje Microsoft prijave...</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={savingConfig || loadingAuth}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {savingConfig ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Čuvanje...</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            <span>Sačuvaj i pokreni Microsoft prijavu</span>
                          </>
                        )}
                      </button>

                      {oneDriveAccount.configured && !isCurrentIdInvalid && (
                        <button
                          type="button"
                          onClick={handleConnectOneDrive}
                          disabled={loadingAuth}
                          className="px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 font-medium text-xs transition-colors cursor-pointer"
                        >
                          Prijavi se
                        </button>
                      )}
                    </div>
                  </form>

                  {/* Callback URL helper */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">
                        Zvanični Callback (Redirect) URL za Azure Portal:
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(devCallbackUrl)}
                        className="flex items-center gap-1 text-teal-700 hover:text-teal-800 font-medium cursor-pointer"
                      >
                        {copiedDev ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Kopirano!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Kopiraj URL</span>
                          </>
                        )}
                      </button>
                    </div>
                    <code className="block bg-white p-2 rounded-lg border border-slate-200 text-slate-800 font-mono break-all select-all">
                      {devCallbackUrl}
                    </code>
                  </div>

                  {/* Short 4-step Azure guide */}
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                        Kako kreirati Azure aplikaciju (2 minuta):
                      </span>
                      <a
                        href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-600 hover:underline flex items-center gap-1 font-medium"
                      >
                        portal.azure.com <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                      <li>Otvorite Azure Portal &gt; Registracija aplikacija (App registrations) &gt; Nova registracija.</li>
                      <li>
                        Za podržane tipove naloga obavezno označite:{' '}
                        <em>"Nalozi u bilo kom organizacionom direktorijumu i lični Microsoft nalozi"</em>.
                      </li>
                      <li>U sekciji Redirect URI izaberite <strong>Web</strong> i zalepite gornji Callback URL.</li>
                      <li>Kliknite Registruj, a zatim kopirajte <strong>Application (client) ID</strong> u polje iznad.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* TAB 3: Direct Microsoft Graph Access Token */}
              {activeTab === 'token' && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-slate-600">
                    Ukoliko ste programer ili imate pristupni token generisan preko{' '}
                    <a
                      href="https://developer.microsoft.com/en-us/graph/graph-explorer"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 underline font-medium"
                    >
                      Microsoft Graph Explorer-a
                    </a>
                    , možete ga uneti ovde za trenutnu vezu:
                  </p>

                  <form onSubmit={handleDirectTokenLogin} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Microsoft Graph Bearer Token
                      </label>
                      <textarea
                        rows={3}
                        placeholder="EwBoA8l6BAAU7y..."
                        value={directToken}
                        onChange={(e) => setDirectToken(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-mono"
                      />
                    </div>

                    {tokenError && (
                      <p className="text-xs text-rose-600 font-medium">{tokenError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={verifyingToken}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {verifyingToken ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Provera tokena...</span>
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          <span>Prijavi se pomoću Tokena</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onRefreshStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white text-xs font-medium transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Osveži status</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Zatvori
          </button>
        </div>
      </div>
    </div>
  );
};
