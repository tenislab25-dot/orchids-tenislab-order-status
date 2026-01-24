"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Phone, Package, Loader2, CheckCircle2, XCircle, AlertCircle, Edit, Save, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function RotaAtivaPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const router = useRouter();
  const { role, loading: loadingAuth } = useAuth();

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
        .order("failed_delivery", { ascending: true }) // Pedidos sem falha primeiro
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Filtrar apenas por status: Coleta, Pronto, Em Rota
      // SEM filtro de data - se está nesses status, deve aparecer!
      const filtrados = data?.filter(pedido => {
        const s = pedido.status;
        
        // EXCLUIR retiradas
        if (pedido.tipo_entrega === 'retirada') {
          return false;
        }
        
        // Incluir apenas: Coleta, Pronto, Em Rota
        return s === "Coleta" || s === "Pronto" || s === "Em Rota";
      });

      setPedidos(filtrados || []);
    } catch (error: any) {
      console.error("Erro ao carregar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
    
    // Atualização automática apenas para Admin/Atendente (modo observador)
    if (role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'atendente') {
      const interval = setInterval(fetchPedidos, 10000); // Atualiza a cada 10 segundos
      return () => clearInterval(interval);
    }
  }, [role]);

  const atualizarStatus = async (pedido: any, novoStatus: string) => {
    try {
      setUpdating(pedido.id);

      // Salvar status anterior antes de mudar para Em Rota
      const updateData: any = { status: novoStatus };
      if (novoStatus === "Em Rota") {
        updateData.previous_status = pedido.status;
        updateData.failed_delivery = false; // Limpar flag de falha ao tentar novamente
      }

      const { error } = await supabase
        .from("service_orders")
        .update(updateData)
        .eq("id", pedido.id);

      if (error) throw error;

      // Abrir WhatsApp se for A CAMINHO ou NOVA TENTATIVA
      if (novoStatus === "Em Rota") {
        const phone = pedido.clients?.phone?.replace(/\D/g, "");
        if (phone) {
          const whatsapp = phone.startsWith("55") ? phone : `55${phone}`;
          const isColeta = pedido.status === "Coleta";
          const isNovaTentativa = pedido.failed_delivery;
          
          let mensagem;
          if (isNovaTentativa) {
            // Mensagens para NOVA TENTATIVA
            mensagem = isColeta
              ? `Olá ${pedido.clients.name}! 🔄\n\nEstamos fazendo uma *NOVA TENTATIVA DE COLETA*! Nosso entregador está a caminho do seu endereço novamente para buscar seus tênis. ✨\n\nAguarde, em breve ele chegará!\n\n*OS #${pedido.os_number}*`
              : `Olá ${pedido.clients.name}! 🔄\n\nEstamos fazendo uma *NOVA TENTATIVA DE ENTREGA*! Nosso entregador está a caminho do seu endereço novamente com seus tênis. ✨\n\nAguarde, em breve ele chegará!\n\n*OS #${pedido.os_number}*`;
          } else {
            // Mensagens para primeira tentativa (A CAMINHO)
            mensagem = isColeta
              ? `Olá ${pedido.clients.name}! 🚚\n\nEstamos a caminho para buscar seus tênis! Nosso entregador está indo até você agora. ✨\n\nEm breve chegaremos! Qualquer dúvida, estamos à disposição.\n\n*OS #${pedido.os_number}*`
              : `Olá ${pedido.clients.name}! 🚚\n\nSeus tênis estão a caminho! Nosso entregador está indo até você agora. ✨\n\nEm breve chegaremos! Qualquer dúvida, estamos à disposição.\n\n*OS #${pedido.os_number}*`;
          }
          
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

  const marcarComoFalhou = async (pedido: any) => {
    try {
      setUpdating(pedido.id);

      // Voltar ao status anterior e marcar como falha
      const { error } = await supabase
        .from("service_orders")
        .update({
          status: pedido.previous_status || "Pronto",
          failed_delivery: true,
        })
        .eq("id", pedido.id);

      if (error) throw error;

      toast.success("Entrega marcada como falha. Pedido movido para o final da fila.");
      fetchPedidos();
    } catch (error: any) {
      console.error("Erro ao marcar falha:", error);
      toast.error("Erro ao marcar falha");
    } finally {
      setUpdating(null);
    }
  };

  const salvarObservacoes = async (pedidoId: string) => {
    try {
      const { error } = await supabase
        .from("service_orders")
        .update({ delivery_notes: notesText })
        .eq("id", pedidoId);

      if (error) throw error;

      toast.success("Observações salvas!");
      setEditingNotes(null);
      setNotesText("");
      fetchPedidos();
    } catch (error: any) {
      console.error("Erro ao salvar observações:", error);
      toast.error("Erro ao salvar observações");
    }
  };

  const finalizarRota = async () => {
    if (!confirm("Finalizar rota? Pedidos não concluídos voltarão para aguardando.")) {
      return;
    }
    
    try {
      // Voltar pedidos "Em Rota" para status anterior
      const pedidosEmRota = pedidos.filter(p => p.status === "Em Rota");
      
      for (const pedido of pedidosEmRota) {
        await supabase
          .from("service_orders")
          .update({ status: pedido.previous_status || "Pronto" })
          .eq("id", pedido.id);
      }
      
      localStorage.removeItem("tenislab_rota_ativa");
      localStorage.removeItem("tenislab_motoboy_name");
      toast.success("Rota finalizada! Pedidos não concluídos voltaram para aguardando.");
      router.push("/interno/entregas");
    } catch (error: any) {
      console.error("Erro ao finalizar rota:", error);
      toast.error("Erro ao finalizar rota");
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

  // Mostrar loading enquanto carrega autenticação
  if (loadingAuth || loadingPedidos) {
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
  const canEditNotes = role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'atendente';

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
            {role?.toLowerCase() === 'entregador' && (
              <Button
                onClick={finalizarRota}
                className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
              >
                Finalizar Rota
              </Button>
            )}
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

                  {/* Observações */}
                  {pedido.delivery_notes && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-800">Observações:</p>
                          <p className="text-sm text-amber-700">{pedido.delivery_notes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirMaps(pedido)}
                      className="w-full"
                    >
                      <MapPin className="w-4 h-4 mr-1" />
                      Maps
                    </Button>
                    {role?.toLowerCase() === 'entregador' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => marcarComoFalhou(pedido)}
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                          disabled={updating === pedido.id}
                        >
                          {updating === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                          FALHOU
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const isColeta = pedido.previous_status === "Coleta";
                            const action = isColeta ? "COLETADO" : "ENTREGUE";
                            if (confirm(`Confirmar que o pedido foi ${action}?`)) {
                              atualizarStatus(pedido, isColeta ? "Recebido" : "Entregue");
                            }
                          }}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          disabled={updating === pedido.id}
                        >
                          {updating === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                          {pedido.previous_status === "Coleta" ? "COLETADO" : "ENTREGUE"}
                        </Button>
                      </div>
                    )}
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
              {pedidosAguardando.map((pedido, index) => (
                <div
                  key={pedido.id}
                  className={`border-2 rounded-xl p-4 ${
                    pedido.failed_delivery
                      ? "border-red-300 bg-red-50"
                      : index === 0
                      ? "border-green-400 bg-green-50 shadow-lg"
                      : "border-amber-100"
                  }`}
                >
                  {index === 0 && !pedido.failed_delivery && (
                    <div className="mb-2">
                      <Badge className="bg-green-600 text-white font-bold">
                        🎯 PRÓXIMA ENTREGA
                      </Badge>
                    </div>
                  )}
                  {pedido.failed_delivery && (
                    <div className="mb-2">
                      <Badge className="bg-red-600 text-white font-bold">
                        ⚠️ FALHA
                      </Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-800">{pedido.clients?.name}</h3>
                        <Badge
                          className={
                            pedido.status === "Coleta"
                              ? "bg-orange-500 text-white"
                              : "bg-blue-500 text-white"
                          }
                        >
                          {pedido.status === "Coleta" ? "📦 COLETA" : "🚚 ENTREGA"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">OS #{pedido.os_number}</p>
                    </div>
                  </div>

                  {/* Observações */}
                  {editingNotes === pedido.id ? (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Ex: Cliente só pode receber até as 16h"
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm mb-2"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => salvarObservacoes(pedido.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingNotes(null);
                            setNotesText("");
                          }}
                        >
                          <XIcon className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : pedido.delivery_notes ? (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-amber-800">Observações:</p>
                          <p className="text-sm text-amber-700">{pedido.delivery_notes}</p>
                        </div>
                        {canEditNotes && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingNotes(pedido.id);
                              setNotesText(pedido.delivery_notes || "");
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : canEditNotes ? (
                    <div className="mb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingNotes(pedido.id);
                          setNotesText("");
                        }}
                        className="w-full border-dashed"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Adicionar Observações
                      </Button>
                    </div>
                  ) : null}

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
                    {role?.toLowerCase() === 'entregador' && (
                      <Button
                        size="sm"
                        onClick={() => atualizarStatus(pedido, "Em Rota")}
                        className={`flex-1 ${
                          pedido.failed_delivery
                            ? "bg-orange-600 hover:bg-orange-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                        disabled={updating === pedido.id}
                      >
                        {updating === pedido.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <MapPin className="w-4 h-4 mr-1" />
                            {pedido.failed_delivery ? "NOVA TENTATIVA" : "A CAMINHO"}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
