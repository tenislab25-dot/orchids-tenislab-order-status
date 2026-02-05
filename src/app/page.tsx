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
    <div className="relative w-full min-h-screen bg-gray-100 overflow-x-hidden">
      {/* Container centralizado com tamanho fixo 1200x3333 (igual Framer) */}
      <div className="relative mx-auto" style={{ width: '1200px', height: '3333px' }}>
        {/* Background Image - Template fixo */}
        <img 
          src="/tenislab-template.webp" 
          alt="TENISLAB Background" 
          className="absolute inset-0 w-full h-full object-cover"
          style={{ width: '1200px', height: '3333px' }}
          loading="eager"
        />

        {/* Ícones com posição absoluta (extraídos do Framer) */}
        {/* WhatsApp - Left: 553px, Top: 982px */}
        <a 
          href="https://wa.me/message/FNQNTD6CIDFMI1"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button"
          style={{
            position: 'absolute',
            left: '553px',
            top: '982px',
            width: '140px',
            height: '140px'
          }}
        >
          <img 
            src="/icon-whatsapp-optimized.webp" 
            alt="WhatsApp" 
            className="w-full h-full object-contain"
          />
        </a>

        {/* Instagram - Left: 735px, Top: 921px */}
        <a 
          href="https://www.instagram.com/tenislabr?igsh=dWt4bHdvamx6MWt6&utm_source=qr"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button"
          style={{
            position: 'absolute',
            left: '735px',
            top: '921px',
            width: '140px',
            height: '140px'
          }}
        >
          <img 
            src="/icon-instagram-optimized.webp" 
            alt="Instagram" 
            className="w-full h-full object-contain"
          />
        </a>

        {/* Localização - Left: 917px, Top: 860px */}
        <a 
          href="https://maps.google.com/?q=TENISLAB+Maceio"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button"
          style={{
            position: 'absolute',
            left: '917px',
            top: '860px',
            width: '140px',
            height: '140px'
          }}
        >
          <img 
            src="/icon-location-optimized.webp" 
            alt="Localização" 
            className="w-full h-full object-contain"
          />
        </a>

        {/* Contador de tênis - posicionado abaixo dos ícones */}
        {processedCount !== null && (
          <div 
            className="flex flex-col items-center gap-1 bg-slate-900/90 backdrop-blur-sm px-6 py-4 rounded-[2rem] shadow-xl animate-in zoom-in duration-700"
            style={{
              position: 'absolute',
              left: '50%',
              top: '1200px',
              transform: 'translateX(-50%)',
              width: 'auto',
              minWidth: '300px'
            }}
          >
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

        {/* Footer - no final do template */}
        <footer 
          className="text-center"
          style={{
            position: 'absolute',
            bottom: '40px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          <Link 
            href="/menu-principal/login"
            className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-bold hover:text-slate-600 transition-colors"
          >
            Acesso Restrito
          </Link>
        </footer>
      </div>

      {/* Estilos para efeito de botão (Hover e Press do Framer) */}
      <style jsx global>{`
        .icon-button {
          display: inline-block;
          transition: transform 0.2s ease-in-out, filter 0.2s ease-in-out;
          cursor: pointer;
        }

        .icon-button:hover {
          transform: scale(1.1);
          filter: drop-shadow(0 10px 20px rgba(0, 102, 255, 0.4));
        }

        .icon-button:active {
          transform: scale(0.9);
          filter: drop-shadow(0 5px 10px rgba(0, 102, 255, 0.6));
        }
      `}</style>
    </div>
  );
}
