"use client";

import Link from "next/link";
import Image from "next/image";
import { logger } from "@/lib/logger";
import { 
  Search, 
  MessageCircle, 
  Instagram, 
  ChevronRight,
  MapPin,
  Sparkles
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";

interface ActionButtonProps {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  external?: boolean;
  variant?: "primary" | "secondary";
}

function ActionButton({ href, title, description, icon: Icon, external, variant = "secondary" }: ActionButtonProps) {
  const baseClasses = "group relative overflow-hidden flex items-center gap-4 p-6 rounded-2xl transition-all duration-300 active:scale-[0.98] w-full text-left shadow-lg hover:shadow-2xl";
  
  const variantClasses = variant === "primary"
    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600"
    : "bg-white text-slate-900 border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50";

  const content = (
    <div className={`${baseClasses} ${variantClasses}`}>
      {/* Geometric accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
      
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
        variant === "primary" 
          ? "bg-white/20 group-hover:bg-white/30" 
          : "bg-blue-100 group-hover:bg-blue-600"
      }`}>
        <Icon className={`w-7 h-7 transition-colors ${
          variant === "primary" 
            ? "text-white" 
            : "text-blue-600 group-hover:text-white"
        }`} />
      </div>
      
      <div className="flex-1 z-10">
        <h3 className="font-black text-xl leading-tight mb-1">{title}</h3>
        <p className={`text-sm font-medium ${
          variant === "primary" ? "text-blue-100" : "text-slate-500"
        }`}>
          {description}
        </p>
      </div>
      
      <ChevronRight className={`w-6 h-6 transition-transform group-hover:translate-x-1 ${
        variant === "primary" ? "text-white/50" : "text-slate-300"
      }`} />
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
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section with Geometric Background */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-slate-900">
        {/* Geometric shapes */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -ml-32 -mt-32" />
          <div className="absolute top-20 right-0 w-96 h-96 bg-white transform rotate-45 -mr-48" />
          <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-white transform -rotate-12 -mb-24" />
        </div>

        <div className="relative max-w-md mx-auto px-6 py-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative w-72 h-56 bg-white/10 backdrop-blur-sm rounded-3xl p-6 shadow-2xl">
              <Image 
                src="/logo-tenislab.jpeg"
                alt="TENISLAB Logo"
                width={288}
                height={224}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>

          {/* Tagline */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight tracking-tight">
              O LABORATÓRIO<br />DO SEU TÊNIS
            </h1>
            <p className="text-blue-100 text-lg font-medium">
              Higienização, restauração e conserto profissional
            </p>
          </div>

          {/* Counter Badge */}
          {processedCount !== null && (
            <div className="flex justify-center animate-in zoom-in duration-700 delay-300">
              <div className="bg-white/95 backdrop-blur-sm px-8 py-5 rounded-2xl shadow-2xl border-2 border-white/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <span className="text-4xl font-black text-blue-600 tracking-tighter">
                    {processedCount}+
                  </span>
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] text-center">
                  Tênis Higienizados
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="rgb(248, 250, 252)"/>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 py-12">
        {/* Before/After Section */}
        <section className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-900 mb-2">ANTES & DEPOIS</h2>
            <p className="text-slate-600 font-medium">Veja a transformação</p>
          </div>
          
          <div className="relative bg-gradient-to-br from-slate-100 to-white rounded-3xl p-8 shadow-xl border-2 border-slate-100">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="relative mb-3">
                  <Image 
                    src="/assets/sneaker-dirty-v2.png"
                    alt="Tênis sujo"
                    width={200}
                    height={200}
                    className="w-full h-auto"
                  />
                </div>
                <span className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-full">
                  Antes
                </span>
              </div>
              
              <div className="text-center">
                <div className="relative mb-3">
                  <Image 
                    src="/assets/sneaker-clean-v2.png"
                    alt="Tênis limpo"
                    width={200}
                    height={200}
                    className="w-full h-auto"
                  />
                </div>
                <span className="inline-block px-4 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-full">
                  Depois
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="flex flex-col gap-4 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700">
          <ActionButton 
            href="/consulta"
            title="Consultar Pedido"
            description="Acompanhe seu tênis em tempo real"
            icon={Search}
            variant="primary"
          />
          
          <ActionButton 
            href="https://wa.me/message/FNQNTD6CIDFMI1"
            title="Falar no WhatsApp"
            description="Tire suas dúvidas ou faça um orçamento"
            icon={MessageCircle}
            external
          />
          
          <ActionButton 
            href="https://www.instagram.com/tenislabr?igsh=dWt4bHdvamx6MWt6&utm_source=qr"
            title="Instagram"
            description="Veja nossos trabalhos e novidades"
            icon={Instagram}
            external
          />
          
          <ActionButton 
            href="https://maps.google.com/?q=TENISLAB+Maceio"
            title="Como Chegar"
            description="Encontre nossa loja em Maceió"
            icon={MapPin}
            external
          />
        </section>

        {/* Trust Section */}
        <section className="text-center mb-12 px-4 animate-in fade-in duration-1000 delay-1000">
          <div className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-2xl p-8 border-2 border-blue-100">
            <h3 className="text-xl font-black text-slate-900 mb-3">
              QUALIDADE PROFISSIONAL
            </h3>
            <p className="text-slate-600 leading-relaxed font-medium">
              Utilizamos produtos e técnicas especializadas para devolver a vida ao seu tênis favorito.
            </p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="max-w-md mx-auto px-6 pb-12 pt-8 text-center">
        <Link 
          href="/menu-principal/login"
          className="inline-block text-slate-400 text-xs uppercase tracking-[0.2em] font-bold hover:text-blue-600 transition-colors mb-6"
        >
          Acesso Restrito
        </Link>
        
        <div className="border-t border-slate-200 pt-6">
          <p className="text-slate-400 text-xs uppercase tracking-[0.3em] font-bold">
            TENISLAB © 2026
          </p>
          <p className="text-slate-300 text-[10px] mt-2">
            O laboratório do seu tênis
          </p>
        </div>
      </footer>
    </div>
  );
}
