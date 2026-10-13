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
    // 1. Check standalone mode (already launched from home screen icon)
    const checkIsStandalone = () => {
      if (typeof window === 'undefined') return false;
      const standaloneQuery = window.matchMedia('(display-mode: standalone)').matches;
      const navigatorStandalone =
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const androidAppReferrer = document.referrer.includes('android-app://');
      return standaloneQuery || navigatorStandalone || androidAppReferrer;
    };

    const standaloneActive = checkIsStandalone();
    setIsStandalone(standaloneActive);
    if (standaloneActive) {
      setIsInstalled(true);
    }

    // 2. Check device and browser type
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

    // 3. Check if window already holds deferred prompt
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
      if (typeof window !== 'undefined') {
        (window as any).__deferredPwaPrompt = null;
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Watch for standalone display mode changes
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

    // Poll during first 10 seconds to catch beforeinstallprompt as soon as Chromium fires it
    const pollInterval = setInterval(() => {
      if ((window as any).__deferredPwaPrompt) {
        setDeferredPrompt((prev) => prev || (window as any).__deferredPwaPrompt);
      }
    }, 300);
    const stopPollTimer = setTimeout(() => clearInterval(pollInterval), 10000);

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
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    // Immediate prompt from state or window global
    const promptToUse =
      deferredPrompt ||
      (typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt : null);

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

  const chromeIntentUrl =
    typeof window !== 'undefined'
      ? `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`
      : '#';

  return {
    isInstallable: Boolean(deferredPrompt || (typeof window !== 'undefined' && (window as any).__deferredPwaPrompt)),
    isInstalled,
    isStandalone,
    isAndroid,
    isIOS,
    isMobile,
    isInAppBrowser,
    isViber,
    chromeIntentUrl,
    install,
  };
}
