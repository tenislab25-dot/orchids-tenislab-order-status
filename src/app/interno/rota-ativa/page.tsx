"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Phone, Package, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function RotaAtivaPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const router = useRouter();
  const { role, loading: loadingAuth } = useAuth();

  // Redirecionar se não for entregador
  useEffect(() => {
    // Só redireciona se o role já foi carregado E não é entregador
    if (!loadingAuth && role && role.toLowerCase() !== "entregador") {
      toast.error("Acesso negado");
      router.push("/interno/entregas");
    }
  }, [role, loadingAuth, router]);

  // Mostrar loading enquanto verifica permissões
  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    );
  }

  const fetchPedidos = async () => {
    try {
      setLoadingPedidos(true);
      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          *,
          clients (
            name,
            phone,
            plus_code,
            coordinates,
            complement
          )
        `)
        .in("status", ["Pronto", "Coleta", "Em Rota"])
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setPedidos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
    // Atualizar a cada 10 segundos
    const interval = setInterval(fetchPedidos, 10000);
    return () => clearInterval(interval);
  }, []);

  const atualizarStatus = async (pedido: any, novoStatus: string) => {
    try {
      setUpdating(pedido.id);

      // Salvar status anterior antes de mudar para Em Rota
      const updateData: any = { status: novoStatus };
      if (novoStatus === "Em Rota") {
        updateData.previous_status = pedido.status;
      }

      const { error } = await supabase
        .from("service_orders")
        .update(updateData)
        .eq("id", pedido.id);

      if (error) throw error;

      // Abrir WhatsApp se for A CAMINHO
      if (novoStatus === "Em Rota") {
        const phone = pedido.clients?.phone?.replace(/\D/g, "");
        if (phone) {
          const whatsapp = phone.startsWith("55") ? phone : `55${phone}`;
          const isColeta = pedido.status === "Coleta";
          const mensagem = isColeta
            ? `Olá ${pedido.clients.name}! Nosso entregador está *A CAMINHO DO SEU ENDEREÇO* para *COLETAR* seu tênis! 👟\n\nAguarde, em breve ele chegará para buscar seu tênis.\n\n*OS #${pedido.os_number}*`
            : `Olá ${pedido.clients.name}! Seu pedido está *A CAMINHO DO SEU ENDEREÇO*! 🚚\n\nNosso entregador já saiu para realizar a *ENTREGA*. Aguarde, em breve ele chegará!\n\n*OS #${pedido.os_number}*`;
          
          window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagem)}`, "_blank");
        }
      }

      toast.success(`Status atualizado para ${novoStatus}`);
      fetchPedidos();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setUpdating(null);
    }
  };

  const finalizarRota = () => {
    if (confirm("Finalizar rota? Pedidos concluídos serão removidos da lista.")) {
      localStorage.removeItem("tenislab_rota_ativa");
      localStorage.removeItem("tenislab_motoboy_name");
      toast.success("Rota finalizada!");
      router.push("/interno/entregas");
    }
  };

  const abrirMaps = (pedido: any) => {
    if (pedido.clients?.coordinates) {
      const [lat, lng] = pedido.clients.coordinates.split(",");
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
    } else if (pedido.clients?.plus_code) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${pedido.clients.plus_code}`, "_blank");
    } else {
      toast.error("Endereço não disponível");
    }
  };

  if (loadingPedidos) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando rota...</p>
        </div>
      </div>
    );
  }

  const pedidosEmRota = pedidos.filter(p => p.status === "Em Rota");
  const pedidosAguardando = pedidos.filter(p => p.status === "Pronto" || p.status === "Coleta");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/interno/entregas")}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-gray-800">Rota Ativa</h1>
              <p className="text-sm text-gray-600">
                {pedidosEmRota.length} em rota • {pedidosAguardando.length} aguardando
              </p>
            </div>
            <Button
              onClick={finalizarRota}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
            >
              Finalizar Rota
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Em Rota */}
        {pedidosEmRota.length > 0 && (
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-800">Em Rota</h2>
                <p className="text-sm text-gray-600">Pedidos sendo entregues</p>
              </div>
              <Badge className="bg-blue-500 text-white">{pedidosEmRota.length}</Badge>
            </div>

            <div className="space-y-3">
              {pedidosEmRota.map((pedido, index) => (
                <div
                  key={pedido.id}
                  className="border-2 border-blue-100 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-blue-600 text-white font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                      #{index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800">{pedido.clients?.name}</h3>
                        {pedido.previous_status === "Coleta" && (
                          <Badge className="bg-orange-500 text-white text-xs">📦 COLETA</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">OS #{pedido.os_number}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirMaps(pedido)}
                      className="flex-1"
                    >
                      <MapPin className="w-4 h-4 mr-1" />
                      Maps
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => atualizarStatus(pedido, pedido.previous_status || "Pronto")}
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                      disabled={updating === pedido.id}
                    >
                      {updating === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                      FALHOU
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => atualizarStatus(pedido, pedido.previous_status === "Coleta" ? "Recebido" : "Entregue")}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      disabled={updating === pedido.id}
                    >
                      {updating === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                      {pedido.previous_status === "Coleta" ? "COLETADO" : "ENTREGUE"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Aguardando */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-100 p-3 rounded-full">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">Aguardando</h2>
              <p className="text-sm text-gray-600">Próximas entregas</p>
            </div>
            <Badge className="bg-amber-500 text-white">{pedidosAguardando.length}</Badge>
          </div>

          {pedidosAguardando.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum pedido aguardando</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pedidosAguardando.map((pedido) => (
                <div
                  key={pedido.id}
                  className="border-2 border-amber-100 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800">{pedido.clients?.name}</h3>
                        <Badge
                          className={
                            pedido.status === "Coleta"
                              ? "bg-orange-500 text-white text-xs"
                              : "bg-green-500 text-white text-xs"
                          }
                        >
                          {pedido.status === "Coleta" ? "📦 COLETA" : "✅ PRONTO"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">OS #{pedido.os_number}</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => atualizarStatus(pedido, "Em Rota")}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={updating === pedido.id}
                  >
                    {updating === pedido.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <MapPin className="w-4 h-4 mr-2" />
                    )}
                    A CAMINHO
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
