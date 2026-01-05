"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Truck, 
  Plus, 
  ChevronLeft,
  Calendar,
  User,
  ChevronRight,
  Clock,
  CheckCircle2,
  PlayCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Route {
  id: string;
  date: string;
  driver_name: string;
  status: 'created' | 'in_progress' | 'finished';
  created_at: string;
  delivery_count?: number;
}

export default function RoutesListPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRoutes();
  }, []);

  async function fetchRoutes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("routes")
        .select(`
          *,
          delivery_count:route_deliveries(count)
        `)
        .order("date", { ascending: false });

      if (error) throw error;
      
      const formattedData = data.map(r => ({
        ...r,
        delivery_count: r.delivery_count?.[0]?.count || 0
      }));

      setRoutes(formattedData);
    } catch (error: any) {
      toast.error("Erro ao carregar rotas: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status: Route['status']) => {
    switch (status) {
      case 'created':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
            <Clock className="w-3 h-3" /> Criada
          </span>
        );
      case 'in_progress':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
            <PlayCircle className="w-3 h-3 animate-pulse" /> Em Rota
          </span>
        );
      case 'finished':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-600 text-[10px] font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3" /> Finalizada
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/interno">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-500" />
              Rotas de Entrega
            </h1>
            <p className="text-sm text-slate-500">Logística e planejamento de entregas</p>
          </div>
        </div>
        <Button 
          onClick={() => router.push("/interno/rotas/nova")} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2 h-12"
        >
          <Plus className="w-4 h-4" />
          Nova Rota
        </Button>
      </header>

      {loading ? (
        <div className="py-20 text-center text-slate-500">Carregando rotas...</div>
      ) : routes.length === 0 ? (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <Truck className="w-8 h-8 text-slate-300" />
            </div>
            <div className="text-center">
              <p className="text-slate-900 font-bold">Nenhuma rota planejada</p>
              <p className="text-sm text-slate-500">Comece criando uma nova rota de entregas.</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push("/interno/rotas/nova")}
              className="mt-2"
            >
              Criar minha primeira rota
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {routes.map((route) => (
            <button
              key={route.id}
              onClick={() => router.push(`/interno/rotas/${route.id}`)}
              className="w-full text-left transition-all active:scale-[0.98]"
            >
              <Card className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        route.status === 'finished' ? 'bg-green-50 text-green-600' : 
                        route.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'
                      }`}>
                        <Truck className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {format(new Date(route.date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                          </span>
                          {getStatusBadge(route.status)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {route.driver_name || "Sem entregador"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {route.delivery_count} entregas
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300" />
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* DRIVER MODE QUICK ACCESS */}
      <div className="mt-8 pt-8 border-t border-slate-100">
        <Button 
          variant="outline"
          onClick={() => router.push("/interno/entregas")}
          className="w-full h-16 rounded-2xl border-2 border-slate-200 hover:bg-slate-50 gap-3 text-lg font-bold text-slate-700"
        >
          <PlayCircle className="w-6 h-6 text-blue-500" />
          Modo Entregador (Executar Rota)
        </Button>
      </div>
    </div>
  );
}
