"use client";

import { useMemo, useState, useEffect } from "react";
import { 
  ArrowLeft, 
  LayoutDashboard,
  Package,
  Calendar,
  User,
  AlertTriangle,
  Info,
  XCircle,
  X
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
import { useParams } from "next/navigation";

// Types
type Status = "Recebido" | "Em serviço" | "Pronto" | "Entregue" | "Cancelado";

interface OSItem {
  id: string;
  orderInOS: number;
  services: string[];
  observations: string;
  photos: string[];
}

interface OSData {
  osNumber: string;
  clientName: string;
  status: Status;
  entryDate: string;
  deliveryDate?: string;
  items: OSItem[];
  cancellationReason?: string;
  cancellationDate?: string;
}

// Mock function to get OS data
const getOSMockData = (osId: string): OSData => {
  // We can derive some data from osId if it looks like 001-2025 or similar
  const displayId = osId.replace("-", "/");
  
  // Return different data based on ID for variety in testing
  if (osId === "006-2025") {
    return {
      osNumber: "006/2025",
      clientName: "Carla Souza",
      status: "Cancelado",
      entryDate: "2025-12-12",
      cancellationReason: "Cliente desistiu do serviço por conta do prazo.",
      cancellationDate: "2025-12-13",
      items: [
        {
          id: "item1",
          orderInOS: 1,
          services: ["Higienização Pro", "Pintura Parcial"],
          observations: "Mancha de graxa no bico direito.",
          photos: ["/placeholder.svg", "/placeholder.svg"]
        }
      ]
    };
  }

  return {
    osNumber: displayId.includes("/") ? displayId : `${displayId}/2025`,
    clientName: "João Silva",
    status: "Em serviço",
    entryDate: "2025-12-20",
    deliveryDate: "2025-12-27",
    items: [
      {
        id: "item1",
        orderInOS: 1,
        services: ["Higienização Pro"],
        observations: "Cadarços muito sujos.",
        photos: ["/placeholder.svg", "/placeholder.svg"]
      },
      {
        id: "item2",
        orderInOS: 2,
        services: ["Pintura de Entressola", "Higienização Simples"],
        observations: "Entressola amarelada.",
        photos: ["/placeholder.svg"]
      }
    ]
  };
};

export default function OSViewPage() {
  const params = useParams();
  const osId = params.osId as string;
  
  const [role, setRole] = useState<string | null>(null);
  const [osData, setOsData] = useState<OSData | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  useEffect(() => {
    setRole(localStorage.getItem("tenislab_role"));
    setOsData(getOSMockData(osId));
  }, [osId]);

  const isReasonValid = cancellationReason.trim().length >= 10;

  const handleCancelClick = () => {
    setCancelModalOpen(true);
    setCancellationReason("");
  };

  const confirmCancel = () => {
    if (!isReasonValid || !osData) return;

    setOsData(prev => prev ? {
      ...prev,
      status: "Cancelado",
      cancellationReason,
      cancellationDate: new Date().toISOString()
    } : null);
    
    setCancelModalOpen(false);
  };

  if (!osData) return null;

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "Recebido":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1 font-bold">Recebido</Badge>;
      case "Em serviço":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1 font-bold">Em serviço</Badge>;
      case "Pronto":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-1 font-bold">Pronto</Badge>;
      case "Entregue":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none px-3 py-1 font-bold">Entregue</Badge>;
      case "Cancelado":
        return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-3 py-1 font-bold">Cancelado</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full -ml-2">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-slate-900 leading-none">Detalhes da OS</h1>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{osData.osNumber}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-black text-slate-900 tracking-tighter">TENIS</span>
          <span className="text-sm font-light text-blue-500 tracking-tighter">LAB</span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 flex flex-col gap-5">
        
        {/* SECTION 1 — HEADER INFO */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</span>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{osData.clientName}</h2>
            </div>
            {getStatusBadge(osData.status)}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Entrada
              </span>
              <span className="text-sm font-bold text-slate-700">
                {new Date(osData.entryDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
            {osData.deliveryDate && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Package className="w-3 h-3" /> Previsão
                </span>
                <span className="text-sm font-bold text-slate-700">
                  {new Date(osData.deliveryDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* CANCELLED BANNER */}
        {osData.status === "Cancelado" && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-xs font-black text-red-700 uppercase tracking-tight">
              OS cancelada — ver motivo abaixo
            </p>
          </div>
        )}

        {/* SECTION 2 — ITEMS */}
        <div className="flex flex-col gap-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Pares de Tênis</h3>
          
          {osData.items.map((item) => (
            <Card key={item.id} className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 py-3 px-6 border-b border-slate-100">
                <CardTitle className="text-xs font-black text-slate-600 uppercase tracking-widest">
                  ITEM {osData.osNumber}.{item.orderInOS}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Photos Gallery */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fotos do Recebimento</span>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {item.photos.map((photo, i) => (
                      <div key={i} className="min-w-[120px] h-[120px] rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        <img 
                          src={photo} 
                          alt={`Item ${item.orderInOS} photo ${i + 1}`} 
                          className="w-full h-full object-cover opacity-50"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Serviços a Executar</span>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <ul className="space-y-2">
                      {item.services.map((service, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {service}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Observations */}
                {item.observations && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Observações</span>
                    <div className="bg-amber-50/30 rounded-2xl p-4 border border-amber-100/50">
                      <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                        "{item.observations}"
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SECTION 3 — CANCELLATION INFO */}
        {osData.status === "Cancelado" && (
          <section className="bg-red-50 border-2 border-red-100 rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-red-100 pb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-sm font-black text-red-900 uppercase tracking-tight">INFORMAÇÕES DE CANCELAMENTO</h2>
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest ml-1">Motivo do cancelamento</span>
                <p className="text-sm font-bold text-red-700 bg-white p-4 rounded-2xl border border-red-100 shadow-inner">
                  {osData.cancellationReason}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest ml-1">Data do cancelamento</span>
                <div className="flex items-center gap-2 text-sm font-bold text-red-700 bg-red-100/50 w-fit px-4 py-2 rounded-xl border border-red-200">
                  <Calendar className="w-4 h-4" />
                  {osData.cancellationDate ? new Date(osData.cancellationDate).toLocaleDateString('pt-BR') : "-"}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* SECTION 4 — ACTIONS */}
        <div className="flex flex-col gap-3 mt-4">
          {/* CANCEL BUTTON: Visible for Admin/Atendente if status is not Entregue/Cancelado */}
          {(role === "ADMIN" || role === "ATENDENTE") && 
           osData.status !== "Entregue" && 
           osData.status !== "Cancelado" && (
            <Button 
              onClick={handleCancelClick}
              className="w-full h-14 rounded-2xl bg-white border-2 border-red-200 hover:bg-red-50 text-red-600 font-black shadow-sm transition-all active:scale-[0.97] flex items-center gap-2"
            >
              <AlertTriangle className="w-5 h-5" />
              ❌ Cancelar Ordem de Serviço
            </Button>
          )}

          <Link href="/interno/dashboard" className="w-full">
            <Button 
              type="button" 
              className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black shadow-xl transition-all active:scale-[0.97]"
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5" />
                VOLTAR AO DASHBOARD
              </div>
            </Button>
          </Link>
        </div>

        {/* CANCELLATION DIALOG */}
        <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Cancelar Ordem de Serviço
              </DialogTitle>
              <DialogDescription className="font-bold text-slate-600">
                Esta ação é irreversível. A OS será marcada como cancelada.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="cancelDate" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                  Data do cancelamento
                </Label>
                <Input 
                  id="cancelDate" 
                  value={new Date().toLocaleDateString('pt-BR')} 
                  disabled 
                  className="rounded-xl bg-slate-50 border-slate-200 font-bold text-slate-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                  Motivo do cancelamento *
                </Label>
                <Textarea 
                  id="reason"
                  placeholder="Informe detalhadamente o motivo do cancelamento..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="mt-1 rounded-2xl border-slate-200 min-h-[100px] text-sm resize-none focus-visible:ring-red-500/20"
                  required
                />
                {!isReasonValid && cancellationReason.length > 0 && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium italic">
                    O motivo deve ter pelo menos 10 caracteres para confirmar.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setCancelModalOpen(false)} className="rounded-xl font-bold">
                Voltar
              </Button>
              <Button 
                onClick={confirmCancel} 
                disabled={!isReasonValid}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
              >
                Confirmar cancelamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <footer className="mt-8 text-center opacity-30">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold">
            Visualização Operacional · TENISLAB
          </p>
        </footer>
      </main>
    </div>
  );
}
