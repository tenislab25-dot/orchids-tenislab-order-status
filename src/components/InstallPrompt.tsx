"use client";

import { useState, useEffect } from "react";
import { Download, X, Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const { isSupported, permission, requestPermission, subscribe } = usePushNotifications();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      setIsInstalled(isStandalone);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      await subscribe();
    }
  };

  if (isInstalled && permission === "granted") {
    return null;
  }

  if (!showPrompt && !isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-4 space-y-3">
        {!isInstalled && deferredPrompt && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">Instalar App</h3>
              <p className="text-xs text-slate-500 mb-2">Acesse mais rápido direto da tela inicial</p>
              <div className="flex gap-2">
                <button 
                  onClick={handleInstall}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg"
                >
                  Instalar
                </button>
                <button 
                  onClick={handleDismiss}
                  className="px-4 py-2 text-slate-500 text-sm font-medium"
                >
                  Depois
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {isSupported && permission === "default" && (
          <div className="flex items-start gap-3 pt-3 border-t border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">Ativar Notificações</h3>
              <p className="text-xs text-slate-500 mb-2">Receba atualizações sobre seu pedido</p>
              <button 
                onClick={handleEnableNotifications}
                className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg"
              >
                Ativar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
