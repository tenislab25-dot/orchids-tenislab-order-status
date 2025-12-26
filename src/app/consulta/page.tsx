"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Package, Clock, CheckCircle2, Truck, ArrowLeft, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

type Status = "Recebido" | "Em espera" | "Em serviço" | "Pronto para entrega ou retirada" | "Entregue" | "Cancelado";

interface OrderData {
  os_number: string;
  status: Status;
  clients: {
    phone: string;
  } | null;
}

const statusConfig = {
  Recebido: {
    icon: Package,
    color: "text-blue-500",
    bg: "bg-blue-50",
    message: "Seu tênis foi recebido e já está na fila de serviço.",
  },
  "Em espera": {
    icon: Clock,
    color: "text-orange-500",
    bg: "bg-orange-50",
    message: "Serviço aceito! Seu tênis está na fila para iniciar a produção.",
  },
  "Em serviço": {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-50",
    message: "Seu tênis está em processo de limpeza/restauração.",
  },
  "Pronto para entrega ou retirada": {
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-50",
    message: "Seu tênis está pronto! Em breve entraremos em contato para retirada ou entrega.",
  },
    Entregue: {
      icon: Truck,
      color: "text-slate-500",
      bg: "bg-slate-50",
      message: "Pedido finalizado. Obrigado por confiar na tenislab.",
    },
    Cancelado: {
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    message: "Esta ordem de serviço foi cancelada. Entre em contato para mais informações.",
  },
};

function StatusSearchForm({ 
  onSearch, 
  loading, 
  error,
  initialOs 
}: { 
  onSearch: (os: string, phone: string) => void; 
  loading: boolean;
  error: string | null;
  initialOs: string;
}) {
  const [osNumber, setOsNumber] = useState(initialOs);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (initialOs) setOsNumber(initialOs);
  }, [initialOs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(osNumber, phone);
  };

  return (
    <motion.div
      key="search"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-6"
    >
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-4">
          <h2 className="text-lg font-bold text-slate-900">Consultar Pedido</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nº do Pedido</label>
              <Input
                type="text"
                placeholder="Ex: 001/2025"
                value={osNumber}
                onChange={(e) => setOsNumber(e.target.value)}
                className="h-14 rounded-2xl bg-white border-slate-200 pl-4 text-lg focus:ring-blue-500/20"
                required
              />
            </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Telefone / WhatsApp</label>
            <Input
              type="tel"
              placeholder="Apenas números com DDD"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-14 rounded-2xl bg-white border-slate-200 pl-4 text-lg focus:ring-blue-500/20"
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <Button 
            type="submit" 
            disabled={loading || !osNumber.trim() || !phone.trim()}
            className="h-14 mt-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-all active:scale-[0.98]"
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
        Para sua segurança, informe o número da OS e o telefone cadastrado no momento da entrega.
      </p>
    </motion.div>
  );
}

function OrderContent() {
  const searchParams = useSearchParams();
  const initialOs = searchParams.get("os") || "";
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (os: string, phone: string) => {
    setLoading(true);
    setError(null);
    
    let searchOs = os.trim();
    if (!searchOs.includes("/")) {
      const year = new Date().getFullYear();
      searchOs = `${searchOs.padStart(3, "0")}/${year}`;
    }

    const searchPhone = phone.replace(/\D/g, "");

    const { data, error: sbError } = await supabase
      .from("service_orders")
      .select(`
        os_number,
        status,
        clients (
          phone
        )
      `)
      .eq("os_number", searchOs)
      .single();

    if (sbError || !data) {
      setError("Pedido não encontrado. Verifique o número da OS.");
      setLoading(false);
      return;
    }

    // Verify phone (very simple check)
    const dbPhone = data.clients?.phone.replace(/\D/g, "");
    if (dbPhone && !dbPhone.includes(searchPhone) && !searchPhone.includes(dbPhone)) {
      setError("Telefone não confere com o cadastro.");
      setLoading(false);
      return;
    }

    setOrder(data as any);
    setLoading(false);
  };

  const reset = () => {
    setOrder(null);
    setError(null);
  };

  return (
    <AnimatePresence mode="wait">
      {!order ? (
        <StatusSearchForm 
          onSearch={handleSearch} 
          loading={loading} 
          error={error}
          initialOs={initialOs}
        />
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
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nº do Pedido</span>
                <span className="text-3xl font-black text-slate-900">{order.os_number}</span>
              </div>

            <div className={`w-20 h-20 rounded-full ${statusConfig[order.status as keyof typeof statusConfig].bg} flex items-center justify-center`}>
              {(() => {
                const Icon = statusConfig[order.status as keyof typeof statusConfig].icon;
                return <Icon className={`w-10 h-10 ${statusConfig[order.status as keyof typeof statusConfig].color}`} />;
              })()}
            </div>

            <div className="flex flex-col gap-2">
              <span className={`text-2xl font-bold ${statusConfig[order.status as keyof typeof statusConfig].color}`}>
                {order.status}
              </span>
              <p className="text-slate-600 leading-relaxed max-w-[240px] mx-auto">
                {statusConfig[order.status as keyof typeof statusConfig].message}
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
  );
}

export default function StatusPage() {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-8 py-12 animate-in fade-in min-h-screen px-6">
      <header className="flex flex-col items-center gap-6 mb-4">
        <h1 className="font-black text-2xl">TENISLAB</h1>
      </header>

      <Suspense fallback={
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }>
        <OrderContent />
      </Suspense>

      <footer className="mt-auto pt-12 text-center pb-8 flex flex-col gap-4">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          tenislab. o laboratório do seu tênis
        </p>
      </footer>
    </div>
  );
}
