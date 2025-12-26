"use client";

import Link from "next/link";
import Image from "next/image";
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
      <header className="flex flex-col items-center gap-6 mb-16">
        <div className="relative w-48 h-24">
          <Image 
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/IMG_8882-1766752404200.PNG?width=8000&height=8000&resize=contain"
            alt="TENISLAB Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="h-px w-12 bg-slate-200" />
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
          O laboratório do seu tênis
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
              href="https://wa.me/message/FNQNTD6CIDFMI1"
              title="Falar no WhatsApp"
              icon={MessageCircle}
              external
            />
          <ActionButton 
            href="https://www.instagram.com/tenislabr?igsh=dWt4bHdvamx6MWt6&utm_source=qr"
            title="Instagram"
            icon={Instagram}
            external
          />
          <ActionButton 
            href="https://maps.google.com/?q=TENISLAB+Maceio"
            title="Como chegar"
            icon={MapPin}
            external
          />
        </section>

        {/* SECTION 3 — SUPPORT TEXT */}
        <section className="px-4 text-center flex flex-col gap-4">
          <p className="text-slate-500 text-sm leading-relaxed">
            Acompanhe seu pedido ou fale conosco para mais informações.
          </p>
        </section>
      </main>

      {/* SECTION 7 — FOOTER */}
      <footer className="mt-auto pt-16 pb-8 text-center flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-slate-500 font-medium text-sm">
          <span>82 99943-8997</span>
          <span>@tenislabr</span>
        </div>
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.3em] font-bold">
          © 2025 TENISLAB · O laboratório do seu tênis
        </p>
      </footer>
    </div>
  );
}
