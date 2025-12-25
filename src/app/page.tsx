"use client";

import { useState } from "react";
import { Search, Package, Clock, CheckCircle2, Truck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

type Status = "Recebido" | "Em serviço" | "Pronto para retirada" | "Entregue";

interface OrderData {
  number: string;
  status: Status;
}

const statusConfig = {
  Recebido: {
    icon: Package,
    color: "text-blue-500",
    bg: "bg-blue-50",
    message: "Recebemos seu tênis! Ele já está em nossa fila para processamento.",
  },
  "Em serviço": {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-50",
    message: "Seu tênis está em processo de limpeza e cuidado especial.",
  },
  "Pronto para retirada": {
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-50",
    message: "Tudo pronto! Seu tênis está brilhando e aguardando você.",
  },
  Entregue: {
    icon: Truck,
    color: "text-slate-500",
    bg: "bg-slate-50",
    message: "Pedido finalizado. Obrigado por confiar na TENISLAB!",
  },
};

export default function Home() {
  const [osNumber, setOsNumber] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!osNumber.trim()) return;

    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Mock logic: different numbers return different statuses for demo
      const statuses: Status[] = ["Recebido", "Em serviço", "Pronto para retirada", "Entregue"];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      setOrder({
        number: osNumber,
        status: randomStatus,
      });
      setLoading(false);
    }, 800);
  };

  const reset = () => {
    setOrder(null);
    setOsNumber("");
  };

  return (
    <div className="w-full flex flex-col gap-8 py-8 animate-in fade-in">
      {/* Header / Logo */}
      <header className="flex flex-col items-center gap-2 mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-extrabold tracking-tighter text-slate-900">TENIS</span>
          <span className="text-4xl font-light tracking-tighter text-blue-500">LAB</span>
        </div>
        <p className="text-slate-500 text-sm font-medium">Sneaker Laundry Service</p>
      </header>

      <AnimatePresence mode="wait">
        {!order ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-4">
              <h2 className="text-lg font-bold text-slate-900">Consultar Pedido</h2>
              <form onSubmit={handleSearch} className="flex flex-col gap-3">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Digite o número da sua OS"
                    value={osNumber}
                    onChange={(e) => setOsNumber(e.target.value)}
                    className="h-14 rounded-2xl bg-white border-slate-200 pl-4 text-lg focus:ring-blue-500/20"
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !osNumber.trim()}
                  className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Consultar pedido"
                  )}
                </Button>
              </form>
            </div>
            
            <p className="text-center text-slate-400 text-xs px-8">
              O número da sua Ordem de Serviço (OS) pode ser encontrado no comprovante entregue na recepção.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-6"
          >
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Pedido</span>
                <span className="text-3xl font-black text-slate-900">#{order.number}</span>
              </div>

              <div className={`w-20 h-20 rounded-full ${statusConfig[order.status].bg} flex items-center justify-center`}>
                {(() => {
                  const Icon = statusConfig[order.status].icon;
                  return <Icon className={`w-10 h-10 ${statusConfig[order.status].color}`} />;
                })()}
              </div>

              <div className="flex flex-col gap-2">
                <span className={`text-2xl font-bold ${statusConfig[order.status].color}`}>
                  {order.status}
                </span>
                <p className="text-slate-600 leading-relaxed max-w-[240px] mx-auto">
                  {statusConfig[order.status].message}
                </p>
              </div>

              <Button 
                variant="ghost" 
                onClick={reset}
                className="mt-4 text-slate-400 hover:text-slate-900 flex gap-2 items-center"
              >
                <ArrowLeft className="w-4 h-4" />
                Nova consulta
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto pt-12 text-center">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          © 2025 TENISLAB • Premium Sneakers Care
        </p>
      </footer>
    </div>
  );
}
