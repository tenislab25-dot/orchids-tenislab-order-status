"use client";

import Link from "next/link";
import { 
  Search, 
  MessageCircle, 
  Instagram, 
  Lock,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionButtonProps {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  external?: boolean;
  variant?: "default" | "outline" | "secondary";
}

function ActionButton({ href, title, description, icon: Icon, external, variant = "default" }: ActionButtonProps) {
  const content = (
    <div className={`
      flex items-center gap-4 p-5 rounded-2xl transition-all active:scale-[0.98] w-full text-left
      ${variant === "default" ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : ""}
      ${variant === "outline" ? "bg-white border-2 border-slate-100 text-slate-900 hover:border-slate-200" : ""}
      ${variant === "secondary" ? "bg-slate-100 text-slate-700" : ""}
    `}>
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center shrink-0
        ${variant === "default" ? "bg-white/10" : "bg-slate-50"}
      `}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg leading-tight">{title}</h3>
        <p className={`text-sm ${variant === "default" ? "text-slate-400" : "text-slate-500"}`}>{description}</p>
      </div>
      <ChevronRight className={`w-5 h-5 opacity-30 ${variant === "default" ? "text-white" : "text-slate-400"}`} />
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block w-full">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block w-full">
      {content}
    </Link>
  );
}

export default function Home() {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* SECTION 1 — HEADER */}
      <header className="flex flex-col items-center gap-4 mb-12">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold tracking-tighter text-slate-900">TENIS</span>
          <span className="text-5xl font-light tracking-tighter text-blue-500">LAB</span>
        </div>
        <div className="h-px w-12 bg-slate-200" />
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
          Sneaker Laundry Service
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-10">
        {/* SECTION 2 — CUSTOMER ACTIONS */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1 text-center">
            <h2 className="text-xl font-bold text-slate-900">O que você precisa?</h2>
          </div>
          
          <div className="flex flex-col gap-3">
            <ActionButton 
              href="/consulta"
              title="Consultar Pedido"
              description="Acompanhe o status do seu serviço"
              icon={Search}
            />
            <ActionButton 
              href="https://wa.me/placeholder"
              title="Falar no WhatsApp"
              description="Atendimento direto pelo WhatsApp"
              icon={MessageCircle}
              variant="outline"
              external
            />
            <ActionButton 
              href="https://instagram.com/tenislab"
              title="Instagram"
              description="Veja nossos trabalhos e novidades"
              icon={Instagram}
              variant="outline"
              external
            />
          </div>
        </section>

        {/* SECTION 3 — ABOUT */}
        <section className="bg-slate-50/50 rounded-[2rem] p-8 text-center border border-slate-100">
          <p className="text-slate-600 text-sm leading-relaxed font-medium">
            Especialistas em higienização, pintura, costura e restauração de tênis.
          </p>
        </section>

        {/* SECTION 4 — INTERNAL ACCESS */}
        <section className="mt-4 pt-10 border-t border-slate-100">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Acesso Interno</h2>
              <p className="text-slate-400 text-[10px] uppercase font-bold">Área restrita para equipe TENISLAB.</p>
            </div>
            <Link href="/login" className="w-full">
              <Button 
                variant="ghost" 
                className="w-full h-12 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest"
              >
                <Lock className="w-3.5 h-3.5" />
                Acessar Sistema
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* SECTION 5 — FOOTER */}
      <footer className="mt-auto pt-16 text-center">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.3em] font-bold">
          TENISLAB · Sneaker Laundry Service
        </p>
      </footer>
    </div>
  );
}
