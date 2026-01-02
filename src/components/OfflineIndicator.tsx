"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from "lucide-react";

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingCount } = useOfflineSync();

  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      {!isOnline ? (
        <div className="flex items-center gap-3 bg-amber-500 text-white px-4 py-3 rounded-xl shadow-lg">
          <WifiOff className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Você está offline</p>
            <p className="text-xs opacity-90">As alterações serão salvas quando a internet voltar</p>
          </div>
        </div>
      ) : isSyncing ? (
        <div className="flex items-center gap-3 bg-blue-500 text-white px-4 py-3 rounded-xl shadow-lg">
          <RefreshCw className="w-5 h-5 shrink-0 animate-spin" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Sincronizando...</p>
            <p className="text-xs opacity-90">Enviando {pendingCount} alterações pendentes</p>
          </div>
        </div>
      ) : pendingCount > 0 ? (
        <div className="flex items-center gap-3 bg-slate-700 text-white px-4 py-3 rounded-xl shadow-lg">
          <CloudOff className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">{pendingCount} alterações pendentes</p>
            <p className="text-xs opacity-90">Aguardando conexão estável</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
