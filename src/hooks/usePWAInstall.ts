import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && (window as any).__deferredPwaPrompt) {
      return (window as any).__deferredPwaPrompt;
    }
    return null;
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [isViber, setIsViber] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already launched from phone home screen)
    const checkIsStandalone = () => {
      const standaloneQuery = window.matchMedia('(display-mode: standalone)').matches;
      const navigatorStandalone =
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const androidAppReferrer = document.referrer.includes('android-app://');
      return standaloneQuery || navigatorStandalone || androidAppReferrer;
    };

    const standaloneActive = checkIsStandalone();
    setIsStandalone(standaloneActive);
    setIsInstalled(standaloneActive);

    // Check device and browser type
    const ua = window.navigator.userAgent.toLowerCase();
    const android = /android/.test(ua);
    const ios = /iphone|ipad|ipod/.test(ua);
    const viberDetected = /viber/i.test(ua);
    const inApp =
      viberDetected ||
      /fban|fbav|instagram|messenger|whatsapp|line|micromessenger|wv/.test(ua);
    const mobileScreen =
      window.innerWidth <= 768 || /mobile|tablet|android|iphone|ipad/.test(ua);

    setIsAndroid(android);
    setIsIOS(ios);
    setIsMobile(mobileScreen || android || ios);
    setIsInAppBrowser(inApp);
    setIsViber(viberDetected);

    // Check if early prompt was already saved on window
    if ((window as any).__deferredPwaPrompt) {
      setDeferredPrompt((window as any).__deferredPwaPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__deferredPwaPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handlePromptAvailable = () => {
      if ((window as any).__deferredPwaPrompt) {
        setDeferredPrompt((window as any).__deferredPwaPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).__deferredPwaPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Watch for display mode changes (e.g. user installs and launches)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsStandalone(true);
        setIsInstalled(true);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    // Periodic check during the first 6 seconds in case beforeinstallprompt fired before or during mount
    const pollInterval = setInterval(() => {
      if ((window as any).__deferredPwaPrompt && !deferredPrompt) {
        setDeferredPrompt((window as any).__deferredPwaPrompt);
      }
    }, 400);
    const stopPollTimer = setTimeout(() => clearInterval(pollInterval), 6000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(stopPollTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, [deferredPrompt]);

  const install = useCallback(async (): Promise<boolean> => {
    // 1. Try immediate prompt from React state or window global
    let promptToUse = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt : null);

    // 2. If prompt hasn't arrived yet (e.g. user clicked right after load), wait up to 1500ms
    if (!promptToUse && typeof window !== 'undefined') {
      for (let i = 0; i < 15; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if ((window as any).__deferredPwaPrompt) {
          promptToUse = (window as any).__deferredPwaPrompt;
          setDeferredPrompt(promptToUse);
          break;
        }
      }
    }

    if (promptToUse && typeof promptToUse.prompt === 'function') {
      try {
        await promptToUse.prompt();
        const choice = await promptToUse.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') {
            (window as any).__deferredPwaPrompt = null;
          }
          return true;
        }
      } catch (err) {
        console.warn('Install prompt execution failed:', err);
      }
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: Boolean(deferredPrompt || (typeof window !== 'undefined' && (window as any).__deferredPwaPrompt)),
    isInstalled,
    isStandalone,
    isAndroid,
    isIOS,
    isMobile,
    isInAppBrowser,
    isViber,
    install,
  };
}
