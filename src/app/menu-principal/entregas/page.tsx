// Force deploy - 2026-01-27T15:04:21.312245
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { logger } from "@/lib/logger";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, MapPin, Navigation, CheckCircle2, 
  Loader2, Package, XCircle, Phone, MessageCircle,
  Clock, Hash, UserPlus, ChevronUp, ChevronDown, GripVertical, Route,
  AlertCircle, Edit, Save, X as XIcon
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase, ensureValidSession } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";


export default function EntregasPage() {
  const router = useRouter();
  const { role } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showColetaModal, setShowColetaModal] = useState(false);
  const getTodayDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  const addBusinessDays = (startDate: string, days: number) => {
    const date = new Date(startDate + 'T00:00:00');
    let addedDays = 0;
    
    while (addedDays < days) {
      date.setDate(date.getDate() + 1);
      const dayOfWeek = date.getDay();
      // 0 = Domingo, 6 = Sábado
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        addedDays++;
      }
    }
    
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const [coletaForm, setColetaForm] = useState({
    name: '',
    phone: '',
    plusCode: '',
    complement: '',
    deliveryDate: getTodayDate(),
    returnDate: ''
  });
  const [savingColeta, setSavingColeta] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [clienteSuggestions, setClienteSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  
  // Estados para rota ativa e GPS
  const [rotaAtiva, setRotaAtiva] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [pedidoCoords, setPedidoCoords] = useState<Record<string, {lat: number, lng: number}>>({});
  
  // Estados para configuração de rota
  const [showRouteConfigModal, setShowRouteConfigModal] = useState(false);
  
  // Rolar para o topo quando modal abrir
  useEffect(() => {
    if (showRouteConfigModal || showColetaModal) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [showRouteConfigModal, showColetaModal]);
  const [endPointType, setEndPointType] = useState<'current' | 'tenislab' | 'custom' | 'none'>('current');
  const [customEndPoint, setCustomEndPoint] = useState('');
  const [startLocation, setStartLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Estados para seleção de pedidos
  const [selectedPedidos, setSelectedPedidos] = useState<Set<string>>(new Set());
  
  // Estados para observações
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

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
      logger.error('Erro ao buscar clientes:', error);
    }
  };

  const selectCliente = (cliente: any) => {
    setSelectedClient(cliente);
    setColetaForm({
      name: cliente.name,
      phone: cliente.phone,
      plusCode: cliente.plus_code || '',
      complement: cliente.complement || '',
      deliveryDate: getTodayDate(),
      returnDate: ''
    });
    setShowSuggestions(false);
  };

  const handleOptimizeRoute = async () => {
    // Verificar se há pedidos selecionados
    if (selectedPedidos.size === 0) {
      toast.error('❌ Selecione pelo menos um pedido para iniciar a rota!');
      return;
    }

    // Confirmar ação
    const confirmMessage = `🚀 Iniciar rota com ${selectedPedidos.size} pedido(s) selecionado(s)?\n\nTodos serão marcados como "Em Rota".`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Marcar pedidos selecionados como "Em Rota"
      toast.info(`Marcando ${selectedPedidos.size} pedido(s) como Em Rota...`);

      for (const pedidoId of selectedPedidos) {
        const pedido = pedidos.find(p => p.id === pedidoId);
        if (!pedido) continue;

        const { error } = await supabase
          .from("service_orders")
          .update({
            status: "Em Rota",
            previous_status: pedido.status,
            failed_delivery: false
          })
          .eq("id", pedidoId);

        if (error) {
          logger.error(`Erro ao marcar pedido ${pedido.os_number} como Em Rota:`, error);
          throw error;
        }
      }

      toast.success(`${selectedPedidos.size} pedido(s) marcado(s) como Em Rota!`);

      // Limpar seleção
      setSelectedPedidos(new Set());

      // Recarregar pedidos
      await fetchPedidos();

      // Redirecionar para Rota Ativa
      toast.info('🗺️ Redirecionando para Rota Ativa...');
      setTimeout(() => {
        router.push('/menu-principal/rota-ativa');
      }, 1000);

      return;
    } catch (error: any) {
      logger.error('Erro ao iniciar rota:', error);
      toast.error('Erro ao iniciar rota');
      return;
    }
    
    // Código antigo comentado - não usado mais
    // Primeiro, obter localização atual
    toast.info('📍 Obtendo sua localização GPS...');
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          logger.log('✅ GPS obtido com sucesso!');
          logger.log(`📍 Sua localização: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          
          setStartLocation({ lat, lng });
          setUserLocation({ lat, lng });
          
          toast.success(`✅ Localização obtida! Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
          
          // Abrir modal de configuração
          setShowRouteConfigModal(true);
        },
        (error) => {
          logger.error('❌ Erro ao obter localização:', error);
          logger.error('Código do erro:', error.code);
          logger.error('Mensagem:', error.message);
          
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

  const executeOptimizeRoute = async () => {
    try {
      logger.log('\n🚀 INICIANDO OTIMIZAÇÃO DE ROTA');
      toast.info('🧮 Otimizando rota...');

      // Importar biblioteca de Plus Code
      const { OpenLocationCode } = await import('open-location-code');
      const olc = new OpenLocationCode();

      // Coordenadas da loja (vindas de variáveis de ambiente)
      const LOJA_LAT = parseFloat(process.env.NEXT_PUBLIC_STORE_LATITUDE || '-9.619938');
      const LOJA_LNG = parseFloat(process.env.NEXT_PUBLIC_STORE_LONGITUDE || '-35.709313');
      
      // Usar localização atual como ponto de partida
      if (!startLocation) {
        logger.error('❌ Localização de início não disponível');
        toast.error('Localização de início não disponível');
        return;
      }
      
      const START_LAT = startLocation.lat;
      const START_LNG = startLocation.lng;
      
      logger.log(`📍 PONTO DE PARTIDA (sua localização):`);
      logger.log(`   Lat: ${START_LAT.toFixed(6)}`);
      logger.log(`   Lng: ${START_LNG.toFixed(6)}`);
      logger.log(`🏢 Loja Tenislab: ${LOJA_LAT}, ${LOJA_LNG}`);
      logger.log(`🎯 Ponto final escolhido: ${endPointType}`);

      // Obter data de hoje no formato YYYY-MM-DD
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      logger.log('Data de hoje:', todayStr);
      
      // Filtrar apenas pedidos do dia atual (coletas OU entregas)
      const pedidosDoDia = pedidos.filter(p => {
        const pickupDate = (p as any).pickup_date;
        const deliveryDate = p.delivery_date;
        const isPickupToday = pickupDate === todayStr;
        const isDeliveryToday = deliveryDate === todayStr;
        const isToday = isPickupToday || isDeliveryToday;
        logger.log(`OS ${p.os_number}: pickup_date=${pickupDate}, delivery_date=${deliveryDate}, isToday=${isToday}`);
        return isToday;
      });
      
      logger.log(`Total de pedidos: ${pedidos.length}, Pedidos do dia: ${pedidosDoDia.length}`);
      
      if (pedidosDoDia.length === 0) {
        toast.error('Nenhuma entrega/coleta agendada para hoje!');
        return;
      }
      
      // Coletar e converter coordenadas dos pedidos do dia
      const waypoints = [];
      
      for (const p of pedidosDoDia) {
        let lat, lng;
        
        logger.log(`Processando OS ${p.os_number} - Cliente: ${p.clients?.name}`);
        logger.log('  Plus Code:', p.clients?.plus_code);
        logger.log('  Coordinates:', p.clients?.coordinates);
        
        // Priorizar coordenadas diretas
        const coords = p.clients?.coordinates;
        if (coords) {
          // Tentar como string (formato: "lat,lng")
          if (typeof coords === 'string' && coords.trim()) {
            const parts = coords.split(',').map(c => parseFloat(c.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              lat = parts[0];
              lng = parts[1];
              logger.log('  ✓ Coordenadas extraídas (string):', lat, lng);
            }
          }
          // Tentar como objeto JSON
          else if (typeof coords === 'object' && coords.lat && coords.lng) {
            lat = parseFloat(coords.lat);
            lng = parseFloat(coords.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
              logger.log('  ✓ Coordenadas extraídas (objeto):', lat, lng);
            }
          }
        }
        
        // Fallback para Plus Code (conversão local)
        if (!lat && !lng) {
          const plusCode = p.clients?.plus_code;
          if (plusCode && plusCode.trim()) {
            try {
              // Remover cidade/estado se houver (ex: "97HR+2JF Maceió, AL" -> "97HR+2JF")
              let code = plusCode.split(' ')[0];
              
              // Se for código curto (sem os primeiros dígitos), recuperar código completo
              // usando a localização da loja como referência
              if (code.length < 10) {
                code = olc.recoverNearest(code, LOJA_LAT, LOJA_LNG);
              }
              
              // Decodificar Plus Code
              const decoded = olc.decode(code);
              lat = decoded.latitudeCenter;
              lng = decoded.longitudeCenter;
              logger.log('  ✓ Coordenadas extraídas do Plus Code:', lat, lng);
            } catch (error) {
              logger.warn(`  ✗ Não foi possível decodificar Plus Code da OS ${p.os_number}:`, error);
            }
          }
        }
        
        if (lat && lng) {
          logger.log('  ✓ Adicionado à rota!');
          waypoints.push({
            id: p.id,
            lat,
            lng,
            osNumber: p.os_number,
            clientName: p.clients?.name
          });
        } else {
          logger.log('  ✗ Não foi possível obter coordenadas - IGNORADO');
        }
      }

      if (waypoints.length < 1) {
        toast.error('Nenhuma entrega com localização válida encontrada');
        return;
      }

      // Passo 1: Algoritmo do vizinho mais próximo (solução inicial)
      logger.log('\n=== PASSO 1: Vizinho mais próximo ===');
      let route = [];
      const remaining = [...waypoints];
      let currentLat = START_LAT;
      let currentLng = START_LNG;

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

        // Mover o ponto mais próximo para a rota
        const nearest = remaining.splice(nearestIndex, 1)[0];
        route.push(nearest);
        currentLat = nearest.lat;
        currentLng = nearest.lng;
      }

      // Determinar ponto final
      let END_LAT = START_LAT;
      let END_LNG = START_LNG;
      
      if (endPointType === 'tenislab') {
        END_LAT = LOJA_LAT;
        END_LNG = LOJA_LNG;
      } else if (endPointType === 'custom' && customEndPoint) {
        // Tentar decodificar Plus Code customizado
        try {
          let code = customEndPoint.split(' ')[0];
          if (code.length < 10) {
            code = olc.recoverNearest(code, LOJA_LAT, LOJA_LNG);
          }
          const decoded = olc.decode(code);
          END_LAT = decoded.latitudeCenter;
          END_LNG = decoded.longitudeCenter;
        } catch (error) {
          logger.error('Erro ao decodificar ponto final:', error);
          toast.error('Ponto final inválido, usando localização atual');
        }
      } else if (endPointType === 'none') {
        // Não há retorno
        END_LAT = route[route.length - 1].lat;
        END_LNG = route[route.length - 1].lng;
      }
      
      // Calcular distância total inicial
      let initialDistance = calculateDistance(START_LAT, START_LNG, route[0].lat, route[0].lng);
      for (let i = 0; i < route.length - 1; i++) {
        initialDistance += calculateDistance(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng);
      }
      if (endPointType !== 'none') {
        initialDistance += calculateDistance(route[route.length - 1].lat, route[route.length - 1].lng, END_LAT, END_LNG);
      }
      logger.log('Distância inicial:', initialDistance.toFixed(2), 'km');

      // Passo 2: Otimização 2-opt (eliminar cruzamentos)
      logger.log('\n=== PASSO 2: Otimização 2-opt ===');
      let improved = true;
      let iterations = 0;
      const maxIterations = 100;

      while (improved && iterations < maxIterations) {
        improved = false;
        iterations++;

        for (let i = 0; i < route.length - 1; i++) {
          for (let j = i + 2; j < route.length; j++) {
            // Calcular distância atual
            const before_i = i === 0 ? { lat: START_LAT, lng: START_LNG } : route[i - 1];
            const after_j = j === route.length - 1 ? null : route[j + 1];

            let currentDist = calculateDistance(before_i.lat, before_i.lng, route[i].lat, route[i].lng);
            currentDist += calculateDistance(route[j].lat, route[j].lng, after_j ? after_j.lat : route[j].lat, after_j ? after_j.lng : route[j].lng);

            // Calcular distância se inverter o segmento [i...j]
            let newDist = calculateDistance(before_i.lat, before_i.lng, route[j].lat, route[j].lng);
            newDist += calculateDistance(route[i].lat, route[i].lng, after_j ? after_j.lat : route[i].lat, after_j ? after_j.lng : route[i].lng);

            // Se melhorar, inverter o segmento
            if (newDist < currentDist - 0.001) { // Threshold para evitar instabilidade numérica
              // Inverter segmento [i...j]
              const segment = route.slice(i, j + 1).reverse();
              route = [...route.slice(0, i), ...segment, ...route.slice(j + 1)];
              improved = true;
              logger.log(`Iteração ${iterations}: Melhorou ${(currentDist - newDist).toFixed(3)} km`);
            }
          }
        }
      }

      // Calcular distância total final
      let finalDistance = calculateDistance(START_LAT, START_LNG, route[0].lat, route[0].lng);
      for (let i = 0; i < route.length - 1; i++) {
        finalDistance += calculateDistance(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng);
      }
      if (endPointType !== 'none') {
        finalDistance += calculateDistance(route[route.length - 1].lat, route[route.length - 1].lng, END_LAT, END_LNG);
      }
      
      const improvement = ((initialDistance - finalDistance) / initialDistance * 100).toFixed(1);
      logger.log('\nDistância final (com retorno):', finalDistance.toFixed(2), 'km');
      logger.log('Distância economizada:', (initialDistance - finalDistance).toFixed(2), 'km');
      logger.log('Melhoria:', improvement, '%');
      logger.log('Iterações 2-opt:', iterations);

      const optimized = route;

      // Reordenar pedidos conforme rota otimizada
      const reordered = optimized.map(wp => 
        pedidos.find(p => p.id === wp.id)
      ).filter(Boolean);

      setPedidos(reordered);
      
      // Armazenar coordenadas de todos os pedidos para cálculo de distância
      const coords: Record<string, {lat: number, lng: number}> = {};
      for (const wp of optimized) {
        coords[wp.id] = { lat: wp.lat, lng: wp.lng };
      }
      setPedidoCoords(coords);
      
      setRotaAtiva(true);
      startGPSTracking();
      toast.success(`Rota iniciada! ${reordered.length} entregas | Melhoria: ${improvement}%`);
      
    } catch (error) {
      logger.error('Erro ao otimizar rota:', error);
      toast.error('Erro ao otimizar rota.');
    }
  };

  // Iniciar rastreamento GPS
  const startGPSTracking = () => {
    if ('geolocation' in navigator) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          logger.log('Localização atualizada:', position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          logger.error('Erro ao obter localização:', error);
          toast.error('Não foi possível acessar sua localização');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
      watchIdRef.current = id;
      toast.info('GPS ativado');
    } else {
      toast.error('GPS não disponível neste dispositivo');
    }
  };

  // Parar rastreamento GPS
  const stopGPSTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setUserLocation(null);
      toast.info('GPS desativado');
    }
  };

  // Resetar rota
  const handleResetRoute = () => {
    setRotaAtiva(false);
    stopGPSTracking();
    fetchPedidos();
    toast.success('Rota resetada');
  };

  // Finalizar rota
  const handleFinalizarRota = async () => {
    // Confirmação antes de finalizar
    if (!window.confirm('🚚 Tem certeza que deseja finalizar a rota?\n\nTodos os pedidos restantes serão mantidos para a próxima rota.')) {
      return;
    }
    
    try {
      toast.info('Finalizando rota...');
      
      // Filtrar pedidos:
      // - Remover Entregues e Recebidos (coletados)
      // - Manter Falhados mas desmarcar _falhado
      const pedidosAtualizados = pedidos.filter(p => {
        // Remove entregues e coletados
        if (p.status === 'Entregue' || p.status === 'Recebido') {
          return false;
        }
        return true;
      }).map(p => {
        // Desmarca falhados
        if (p._falhado) {
          return { ...p, _falhado: false };
        }
        return p;
      });
      
      setPedidos(pedidosAtualizados);
      setRotaAtiva(false);
      stopGPSTracking();
      setPedidoCoords({});
      
      toast.success('Rota finalizada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao finalizar rota: ' + error.message);
    }
  };

  // Limpar GPS ao desmontar componente
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []); // Sem dependências - useRef não causa re-render

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
        `);

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) throw error;

      // Filtra pedidos:
      // 1. Status "Coleta" - precisa ir buscar o tênis
      // 2. Status "Pronto" ou "Em Rota" + tipo_entrega = 'entrega' - precisa entregar
      // SEM filtro de data - mostra todos para Admin/Atendente verem
      const filtrados = data?.filter(pedido => {
        const s = pedido.status;
        
        // Se é coleta, sempre aparece
        if (s === "Coleta") return true;
        
        // Se é Pronto ou Em Rota, verifica se é entrega
        const isEntrega = pedido.tipo_entrega === 'entrega' || !pedido.tipo_entrega;
        return (s === "Pronto" || s === "Em Rota") && isEntrega;
      });

      setPedidos(filtrados || []);
      
      // Verificar se há pedidos "Em Rota" para mostrar botão Ver Rota
      const temPedidosEmRota = filtrados?.some(p => p.status === "Em Rota");
      if (temPedidosEmRota && !rotaAtiva) {
        setRotaAtiva(true);
      } else if (!temPedidosEmRota && rotaAtiva) {
        setRotaAtiva(false);
      }
    } catch (error: any) {
      logger.error("Erro ao carregar entregas:", error);
      toast.error("Erro ao carregar entregas");
    } finally {
      setLoading(false);
    }
  }, [rotaAtiva]);

  useEffect(() => {
    fetchPedidos();
    
    // Bloquear entregador de acessar entregas quando em rota ativa
    if (role?.toLowerCase() === 'entregador' && rotaAtiva) {
      toast.info('Você está em rota ativa! Redirecionando...');
      router.push('/menu-principal/rota-ativa');
    }

    // Realtime subscription para atualização automática
    const channel = supabase
      .channel("entregas_orders")
      .on(
        "postgres_changes",
        { event: "*", table: "service_orders" },
        (payload) => {
          logger.log("Realtime update em entregas:", payload);
          fetchPedidos(); // Atualiza lista automaticamente
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPedidos, role, rotaAtiva, router]);

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

  const atualizarStatus = async (pedido: any, novoStatus: string) => {
    try {
      setUpdating(pedido.id);
      
      // Preparar dados para atualização
      const updateData: any = { status: novoStatus };
      
      // Se mudar para "Pronto", atualizar delivery_date para hoje
      if (novoStatus === "Pronto") {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        updateData.delivery_date = todayStr;
      }
      
      const { error } = await supabase
        .from("service_orders")
        .update(updateData)
        .eq("id", pedido.id);

      if (error) throw error;
      
      toast.success(`Status atualizado: ${novoStatus}`);
      
      // Se foi entregue, dispara a notificação automática via API
      if (novoStatus === "Entregue") {
        fetch("/api/notifications/status-change", { method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: novoStatus,
            clientName: pedido.clients?.name,
            osNumber: pedido.os_number,
          }),
        }).catch(console.error);
      }

      // Se rota está ativa, atualizar localmente sem recarregar
      if (rotaAtiva) {
        if (novoStatus === "Entregue" || novoStatus === "Recebido") {
          // Remove da lista (entregue ou coletado)
          setPedidos(pedidos.filter(p => p.id !== pedido.id));
        } else if (novoStatus === "Pronto" || novoStatus === "Coleta") {
          // Marca como falhado (para mostrar botão incluir na rota)
          setPedidos(pedidos.map(p => 
            p.id === pedido.id ? { ...p, status: novoStatus, _falhado: true } : p
          ));
        } else {
          // Atualiza status localmente
          setPedidos(pedidos.map(p => 
            p.id === pedido.id ? { ...p, status: novoStatus } : p
          ));
        }
      } else {
        // Se rota não está ativa, recarrega normalmente
        fetchPedidos();
      }
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setUpdating(null);
    }
  };

  // Função para incluir pedido falhado de volta na rota
  const incluirNaRota = async (pedido: any) => {
    try {
      setUpdating(pedido.id);
      const { error } = await supabase
        .from("service_orders")
        .update({ status: "Pronto" })
        .eq("id", pedido.id);

      if (error) throw error;
      
      toast.success('Pedido incluído na rota novamente');
      
      // Atualiza localmente e remove marcação de falhado
      setPedidos(pedidos.map(p => 
        p.id === pedido.id ? { ...p, status: "Pronto", _falhado: false } : p
      ));
    } catch (error: any) {
      toast.error("Erro ao incluir na rota: " + error.message);
    } finally {
      setUpdating(null);
    }
  };

  // Memoizar cálculo de distâncias para evitar recalcular a cada render
  const pedidosComDistancia = useMemo(() => {
    if (!rotaAtiva || !userLocation) return pedidos;
    
    const pedidosComDist = pedidos.map(pedido => {
      const coords = pedidoCoords[pedido.id];
      if (!coords) return { ...pedido, _distancia: Infinity };
      
      const dist = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        coords.lat,
        coords.lng
      );
      
      return { ...pedido, _distancia: dist };
    });
    
    // Ordenar por proximidade (mais próximo primeiro)
    return pedidosComDist.sort((a, b) => {
      // Pedidos sem coordenadas vão para o final
      if (a._distancia === Infinity) return 1;
      if (b._distancia === Infinity) return -1;
      return a._distancia - b._distancia;
    });
  }, [pedidos, userLocation, pedidoCoords, rotaAtiva]);

  if (loading) return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <header className="bg-slate-900 p-6 text-white">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full bg-slate-700" />
            <div>
              <Skeleton className="h-6 w-32 mb-1 bg-slate-700" />
              <Skeleton className="h-3 w-40 bg-slate-700" />
            </div>
          </div>
          <Skeleton className="w-20 h-8 rounded-full bg-slate-700" />
        </div>
      </header>
      <main className="p-4 w-full mt-4 max-w-2xl mx-auto">
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="rounded-3xl shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-12 h-12 rounded-2xl" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48 mb-2" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="w-16 h-6 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-10">
      <main className="p-4 w-full mt-4">
        {pedidos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 shadow-sm max-w-2xl mx-auto">
            <Package className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">Nenhuma entrega pendente no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pedidosComDistancia.map((pedido, index) => (
              <div
                key={pedido.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`${draggedIndex === index ? 'opacity-50' : ''} cursor-move`}
              >
              <Card className={`border-none shadow-lg shadow-slate-200/50 overflow-hidden rounded-2xl bg-white animate-in fade-in slide-in-from-bottom-4 ${
                pedido.status === 'Pronto' && rotaAtiva ? 'opacity-50 saturate-50' : ''
              }`}>
                <CardContent className="p-4 space-y-3 relative">
                  {/* Numeração da rota */}
                  {rotaAtiva && (
                    <div className="absolute top-2 right-2 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-lg">
                      {index + 1}
                    </div>
                  )}
                  {/* Cabeçalho do Card com Botões de Reordenação */}
                  <div className="flex justify-between items-start gap-3">
                    {/* Checkbox de Seleção (só quando rota não está ativa) */}
                    {!rotaAtiva && (
                      <input
                        type="checkbox"
                        checked={selectedPedidos.has(pedido.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedPedidos);
                          if (e.target.checked) {
                            newSelected.add(pedido.id);
                          } else {
                            newSelected.delete(pedido.id);
                          }
                          setSelectedPedidos(newSelected);
                        }}
                        className="w-5 h-5 rounded border-2 border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                    )}
                    {/* Botões de Reordenação (só quando rota não está ativa) */}
                    {!rotaAtiva && (
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
                    )}

                    {/* Informações do Pedido */}
                    <div className="flex-1 flex justify-between items-start">
                      <div className="space-y-1">
                        {/* Distância GPS */}
                        {rotaAtiva && pedido._distancia !== undefined && (
                          <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg mb-1">
                            <Navigation className="w-3 h-3" />
                            <span className="text-xs font-bold">{pedido._distancia.toFixed(1)} km de você</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-sm font-black text-blue-600">#{index + 1}</span>
                          <Hash className="w-3 h-3" />
                          <span className="text-xs font-black uppercase tracking-widest">{pedido.os_number}</span>
                        </div>
                        <h2 className="text-lg font-black text-slate-900 leading-tight">
                          {pedido.clients?.name || "Cliente não identificado"}
                        </h2>
                        {pedido.status === 'Coleta' && pedido.pickup_date && (
                          <div className="flex items-center gap-1 text-purple-500 mt-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs font-bold">
                              Coleta: {pedido.pickup_date.split('-').reverse().join('/')}
                            </span>
                          </div>
                        )}
                        {pedido.delivery_date && (
                          <div className="flex items-center gap-1 text-green-600 mt-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs font-bold">
                              Entrega: {pedido.delivery_date.split('-').reverse().join('/')}
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
                        {pedido.clients?.plus_code || pedido.clients?.coordinates || "Localização não cadastrada"}
                      </p>
                      {pedido.clients?.complement && (
                        <p className="text-slate-500 text-sm mt-1">
                          {pedido.clients.complement}
                        </p>
                      )}
                    </div>
                  </div>


                  {/* Observações */}
                  {editingNotes === pedido.id ? (
                    <div className="border-t border-slate-200 pt-2">
                      <textarea
                        value={notesText}
                        onChange={(e) => setNotesText(e.target.value)}
                        placeholder="Ex: Cliente só pode receber até as 16h"
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm mb-2"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => salvarObservacoes(pedido.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs"
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingNotes(null);
                            setNotesText("");
                          }}
                          className="flex-1 h-8 text-xs"
                        >
                          <XIcon className="w-3 h-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : pedido.delivery_notes ? (
                    <div className="border-t border-slate-200 pt-2">
                      <div className="flex items-start gap-2 bg-amber-50 p-2 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-amber-800">Observações:</p>
                          <p className="text-xs text-amber-700 break-words">{pedido.delivery_notes}</p>
                        </div>
                        {(role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'atendente') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingNotes(pedido.id);
                              setNotesText(pedido.delivery_notes || "");
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'atendente') ? (
                    <div className="border-t border-slate-200 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingNotes(pedido.id);
                          setNotesText("");
                        }}
                        className="w-full border-dashed h-8 text-xs"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Adicionar Observações
                      </Button>
                    </div>
                  ) : null}
                </div>

                {/* Botões de Navegação e Comunicação */}
                {rotaAtiva ? (
                  <div className="grid grid-cols-2 gap-2">
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
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant="outline" 
                      className="h-10 rounded-xl border-2 border-slate-200 text-xs font-bold"
                      onClick={() => router.push(`/menu-principal/entregas/editar/${pedido.id}`)}
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
                )}

                {/* Botões de Ação Logística */}
                <div className="pt-2">
                  {/* ENTREGADOR COM ROTA ATIVA */}
                  {role?.toLowerCase() === 'entregador' && rotaAtiva && (pedido.status === "Pronto" || pedido.status === "Coleta") && !pedido._falhado ? (
                    <div className="space-y-2">
                      {/* Botão A CAMINHO */}
                      <Button 
                        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg"
                        onClick={() => {
                          const phone = pedido.clients?.phone?.replace(/\D/g, "");
                          const whatsapp = phone?.startsWith("55") ? phone : `55${phone}`;
                          const isColeta = pedido.status === 'Coleta';
                          const message = encodeURIComponent(
                            isColeta 
                              ? `Olá ${pedido.clients?.name}! 🚚\n\nEstamos a caminho para buscar seus tênis! Nosso entregador está indo até você agora. ✨\n\nEm breve chegaremos! Qualquer dúvida, estamos à disposição.`
                              : `Olá ${pedido.clients?.name}! 🚚\n\nSeus tênis estão a caminho! Nosso entregador está indo até você agora. ✨\n\nEm breve chegaremos! Qualquer dúvida, estamos à disposição.`
                          );
                          window.open(`https://wa.me/${whatsapp}?text=${message}`, "_blank");
                          toast.success("Mensagem enviada!");
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        A CAMINHO
                      </Button>
                      
                      {/* Botões FALHOU e COLETADO/ENTREGUE */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          className="flex-1 h-12 rounded-xl border-2 border-red-100 text-red-600 font-bold text-sm hover:bg-red-50" 
                          onClick={() => {
                            const isColeta = pedido.status === 'Coleta';
                            const mensagem = isColeta ? "Confirmar que a coleta não foi realizada?" : "Confirmar que a entrega não foi realizada?";
                            const novoStatus = isColeta ? 'Coleta' : 'Pronto';
                            confirm(mensagem) && atualizarStatus(pedido, novoStatus);
                          }}
                          disabled={updating === pedido.id}
                        >
                          <XCircle className="w-4 h-4" />
                          FALHOU
                        </Button>
                        <Button 
                          className="flex-[2] h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-lg"
                          onClick={() => {
                            const novoStatus = pedido.status === 'Coleta' ? 'Recebido' : 'Entregue';
                            atualizarStatus(pedido, novoStatus);
                          }}
                          disabled={updating === pedido.id}
                        >
                          {updating === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          {pedido.status === 'Coleta' ? 'COLETADO' : 'ENTREGUE'}
                        </Button>
                      </div>
                    </div>
                  
                  /* ADMIN/ATENDENTE (COM OU SEM ROTA ATIVA) */
                  ) : (role?.toLowerCase() === 'admin' || role?.toLowerCase() === 'atendente') && (pedido.status === "Pronto" || pedido.status === "Coleta") ? (
                    <div className="space-y-2">
                      {/* Botão COLETADO/ENTREGUE */}
                      <Button 
                        className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm shadow-lg"
                        onClick={() => {
                          const novoStatus = pedido.status === 'Coleta' ? 'Recebido' : 'Entregue';
                          atualizarStatus(pedido, novoStatus);
                        }}
                        disabled={updating === pedido.id}
                      >
                        {updating === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        {pedido.status === 'Coleta' ? 'COLETADO' : 'ENTREGUE'}
                      </Button>
                      

                    </div>
                  
                  /* PEDIDO QUE FALHOU - INCLUIR NA ROTA NOVAMENTE */
                  ) : (pedido.status === "Coleta" || pedido.status === "Pronto") && rotaAtiva && pedido._falhado ? (
                    <Button 
                      className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg"
                      onClick={() => incluirNaRota(pedido)}
                      disabled={updating === pedido.id}
                    >
                      {updating === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}
                      INCLUIR NA ROTA
                    </Button>
                  
                  /* ENTREGADOR SEM ROTA ATIVA - NENHUM BOTÃO */
                  ) : null}
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

              <div>
                <label className="text-sm font-bold text-slate-700 mb-1 block">Data de Entrega</label>
                <input
                  type="date"
                  value={coletaForm.returnDate}
                  onChange={(e) => setColetaForm({ ...coletaForm, returnDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-2 mt-2">
                  {[1, 3, 5, 7].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        const returnDate = addBusinessDays(coletaForm.deliveryDate, days);
                        setColetaForm({ ...coletaForm, returnDate });
                      }}
                      className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      {days} dia{days > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <Button
              onClick={async () => {
                try {
                  logger.log('[CADASTRO] Iniciando cadastro de cliente...');
                  setSavingColeta(true);
                  
                  // Validações
                  if (!coletaForm.name || !coletaForm.phone) {
                    logger.log('[CADASTRO] Validação falhou: nome ou telefone vazio');
                    toast.error('Preencha nome e telefone');
                    setSavingColeta(false);
                    return;
                  }
                  
                  logger.log('[CADASTRO] Dados do formulário:', coletaForm);

                  let clientData;
                  
                  // Se já selecionou um cliente existente, atualiza os dados dele
                  if (selectedClient) {
                    logger.log('[CADASTRO] Atualizando cliente existente:', selectedClient.id);
                    // Processa coordenadas se fornecidas (formato: lat,lng)
                    let coordinates = null;
                    if (coletaForm.plusCode && coletaForm.plusCode.includes(',')) {
                      const [lat, lng] = coletaForm.plusCode.split(',').map(s => parseFloat(s.trim()));
                      if (!isNaN(lat) && !isNaN(lng)) {
                        coordinates = JSON.stringify({ lat, lng });
                        logger.log('[CADASTRO] Coordenadas processadas:', coordinates);
                      }
                    }

                    // Atualiza dados do cliente existente
                    logger.log('[CADASTRO] Enviando atualização para Supabase...');
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
                    logger.log('[CADASTRO] Criando novo cliente...');
                    // Processa coordenadas se fornecidas (formato: lat,lng)
                    let coordinates = null;
                    if (coletaForm.plusCode && coletaForm.plusCode.includes(',')) {
                      const [lat, lng] = coletaForm.plusCode.split(',').map(s => parseFloat(s.trim()));
                      if (!isNaN(lat) && !isNaN(lng)) {
                        coordinates = JSON.stringify({ lat, lng });
                        logger.log('[CADASTRO] Coordenadas processadas:', coordinates);
                      }
                    }

                    // Cria novo cliente
                    logger.log('[CADASTRO] Enviando novo cliente para Supabase...');
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
                  logger.log('[CADASTRO] Gerando número da OS...');
                  const currentYear = new Date().getFullYear();
                  const { data: lastOSArray, error: osQueryError } = await supabase
                    .from('service_orders')
                    .select('os_number')
                    .like('os_number', `%/${currentYear}`)
                    .order('created_at', { ascending: false })
                    .limit(1);
                  
                  if (osQueryError) {
                    logger.error('[CADASTRO] Erro ao buscar última OS:', osQueryError);
                    throw osQueryError;
                  }
                  
                  const lastOS = lastOSArray && lastOSArray.length > 0 ? lastOSArray[0] : null;

                  let nextNumber = 1;
                  if (lastOS?.os_number) {
                    const [numPart] = lastOS.os_number.split('/');
                    nextNumber = parseInt(numPart) + 1;
                  }
                  const newOsNumber = `${String(nextNumber).padStart(3, '0')}/${currentYear}`;
                  logger.log('[CADASTRO] Número da OS gerado:', newOsNumber);

                  // Formatar data de forma compatível com Safari
                  const today = new Date();
                  const entryDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  logger.log('[CADASTRO] Data de entrada:', entryDate);

                  // Cria a OS com status "Coleta"
                  logger.log('[CADASTRO] Criando OS no Supabase...');
                  const { error: osError } = await supabase
                    .from('service_orders')
                    .insert({
                      os_number: newOsNumber,
                      client_id: clientData.id,
                      status: 'Coleta',
                      entry_date: entryDate,
                      pickup_date: coletaForm.deliveryDate || null,
                      delivery_date: coletaForm.returnDate || null,
                      items: [],
                      total: 0
                    });

                  if (osError) {
                    logger.error('[CADASTRO] Erro ao criar OS:', osError);
                    throw osError;
                  }

                  logger.log('[CADASTRO] OS criada com sucesso!');
                  toast.success(`Coleta cadastrada! OS #${newOsNumber} criada com sucesso.`);
                  setShowColetaModal(false);
                  setColetaForm({ name: '', phone: '', plusCode: '', complement: '', deliveryDate: getTodayDate(), returnDate: '' });
                  setSelectedClient(null);
                  setShowSuggestions(false);
                  setClienteSuggestions([]);
                  logger.log('[CADASTRO] Recarregando lista de pedidos...');
                  fetchPedidos();
                  logger.log('[CADASTRO] Processo concluído com sucesso!');
                } catch (error: any) {
                  logger.error('[CADASTRO] ERRO CAPTURADO:', error);
                  logger.error('[CADASTRO] Stack trace:', error.stack);
                  logger.error('[CADASTRO] Mensagem:', error.message);
                  toast.error('Erro ao cadastrar: ' + (error.message || 'Erro desconhecido'));
                } finally {
                  logger.log('[CADASTRO] Finalizando (setSavingColeta = false)');
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

      {/* Modal de Configuração de Rota */}
      {showRouteConfigModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowRouteConfigModal(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">📍 Configurar Rota</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowRouteConfigModal(false)}>
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm text-blue-700">
                  <strong>📍 Início:</strong> Sua localização atual<br/>
                  <span className="text-xs">{startLocation ? `${startLocation.lat.toFixed(6)}, ${startLocation.lng.toFixed(6)}` : 'Obtendo...'}</span>
                </p>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 block">Onde terminar a rota?</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors" style={{ borderColor: endPointType === 'current' ? '#3b82f6' : '#e2e8f0' }}>
                    <input
                      type="radio"
                      name="endPoint"
                      value="current"
                      checked={endPointType === 'current'}
                      onChange={(e) => setEndPointType(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-bold text-slate-900">📍 Voltar para onde estou agora</div>
                      <div className="text-xs text-slate-500">Retornar à localização atual</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors" style={{ borderColor: endPointType === 'tenislab' ? '#3b82f6' : '#e2e8f0' }}>
                    <input
                      type="radio"
                      name="endPoint"
                      value="tenislab"
                      checked={endPointType === 'tenislab'}
                      onChange={(e) => setEndPointType(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-bold text-slate-900">🏢 Voltar para Tenislab</div>
                      <div className="text-xs text-slate-500">Terminar na loja</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors" style={{ borderColor: endPointType === 'custom' ? '#3b82f6' : '#e2e8f0' }}>
                    <input
                      type="radio"
                      name="endPoint"
                      value="custom"
                      checked={endPointType === 'custom'}
                      onChange={(e) => setEndPointType(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-slate-900">📍 Outro endereço</div>
                      {endPointType === 'custom' && (
                        <input
                          type="text"
                          value={customEndPoint}
                          onChange={(e) => setCustomEndPoint(e.target.value)}
                          placeholder="Plus Code ou lat,lng"
                          className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      )}
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors" style={{ borderColor: endPointType === 'none' ? '#3b82f6' : '#e2e8f0' }}>
                    <input
                      type="radio"
                      name="endPoint"
                      value="none"
                      checked={endPointType === 'none'}
                      onChange={(e) => setEndPointType(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-bold text-slate-900">❌ Não voltar</div>
                      <div className="text-xs text-slate-500">Terminar no último ponto</div>
                    </div>
                  </label>
                </div>
              </div>

              <Button
                onClick={() => {
                  setShowRouteConfigModal(false);
                  executeOptimizeRoute();
                }}
                className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold"
              >
                <Route className="w-4 h-4 mr-2" />
                Iniciar Rota
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

