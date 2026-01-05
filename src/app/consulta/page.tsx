"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Package, Clock, CheckCircle2, Truck, ArrowLeft, AlertCircle, XCircle, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Status = "Recebido" | "Em espera" | "Em serviço" | "Em finalização" | "Pronto para entrega ou retirada" | "Entregue" | "Cancelado";

interface OrderData {
  os_number: string;
  status: Status;
  items: any[];
  delivery_date?: string;
  total?: number;
  discount_percent?: number;
  machine_fee?: number;
  delivery_fee?: number;
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
    "Em finalização": {
      icon: Clock,
      color: "text-indigo-500",
      bg: "bg-indigo-50",
      message: "Seu tênis está nas etapas finais de acabamento e controle de qualidade.",
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
    const [osNumber, setOsNumber] = useState(initialOs || "");
    const [phone, setPhone] = useState("");

    useEffect(() => {
      if (initialOs) setOsNumber(initialOs);
    }, [initialOs]);

    const handleOsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/[^0-9/]/g, "");
      if (value.length > 8) value = value.slice(0, 8);
      setOsNumber(value);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, "");
      if (value.length > 11) value = value.slice(0, 11);
      setPhone(value);
    };

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
                      <div className="relative flex items-center">
                        <Input
                          type="text"
                          placeholder="Ex: 001/2025"
                          value={osNumber}
                          onChange={handleOsChange}
                          className="h-14 rounded-2xl bg-white border-slate-200 pl-4 text-lg font-bold focus:ring-blue-500/20 flex-1"
                          required
                        />
                      </div>
                  </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Telefone / WhatsApp</label>
              <Input
                type="tel"
                placeholder="Ex: 82999999999"
                value={phone}
                onChange={handlePhoneChange}
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

            <div className="flex flex-col gap-2">
              <Button 
                type="submit" 
                disabled={loading || !osNumber.trim() || !phone.trim()}
                className="h-14 mt-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Consultar Pedido"
                )}
              </Button>
              <Button 
                variant="ghost" 
                asChild
                className="h-12 rounded-2xl text-slate-400 font-bold"
              >
                <Link href="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar para página inicial
                </Link>
              </Button>
            </div>
          </form>
        </div>
        
        <p className="text-center text-slate-400 text-xs px-8">
          Para sua segurança, informe o número do pedido e o telefone cadastrado no momento da entrega.
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Auto-refresh logic
  useEffect(() => {
    if (!order) return;

    const channel = supabase
      .channel(`os-customer-${order.os_number}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_orders",
          filter: `os_number=eq.${order.os_number}`
        },
        (payload) => {
          setOrder(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              ...(payload.new as OrderData)
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order?.os_number]);

    const handleSearch = async (os: string, phone: string) => {
      setLoading(true);
      setError(null);
      
      let searchOs = os.trim();
      if (searchOs.includes("/")) {
        const [num, year] = searchOs.split("/");
        searchOs = `${num.padStart(3, "0")}/${year || new Date().getFullYear()}`;
      } else if (searchOs.length > 0) {
        const year = new Date().getFullYear();
        searchOs = `${searchOs.padStart(3, "0")}/${year}`;
      }

    const searchPhone = phone.replace(/\D/g, "");

    const { data, error: sbError } = await supabase
      .from("service_orders")
      .select(`
        os_number,
        status,
        items,
        delivery_date,
        total,
        discount_percent,
        machine_fee,
        delivery_fee,
        clients!inner (
          phone
        )
      `)
      .eq("os_number", searchOs)
      .single();

      if (sbError || !data) {
        setError("Pedido não encontrado. Verifique o número digitado.");
        setLoading(false);
        return;
      }

    const dbPhone = data.clients?.phone?.replace(/\D/g, "") || "";
    const last4Db = dbPhone.slice(-4);
    const last4Search = searchPhone.slice(-4);
    
    if (!dbPhone || last4Db !== last4Search) {
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
                    <div className="flex flex-col gap-2 items-center">
                      <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Nº do Pedido</span>
                        <div className="bg-blue-600 text-white px-6 py-2 rounded-full shadow-lg shadow-blue-100">
                          <span className="text-2xl font-black">
                            {order.os_number}
                          </span>
                        </div>
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

                {order.delivery_date && (
                  <div className="flex flex-col items-center gap-1 bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Previsão de Entrega</span>
                    <span className={`text-sm font-black ${
                      new Date(order.delivery_date) < new Date(new Date().setHours(0,0,0,0)) 
                      ? "text-red-500 animate-pulse" 
                      : "text-slate-700"
                    }`}>
                      {new Date(order.delivery_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}


                {order.items && order.items.length > 0 && (
                  <div className="w-full pt-4 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resumo Financeiro</span>
                    <div className="flex flex-col gap-2 mt-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Subtotal</span>
                        <span className="font-bold text-slate-700">R$ {order.items.reduce((acc: number, i: any) => acc + (i.services?.reduce((sAcc: number, s: any) => sAcc + Number(s.price || 0), 0) || 0) + Number(i.customService?.price || 0), 0).toFixed(2)}</span>
                      </div>
                        {order.discount_percent && order.discount_percent > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-red-500 font-medium">Desconto ({order.discount_percent}%)</span>
                            <span className="font-bold text-red-500">- R$ {((order.items.reduce((acc: number, i: any) => acc + (i.services?.reduce((sAcc: number, s: any) => sAcc + Number(s.price || 0), 0) || 0) + Number(i.customService?.price || 0), 0) * order.discount_percent) / 100).toFixed(2)}</span>
                          </div>
                        )}
                        {order.machine_fee && order.machine_fee > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-red-500 font-medium">Desconto do Cartão</span>
                            <span className="font-bold text-red-500">- R$ {Number(order.machine_fee).toFixed(2)}</span>
                          </div>
                        )}
                        {order.delivery_fee && order.delivery_fee > 0 && (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Taxa de Entrega</span>
                            <span className="font-bold text-slate-700">+ R$ {Number(order.delivery_fee).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-200">
                          <span className="text-sm font-black text-slate-900 uppercase">Total</span>
                          <span className="text-lg font-black text-blue-600">R$ {Number(order.total || 0).toFixed(2)}</span>
                        </div>
                    </div>
                  </div>
                )}

                {order.items && order.items.length > 0 && (
                  <div className="w-full pt-4 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seus Itens</span>
                    <div className="flex flex-col gap-4 mt-3">
                      {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-slate-600">Item {idx + 1}</span>
                          
                            <div className="flex flex-col gap-1 my-1">
                              {item.services?.map((s: any, sIdx: number) => (
                                    <div key={sIdx} className="flex flex-col items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                                      <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-1 h-1 rounded-full bg-blue-500" />
                                          <span className="text-xs font-bold text-slate-900">{s.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-blue-600">R$ {Number(s.price || 0).toFixed(2)}</span>
                                      </div>
                                      {s.description && (
                                        <span className="text-[10px] text-slate-500 text-left mt-1 ml-2.5 leading-tight">{s.description}</span>
                                      )}
                                    </div>
                              ))}
                              {item.customService?.name && (
                                <div className="flex flex-col items-start bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-1 h-1 rounded-full bg-blue-600" />
                                      <span className="text-xs font-bold text-slate-900">{item.customService.name} (Extra)</span>
                                    </div>
                                    <span className="text-xs font-black text-blue-700">R$ {Number(item.customService.price || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              )}
                            </div>


{(() => {
                              const beforePhotos = item.photosBefore || item.photos || [];
                              const afterPhotos = item.photosAfter || item.photos_after || [];
                              const hasBeforePhotos = beforePhotos.length > 0;
                              const hasAfterPhotos = afterPhotos.length > 0;
                              
                              if (!hasBeforePhotos && !hasAfterPhotos) return null;
                              
                              return (
                                <div className="flex flex-col gap-4">
                                  {hasBeforePhotos && (
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antes</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        {beforePhotos.map((photo: string, pIdx: number) => (
                                          <div 
                                            key={pIdx} 
                                            className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-200 cursor-pointer group active:scale-[0.98] transition-all bg-slate-100"
                                            onClick={() => setSelectedImage(photo)}
                                          >
                                            <Image 
                                              src={photo} 
                                              alt={`Antes ${pIdx + 1}`} 
                                              fill
                                              unoptimized
                                              className="object-cover"
                                              sizes="(max-width: 768px) 50vw, 33vw"
                                            />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                                              <ZoomIn className="w-5 h-5 text-white" />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {hasAfterPhotos && (
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Depois</span>
                                      </div>
                                      <div 
                                        className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border-2 border-emerald-200 cursor-pointer group active:scale-[0.98] transition-all bg-emerald-50"
                                        onClick={() => setSelectedImage(afterPhotos[0])}
                                      >
                                        <Image 
                                          src={afterPhotos[0]} 
                                          alt="Resultado final" 
                                          fill
                                          unoptimized
                                          className="object-cover"
                                          sizes="(max-width: 768px) 100vw, 50vw"
                                        />
                                        <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[8px] font-bold uppercase px-2 py-1 rounded-full shadow-lg">
                                          Resultado
                                        </div>
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                                            <ZoomIn className="w-6 h-6 text-slate-700" />
                                          </div>
                                        </div>
                                      </div>
                                      {afterPhotos.length > 1 && (
                                        <div className="grid grid-cols-3 gap-2">
                                          {afterPhotos.slice(1).map((photo: string, pIdx: number) => (
                                            <div 
                                              key={pIdx} 
                                              className="relative w-full aspect-square rounded-lg overflow-hidden border border-emerald-200 cursor-pointer group active:scale-[0.98] transition-all bg-emerald-50"
                                              onClick={() => setSelectedImage(photo)}
                                            >
                                              <Image 
                                                src={photo} 
                                                alt={`Depois ${pIdx + 2}`} 
                                                fill
                                                unoptimized
                                                className="object-cover"
                                                sizes="(max-width: 768px) 33vw, 20vw"
                                              />
                                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                                                <ZoomIn className="w-4 h-4 text-white" />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 w-full mt-4">
                <Button 
                  variant="outline" 
                  onClick={reset}
                  className="h-12 rounded-2xl text-slate-600 font-bold flex gap-2 items-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Nova consulta
                </Button>
                  <Button 
                    variant="ghost" 
                    asChild
                    className="h-12 rounded-2xl text-slate-400 font-bold"
                  >
                    <Link href="/">
                      Voltar para página inicial
                    </Link>
                  </Button>
              </div>
            </div>

            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
              <DialogContent className="max-w-[95vw] lg:max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
                <DialogHeader className="sr-only">
                  <DialogTitle>Visualização da Imagem</DialogTitle>
                </DialogHeader>
                {selectedImage && (
                  <div className="relative w-full h-full flex flex-col items-center justify-center animate-in zoom-in duration-300">
                    <div className="absolute top-4 right-4 z-50">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10"
                        onClick={() => setSelectedImage(null)}
                      >
                        <X className="w-6 h-6" />
                      </Button>
                    </div>
                    <img 
                      src={selectedImage} 
                      alt="Visualização ampliada" 
                      className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                    />
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function StatusPage() {
  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-8 py-12 animate-in fade-in min-h-screen px-6">
    <header className="flex flex-col items-center gap-6 mb-8">
          <img 
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=8000&height=8000&resize=contain" 
            alt="TENISLAB Logo" 
            className="h-48 w-auto object-contain"
          />
    </header>

      <Suspense fallback={
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }>
        <OrderContent />
      </Suspense>

      <div className="flex justify-center -mt-4">
        <Button 
          variant="link" 
          asChild
          className="text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-widest"
        >
          <Link href="/">Voltar para página inicial</Link>
        </Button>
      </div>

      <footer className="mt-auto pt-12 text-center pb-8 flex flex-col gap-4">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          tenislab. o laboratório do seu tênis
        </p>
      </footer>
    </div>
  );
}
