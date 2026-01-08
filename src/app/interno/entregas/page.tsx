"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, MapPin, Navigation, CheckCircle2, 
  Truck, Loader2, Package, XCircle, Phone, MessageCircle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function EntregasSimplesPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

   const fetchPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // FILTRO BLINDADO: Aceita "Pronto para entrega", "Pronto p/ entrega" e "Em Rota"
      const filtrados = data?.filter(pedido => {
        const s = pedido.status?.toLowerCase() || "";
        return (
          s.includes("pronto") && (s.includes("entrega") || s.includes("retirada")) ||
          s === "em rota"
        );
      });

      setPedidos(filtrados || []);
    } catch (error: any) {
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const atualizarStatus = async (id: string, novoStatus: string) => {
    try {
      setUpdating(id);
      const { error } = await supabase
        .from("service_orders")
        .update({ status: novoStatus })
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`Status atualizado para: ${novoStatus}`);
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
      <p className="text-slate-500 font-medium">Buscando pedidos...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-10">
      <header className="bg-white p-4 border-b flex items-center gap-3 sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.push("/interno")} className="rounded-full">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="font-bold text-slate-900 text-lg">Pedidos para Entrega</h1>
        <span className="ml-auto bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">
          {pedidos.length} total
        </span>
      </header>

      <main className="p-4 max-w-2xl mx-auto w-full space-y-4">
        {pedidos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Nenhum pedido pronto para entrega.</p>
          </div>
        ) : (
          pedidos.map((pedido) => (
            <Card key={pedido.id} className="border-none shadow-sm overflow-hidden rounded-2xl">
              <CardContent className="p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-4">
                    <h2 className="text-xl font-black text-slate-900 leading-tight">{pedido.client_name}</h2>
                    <p className="text-slate-500 text-sm flex items-start gap-1.5 mt-1">
                      <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" /> 
                      {pedido.address || "Endereço não informado"}
                    </p>
                    {pedido.phone && (
                      <p className="text-slate-500 text-sm flex items-start gap-1.5 mt-1">
                        <a href={`tel:${pedido.phone}`} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                          <Phone className="w-4 h-4 shrink-0 mt-0.5" /> 
                          {pedido.phone}
                        </a>
                      </p>
                    )}
                    {pedido.description && (
                      <p className="text-slate-500 text-sm mt-2">
                        <span className="font-semibold">Serviço:</span> {pedido.description}
                      </p>
                    )}
                    {pedido.created_at && (
                      <p className="text-slate-500 text-xs mt-2">
                        <span className="font-semibold">Criado em:</span> {format(new Date(pedido.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    {pedido.order_value && (
                      <p className="text-slate-500 text-xs mt-1">
                        <span className="font-semibold">Valor:</span> R$ {pedido.order_value.toFixed(2).replace(".", ",")}
                      </p>
                    )}
                  </div>
                  <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded uppercase shrink-0">
                    #{pedido.os_number}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl border-2 gap-2 font-bold text-slate-700"
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pedido.address   )}`, "_blank")}
                  >
                    <Navigation className="w-4 h-4 text-blue-500" /> Abrir no Google Maps
                  </Button>
                  {pedido.phone && (
                    <Button 
                      variant="outline" 
                      className="w-full h-12 rounded-xl border-2 gap-2 font-bold text-slate-700"
                      onClick={() => window.open(`https://wa.me/${pedido.phone.replace(/\D/g, "" )}`, "_blank")}
                    >
                      <MessageCircle className="w-4 h-4 text-green-500" /> Enviar WhatsApp
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  {pedido.status === "Pronto p/ Retirada" && (
                    <Button 
                      className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      onClick={() => atualizarStatus(pedido.id, "Em Rota")}
                      disabled={updating === pedido.id}
                    >
                      {updating === pedido.id ? <Loader2 className="animate-spin" /> : "Sair p/ Entrega"}
                    </Button>
                  )}

                  {pedido.status === "Em Rota" && (
                    <>
                      <Button 
                        variant="outline"
                        className="flex-1 h-12 rounded-xl border-2 border-red-100 text-red-600 font-bold gap-2 hover:bg-red-50" 
                        onClick={() => confirm("Confirmar que não foi entregue?") && atualizarStatus(pedido.id, "Pronto p/ Retirada")}
                        disabled={updating === pedido.id}
                      >
                        <XCircle className="w-5 h-5" />
                        Não Entregue
                      </Button>
                      <Button 
                        className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                        onClick={() => atualizarStatus(pedido.id, "Entregue")}
                        disabled={updating === pedido.id}
                      >
                        {updating === pedido.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                        Concluir
                      </Button>
                    </>
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
