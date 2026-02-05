"use client";

import Link from "next/link";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

export default function Home() {
  const [processedCount, setProcessedCount] = useState<number | null>(null);
  const [displayCount, setDisplayCount] = useState<number>(0);

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

  // Animação do contador: de 0 até o valor final
  useEffect(() => {
    if (processedCount === null) return;
    
    const duration = 2000; // 2 segundos
    const steps = 60;
    const increment = processedCount / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= processedCount) {
        setDisplayCount(processedCount);
        clearInterval(timer);
      } else {
        setDisplayCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [processedCount]);

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

        {/* Contador de tênis - RESPONSIVO */}
        {processedCount !== null && (
          <div 
            className="flex flex-col items-center gap-0.5 bg-blue-600/90 backdrop-blur-sm rounded-lg shadow-md animate-in zoom-in duration-700"
            style={{
              position: 'absolute',
              left: '50%',
              top: '22%',
              transform: 'translateX(-50%)',
              width: '15%',
              minWidth: '150px',
              padding: '0.8% 1.5%'
            }}
          >
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-white tracking-tight">
                {displayCount}
              </span>
            </div>
            <p className="text-[7px] font-semibold text-white/90 uppercase tracking-[0.1em] text-center leading-tight">
              TÊNIS HIGIENIZADOS/RESTAURADOS
            </p>
          </div>
        )}

        {/* Botão "Consulte seu Pedido" - BRANCO COM TEXTO AZUL + RESPONSIVO */}
        <Link
          href="/consultar-pedido"
          className="absolute bg-white hover:bg-gray-100 text-blue-600 font-bold text-[7px] uppercase tracking-[0.1em] rounded-lg shadow-md transition-all duration-300 hover:shadow-lg pulse-button flex items-center justify-center text-center"
          style={{
            left: '50%',
            top: '25%',
            transform: 'translateX(-50%)',
            width: '15%',
            minWidth: '150px',
            padding: '0.8% 1.5%'
          }}
        >
          CONSULTE SEU PEDIDO
        </Link>

        {/* Ícones com posição em porcentagem + ANIMAÇÃO DE PULSO */}
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

        {/* Footer - DESCIDO 1% (3.5%) e CENTRALIZADO */}
        <footer 
          className="text-center"
          style={{
            position: 'absolute',
            bottom: '3.5%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%'
          }}
        >
          <Link 
            href="/menu-principal/login"
            className="text-slate-500 text-[11px] uppercase tracking-[0.2em] font-bold hover:text-slate-700 transition-all duration-300 shadow-pulse"
          >
            Acesso Restrito
          </Link>
        </footer>
      </div>

      {/* Estilos para efeito de botão + ANIMAÇÕES */}
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

        /* Animação de pulso - cada botão com timing diferente */
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }

        .float-1 {
          animation: pulse 2s ease-in-out infinite;
        }

        .float-2 {
          animation: pulse 2.3s ease-in-out infinite;
          animation-delay: 0.3s;
        }

        .float-3 {
          animation: pulse 2.6s ease-in-out infinite;
          animation-delay: 0.6s;
        }

        /* Pausa a animação no hover para melhor UX */
        .icon-button:hover {
          animation-play-state: paused;
        }

        /* Animação de sombra para Acesso Restrito */
        @keyframes shadowPulse {
          0%, 100% {
            text-shadow: 0 0 0px rgba(100, 116, 139, 0);
          }
          50% {
            text-shadow: 0 0 8px rgba(100, 116, 139, 0.6);
          }
        }

        .shadow-pulse {
          animation: shadowPulse 2s ease-in-out infinite;
        }

        /* Animação de pulso para botão Consulte Pedido - preserva centralização */
        @keyframes pulseButton {
          0%, 100% {
            transform: translateX(-50%) scale(1);
          }
          50% {
            transform: translateX(-50%) scale(1.08);
          }
        }

        .pulse-button {
          animation: pulseButton 2.2s ease-in-out infinite;
          animation-delay: 0.4s;
        }

        .pulse-button:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
