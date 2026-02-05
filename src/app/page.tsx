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
      {/* Container responsivo que mantém proporção 1200:3333 */}
      <div className="relative mx-auto w-full max-w-[1200px]" style={{ aspectRatio: '1200 / 3333' }}>
        {/* Background Image - Template responsivo */}
        <img 
          src="/tenislab-template.webp" 
          alt="TENISLAB Background" 
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />

        {/* Ícones com posição em porcentagem - BAIXADOS 3% */}
        {/* WhatsApp - Left: 46.11%, Top: 32.47% (era 29.47% + 3%) */}
        <a 
          href="https://wa.me/message/FNQNTD6CIDFMI1"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button"
          style={{
            position: 'absolute',
            left: '46.11%',
            top: '32.47%',
            width: '11.67%',
            height: 'auto',
            aspectRatio: '1 / 1'
          }}
        >
          <img 
            src="/icon-whatsapp-optimized.webp" 
            alt="WhatsApp" 
            className="w-full h-full object-contain"
          />
        </a>

        {/* Instagram - Left: 61.28%, Top: 30.64% (era 27.64% + 3%) */}
        <a 
          href="https://www.instagram.com/tenislabr?igsh=dWt4bHdvamx6MWt6&utm_source=qr"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button"
          style={{
            position: 'absolute',
            left: '61.28%',
            top: '30.64%',
            width: '11.67%',
            height: 'auto',
            aspectRatio: '1 / 1'
          }}
        >
          <img 
            src="/icon-instagram-optimized.webp" 
            alt="Instagram" 
            className="w-full h-full object-contain"
          />
        </a>

        {/* Localização - Left: 76.46%, Top: 28.81% (era 25.81% + 3%) */}
        <a 
          href="https://maps.google.com/?q=TENISLAB+Maceio"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button"
          style={{
            position: 'absolute',
            left: '76.46%',
            top: '28.81%',
            width: '11.67%',
            height: 'auto',
            aspectRatio: '1 / 1'
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
              top: '38%',
              transform: 'translateX(-50%)',
              width: 'auto',
              minWidth: '300px',
              maxWidth: '90%'
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
            bottom: '2%',
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
