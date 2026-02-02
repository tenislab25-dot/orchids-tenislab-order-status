"use client";

import Link from "next/link";
import Image from "next/image";
import { logger } from "@/lib/logger";
import { 
  Search, 
  MessageCircle, 
  Instagram, 
  ArrowRight,
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
    <div className="group relative overflow-hidden flex items-center justify-between p-5 transition-all active:scale-[0.98] w-full text-left bg-white border-2 border-slate-900 hover:bg-slate-900 hover:text-white">
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 flex items-center justify-center shrink-0 bg-slate-900 group-hover:bg-white transition-colors">
          <Icon className="w-5 h-5 text-white group-hover:text-slate-900 transition-colors" />
        </div>
        <h3 className="font-black text-base uppercase tracking-wide leading-tight">{title}</h3>
      </div>
      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
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
    <div className="w-full min-h-screen bg-white">
      {/* HERO EDITORIAL */}
      <div className="relative w-full aspect-[9/16] md:aspect-[16/9] overflow-hidden">
        <Image 
          src="/assets/hero-editorial.png"
          alt="TENISLAB - Premium Sneaker Care"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-md mx-auto px-6 py-12">
        {/* STATS BADGE */}
        {processedCount !== null && (
          <div className="mb-12 animate-in fade-in duration-700">
            <div className="bg-blue-600 text-white p-6 relative overflow-hidden">
              {/* Geometric accent */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-black transform rotate-45 translate-x-12 -translate-y-12" />
              
              <div className="relative z-10">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-5xl font-black tracking-tighter">
                    {processedCount}+
                  </span>
                  <span className="text-sm font-bold uppercase tracking-wider">
                    Pares
                  </span>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-90">
                  Higienizados & Restaurados
                </p>
              </div>
            </div>
          </div>
        )}

        {/* COLLAGE SECTION */}
        <div className="mb-12 grid grid-cols-2 gap-4">
          <div className="relative aspect-square bg-slate-100 overflow-hidden">
            <Image 
              src="/assets/sneaker-detail-1.png"
              alt="Detalhe de qualidade"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black text-white p-3">
              <p className="text-[10px] font-black uppercase tracking-wider">
                Precisão
              </p>
            </div>
          </div>
          
          <div className="relative aspect-square bg-slate-100 overflow-hidden">
            <Image 
              src="/assets/sneaker-detail-2.png"
              alt="Resultado profissional"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white p-3">
              <p className="text-[10px] font-black uppercase tracking-wider">
                Qualidade
              </p>
            </div>
          </div>
        </div>

        {/* MANIFESTO */}
        <div className="mb-12 bg-slate-900 text-white p-8">
          <h2 className="text-3xl font-black uppercase leading-none mb-4">
            O LABORATÓRIO<br />DO SEU TÊNIS
          </h2>
          <p className="text-sm font-medium leading-relaxed opacity-90">
            Higienização técnica. Restauração profissional. 
            Cuidado especializado para seus sneakers.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col gap-3 mb-12">
          <ActionButton 
            href="/consulta"
            title="Consultar Pedido"
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
            title="Como Chegar"
            icon={MapPin}
            external
          />
        </div>

        {/* TRUST BLOCK */}
        <div className="mb-12 border-2 border-slate-900 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-600 shrink-0" />
            <div>
              <h3 className="text-lg font-black uppercase mb-2">
                Técnica Profissional
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Produtos especializados e processos certificados 
                para devolver a vida ao seu tênis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-md mx-auto px-6 text-center">
          <Link 
            href="/menu-principal/login"
            className="inline-block text-slate-400 text-xs uppercase tracking-[0.2em] font-bold hover:text-white transition-colors mb-8"
          >
            Acesso Restrito
          </Link>
          
          <div className="border-t border-white/10 pt-8">
            <p className="text-xs uppercase tracking-[0.3em] font-black mb-2">
              TENISLAB
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">
              O Laboratório do Seu Tênis © 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
