"use client";

import Link from "next/link";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

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
    <div className="relative w-full min-h-screen">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img 
          src="/tenislab-bg.webp" 
          alt="TENISLAB Background" 
          className="w-full h-full object-cover object-top"
          loading="eager"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-12">
        {/* Espaço para o topo do template (logo + texto + "CONSULTE SEU PEDIDO") */}
        <div className="h-[280px]"></div>

        {/* Botão "Consulte seu pedido" */}
        <Link 
          href="/consulta"
          className="block w-full mb-6"
        >
          <div className="flex items-center justify-center gap-3 p-4 rounded-xl transition-all hover:scale-105 active:scale-95 bg-white/90 backdrop-blur-sm border-2 border-blue-600 shadow-lg">
            <span className="text-slate-700 font-bold text-base uppercase tracking-wider">
              Consulte seu pedido
            </span>
          </div>
        </Link>

        {/* Espaço até a diagonal azul */}
        <div className="h-[140px]"></div>

        {/* Ícones circulares na diagonal azul */}
        <div className="relative flex items-center justify-center gap-8 mb-8" style={{transform: 'rotate(-12deg)'}}>
          {/* WhatsApp */}
          <a 
            href="https://wa.me/message/FNQNTD6CIDFMI1"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-all hover:scale-110 hover:drop-shadow-2xl active:scale-95"
          >
            <img 
              src="/icon-whatsapp.webp" 
              alt="WhatsApp" 
              className="w-20 h-20 object-contain"
            />
          </a>

          {/* Instagram */}
          <a 
            href="https://www.instagram.com/tenislabr?igsh=dWt4bHdvamx6MWt6&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-all hover:scale-110 hover:drop-shadow-2xl active:scale-95"
          >
            <img 
              src="/icon-instagram.webp" 
              alt="Instagram" 
              className="w-20 h-20 object-contain"
            />
          </a>

          {/* Localização */}
          <a 
            href="https://maps.google.com/?q=TENISLAB+Maceio"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-all hover:scale-110 hover:drop-shadow-2xl active:scale-95"
          >
            <img 
              src="/icon-location.webp" 
              alt="Localização" 
              className="w-20 h-20 object-contain"
            />
          </a>
        </div>

        {/* Contador de tênis */}
        {processedCount !== null && (
          <div className="flex flex-col items-center gap-1 bg-slate-900/90 backdrop-blur-sm px-6 py-4 rounded-[2rem] shadow-xl mb-8 animate-in zoom-in duration-700">
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

        {/* Espaço para o resto do template (textos + fotos + TENISLAB vertical) */}
        <div className="flex-1 min-h-[1400px]"></div>

        {/* Footer */}
        <footer className="mt-auto pt-8 pb-8 text-center flex flex-col gap-4">
          <Link 
            href="/menu-principal/login"
            className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-bold hover:text-slate-600 transition-colors mb-2"
          >
            Acesso Restrito
          </Link>
        </footer>
      </div>
    </div>
  );
}
