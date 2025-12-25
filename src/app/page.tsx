"use client";

import Link from "next/link";
import { 
  PlusCircle, 
  LayoutDashboard, 
  Wallet, 
  Wrench, 
  Search,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

function NavCard({ href, title, description, icon: Icon, adminOnly }: NavCardProps) {
  return (
    <Link href={href} className="block group">
      <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md active:scale-[0.98] flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
            <Icon className="w-6 h-6 text-slate-600 group-hover:text-blue-500 transition-colors" />
          </div>
          {adminOnly && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
              Admin
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{title}</h3>
          <p className="text-slate-500 text-xs leading-relaxed">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-12 animate-in fade-in">
      {/* SECTION 1 — HEADER */}
      <header className="flex flex-col items-center gap-3 mb-12">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold tracking-tighter text-slate-900">TENIS</span>
          <span className="text-5xl font-light tracking-tighter text-blue-500">LAB</span>
        </div>
        <p className="text-slate-500 text-sm font-semibold text-center leading-relaxed">
          Sistema interno de gestão de ordens de serviço
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-12">
        {/* SECTION 2 — INTERNAL ACCESS */}
        <section className="flex flex-col gap-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Acesso Interno</h2>
          <div className="grid grid-cols-1 gap-4">
            <NavCard 
              href="/interno/os"
              title="Nova Ordem de Serviço"
              description="Criar uma nova OS para atendimento ao cliente"
              icon={PlusCircle}
            />
            <NavCard 
              href="/interno/dashboard"
              title="Dashboard Interno"
              description="Gerenciar ordens de serviço em andamento"
              icon={LayoutDashboard}
            />
            <NavCard 
              href="/interno/financeiro"
              title="Financeiro"
              description="Visualizar caixa e projeções"
              icon={Wallet}
              adminOnly
            />
            <NavCard 
              href="/interno/servicos"
              title="Serviços"
              description="Gerenciar catálogo de serviços"
              icon={Wrench}
            />
          </div>
        </section>

        {/* SECTION 3 — CUSTOMER ACCESS */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Área do Cliente</h2>
          <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-[2.5rem] flex flex-col gap-4">
            <p className="text-blue-700/80 text-sm font-medium text-center">
              Área exclusiva para clientes acompanharem o status do serviço.
            </p>
            <Link href="/consulta">
              <Button 
                className="w-full h-16 rounded-[2rem] bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-lg shadow-blue-900/10 flex items-center justify-center gap-3"
              >
                <Search className="w-5 h-5" />
                Consultar Pedido
                <ChevronRight className="w-4 h-4 opacity-50" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* SECTION 4 — FOOTER */}
      <footer className="mt-auto pt-16 text-center">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          TENISLAB · Sistema Interno
        </p>
      </footer>
    </div>
  );
}

interface NavCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}
