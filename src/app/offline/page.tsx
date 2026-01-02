"use client";

import Image from "next/image";
import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-12 items-center justify-center">
      <header className="flex flex-col items-center gap-4 mb-8">
        <div className="relative w-48 h-36">
          <Image 
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=500&height=500&resize=contain" 
            alt="TENISLAB Logo" 
            fill
            priority
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        </div>
      </header>

      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-slate-400" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Você está offline</h1>
          <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
            Não foi possível conectar à internet. Verifique sua conexão e tente novamente.
          </p>
        </div>

        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Tentar novamente
        </button>

        <p className="text-slate-400 text-xs mt-8">
          Quando a conexão voltar, o app sincronizará automaticamente.
        </p>
      </div>

      <footer className="mt-auto pt-16 pb-8 text-center">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.3em] font-bold">
          tenislab. o laboratório do seu tênis
        </p>
      </footer>
    </div>
  );
}
