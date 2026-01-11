"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, MapPin, Navigation, CheckCircle2, 
  Truck, Loader2, Package, XCircle, Phone, MessageCircle,
  Clock, Hash
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function EntregasPage() {
  const router = useRouter();
  const { role } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          *,
          clients (
            name,
            phone,
            address
          )
        `)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Filtra apenas pedidos prontos para entrega ou que já estão em rota
      const filtrados = data?.filter(pedido => {
        const s = pedido.status;
        return (
          s === "Pronto" || 
          s === "Em Rota"
        );
      });

      setPedidos(filtrados || []);
    } catch (error: any) {
      console.error("Erro ao carregar entregas:", error);
      toast.error("Erro ao carregar entregas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const atualizarStatus = async (pedido: any, novoStatus: string) => {
    try {
      setUpdating(pedido.id);
      const { error } = await supabase
        .from("service_orders")
        .update({ status: novoStatus })
        .eq("id", pedido.id);

      if (error) throw error;
      
      toast.success(`Status atualizado: ${novoStatus}`);
      
      // Se foi entregue, dispara a notificação automática via API
      if (novoStatus === "Entregue") {
        fetch("/api/notifications/status-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: novoStatus,
            clientName: pedido.clients?.name,
            osNumber: pedido.os_number,
          }),
        }).catch(console.error);
      }

      fetchPedidos();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      <p className="text-slate-500 font-medium">Carregando entregas...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-10">
      <header className="bg-slate-900 p-6 text-white sticky top-0 z-10 shadow-xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/interno")} className="rounded-full hover:bg-white/10 text-white">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="font-black text-xl tracking-tight">Entregas</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Logística Tenislab</p>
            </div>
          </div>
          <Badge className="bg-blue-500 text-white border-none px-4 py-1 rounded-full font-black">
            {pedidos.length}
          </Badge>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto w-full space-y-6 mt-4">
        {pedidos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 shadow-sm">
            <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">Nenhuma entrega pendente no momento.</p>
          </div>
        ) : (
          pedidos.map((pedido) => (
            <Card key={pedido.id} className="border-none shadow-xl shadow-slate-200/50 overflow-hidden rounded-[2.5rem] bg-white animate-in fade-in slide-in-from-bottom-4">
              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* Cabeçalho do Card */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Hash className="w-3 h-3" />
                      <span className="text-xs font-black uppercase tracking-widest">{pedido.os_number}</span>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight">
                      {pedido.clients?.name || "Cliente não identificado"}
                    </h2>
                  </div>
                  <Badge className={`${pedido.status === 'Em Rota' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'} border-none font-bold px-3 py-1`}>
                    {pedido.status === 'Em Rota' ? 'EM ROTA' : 'PRONTO'}
                  </Badge>
                </div>

                {/* Informações de Endereço e Contato */}
                <div className="bg-slate-50 rounded-3xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Endereço de Entrega</p>
                      <p className="text-slate-700 font-medium leading-snug mt-0.5">
                        {pedido.clients?.address || "Endereço não cadastrado"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contato</p>
                      <p className="text-slate-700 font-bold mt-0.5">{pedido.clients?.phone || "Sem telefone"}</p>
                    </div>
                  </div>
                </div>

                {/* Botões de Navegação e Contato */}
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-14 rounded-2xl border-2 border-slate-100 gap-2 font-bold text-slate-700 hover:bg-slate-50"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pedido.clients?.address || "" )}`, "_blank")}
                  >
                    <Navigation className="w-5 h-5 text-blue-500" /> Maps
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-14 rounded-2xl border-2 border-slate-100 gap-2 font-bold text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      const phone = pedido.clients?.phone?.replace(/\D/g, "");
                      const whatsapp = phone?.startsWith("55") ? phone : `55${phone}`;
                      window.open(`https://wa.me/${whatsapp}`, "_blank" );
                    }}
                  >
                    <MessageCircle className="w-5 h-5 text-green-500" /> WhatsApp
                  </Button>
                </div>

                {/* Botões de Ação Logística */}
                <div className="pt-2">
                  {pedido.status === "Pronto" ? (
                    <Button 
                      className="w-full h-16 rounded-[1.5rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-lg gap-3 shadow-xl shadow-slate-200"
                      onClick={() => atualizarStatus(pedido, "Em Rota")}
                      disabled={updating === pedido.id}
                    >
                      {updating === pedido.id ? <Loader2 className="animate-spin" /> : <Truck className="w-6 h-6" />}
                      INICIAR ENTREGA
                    </Button>
                  ) : (
                    <div className="flex gap-3">
                      <Button 
                        variant="outline"
                        className="flex-1 h-16 rounded-[1.5rem] border-2 border-red-100 text-red-600 font-black gap-2 hover:bg-red-50" 
                        onClick={() => confirm("Confirmar que a entrega não foi realizada?") && atualizarStatus(pedido, "Pronto")}
                        disabled={updating === pedido.id}
                      >
                        <XCircle className="w-6 h-6" />
                        FALHOU
                      </Button>
                      <Button 
                        className="flex-[2] h-16 rounded-[1.5rem] bg-green-600 hover:bg-green-700 text-white font-black text-lg gap-3 shadow-xl shadow-green-100"
                        onClick={() => atualizarStatus(pedido, "Entregue")}
                        disabled={updating === pedido.id}
                      >
                        {updating === pedido.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                        ENTREGUE
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
