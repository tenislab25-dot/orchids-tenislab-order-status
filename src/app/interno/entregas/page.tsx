"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, MapPin, Navigation, CheckCircle2, 
  Truck, Loader2, Package, XCircle, Phone, MessageCircle,
  Clock, Hash, UserPlus, ChevronUp, ChevronDown, GripVertical, Route
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
  const [showColetaModal, setShowColetaModal] = useState(false);
  const [coletaForm, setColetaForm] = useState({
    name: '',
    phone: '',
    plusCode: '',
    complement: '',
    deliveryDate: ''
  });
  const [savingColeta, setSavingColeta] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [clienteSuggestions, setClienteSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newPedidos = [...pedidos];
    [newPedidos[index - 1], newPedidos[index]] = [newPedidos[index], newPedidos[index - 1]];
    setPedidos(newPedidos);
    toast.success('Ordem atualizada');
  };

  const moveDown = (index: number) => {
    if (index === pedidos.length - 1) return;
    const newPedidos = [...pedidos];
    [newPedidos[index], newPedidos[index + 1]] = [newPedidos[index + 1], newPedidos[index]];
    setPedidos(newPedidos);
    toast.success('Ordem atualizada');
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newPedidos = [...pedidos];
    const draggedItem = newPedidos[draggedIndex];
    newPedidos.splice(draggedIndex, 1);
    newPedidos.splice(index, 0, draggedItem);
    
    setPedidos(newPedidos);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const searchClientes = async (query: string) => {
    if (query.length < 2) {
      setClienteSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setClienteSuggestions(data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const selectCliente = (cliente: any) => {
    setSelectedClient(cliente);
    setColetaForm({
      name: cliente.name,
      phone: cliente.phone,
      plusCode: cliente.plus_code || '',
      complement: cliente.complement || '',
      deliveryDate: ''
    });
    setShowSuggestions(false);
  };

  const handleOptimizeRoute = async () => {
    try {
      toast.info('Otimizando rota...');

      // Importar biblioteca de Plus Code
      const OpenLocationCode = (await import('open-location-code')).default;
      const olc = new OpenLocationCode();

      // Coordenadas da loja (ponto de partida)
      const LOJA_LAT = -9.620027;
      const LOJA_LNG = -35.709397;

      // Coletar e converter coordenadas dos pedidos
      const waypoints = [];
      
      for (const p of pedidos) {
        let lat, lng;
        
        // Priorizar coordenadas diretas
        const coords = p.clients?.coordinates;
        if (coords && coords.trim()) {
          const parts = coords.split(',').map(c => parseFloat(c.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            lat = parts[0];
            lng = parts[1];
          }
        }
        
        // Fallback para Plus Code (conversão local)
        if (!lat && !lng) {
          const plusCode = p.clients?.plus_code;
          if (plusCode && plusCode.trim()) {
            try {
              // Remover cidade/estado se houver (ex: "97HR+2JF Maceió, AL" -> "97HR+2JF")
              const code = plusCode.split(' ')[0];
              
              // Decodificar Plus Code
              const decoded = olc.decode(code);
              lat = decoded.latitudeCenter;
              lng = decoded.longitudeCenter;
            } catch (error) {
              console.warn(`Não foi possível decodificar Plus Code da OS ${p.os_number}:`, error);
            }
          }
        }
        
        if (lat && lng) {
          waypoints.push({
            id: p.id,
            lat,
            lng,
            osNumber: p.os_number,
            clientName: p.clients?.name
          });
        }
      }

      if (waypoints.length < 1) {
        toast.error('Nenhuma entrega com localização válida encontrada');
        return;
      }

      // Algoritmo do vizinho mais próximo (começando da loja)
      const optimized = [];
      const remaining = [...waypoints];
      let currentLat = LOJA_LAT;
      let currentLng = LOJA_LNG;

      while (remaining.length > 0) {
        // Encontrar o ponto mais próximo
        let nearestIndex = 0;
        let minDistance = calculateDistance(currentLat, currentLng, remaining[0].lat, remaining[0].lng);

        for (let i = 1; i < remaining.length; i++) {
          const distance = calculateDistance(currentLat, currentLng, remaining[i].lat, remaining[i].lng);
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = i;
          }
        }

        // Mover o ponto mais próximo para a rota otimizada
        const nearest = remaining.splice(nearestIndex, 1)[0];
        optimized.push(nearest);
        currentLat = nearest.lat;
        currentLng = nearest.lng;
      }

      // Reordenar pedidos conforme rota otimizada
      const reordered = optimized.map(wp => 
        pedidos.find(p => p.id === wp.id)
      ).filter(Boolean);

      setPedidos(reordered);
      toast.success(`Rota otimizada! ${reordered.length} entregas ordenadas.`);
      
    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
      toast.error('Erro ao otimizar rota.');
    }
  };

  // Função auxiliar para calcular distância entre dois pontos (Haversine)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Raio da Terra em km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (degrees: number) => {
    return degrees * (Math.PI / 180);
  };

  const fetchPedidos = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
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
        `);

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) throw error;

      // Filtra pedidos:
      // 1. Status "Coleta" - precisa ir buscar o tênis
      // 2. Status "Pronto" ou "Em Rota" + tipo_entrega = 'entrega' - precisa entregar
      const filtrados = data?.filter(pedido => {
        const s = pedido.status;
        
        // Se é coleta, sempre aparece (precisa buscar o tênis)
        if (s === "Coleta") return true;
        
        // Se é Pronto ou Em Rota, verifica se é entrega
        const isEntrega = pedido.tipo_entrega === 'entrega' || !pedido.tipo_entrega;
        return (s === "Pronto" || s === "Em Rota") && isEntrega;
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
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowColetaModal(true)}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-full font-bold"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Coleta
            </Button>
            <Button
              onClick={handleOptimizeRoute}
              disabled={pedidos.length === 0}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white rounded-full font-bold"
            >
              <Route className="w-4 h-4 mr-1" />
              Otimizar
            </Button>
            <Badge className="bg-blue-500 text-white border-none px-4 py-1 rounded-full font-black">
              {pedidos.length}
            </Badge>
          </div>
        </div>
      </header>

      <main className="p-4 w-full mt-4">
        {pedidos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 shadow-sm max-w-2xl mx-auto">
            <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">Nenhuma entrega pendente no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pedidos.map((pedido, index) => (
              <div
                key={pedido.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`${draggedIndex === index ? 'opacity-50' : ''} cursor-move`}
              >
              <Card className="border-none shadow-lg shadow-slate-200/50 overflow-hidden rounded-2xl bg-white animate-in fade-in slide-in-from-bottom-4">
                <CardContent className="p-4 space-y-3">
                  {/* Cabeçalho do Card com Botões de Reordenação */}
                  <div className="flex justify-between items-start gap-3">
                    {/* Botões de Reordenação */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="h-8 w-8 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4 text-slate-600" />
                      </Button>
                      <div className="flex items-center justify-center">
                        <GripVertical className="w-4 h-4 text-slate-400" />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveDown(index)}
                        disabled={index === pedidos.length - 1}
                        className="h-8 w-8 rounded-lg hover:bg-slate-100 disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4 text-slate-600" />
                      </Button>
                    </div>

                    {/* Informações do Pedido */}
                    <div className="flex-1 flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-sm font-black text-blue-600">#{index + 1}</span>
                          <Hash className="w-3 h-3" />
                          <span className="text-xs font-black uppercase tracking-widest">{pedido.os_number}</span>
                        </div>
                        <h2 className="text-lg font-black text-slate-900 leading-tight">
                          {pedido.clients?.name || "Cliente não identificado"}
                        </h2>
                        {pedido.delivery_date && (
                          <div className="flex items-center gap-1 text-slate-400 mt-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs font-medium">
                              {pedido.delivery_date.split('-').reverse().join('/')}
                            </span>
                          </div>
                        )}
                      </div>
                      <Badge className={`${
                        pedido.status === 'Coleta' ? 'bg-purple-100 text-purple-700' :
                        pedido.status === 'Em Rota' ? 'bg-amber-100 text-amber-700' : 
                        'bg-green-100 text-green-700'
                      } border-none font-bold px-3 py-1`}>
                        {pedido.status === 'Coleta' ? 'COLETA' : pedido.status === 'Em Rota' ? 'EM ROTA' : 'PRONTO'}
                      </Badge>
                    </div>
                  </div>

                {/* Informações de Endereço e Contato */}
                <div className="bg-slate-50 rounded-2xl p-3 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Localização</p>
                      <p className="text-slate-700 font-medium leading-snug mt-0.5">
                        {pedido.clients?.plus_code || pedido.clients?.coordinates || pedido.clients?.complement || "Localização não cadastrada"}
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

                {/* Botões de Navegação e Comunicação */}
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    className="h-10 rounded-xl border-2 border-slate-200 text-xs font-bold"
                    onClick={() => router.push(`/interno/entregas/editar/${pedido.id}`)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500 mr-1"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-10 rounded-xl border-2 border-slate-200 text-xs font-bold"
                    onClick={() => {
                      const location = pedido.clients?.plus_code || pedido.clients?.coordinates || pedido.clients?.complement || "";
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`, "_blank");
                    }}
                  >
                    <Navigation className="w-3.5 h-3.5 text-blue-500 mr-1" />
                    Maps
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-10 rounded-xl border-2 border-slate-200 text-xs font-bold"
                    onClick={() => {
                      const phone = pedido.clients?.phone?.replace(/\D/g, "");
                      const whatsapp = phone?.startsWith("55") ? phone : `55${phone}`;
                      window.open(`https://wa.me/${whatsapp}`, "_blank" );
                    }}
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-green-500 mr-1" />
                    Zap
                  </Button>
                </div>

                {/* Botões de Ação Logística */}
                <div className="pt-2">
                  {pedido.status === "Coleta" ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className="flex-1 h-12 rounded-xl border-2 border-red-100 text-red-600 font-bold text-sm hover:bg-red-50"
                        onClick={async () => {
                          if (confirm(`Confirmar exclusão da OS #${pedido.os_number}? Esta ação não pode ser desfeita.`)) {
                            try {
                              setUpdating(pedido.id);
                              const { error } = await supabase
                                .from('service_orders')
                                .delete()
                                .eq('id', pedido.id);
                              
                              if (error) throw error;
                              toast.success('OS excluída com sucesso');
                              fetchPedidos();
                            } catch (error: any) {
                              toast.error('Erro ao excluir: ' + error.message);
                            } finally {
                              setUpdating(null);
                            }
                          }
                        }}
                        disabled={updating === pedido.id}
                      >
                        {updating === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        NÃO COLETADO
                      </Button>
                      <Button 
                        className="flex-[2] h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-lg"
                        onClick={() => atualizarStatus(pedido, "Recebido")}
                        disabled={updating === pedido.id}
                      >
                        {updating === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        COLETADO
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline"
                        className="flex-1 h-12 rounded-xl border-2 border-red-100 text-red-600 font-bold text-sm hover:bg-red-50" 
                        onClick={() => confirm("Confirmar que a entrega não foi realizada?") && atualizarStatus(pedido, "Pronto")}
                        disabled={updating === pedido.id}
                      >
                        <XCircle className="w-4 h-4" />
                        FALHOU
                      </Button>
                      <Button 
                        className="flex-[2] h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-lg"
                        onClick={() => atualizarStatus(pedido, "Entregue")}
                        disabled={updating === pedido.id}
                      >
                        {updating === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        ENTREGUE
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            </div>
          ))}
          </div>
        )}
      </main>

      {/* Modal Adicionar Coleta */}
      {showColetaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => {
          setShowColetaModal(false);
          setSelectedClient(null);
          setShowSuggestions(false);
          setClienteSuggestions([]);
        }}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Adicionar Coleta</h2>
              <Button variant="ghost" size="icon" onClick={() => {
                setShowColetaModal(false);
                setSelectedClient(null);
                setShowSuggestions(false);
                setClienteSuggestions([]);
              }}>
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <label className="text-sm font-bold text-slate-700 mb-1 block">Nome do Cliente</label>
                <input
                  type="text"
                  value={coletaForm.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setColetaForm({ ...coletaForm, name: value });
                    setSelectedClient(null);
                    searchClientes(value);
                  }}
                  onFocus={() => {
                    if (coletaForm.name.length >= 2) {
                      searchClientes(coletaForm.name);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="Digite o nome para buscar..."
                />
                
                {/* Dropdown de sugestões */}
                {showSuggestions && clienteSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {clienteSuggestions.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => selectCliente(cliente)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <div className="font-bold text-slate-900">{cliente.name}</div>
                        <div className="text-sm text-slate-500">{cliente.phone}</div>
                        {cliente.complement && (
                          <div className="text-xs text-slate-400 mt-1">{cliente.complement}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Indicador de cliente existente */}
                {selectedClient && (
                  <div className="mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-bold text-green-700">✅ Cliente já cadastrado! Dados preenchidos automaticamente.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Telefone</label>
                <input
                  type="tel"
                  value={coletaForm.phone}
                  onChange={(e) => setColetaForm({ ...coletaForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="(82) 99999-9999"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Plus Code / Coordenadas</label>
                <input
                  type="text"
                  value={coletaForm.plusCode}
                  onChange={(e) => setColetaForm({ ...coletaForm, plusCode: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="97HR+H3V ou -9.123,-35.456"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Complemento</label>
                <input
                  type="text"
                  value={coletaForm.complement}
                  onChange={(e) => setColetaForm({ ...coletaForm, complement: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="Apt 101, Bloco A"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Data da Coleta</label>
                <input
                  type="date"
                  value={coletaForm.deliveryDate}
                  onChange={(e) => setColetaForm({ ...coletaForm, deliveryDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                />
              </div>

            </div>

            <Button
              onClick={async () => {
                try {
                  setSavingColeta(true);
                  
                  // Validações
                  if (!coletaForm.name || !coletaForm.phone) {
                    toast.error('Preencha nome e telefone');
                    setSavingColeta(false);
                    return;
                  }

                  let clientData;
                  
                  // Se já selecionou um cliente existente, atualiza os dados dele
                  if (selectedClient) {
                    // Processa coordenadas se fornecidas (formato: lat,lng)
                    let coordinates = null;
                    if (coletaForm.plusCode && coletaForm.plusCode.includes(',')) {
                      const [lat, lng] = coletaForm.plusCode.split(',').map(s => parseFloat(s.trim()));
                      if (!isNaN(lat) && !isNaN(lng)) {
                        coordinates = JSON.stringify({ lat, lng });
                      }
                    }

                    // Atualiza dados do cliente existente
                    const { error: updateError } = await supabase
                      .from('clients')
                      .update({
                        phone: coletaForm.phone,
                        plus_code: coletaForm.plusCode || null,
                        coordinates: coordinates,
                        complement: coletaForm.complement || null
                      })
                      .eq('id', selectedClient.id);

                    if (updateError) throw updateError;
                    
                    // Atualiza clientData com os novos valores
                    clientData = {
                      ...selectedClient,
                      phone: coletaForm.phone,
                      plus_code: coletaForm.plusCode || null,
                      coordinates: coordinates,
                      complement: coletaForm.complement || null
                    };
                  } else {
                    // Processa coordenadas se fornecidas (formato: lat,lng)
                    let coordinates = null;
                    if (coletaForm.plusCode && coletaForm.plusCode.includes(',')) {
                      const [lat, lng] = coletaForm.plusCode.split(',').map(s => parseFloat(s.trim()));
                      if (!isNaN(lat) && !isNaN(lng)) {
                        coordinates = JSON.stringify({ lat, lng });
                      }
                    }

                    // Cria novo cliente
                    const { data: newClientData, error: clientError } = await supabase
                      .from('clients')
                      .insert({
                        name: coletaForm.name.toUpperCase(),
                        phone: coletaForm.phone,
                        plus_code: coletaForm.plusCode || null,
                        coordinates: coordinates,
                        complement: coletaForm.complement || null
                      })
                      .select();

                    if (clientError) throw clientError;
                    clientData = newClientData && newClientData.length > 0 ? newClientData[0] : null;
                    if (!clientData) throw new Error('Erro ao criar cliente');
                  }

                  // Gera número da OS no formato 000001/2026
                  const currentYear = new Date().getFullYear();
                  const { data: lastOSArray } = await supabase
                    .from('service_orders')
                    .select('os_number')
                    .like('os_number', `%/${currentYear}`)
                    .order('created_at', { ascending: false })
                    .limit(1);
                  
                  const lastOS = lastOSArray && lastOSArray.length > 0 ? lastOSArray[0] : null;

                  let nextNumber = 1;
                  if (lastOS?.os_number) {
                    const [numPart] = lastOS.os_number.split('/');
                    nextNumber = parseInt(numPart) + 1;
                  }
                  const newOsNumber = `${String(nextNumber).padStart(3, '0')}/${currentYear}`;

                  // Cria a OS com status "Coleta"
                  const { error: osError } = await supabase
                    .from('service_orders')
                    .insert({
                      os_number: newOsNumber,
                      client_id: clientData.id,
                      status: 'Coleta',
                      entry_date: new Date().toISOString().split('T')[0],
                      delivery_date: coletaForm.deliveryDate || null,
                      items: [],
                      total: 0
                    });

                  if (osError) throw osError;

                  toast.success(`Coleta cadastrada! OS #${newOsNumber} criada com sucesso.`);
                  setShowColetaModal(false);
                  setColetaForm({ name: '', phone: '', plusCode: '', complement: '', deliveryDate: '' });
                  setSelectedClient(null);
                  setShowSuggestions(false);
                  setClienteSuggestions([]);
                  fetchPedidos();
                } catch (error: any) {
                  console.error('Erro ao cadastrar cliente:', error);
                  toast.error('Erro ao cadastrar: ' + error.message);
                } finally {
                  setSavingColeta(false);
                }
              }}
              disabled={savingColeta}
              className="w-full h-14 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black"
            >
              {savingColeta ? <Loader2 className="animate-spin" /> : '🏠 Cadastrar Cliente'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
