"use client";

import Link from "next/link";
import { Search, ShieldCheck, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-12 animate-in fade-in">
      {/* SECTION 1 — BRANDING */}
      <header className="flex flex-col items-center gap-2 mb-16">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold tracking-tighter text-slate-900">TENIS</span>
          <span className="text-5xl font-light tracking-tighter text-blue-500">LAB</span>
        </div>
        <p className="text-slate-500 text-base font-medium">Sneaker Laundry Service</p>
      </header>

      {/* SECTION 2 — MAIN ACTION (CLIENT) */}
      <main className="flex-1 flex flex-col gap-12">
        <section className="flex flex-col gap-4">
          <Link href="/status" className="w-full">
            <Button 
              className="w-full h-20 rounded-3xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Search className="w-6 h-6" />
              Consultar pedido
            </Button>
          </Link>
          <p className="text-center text-slate-500 text-sm px-4">
            Digite o número da sua OS para acompanhar o status do seu serviço.
          </p>
        </section>

        {/* SECTION 3 — CUSTOMER INFORMATION (PASSIVE) */}
        <section className="bg-blue-50/50 border border-blue-100 p-6 rounded-3xl flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
          </div>
          <p className="text-blue-700 text-sm leading-relaxed">
            Clientes recebem atualizações automáticas conforme o status do serviço.
          </p>
        </section>
      </main>

      {/* SECTION 4 — INTERNAL ACCESS (STAFF ONLY) */}
      <footer className="mt-auto flex flex-col items-center gap-8 pt-12">
        <Link href="/interno/dashboard">
          <Button 
            variant="ghost" 
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl px-6 h-10 text-xs font-bold uppercase tracking-widest flex gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            Acesso interno
          </Button>
        </Link>

        {/* SECTION 5 — FOOTER */}
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold text-center">
          © TENISLAB — Uso interno e atendimento ao cliente
        </p>
      </footer>
    </div>
  );
}
