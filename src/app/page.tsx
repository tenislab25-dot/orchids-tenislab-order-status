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
        {/* Desktop: usa template longo */}
        <img 
          src="/tenislab-template.webp" 
          alt="TENISLAB Background" 
          className="hidden md:block absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        {/* Mobile: usa template curto */}
        <img 
          src="/tenislab-template-mobile.webp" 
          alt="TENISLAB Background Mobile" 
          className="block md:hidden absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />

        {/* DESKTOP: Contador e botões originais */}
        <div className="hidden md:block">
          {/* Contador de tênis - DESKTOP */}
          {processedCount !== null && (
            <div 
              className="responsive-counter flex flex-col items-center gap-0.5 bg-blue-600/90 backdrop-blur-sm rounded-lg shadow-md animate-in zoom-in duration-700"
              style={{
                position: 'absolute',
                left: '50%',
                top: '22%',
                transform: 'translateX(-50%)',
                width: '20%',
                minWidth: '180px',
                padding: '0.8% 1.5%'
              }}
            >
              <div className="flex items-center gap-1">
                <span className="counter-number text-sm font-bold text-white tracking-tight">
                  {displayCount}
                </span>
              </div>
              <p className="counter-text text-[7px] font-semibold text-white/90 uppercase tracking-[0.1em] text-center leading-tight">
                TÊNIS HIGIENIZADOS/RESTAURADOS
              </p>
            </div>
          )}

          {/* Botão "Consulte seu Pedido" - DESKTOP */}
          <Link
            href="/consulta"
            className="responsive-button button-text absolute bg-white hover:bg-gray-100 text-blue-600 font-bold text-[9px] uppercase tracking-[0.1em] rounded-lg shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center text-center"
            style={{
              left: '50%',
              top: '25%',
              transform: 'translateX(-50%)',
              width: '20%',
              minWidth: '180px',
              padding: '0.8% 1.5%'
            }}
          >
            CONSULTE SEU PEDIDO
          </Link>

          {/* Ícones - DESKTOP */}
          <a 
            href="https://wa.me/message/FNQNTD6CIDFMI1"
            target="_blank"
            rel="noopener noreferrer"
            className="icon-button"
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
              className="w-full h-full object-contain transition-transform hover:scale-110"
            />
          </a>

          <a 
            href="https://www.instagram.com/tenislabr?igsh=dWt4bHdvamx6MWt6&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            className="icon-button"
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
              className="w-full h-full object-contain transition-transform hover:scale-110"
            />
          </a>

          <a 
            href="https://maps.google.com/?q=TENISLAB+Maceio"
            target="_blank"
            rel="noopener noreferrer"
            className="icon-button"
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
              className="w-full h-full object-contain transition-transform hover:scale-110"
            />
          </a>

          {/* Tênis flutuante - DESKTOP */}
          <div 
            className="floating-sneaker"
            style={{
              position: 'absolute',
              left: '15%',
              top: '20%',
              width: '20%',
              maxWidth: '250px',
              zIndex: 10
            }}
          >
            <img 
              src="/yeezy-float.webp" 
              alt="Tênis Yeezy" 
              className="w-full h-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        {/* MOBILE: Design moderno customizado */}
        <div className="block md:hidden">
          {/* Contador - MOBILE (mais compacto, no topo) */}
          {processedCount !== null && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-3 rounded-2xl shadow-xl animate-in zoom-in duration-700"
              style={{ top: '27%' }}
            >
              <span className="text-3xl font-black text-white tracking-tight">
                {displayCount}
              </span>
              <p className="text-[10px] font-bold text-white/95 uppercase tracking-wider text-center">
                Tênis Restaurados/Higienizados
              </p>
            </div>
          )}

          {/* Botões - MOBILE (todos com mesmo estilo e espaçamento) */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col gap-4 w-[80%] max-w-[300px]" style={{ top: '35%' }}>
            <Link
              href="/consulta"
              className="bg-white text-blue-600 font-black text-sm uppercase tracking-wide px-8 py-4 rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center"
            >
              📦 Consulte seu Pedido
            </Link>

            <a 
              href="https://wa.me/message/FNQNTD6CIDFMI1"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-blue-600 font-black text-sm uppercase tracking-wide px-8 py-4 rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center"
            >
              💬 WhatsApp
            </a>

            <a 
              href="https://www.instagram.com/tenislabr?igsh=dWt4bHdvamx6MWt6&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-blue-600 font-black text-sm uppercase tracking-wide px-8 py-4 rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center"
            >
              📸 Instagram
            </a>

            <a 
              href="https://maps.google.com/?q=TENISLAB+Maceio"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-blue-600 font-black text-sm uppercase tracking-wide px-8 py-4 rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center"
            >
              📍 Localização
            </a>
          </div>

          {/* Tênis flutuante - MOBILE */}
          <div 
            className="floating-sneaker"
            style={{
              position: 'absolute',
              left: '-5%',
              top: '26%',
              width: '70%',
              maxWidth: '280px',
              zIndex: 10
            }}
          >
            <img 
              src="/yeezy-float.webp" 
              alt="Tênis Yeezy" 
              className="w-full h-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Botão "Acesso Restrito" - COMPARTILHADO (desktop e mobile) */}
        <Link
          href="/menu-principal"
          className="absolute bottom-[3.5%] left-0 right-0 text-center text-gray-600 hover:text-blue-600 text-xs font-medium transition-colors duration-300 w-full"
        >
          Acesso Restrito
        </Link>
      </div>

      {/* CSS customizado para responsividade */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(-5deg);
          }
          50% {
            transform: translateY(-20px) rotate(-5deg);
          }
        }

        .floating-sneaker {
          animation: float 3s ease-in-out infinite;
        }

        @media (min-width: 768px) {
          .counter-number {
            font-size: 1.2vw;
          }
          .counter-text {
            font-size: 0.6vw;
          }
          .button-text {
            font-size: 0.75vw;
          }
        }
        
        @media (min-width: 1024px) {
          .counter-number {
            font-size: 22px;
          }
          .counter-text {
            font-size: 12px;
          }
          .button-text {
            font-size: 16px;
          }
          .responsive-counter {
            width: 25% !important;
            min-width: 220px !important;
            padding: 1% 2% !important;
          }
          .responsive-button {
            width: 25% !important;
            min-width: 220px !important;
            padding: 1% 2% !important;
          }
        }
      `}</style>
    </div>
  );
}
