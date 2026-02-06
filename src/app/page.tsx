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
      {/* Container DESKTOP com aspectRatio fixo */}
      <div className="hidden md:block relative mx-auto w-full max-w-[1200px]" style={{ aspectRatio: '1200 / 3333' }}>
        <img 
          src="/tenislab-template.webp" 
          alt="TENISLAB Background" 
          className="w-full h-auto"
          loading="eager"
        />
        <div className="absolute inset-0">

        {/* DESKTOP: Contador e botões originais */}
        <div className="hidden md:block">
          {/* Contador de tênis - DESKTOP */}
          {processedCount !== null && (
            <div 
              className="responsive-counter flex flex-col items-center gap-0.5 bg-blue-600/90 backdrop-blur-sm rounded-lg shadow-md animate-in zoom-in duration-700"
              style={{
                position: 'absolute',
                left: '50%',
                top: '32%',
                transform: 'translateX(-50%)',
                width: '46.8%',
                minWidth: '421px',
                padding: '1% 1.8%'
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
            className="absolute bg-white text-blue-600 font-black text-xs uppercase tracking-wide rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center flex items-center justify-center"
            style={{
              left: '50%',
              top: '35%',
              transform: 'translateX(-50%)',
              width: '46.8%',
              minWidth: '421px',
              padding: '1% 2%'
            }}
          >
            CONSULTE SEU PEDIDO
          </Link>

          {/* Botões - DESKTOP */}
          <a 
            href="https://wa.me/message/FNQNTD6CIDFMI1"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bg-white text-blue-600 font-black text-xs uppercase tracking-wide rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center flex items-center justify-center"
            style={{
              left: '50%',
              top: '38.5%',
              transform: 'translateX(-50%)',
              width: '46.8%',
              minWidth: '421px',
              padding: '1% 2%'
            }}
          >
            💬 WhatsApp
          </a>

          <a 
            href="https://www.instagram.com/tenislabr?igsh=dWt4bHdvamx6MWt6&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bg-white text-blue-600 font-black text-xs uppercase tracking-wide rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center flex items-center justify-center"
            style={{
              left: '50%',
              top: '42.5%',
              transform: 'translateX(-50%)',
              width: '46.8%',
              minWidth: '421px',
              padding: '1% 2%'
            }}
          >
            📸 Instagram
          </a>

          <a 
            href="https://maps.google.com/?q=TENISLAB+Maceio"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bg-white text-blue-600 font-black text-xs uppercase tracking-wide rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center flex items-center justify-center"
            style={{
              left: '50%',
              top: '46.5%',
              transform: 'translateX(-50%)',
              width: '46.8%',
              minWidth: '421px',
              padding: '1% 2%'
            }}
          >
            📍 Localização
          </a>

          {/* Tênis flutuante - DESKTOP */}
          <div 
            className="floating-sneaker"
            style={{
              position: 'absolute',
              left: '-8%',
              top: '30%',
              width: '52%',
              maxWidth: '650px',
              zIndex: 10
            }}
          >
            <img 
              src="/yeezy-float.webp" 
              alt="Tênis Yeezy" 
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* Botão "Acesso Restrito" - DESKTOP */}
        <Link
          href="/menu-principal"
          className="absolute bottom-[3.5%] left-0 right-0 text-center text-gray-600 hover:text-blue-600 text-xs font-medium transition-colors duration-300 w-full"
        >
          Acesso Restrito
        </Link>
        </div>
      </div>

      {/* Container MOBILE sem aspectRatio - escala naturalmente */}
      <div 
        className="block md:hidden relative mx-auto w-full bg-cover bg-top bg-no-repeat"
        style={{ 
          backgroundImage: 'url(/tenislab-template-mobile.webp)',
          paddingBottom: '277.78%' // 3375:9375 = 1:2.7778
        }}
      >
        {/* MOBILE: Design moderno customizado */}
          {/* Contador - MOBILE (mais compacto, no topo) */}
          {processedCount !== null && (
            <div 
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 bg-gradient-to-br from-blue-600 to-blue-700 px-5 py-2 rounded-2xl shadow-xl animate-in zoom-in duration-700"
              style={{ top: '27%' }}
            >
              <span className="text-2xl font-black text-white tracking-tight">
                {displayCount}
              </span>
              <p className="text-[9px] font-bold text-white/95 uppercase tracking-wider text-center">
                Tênis Restaurados/Higienizados
              </p>
            </div>
          )}

          {/* Botões - MOBILE (todos com mesmo estilo e espaçamento) */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col gap-3 w-[76%] max-w-[285px]" style={{ top: '35%' }}>
            <Link
              href="/consulta"
              className="bg-white text-blue-600 font-black text-xs uppercase tracking-wide px-7 py-3 rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center"
            >
              📦 Consulte seu Pedido
            </Link>

            <a 
              href="https://wa.me/message/FNQNTD6CIDFMI1"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-blue-600 font-black text-xs uppercase tracking-wide px-7 py-3 rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center"
            >
              💬 WhatsApp
            </a>

            <a 
              href="https://www.instagram.com/tenislabr?igsh=dWt4bHdvamx6MWt6&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-blue-600 font-black text-xs uppercase tracking-wide px-7 py-3 rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center"
            >
              📸 Instagram
            </a>

            <a 
              href="https://maps.google.com/?q=TENISLAB+Maceio"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-blue-600 font-black text-xs uppercase tracking-wide px-7 py-3 rounded-2xl shadow-2xl hover:shadow-blue-200 transition-all duration-300 active:scale-95 text-center"
            >
              📍 Localização
            </a>
          </div>

          {/* Tênis flutuante - MOBILE */}
          <div 
            className="floating-sneaker"
            style={{
              position: 'absolute',
              left: '-12%',
              top: '26%',
              width: '55%',
              maxWidth: '230px',
              zIndex: 10
            }}
          >
            <img 
              src="/yeezy-float.webp" 
              alt="Tênis Yeezy" 
              className="w-full h-auto object-contain"
            />
          </div>

        {/* Botão "Acesso Restrito" - MOBILE */}
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
            transform: translateY(0px) rotate(3deg);
          }
          50% {
            transform: translateY(-20px) rotate(3deg);
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
