"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft,
  Search,
  Check,
  Truck,
  Calendar,
  User,
  MapPin,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { geocodeAddress, TENISLAB_COORDS } from "@/lib/geocoding";

interface Order {
  id: string;
  os_number: string;
  client_id: string;
  clients: {
    name: string;
    address: string;
  };
}

export default function NewRoutePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    driver_name: ""
  });

  useEffect(() => {
    fetchReadyOrders();
  }, []);

  async function fetchReadyOrders() {
    try {
      setLoading(true);
      // Fetch orders that are ready for pickup and NOT already in a route
      // We'll check route_deliveries later or just filter by ready_for_pickup for now
      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          id,
          os_number,
          client_id,
          clients (
            name,
            address
          )
        `)
        .eq("ready_for_pickup", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filter out orders that already have a pending delivery in an active route
      const { data: activeDeliveries } = await supabase
        .from("route_deliveries")
        .select("service_order_id")
        .in("status", ["pending", "in_progress"]);
      
      const activeIds = activeDeliveries?.map(d => d.service_order_id) || [];
      const availableOrders = (data || []).filter(o => !activeIds.includes(o.id));

      setOrders(availableOrders);
    } catch (error: any) {
      toast.error("Erro ao carregar ordens: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreateRoute = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error("Selecione pelo menos uma ordem");
      return;
    }

    try {
      setCreating(true);
      
      // 1. Create the route
      const { data: route, error: routeError } = await supabase
        .from("routes")
        .insert([{
          date: formData.date,
          driver_name: formData.driver_name,
          status: 'created'
        }])
        .select()
        .single();

      if (routeError) throw routeError;

      // 2. Prepare deliveries with geocoding
      const selectedOrders = orders.filter(o => selectedOrderIds.includes(o.id));
      const deliveries = [];

      for (let i = 0; i < selectedOrders.length; i++) {
        const order = selectedOrders[i];
        const address = order.clients?.address;
        let lat = null;
        let lng = null;

        if (address) {
          const geo = await geocodeAddress(address);
          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
          }
        }

        deliveries.push({
          route_id: route.id,
          service_order_id: order.id,
          client_name: order.clients?.name || "Desconhecido",
          address: address || "Sem endereço",
          latitude: lat,
          longitude: lng,
          sequence_order: i + 1, // Default sequence, will optimize in detail page
          status: 'pending'
        });
      }

      // 3. Insert deliveries
      const { error: delError } = await supabase
        .from("route_deliveries")
        .insert(deliveries);

      if (delError) throw delError;

      toast.success("Rota criada com sucesso!");
      router.push(`/interno/rotas/${route.id}`);
    } catch (error: any) {
      toast.error("Erro ao criar rota: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.clients?.name.toLowerCase().includes(search.toLowerCase()) ||
    o.os_number.includes(search)
  );

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 sm:p-6 pb-32">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Nova Rota</h1>
          <p className="text-sm text-slate-500">Selecione as ordens para entrega</p>
        </div>
      </header>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="date">Data da Rota</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                id="date" 
                type="date" 
                className="pl-9"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver">Entregador</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                id="driver" 
                placeholder="Nome do entregador" 
                className="pl-9"
                value={formData.driver_name}
                onChange={e => setFormData({...formData, driver_name: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            Ordens Prontas ({filteredOrders.length})
          </h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar OS ou cliente..." 
              className="pl-9 h-10 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-500">Buscando ordens...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            Nenhuma ordem pronta para entrega encontrada.
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredOrders.map(order => (
              <button
                key={order.id}
                onClick={() => toggleOrder(order.id)}
                className={`w-full text-left transition-all rounded-2xl border-2 p-4 flex items-center justify-between ${
                  selectedOrderIds.includes(order.id) 
                    ? 'border-blue-500 bg-blue-50/30 shadow-sm' 
                    : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedOrderIds.includes(order.id) ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {selectedOrderIds.includes(order.id) ? <Check className="w-6 h-6" /> : <Truck className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{order.clients?.name}</span>
                      <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase">
                        #{order.os_number}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {order.clients?.address || "Sem endereço cadastrado"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FLOATING ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-slate-900">{selectedOrderIds.length} ordens selecionadas</p>
            <p className="text-xs text-slate-500">Pronto para gerar rota</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none h-12 rounded-xl"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-[2] sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl px-8 gap-2"
              onClick={handleCreateRoute}
              disabled={creating || selectedOrderIds.length === 0}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando Rota...
                </>
              ) : (
                <>
                  Criar Rota ({selectedOrderIds.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
