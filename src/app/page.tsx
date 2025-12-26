"use client";

import Link from "next/link";
import { 
  Search, 
  MessageCircle, 
  Instagram, 
  ChevronRight,
  MapPin
} from "lucide-react";

interface ActionButtonProps {
  href: string;
  title: string;
  icon: React.ElementType;
  external?: boolean;
}

function ActionButton({ href, title, icon: Icon, external }: ActionButtonProps) {
  const content = (
    <div className="flex items-center gap-4 p-6 rounded-2xl transition-all active:scale-[0.98] w-full text-left bg-slate-900 text-white shadow-lg shadow-slate-200">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-white/10">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg leading-tight">{title}</h3>
      </div>
      <ChevronRight className="w-5 h-5 opacity-30 text-white" />
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
    <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* SECTION 1 — BRAND / HEADER */}
      <header className="flex flex-col items-center gap-4 mb-16">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold tracking-tighter text-slate-900">TENIS</span>
          <span className="text-5xl font-light tracking-tighter text-blue-500">LAB</span>
        </div>
        <div className="h-px w-12 bg-slate-200" />
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
          Sneaker Laundry Service
        </p>
      </header>

      <main className="flex-1 flex flex-col gap-12">
        {/* SECTION 2 — MAIN CUSTOMER ACTIONS */}
        <section className="flex flex-col gap-4">
          <ActionButton 
            href="/consulta"
            title="Consultar pedido"
            icon={Search}
          />
          <ActionButton 
            href="https://wa.me/55XXXXXXXXXX"
            title="Falar no WhatsApp"
            icon={MessageCircle}
            external
          />
          <ActionButton 
            href="https://instagram.com/tenislab"
            title="Instagram"
            icon={Instagram}
            external
          />
          <ActionButton 
            href="https://maps.google.com/?q=TENISLAB+Maceio"
            title="Como chegar (Maps)"
            icon={MapPin}
            external
          />
        </section>

        {/* SECTION 3 — SUPPORT TEXT */}
        <section className="px-4 text-center flex flex-col gap-4">
          <p className="text-slate-500 text-sm leading-relaxed">
            Acompanhe seu pedido ou fale conosco para mais informações.
          </p>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nosso Endereço</span>
            <p className="text-slate-600 text-sm font-medium">
              Rua Prof. Sandoval Arroxelas, 810<br />
              Ponta Verde, Maceió - AL
            </p>
          </div>
        </section>
      </main>

      {/* SECTION 7 — FOOTER */}
      <footer className="mt-auto pt-16 text-center">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.3em] font-bold">
          TENISLAB · Sneaker Laundry Service
        </p>
      </footer>
    </div>
  );
}
