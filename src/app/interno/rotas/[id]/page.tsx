"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ChevronLeft,
  MapPin,
  GripVertical,
  Wand2,
  Play,
  CheckCircle2,
  Trash2,
  Loader2,
  Clock,
  Navigation
} from "lucide-react";
import { Reorder } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { optimizeRoute, TENISLAB_COORDS } from "@/lib/geocoding";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Delivery {
  id: string;
  service_order_id: string;
  client_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  sequence_order: number;
  status: 'pending' | 'in_progress' | 'delivered' | 'failed';
  service_orders: {
    os_number: string;
  };
}

interface Route {
  id: string;
  date: string;
  driver_name: string;
  status: 'created' | 'in_progress' | 'finished';
}

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = params.id as string;
  
  const [route, setRoute] = useState<Route | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRouteData();
  }, [routeId]);

  async function fetchRouteData() {
    try {
      setLoading(true);
      const { data: routeData, error: routeError } = await supabase
        .from("routes")
        .select("*")
        .eq("id", routeId)
        .single();

      if (routeError) throw routeError;
      setRoute(routeData);

      const { data: delData, error: delError } = await supabase
        .from("route_deliveries")
        .select(`
          *,
          service_orders (
            os_number
          )
        `)
        .eq("route_id", routeId)
        .order("sequence_order", { ascending: true });

      if (delError) throw delError;
      setDeliveries(delData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar rota: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const handleReorder = (newOrder: Delivery[]) => {
    setDeliveries(newOrder);
  };

  const saveOrder = async () => {
    try {
      setSaving(true);
      const updates = deliveries.map((d, index) => ({
        id: d.id,
        sequence_order: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("route_deliveries")
          .update({ sequence_order: update.sequence_order })
          .eq("id", update.id);
        if (error) throw error;
      }

      toast.success("Ordem salva com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar ordem: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAutoOptimize = () => {
    const geoDeliveries = deliveries.filter(d => d.latitude && d.longitude);
    const nonGeoDeliveries = deliveries.filter(d => !d.latitude || !d.longitude);

    if (geoDeliveries.length === 0) {
      toast.error("Nenhuma entrega possui coordenadas geográficas para otimizar.");
      return;
    }

    const optimized = optimizeRoute(
      { lat: TENISLAB_COORDS.lat, lng: TENISLAB_COORDS.lng },
      geoDeliveries
    );

    setDeliveries([...optimized, ...nonGeoDeliveries]);
    toast.success("Rota otimizada por proximidade!");
  };

  const startRoute = async () => {
    if (!confirm("Deseja iniciar esta rota agora? A ordem das entregas será travada.")) return;
    
    try {
      setSaving(true);
      // 1. Save final order first
      await saveOrder();

      // 2. Update route status
      const { error } = await supabase
        .from("routes")
        .update({ 
          status: 'in_progress',
          start_time: new Date().toISOString()
        })
        .eq("id", routeId);

      if (error) throw error;

      toast.success("Rota iniciada! Redirecionando para modo entregador...");
      router.push("/interno/entregas");
    } catch (error: any) {
      toast.error("Erro ao iniciar rota: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteRoute = async () => {
    if (!confirm("Tem certeza que deseja excluir esta rota? As entregas voltarão para o estado pendente.")) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("routes")
        .delete()
        .eq("id", routeId);

      if (error) throw error;
      toast.success("Rota excluída");
      router.push("/interno/rotas");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center text-slate-500">Carregando detalhes...</div>;
  if (!route) return <div className="p-20 text-center text-slate-500">Rota não encontrada</div>;

  const isLocked = route.status !== 'created';

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 sm:p-6 pb-32">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push("/interno/rotas")}>
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Rota {format(new Date(route.date + 'T12:00:00'), "dd/MM", { locale: ptBR })}
            </h1>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {route.status === 'created' ? 'Planejamento' : 
               route.status === 'in_progress' ? 'Em andamento' : 'Finalizada'} 
              {route.driver_name && ` • ${route.driver_name}`}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {route.status === 'created' && (
            <Button 
              variant="outline" 
              className="text-red-600 border-red-100 hover:bg-red-50 gap-2 h-11"
              onClick={deleteRoute}
              disabled={saving}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
          )}
          {route.status === 'in_progress' && (
            <Button 
              onClick={() => router.push("/interno/entregas")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 gap-2"
            >
              <Navigation className="w-4 h-4" />
              Ver no Modo Entregador
            </Button>
          )}
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-widest text-[10px]">
            Itens da Entrega ({deliveries.length})
          </h2>
          {!isLocked && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-blue-600 hover:text-blue-700 font-bold gap-2"
              onClick={handleAutoOptimize}
              disabled={saving}
            >
              <Wand2 className="w-4 h-4" />
              Otimizar Automático
            </Button>
          )}
        </div>

        {isLocked ? (
          <div className="grid gap-3">
            {deliveries.map((delivery, index) => (
              <Card key={delivery.id} className="border-none shadow-sm overflow-hidden opacity-80">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{delivery.client_name}</span>
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        #{delivery.service_orders?.os_number}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {delivery.address}
                    </p>
                  </div>
                  {delivery.status === 'delivered' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : delivery.status === 'failed' ? (
                    <div className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-[10px] font-bold">!</div>
                  ) : (
                    <Clock className="w-5 h-5 text-slate-300" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Reorder.Group axis="y" values={deliveries} onReorder={handleReorder} className="grid gap-3">
            {deliveries.map((delivery, index) => (
              <Reorder.Item 
                key={delivery.id} 
                value={delivery}
                className="active:scale-[1.02] transition-transform cursor-grab active:cursor-grabbing"
              >
                <Card className="border-none shadow-sm overflow-hidden hover:border-blue-200 border border-transparent">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="text-slate-300 cursor-grab">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{delivery.client_name}</span>
                        <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase">
                          #{delivery.service_orders?.os_number}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {delivery.address}
                      </p>
                    </div>
                    {!delivery.latitude && (
                      <div className="px-2 py-1 rounded bg-amber-50 text-amber-600 text-[10px] font-bold uppercase" title="Geolocalização falhou">
                        Sem GPS
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* FLOATING ACTION BAR */}
      {!isLocked && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{deliveries.length} Entregas</p>
              <p className="text-xs text-slate-500">Arraste para reordenar</p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                variant="outline" 
                className="flex-1 sm:flex-none h-12 rounded-xl"
                onClick={saveOrder}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Ordem"}
              </Button>
              <Button 
                className="flex-[2] sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl px-8 gap-2"
                onClick={startRoute}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Iniciar Rota
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
