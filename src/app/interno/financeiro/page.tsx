"use client";

import { TrendingUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FinanceiroPage() {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-12 animate-in fade-in">
      <header className="flex items-center gap-4 mb-12">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
          <TrendingUp className="w-10 h-10 text-blue-500" />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-slate-900">Área Restrita</h2>
          <p className="text-slate-500 text-sm leading-relaxed max-w-[280px]">
            Esta funcionalidade está disponível apenas para administradores do sistema.
          </p>
        </div>
        
        <div className="w-full mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-4 opacity-50 grayscale">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-12 bg-slate-200 rounded w-full"></div>
            <div className="h-12 bg-slate-200 rounded w-full"></div>
        </div>
      </main>

      <footer className="mt-auto text-center pt-12">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          TENISLAB · Sistema Interno
        </p>
      </footer>
    </div>
  );
}
