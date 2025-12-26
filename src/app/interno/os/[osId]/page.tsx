"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  ArrowLeft, 
  LayoutDashboard,
  Calendar,
  AlertTriangle,
  Package,
  User,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Status = "Recebido" | "Em serviço" | "Pronto" | "Entregue" | "Cancelado";

interface OrderData {
  id: string;
  os_number: string;
  status: Status;
  entry_date: string;
  delivery_date?: string;
  items: any[];
  total: number;
  payment_method: string;
  pay_on_entry: boolean;
  delivery_fee: number;
  discount_percent: number;
  clients: {
    name: string;
    phone: string;
  } | null;
}

export default function OSViewPage() {
  const params = useParams();
  const router = useRouter();
  const osIdRaw = params.osId as string;
  const osNumber = osIdRaw.replace("-", "/");
  
  const [role, setRole] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  
  useEffect(() => {
    setRole(localStorage.getItem("tenislab_role"));
    fetchOrder();
  }, [osNumber]);

  const fetchOrder = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        *,
        clients (
          name,
          phone
        )
      `)
      .eq("os_number", osNumber)
      .single();

    if (error) {
      toast.error("Erro ao carregar OS: " + error.message);
    } else {
      setOrder(data as OrderData);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async (newStatus: Status) => {
    const { error } = await supabase
      .from("service_orders")
      .update({ status: newStatus })
      .eq("os_number", osNumber);

    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
    } else {
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success("Status atualizado!");
    }
  };

  const confirmCancel = async () => {
    if (cancellationReason.trim().length < 10) {
      toast.error("Informe o motivo com pelo menos 10 caracteres");
      return;
    }

    const { error } = await supabase
      .from("service_orders")
      .update({ 
        status: "Cancelado",
        // We could add a cancellation_reason column if needed, 
        // but for now let's just update the status as per the current schema
      })
      .eq("os_number", osNumber);

    if (error) {
      toast.error("Erro ao cancelar: " + error.message);
    } else {
      setOrder(prev => prev ? { ...prev, status: "Cancelado" } : null);
      setCancelModalOpen(false);
      toast.success("OS Cancelada");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <h1 className="text-xl font-bold">OS não encontrada</h1>
      <Button asChild>
        <Link href="/interno/dashboard">Voltar ao Dashboard</Link>
      </Button>
    </div>
  );

  const getStatusBadge = (status: Status) => {
    const styles = {
      Recebido: "bg-blue-100 text-blue-700",
      "Em serviço": "bg-amber-100 text-amber-700",
      Pronto: "bg-green-100 text-green-700",
      Entregue: "bg-slate-100 text-slate-700",
      Cancelado: "bg-red-100 text-red-700",
    };
    return (
      <Badge className={`${styles[status]} border-none px-3 py-1 font-bold`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full -ml-2">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-slate-900 leading-none">Detalhes da OS</h1>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{order.os_number}</span>
          </div>
        </div>
        <div className="relative w-24 h-8">
          <Image 
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/IMG_8889-1766755171009.JPG?width=8000&height=8000&resize=contain"
            alt="TENISLAB"
            fill
            className="object-contain"
          />
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 flex flex-col gap-5 animate-in fade-in duration-500">
        
        {/* CLIENT INFO */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</span>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{order.clients?.name}</h2>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                <Phone className="w-3 h-3" />
                {order.clients?.phone}
              </div>
            </div>
            {getStatusBadge(order.status)}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Entrada
              </span>
              <span className="text-sm font-bold text-slate-700">
                {new Date(order.entry_date).toLocaleDateString('pt-BR')}
              </span>
            </div>
            {order.delivery_date && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Package className="w-3 h-3" /> Previsão
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {new Date(order.delivery_date).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* ITEMS */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pares de Tênis</h3>
          
          {order.items.map((item: any, idx: number) => (
            <Card key={idx} className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 py-3 px-6 border-b border-slate-100">
                <CardTitle className="text-xs font-black text-slate-600 uppercase tracking-widest">
                  ITEM {idx + 1} - {item.itemNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Serviços</span>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <ul className="space-y-2">
                      {item.services.map((service: any, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {service.name}
                        </li>
                      ))}
                      {item.customService?.name && (
                        <li className="flex items-center gap-2 text-sm font-bold text-blue-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          {item.customService.name} (Extra)
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {item.notes && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Observações</span>
                    <div className="bg-amber-50/30 rounded-2xl p-4 border border-amber-100/50">
                      <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                        "{item.notes}"
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FINANCIAL SUMMARY */}
        <section>
          <Card className="rounded-3xl bg-slate-900 text-white overflow-hidden shadow-xl">
            <CardHeader className="py-4 px-6 border-b border-white/10">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">Método de Pagamento</span>
                <span className="font-bold">{order.payment_method}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">Status de Pagamento</span>
                <span className={`font-bold ${order.pay_on_entry ? "text-green-400" : "text-amber-400"}`}>
                  {order.pay_on_entry ? "Pago na Entrada" : "Pagar na Entrega"}
                </span>
              </div>
              <div className="h-px bg-white/10 my-2" />
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Total Geral</span>
                <span className="text-3xl font-black text-blue-400 tracking-tighter">
                  R$ {Number(order.total).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ACTIONS */}
        <div className="flex flex-col gap-3 mt-4">
          {order.status !== "Entregue" && order.status !== "Cancelado" && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Atualizar Status</p>
              <div className="grid grid-cols-2 gap-2">
                {["Em serviço", "Pronto", "Entregue"].map((st) => (
                  <Button
                    key={st}
                    onClick={() => handleStatusUpdate(st as Status)}
                    className={`h-12 rounded-xl font-bold transition-all ${
                      st === "Entregue" 
                      ? "bg-slate-900 text-white hover:bg-slate-800" 
                      : "bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Marcar como {st}
                  </Button>
                ))}
                <Button
                  onClick={() => setCancelModalOpen(true)}
                  className="h-12 rounded-xl border-2 border-red-100 bg-red-50 text-red-600 font-bold hover:bg-red-100"
                >
                  Cancelar OS
                </Button>
              </div>
            </div>
          )}

          <Link href="/interno/dashboard" className="w-full mt-4">
            <Button 
              className="w-full h-14 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 font-black shadow-sm"
            >
              <LayoutDashboard className="w-5 h-5 mr-2" />
              VOLTAR AO DASHBOARD
            </Button>
          </Link>
        </div>

        {/* CANCELLATION DIALOG */}
        <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
          <DialogContent className="rounded-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Cancelar OS
              </DialogTitle>
              <DialogDescription>
                Esta ação é irreversível e removerá a OS do fluxo de trabalho.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Motivo</Label>
              <Textarea 
                placeholder="Descreva o motivo..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="mt-2 rounded-2xl"
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCancelModalOpen(false)}>Voltar</Button>
              <Button onClick={confirmCancel} className="bg-red-600 text-white">Confirmar Cancelamento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
