"use client";

import { useState, useEffect, useCallback } from "react";

export function usePWA() {
  const [isPWA, setIsPWA] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const checkPWA = () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsPWA(standalone || isIOSStandalone);
    };

    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    checkPWA();
    checkDevice();

    window.addEventListener("resize", checkDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("resize", checkDevice);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setCanInstall(false);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const isMobileOrTablet = isMobile || isTablet;
  const shouldHideUyapSync = isMobileOrTablet || isPWA;

  return {
    isPWA,
    isMobile,
    isTablet,
    isMobileOrTablet,
    canInstall,
    install,
    shouldHideUyapSync,
  };
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}