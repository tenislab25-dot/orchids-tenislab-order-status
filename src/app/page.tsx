"use client";

import Link from "next/link";
import { logger } from "@/lib/logger";
import { 
  Search, 
  MessageCircle, 
  Instagram, 
  ChevronRight,
  MapPin
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

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
  const [processedCount, setProcessedCount] = useState<number | null>(null);

    useEffect(() => {
      async function fetchCount() {
        try {
          // Fetch only necessary data
          const { data, error } = await supabase
            .from("service_orders")
            .select("items")
            .eq("status", "Entregue");
    
          if (error) throw error;
          
            const totalSneakers = data?.reduce((acc, order: any) => {
              const itemCount = Array.isArray(order.items) ? order.items.length : 0;
              return acc + itemCount;
            }, 0) || 0;
            
            setProcessedCount(totalSneakers + 480);
        } catch (err) {
          logger.error("Error fetching count:", err);
          setProcessedCount(480);
        }
      }
      fetchCount();
    }, []);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* SECTION 1 — BRAND / HEADER */}
          <header className="flex flex-col items-center gap-1 mb-8">
            <div className="relative w-64 h-48">
              <img src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/logo-1766879913032.PNG" 
                alt="TENISLAB Logo"className="w-full h-full object-contain" loading="eager" />
            </div>

          {processedCount !== null && (
            <div className="flex flex-col items-center gap-1 bg-slate-900 px-6 py-4 rounded-[2rem] shadow-xl shadow-slate-200 border border-white/10 animate-in zoom-in duration-700">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-white tracking-tighter">
                  {processedCount}
                </span>
              </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center leading-tight">
                  PARES DE TÊNIS HIGIENIZADOS/RESTAURADOS
                </p>
            </div>
          )}
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
        <Link 
          href="/interno/login"
          className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-bold hover:text-slate-600 transition-colors mb-2"
        >
          Acesso Restrito
        </Link>
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.3em] font-bold">
          tenislab. o laboratório do seu tênis
        </p>
      </footer>
    </div>
  );
}
