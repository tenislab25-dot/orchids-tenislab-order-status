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

        {/* Contador de tênis - MOVIDO para parte branca (após primeiro texto) */}
        {processedCount !== null && (
          <div 
            className="flex flex-col items-center gap-1 bg-blue-600/95 backdrop-blur-sm px-4 py-3 rounded-2xl shadow-lg animate-in zoom-in duration-700"
            style={{
              position: 'absolute',
              left: '50%',
              top: '14%',
              transform: 'translateX(-50%)',
              width: 'auto',
              minWidth: '280px',
              maxWidth: '90%'
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white tracking-tighter">
                {processedCount}
              </span>
            </div>
            <p className="text-[9px] font-bold text-white uppercase tracking-[0.15em] text-center leading-tight">
              PARES DE TÊNIS HIGIENIZADOS/RESTAURADOS
            </p>
          </div>
        )}

        {/* Botão "Consulte seu Pedido" - Logo abaixo do contador */}
        <Link
          href="/menu-principal/consultar-pedido"
          className="absolute bg-white hover:bg-gray-100 text-blue-600 font-bold text-sm px-6 py-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
          style={{
            left: '50%',
            top: '18%',
            transform: 'translateX(-50%)'
          }}
        >
          📦 CONSULTE SEU PEDIDO
        </Link>

        {/* Ícones com posição em porcentagem + ANIMAÇÃO FLUTUANTE */}
        {/* WhatsApp - Left: 46.11%, Top: 30.97% */}
        <a 
          href="https://wa.me/message/FNQNTD6CIDFMI1"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button float-1"
          style={{
            position: 'absolute',
            left: '46.11%',
            top: '30.97%',
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

        {/* Instagram - Left: 61.28%, Top: 29.14% */}
        <a 
          href="https://www.instagram.com/tenislabr?igsh=dWt4bHdvamx6MWt6&utm_source=qr"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button float-2"
          style={{
            position: 'absolute',
            left: '61.28%',
            top: '29.14%',
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

        {/* Localização - Left: 76.46%, Top: 27.31% */}
        <a 
          href="https://maps.google.com/?q=TENISLAB+Maceio"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button float-3"
          style={{
            position: 'absolute',
            left: '76.46%',
            top: '27.31%',
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

        {/* Footer - SUBIDO */}
        <footer 
          className="text-center"
          style={{
            position: 'absolute',
            bottom: '1%',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          <Link 
            href="/menu-principal/login"
            className="text-slate-500 text-[11px] uppercase tracking-[0.2em] font-bold hover:text-slate-700 transition-colors"
          >
            🔒 Acesso Restrito
          </Link>
        </footer>
      </div>

      {/* Estilos para efeito de botão + ANIMAÇÃO FLUTUANTE */}
      <style jsx global>{`
        .icon-button {
          display: inline-block;
          transition: transform 0.2s ease-in-out, filter 0.2s ease-in-out;
          cursor: pointer;
        }

        .icon-button:hover {
          transform: scale(1.15);
          filter: drop-shadow(0 10px 25px rgba(0, 102, 255, 0.5));
        }

        .icon-button:active {
          transform: scale(0.9);
          filter: drop-shadow(0 5px 15px rgba(0, 102, 255, 0.7));
        }

        /* Animação flutuante - cada botão com timing diferente */
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        .float-1 {
          animation: float 3s ease-in-out infinite;
        }

        .float-2 {
          animation: float 3.5s ease-in-out infinite;
          animation-delay: 0.5s;
        }

        .float-3 {
          animation: float 4s ease-in-out infinite;
          animation-delay: 1s;
        }

        /* Pausa a animação no hover para melhor UX */
        .icon-button:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
