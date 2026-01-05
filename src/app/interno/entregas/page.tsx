"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Truck, 
  ChevronLeft,
  MapPin,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Navigation,
  CheckCircle,
  Home,
  Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { TENISLAB_COORDS } from "@/lib/geocoding";

interface Delivery {
  id: string;
  route_id: string;
  service_order_id: string;
  client_name: string;
  address: string;
  status: 'pending' | 'in_progress' | 'delivered' | 'failed';
  sequence_order: number;
  service_orders: {
    os_number: string;
  };
}

interface Route {
  id: string;
  driver_name: string;
  status: 'in_progress' | 'finished';
}

export default function DriverModePage() {
  const router = useRouter();
  const [activeRoute, setActiveRoute] = useState<Route | null>(null);
  const [currentDelivery, setCurrentDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [routeStats, setRouteStats] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    fetchActiveRoute();
  }, []);

  async function fetchActiveRoute() {
    try {
      setLoading(true);
      // Find the first active route
      const { data: routeData, error: routeError } = await supabase
        .from("routes")
        .select("*")
        .eq("status", "in_progress")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (routeError) throw routeError;
      
      if (!routeData) {
        setActiveRoute(null);
        setLoading(false);
        return;
      }

      setActiveRoute(routeData);

      // Fetch all deliveries for this route to find the next one
      const { data: delData, error: delError } = await supabase
        .from("route_deliveries")
        .select(`
          *,
          service_orders (
            os_number
          )
        `)
        .eq("route_id", routeData.id)
        .order("sequence_order", { ascending: true });

      if (delError) throw delError;

      const total = delData.length;
      const completed = delData.filter(d => d.status === 'delivered' || d.status === 'failed').length;
      setRouteStats({ completed, total });

      // Find the first pending or in_progress delivery
      const next = delData.find(d => d.status === 'pending' || d.status === 'in_progress');
      setCurrentDelivery(next || null);

    } catch (error: any) {
      toast.error("Erro ao carregar rota ativa: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const updateDeliveryStatus = async (status: 'delivered' | 'failed') => {
    if (!currentDelivery) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from("route_deliveries")
        .update({ 
          status,
          completed_at: new Date().toISOString()
        })
        .eq("id", currentDelivery.id);

      if (error) throw error;

      toast.success(status === 'delivered' ? "Entrega concluída!" : "Entrega marcada como falha.");
      
      // If delivered, we should also update the service_order status if needed
      // but the user didn't explicitly ask for it, so we'll keep it simple for now.
      
      fetchActiveRoute();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const finishRoute = async () => {
    if (!activeRoute) return;

    try {
      setUpdating(true);
      const { error } = await supabase
        .from("routes")
        .update({ 
          status: 'finished',
          end_time: new Date().toISOString()
        })
        .eq("id", activeRoute.id);

      if (error) throw error;

      toast.success("Rota finalizada com sucesso!");
      router.push("/interno/rotas");
    } catch (error: any) {
      toast.error("Erro ao finalizar rota: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const openGoogleMaps = () => {
    if (!currentDelivery) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(currentDelivery.address)}`;
    window.open(url, "_blank");
  };

  const openReturnToTenisLab = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(TENISLAB_COORDS.address)}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="font-bold">Carregando rota...</p>
        </div>
      </div>
    );
  }

  if (!activeRoute) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center">
          <Truck className="w-10 h-10 text-slate-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">Sem Rotas Ativas</h1>
          <p className="text-slate-400 text-sm">Não há nenhuma rota em andamento no momento.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push("/interno/rotas")}
          className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-2xl h-14 px-8 font-bold"
        >
          Ir para Planejamento
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-4 sm:p-6 pb-12">
      {/* HEADER */}
      <header className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full text-white hover:bg-white/10"
          onClick={() => router.push("/interno/rotas")}
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="text-center">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Modo Entregador</p>
          <h1 className="text-white font-bold">{activeRoute.driver_name || "Motorista"}</h1>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* PROGRESS */}
      <div className="mb-6 flex items-center justify-between px-2">
        <div className="flex flex-col">
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Progresso</span>
          <span className="text-white font-black text-xl">{routeStats.completed} / {routeStats.total}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: routeStats.total }).map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 w-6 rounded-full ${i < routeStats.completed ? 'bg-green-500' : 'bg-slate-700'}`} 
            />
          ))}
        </div>
      </div>

      <main className="flex-1 flex flex-col gap-6">
        {currentDelivery ? (
          <>
            <div className="space-y-4">
              <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest block text-center">Próxima Entrega</span>
              
              <Card className="bg-slate-800 border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-8 space-y-8">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-20 h-20 rounded-3xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                      <MapPin className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-2xl font-black text-white">{currentDelivery.client_name}</h2>
                      <span className="inline-block px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black rounded uppercase">
                        OS #{currentDelivery.service_orders?.os_number}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/5 space-y-2">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Endereço</p>
                    <p className="text-white font-medium text-lg leading-tight">{currentDelivery.address}</p>
                  </div>

                  <Button 
                    onClick={openGoogleMaps}
                    className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] text-xl font-black gap-3 shadow-lg shadow-blue-900/40 transition-transform active:scale-[0.98]"
                  >
                    <Navigation className="w-6 h-6 fill-current" />
                    Abrir no Maps
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-auto">
              <Button 
                variant="outline" 
                onClick={() => updateDeliveryStatus('failed')}
                disabled={updating}
                className="h-20 bg-white/5 border-white/10 text-white hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 rounded-[1.5rem] flex flex-col gap-1 font-bold"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <XCircle className="w-6 h-6" />}
                Falhou
              </Button>
              <Button 
                onClick={() => updateDeliveryStatus('delivered')}
                disabled={updating}
                className="h-20 bg-green-600 hover:bg-green-700 text-white border-none rounded-[1.5rem] flex flex-col gap-1 font-black shadow-lg shadow-green-900/40"
              >
                {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                Entregue
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 py-10">
            <div className="w-24 h-24 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center animate-bounce">
              <CheckCircle className="w-12 h-12" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-white tracking-tight">Todas as Entregas Concluídas!</h2>
              <p className="text-slate-400">Excelente trabalho. Agora é hora de voltar.</p>
            </div>

            <Card className="bg-slate-800 border-none rounded-[2rem] p-6 w-full max-w-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-blue-500">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase">Destino Final</p>
                  <p className="text-white font-bold">TENISLAB</p>
                </div>
              </div>
              <Button 
                onClick={openReturnToTenisLab}
                variant="outline"
                className="w-full h-14 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl font-bold gap-2"
              >
                <Navigation className="w-4 h-4" />
                Rota de Retorno
              </Button>
            </Card>

            <Button 
              onClick={finishRoute}
              disabled={updating}
              className="w-full max-w-sm h-16 bg-white text-slate-900 hover:bg-slate-100 rounded-[1.2rem] text-lg font-black mt-4"
            >
              {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Finalizar Rota"}
            </Button>
          </div>
        )}
      </main>

      {/* FOOTER INFO */}
      <footer className="mt-8 flex justify-center">
        <div className="bg-white/5 rounded-full px-4 py-2 flex items-center gap-3 border border-white/5">
           <span className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
             <Clock className="w-3 h-3" /> Início: {activeRoute.status === 'in_progress' ? 'Hoje' : '-'}
           </span>
        </div>
      </footer>
    </div>
  );
}
