"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Phone, MessageCircle, Package, Loader2, CheckCircle2, XCircle, AlertCircle, Edit, Save, X as XIcon, Route } from "lucide-react";
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
  
  // Estados para GPS e configuração de rota
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showRouteConfigModal, setShowRouteConfigModal] = useState(false);
  const [endPointType, setEndPointType] = useState<'current' | 'tenislab' | 'custom' | 'none'>('none');
  const [customEndPoint, setCustomEndPoint] = useState('');

  const fetchPedidos = async () => {
    try {
      setLoadingPedidos(true);
      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          id,
          os_number,
          status,
          tipo_entrega,
          delivery_date,
          pickup_date,
          delivery_notes,
          failed_delivery,
          previous_status,
          updated_at,
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

      // Obter data de hoje
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Filtrar por status E data (com exceção para coletas Em Rota)
      const filtrados = data?.filter(pedido => {
        const s = pedido.status;
        
        // EXCLUIR retiradas
        if (pedido.tipo_entrega === 'retirada') {
          return false;
        }
        
        // Incluir apenas: Coleta, Pronto, Em Rota
        if (s !== "Coleta" && s !== "Pronto" && s !== "Em Rota") {
          return false;
        }
        
        // IMPORTANTE: Coletas Em Rota sempre aparecem (independente da data)
        if (s === "Em Rota" && pedido.previous_status === "Coleta") {
          return true;
        }
        
        // Filtrar por data:
        // - Coleta: pickup_date = hoje
        // - Pronto/Em Rota (entregas): delivery_date = hoje
        if (s === "Coleta") {
          return pedido.pickup_date === todayStr;
        } else {
          // Pronto ou Em Rota (entregas)
          return pedido.delivery_date === todayStr;
        }
      });

      setPedidos(filtrados || []);
    } catch (error: any) {
      logger.error("Erro ao carregar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
    
    // Realtime subscription para atualização automática (substitui polling)
    const channel = supabase
      .channel("rota_ativa_orders")
      .on(
        "postgres_changes",
        { event: "*", table: "service_orders" },
        (payload) => {
          logger.log("Realtime update em rota ativa:", payload);
          // Delay de 300ms para dar tempo do banco atualizar previous_status
          setTimeout(() => {
            fetchPedidos();
          }, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  const atualizarStatus = async (pedido: any, novoStatus: string) => {
    // Confirmação antes de mudar status
    const isColeta = pedido.status === "Coleta";
    const confirmMessage = novoStatus === "Em Rota" 
      ? (isColeta 
          ? `🚚 Confirmar que está A CAMINHO para COLETAR os tênis de ${pedido.clients?.name}?\n\nUma mensagem será enviada via WhatsApp.`
          : `🚚 Confirmar que está A CAMINHO para ENTREGAR os tênis de ${pedido.clients?.name}?\n\nUma mensagem será enviada via WhatsApp.`)
      : novoStatus === "Recebido"
      ? `✅ Confirmar que os tênis de ${pedido.clients?.name} foram COLETADOS?`
      : novoStatus === "Entregue"
      ? `✅ Confirmar que os tênis de ${pedido.clients?.name} foram ENTREGUES?`
      : `Confirmar mudança de status para ${novoStatus}?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
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
          // Verificar se é coleta pelo status ANTERIOR (antes de mudar para Em Rota)
          const isColeta = pedido.status === "Coleta" || pedido.previous_status === "Coleta";
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
      logger.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setUpdating(null);
    }
  };

  const marcarComoFalhou = async (pedido: any) => {
    // Confirmação antes de marcar como falhou
    const isColeta = pedido.previous_status === "Coleta";
    const confirmMessage = isColeta
      ? `⚠️ Confirmar que a COLETA FALHOU?\n\nO pedido voltará para o status "${pedido.previous_status || "Pronto"}" e ficará marcado para nova tentativa.`
      : `⚠️ Confirmar que a ENTREGA FALHOU?\n\nO pedido voltará para o status "${pedido.previous_status || "Pronto"}" e ficará marcado para nova tentativa.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
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
      logger.error("Erro ao marcar falha:", error);
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
      logger.error("Erro ao salvar observações:", error);
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
      logger.error("Erro ao finalizar rota:", error);
      toast.error("Erro ao finalizar rota");
    }
  };

  const abrirMaps = (pedido: any) => {
    // Usar mesma lógica da página entregas: /maps/dir/ para navegação
    const location = pedido.clients?.plus_code || pedido.clients?.coordinates || pedido.clients?.complement || "";
    
    if (location) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`, "_blank");
    } else {
      toast.error("Endereço não disponível");
    }
  };

  const abrirWhatsApp = (pedido: any) => {
    const phone = pedido.clients?.phone?.replace(/\D/g, "");
    if (!phone) {
      toast.error("Telefone não disponível");
      return;
    }
    
    const whatsapp = phone.startsWith("55") ? phone : `55${phone}`;
    const isColeta = pedido.previous_status === "Coleta";
    
    const mensagem = isColeta
      ? `Olá ${pedido.clients.name}! 🚚\n\nEstamos a caminho para buscar seus tênis! Nosso entregador está indo até você agora. ✨\n\nEm breve chegaremos! Qualquer dúvida, estamos à disposição.\n\n*OS #${pedido.os_number}*`
      : `Olá ${pedido.clients.name}! 🚚\n\nSeus tênis estão a caminho! Nosso entregador está indo até você agora. ✨\n\nEm breve chegaremos! Qualquer dúvida, estamos à disposição.\n\n*OS #${pedido.os_number}*`;
    
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagem)}`, "_blank");
  };

  // Função para calcular distância entre dois pontos (fórmula de Haversine)
  const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Função para extrair coordenadas ou localização de diferentes formatos
  const extrairCoordenadas = (pedido: any): { lat: number; lon: number } | null => {
    const coords = pedido.clients?.coordinates;
    const plusCode = pedido.clients?.plus_code;
    const complement = pedido.clients?.complement;
    
    // Tentar extrair coordenadas numéricas primeiro
    if (coords) {
      // Formato: "lat,lon" ou "lat, lon"
      const parts = coords.split(',').map((p: string) => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { lat: parts[0], lon: parts[1] };
      }
    }
    
    // Se não tiver coordenadas numéricas, tentar Plus Code
    // Plus Codes são aceitos pelo Google Maps, então podemos usá-los
    if (plusCode && plusCode.trim()) {
      // Retornar um objeto especial indicando que é Plus Code
      // Vamos usar coordenadas fictícias para não quebrar o algoritmo
      // O Google Maps vai usar o Plus Code na URL
      return { lat: 0, lon: 0 }; // Placeholder - será substituído pelo Plus Code na URL
    }
    
    // Se não tiver nada, retornar null
    return null;
  };

  // Algoritmo do vizinho mais próximo para otimizar rota
  const otimizarRota = () => {
    if (pedidosEmRota.length === 0) {
      toast.error("Nenhum pedido Em Rota para otimizar. Vá para a página Entregas e inicie a rota primeiro!");
      return;
    }

    // Obter localização GPS atual
    toast.info('📍 Obtendo sua localização GPS...');
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setUserLocation({ lat, lng });
          toast.success(`✅ Localização obtida! Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
          
          // Abrir modal de configuração de ponto final
          setShowRouteConfigModal(true);
        },
        (error) => {
          logger.error('❌ Erro ao obter localização:', error);
          
          let errorMsg = 'Não foi possível obter sua localização.';
          if (error.code === 1) {
            errorMsg = 'Permissão de localização negada. Ative nas configurações do navegador.';
          } else if (error.code === 2) {
            errorMsg = 'Localização indisponível. Verifique se o GPS está ativo.';
          } else if (error.code === 3) {
            errorMsg = 'Tempo esgotado ao obter localização. Tente novamente.';
          }
          
          toast.error(errorMsg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      toast.error('GPS não disponível neste dispositivo');
    }
  };

  // Executar otimização após configuração
  const executeOptimizeRoute = () => {
    if (!userLocation) {
      toast.error('Localização GPS não disponível');
      return;
    }

    if (pedidosEmRota.length === 0) {
      toast.error("Nenhum pedido Em Rota para otimizar.");
      return;
    }

    const pedidosComCoordenadas = pedidosEmRota
      .map(p => ({ pedido: p, coords: extrairCoordenadas(p) }))
      .filter(p => p.coords !== null);

    if (pedidosComCoordenadas.length === 0) {
      toast.error("Nenhum pedido com coordenadas disponíveis");
      return;
    }

    if (pedidosComCoordenadas.length === 1) {
      // Se só tem 1 pedido, abrir direto
      const location = pedidosComCoordenadas[0].pedido.clients?.plus_code || 
                      pedidosComCoordenadas[0].pedido.clients?.coordinates || 
                      pedidosComCoordenadas[0].pedido.clients?.complement;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`, "_blank");
      return;
    }

    // Algoritmo do vizinho mais próximo considerando GPS inicial e ponto final
    toast.info('🧠 Otimizando rota...');
    
    const rotaOtimizada: any[] = [];
    const naoVisitados = [...pedidosComCoordenadas];
    
    // Ponto inicial: localização GPS atual
    let pontoAtual = { lat: userLocation.lat, lng: userLocation.lng };
    
    logger.log(`📍 Ponto inicial (GPS): ${pontoAtual.lat.toFixed(6)}, ${pontoAtual.lng.toFixed(6)}`);
    logger.log(`🎯 Tipo de ponto final: ${endPointType}`);
    
    // Determinar ponto final
    let pontoFinal: { lat: number, lng: number } | null = null;
    
    if (endPointType === 'current') {
      // Voltar para onde está agora
      pontoFinal = { lat: userLocation.lat, lng: userLocation.lng };
      logger.log(`🔙 Ponto final: Localização atual (GPS)`);
    } else if (endPointType === 'tenislab') {
      // Voltar para Tenislab
      const LOJA_LAT = parseFloat(process.env.NEXT_PUBLIC_STORE_LATITUDE || '-9.619938');
      const LOJA_LNG = parseFloat(process.env.NEXT_PUBLIC_STORE_LONGITUDE || '-35.709313');
      pontoFinal = { lat: LOJA_LAT, lng: LOJA_LNG };
      logger.log(`🏢 Ponto final: Tenislab (${LOJA_LAT}, ${LOJA_LNG})`);
    } else if (endPointType === 'custom' && customEndPoint.trim()) {
      // Endereço personalizado - não temos coordenadas, usar como waypoint
      logger.log(`📍 Ponto final: Endereço personalizado (${customEndPoint})`);
    } else {
      // Terminar no último ponto
      logger.log(`🎯 Ponto final: Último ponto da rota`);
    }
    
    // Algoritmo do vizinho mais próximo
    while (naoVisitados.length > 0) {
      let maisProximo = naoVisitados[0];
      let menorDistancia = calcularDistancia(
        pontoAtual.lat,
        pontoAtual.lng,
        maisProximo.coords!.lat,
        maisProximo.coords!.lon
      );
      
      // Se houver ponto final e for o último pedido, considerar distância até o ponto final
      if (pontoFinal && naoVisitados.length === 1) {
        // Último pedido - escolher o mais próximo do ponto final
        for (let i = 0; i < naoVisitados.length; i++) {
          const distanciaAteFinal = calcularDistancia(
            naoVisitados[i].coords!.lat,
            naoVisitados[i].coords!.lon,
            pontoFinal.lat,
            pontoFinal.lng
          );
          
          const distanciaAtual = calcularDistancia(
            pontoAtual.lat,
            pontoAtual.lng,
            naoVisitados[i].coords!.lat,
            naoVisitados[i].coords!.lon
          );
          
          // Considerar tanto a distância do ponto atual quanto do ponto final
          const distanciaTotal = distanciaAtual + distanciaAteFinal;
          
          if (i === 0 || distanciaTotal < menorDistancia) {
            menorDistancia = distanciaTotal;
            maisProximo = naoVisitados[i];
          }
        }
      } else {
        // Encontrar o mais próximo do ponto atual
        for (let i = 1; i < naoVisitados.length; i++) {
          const distancia = calcularDistancia(
            pontoAtual.lat,
            pontoAtual.lng,
            naoVisitados[i].coords!.lat,
            naoVisitados[i].coords!.lon
          );
          
          if (distancia < menorDistancia) {
            menorDistancia = distancia;
            maisProximo = naoVisitados[i];
          }
        }
      }
      
      // Adicionar o mais próximo à rota
      rotaOtimizada.push(maisProximo.pedido);
      pontoAtual = { lat: maisProximo.coords!.lat, lng: maisProximo.coords!.lon };
      naoVisitados.splice(naoVisitados.indexOf(maisProximo), 1);
    }
    
    logger.log(`✅ Rota otimizada com ${rotaOtimizada.length} paradas`);


    // Construir URL do Google Maps com waypoints
    // Origem: localização GPS atual
    const origem = `${userLocation.lat},${userLocation.lng}`;
    
    // Determinar destino final
    let destinoFinal: string;
    
    if (endPointType === 'current') {
      // Voltar para onde está agora
      destinoFinal = `${userLocation.lat},${userLocation.lng}`;
    } else if (endPointType === 'tenislab') {
      // Voltar para Tenislab
      const LOJA_LAT = parseFloat(process.env.NEXT_PUBLIC_STORE_LATITUDE || '-9.619938');
      const LOJA_LNG = parseFloat(process.env.NEXT_PUBLIC_STORE_LONGITUDE || '-35.709313');
      destinoFinal = `${LOJA_LAT},${LOJA_LNG}`;
    } else if (endPointType === 'custom' && customEndPoint.trim()) {
      // Endereço personalizado
      destinoFinal = customEndPoint;
    } else {
      // Terminar no último ponto
      const ultimoPedido = rotaOtimizada[rotaOtimizada.length - 1];
      destinoFinal = ultimoPedido.clients?.plus_code || ultimoPedido.clients?.coordinates || ultimoPedido.clients?.complement;
    }
    
    // Waypoints: todos os pedidos (se terminar em ponto específico) ou todos menos o último (se terminar no último pedido)
    let waypoints: string[];
    
    if (endPointType === 'none') {
      // Terminar no último pedido - waypoints são todos menos o último
      waypoints = rotaOtimizada.slice(0, -1).map(p => {
        return p.clients?.plus_code || p.clients?.coordinates || p.clients?.complement;
      }).filter(Boolean);
    } else {
      // Terminar em ponto específico - waypoints são todos os pedidos
      waypoints = rotaOtimizada.map(p => {
        return p.clients?.plus_code || p.clients?.coordinates || p.clients?.complement;
      }).filter(Boolean);
    }
    
    // Construir URL
    let mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origem)}&destination=${encodeURIComponent(destinoFinal)}`;
    
    if (waypoints.length > 0) {
      mapsUrl += `&waypoints=${waypoints.map(w => encodeURIComponent(w)).join('|')}`;
    }
    
    logger.log(`🗺️ URL do Google Maps: ${mapsUrl}`);
    
    window.open(mapsUrl, "_blank");
    toast.success(`✅ Rota otimizada com ${rotaOtimizada.length} paradas!`);

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

            {/* Botão Otimizar Rota */}
            <Button
              onClick={otimizarRota}
              className="w-full mb-4 h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              <Route className="w-5 h-5 mr-2" />
              {pedidosEmRota.length === 0 ? "Otimizar Rota" : `Otimizar Rota (${pedidosEmRota.length} paradas)`}
            </Button>

            <div className="space-y-3">
              {pedidosEmRota.map((pedido, index) => (
                <div
                  key={pedido.id}
                  className="border-2 border-blue-100 rounded-xl p-5"
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
                      {pedido.clients?.complement && (
                        <div className="flex items-start gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-gray-500">{pedido.clients.complement}</p>
                        </div>
                      )}
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

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        size="default"
                        variant="outline"
                        onClick={() => abrirMaps(pedido)}
                        className="flex-1 h-12 text-base font-semibold"
                      >
                        <MapPin className="w-5 h-5 mr-2" />
                        Maps
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 h-10 rounded-xl border-2 border-slate-200 text-xs font-bold"
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
                    <Button
                      size="default"
                      onClick={() => {
                        const phone = pedido.clients?.phone?.replace(/\D/g, "");
                        if (!phone) {
                          toast.error('❌ Cliente sem telefone cadastrado');
                          return;
                        }
                        const whatsapp = phone.startsWith("55") ? phone : `55${phone}`;
                        const isColeta = pedido.previous_status === "Coleta";
                        const mensagem = isColeta
                          ? `Olá ${pedido.clients.name}! 🚚\n\nEstamos a caminho para buscar seus tênis! Nosso entregador está indo até você agora. ✨\n\nEm breve chegaremos! Qualquer dúvida, estamos à disposição.\n\n*OS #${pedido.os_number}*`
                          : `Olá ${pedido.clients.name}! 🚚\n\nSeus tênis estão a caminho! Nosso entregador está indo até você agora. ✨\n\nEm breve chegaremos! Qualquer dúvida, estamos à disposição.\n\n*OS #${pedido.os_number}*`;
                        window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensagem)}`, "_blank");
                        toast.success('✅ Mensagem enviada!');
                      }}
                      className="w-full h-12 text-base font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      A Caminho
                    </Button>
                    {role?.toLowerCase() === 'entregador' && (
                      <div className="flex gap-2">
                        <Button
                          size="default"
                          variant="outline"
                          onClick={() => marcarComoFalhou(pedido)}
                          className="flex-1 h-12 text-base font-bold border-red-300 text-red-600 hover:bg-red-50"
                          disabled={updating === pedido.id}
                        >
                          {updating === pedido.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-5 h-5 mr-2" />}
                          FALHOU
                        </Button>
                        <Button
                          size="default"
                          onClick={() => {
                            const isColeta = pedido.previous_status === "Coleta";
                            const action = isColeta ? "COLETADO" : "ENTREGUE";
                            if (confirm(`Confirmar que o pedido foi ${action}?`)) {
                              atualizarStatus(pedido, isColeta ? "Recebido" : "Entregue");
                            }
                          }}
                          className="flex-1 h-12 text-base font-bold bg-green-600 hover:bg-green-700 text-white"
                          disabled={updating === pedido.id}
                        >
                          {updating === pedido.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                          {pedido.previous_status === "Coleta" ? "COLETADO" : "ENTREGUE"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
        </section>

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
                      {pedido.clients?.complement && (
                        <div className="flex items-start gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-gray-500">{pedido.clients.complement}</p>
                        </div>
                      )}
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

                  <div className="space-y-2">
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
                        variant="outline"
                        className="flex-1 h-10 rounded-xl border-2 border-slate-200 text-xs font-bold"
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
                    {role?.toLowerCase() === 'entregador' && (
                      <Button
                        size="sm"
                        onClick={() => atualizarStatus(pedido, "Em Rota")}
                        className={`w-full ${
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

      {/* Modal de Configuração de Ponto Final */}
      {showRouteConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-gray-800 mb-2">🗺️ Otimizar Rota</h2>
              <p className="text-sm text-gray-600">Onde você quer terminar a rota?</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setEndPointType('none')}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  endPointType === 'none'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-gray-800">🎯 Terminar no último ponto</div>
                <div className="text-sm text-gray-600">Finalizar no endereço da última entrega</div>
              </button>

              <button
                onClick={() => setEndPointType('current')}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  endPointType === 'current'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-gray-800">📍 Voltar para onde estou agora</div>
                <div className="text-sm text-gray-600">Retornar à sua localização atual (GPS)</div>
              </button>

              <button
                onClick={() => setEndPointType('tenislab')}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  endPointType === 'tenislab'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-gray-800">🏢 Voltar para Tenislab</div>
                <div className="text-sm text-gray-600">Retornar à loja após entregas</div>
              </button>

              <button
                onClick={() => setEndPointType('custom')}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  endPointType === 'custom'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-bold text-gray-800">📍 Outro endereço</div>
                <div className="text-sm text-gray-600">Informar um endereço personalizado</div>
              </button>

              {endPointType === 'custom' && (
                <input
                  type="text"
                  value={customEndPoint}
                  onChange={(e) => setCustomEndPoint(e.target.value)}
                  placeholder="Digite o endereço ou Plus Code"
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none"
                />
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowRouteConfigModal(false);
                  setEndPointType('none');
                  setCustomEndPoint('');
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setShowRouteConfigModal(false);
                  executeOptimizeRoute();
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={endPointType === 'custom' && !customEndPoint.trim()}
              >
                Otimizar Rota
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
