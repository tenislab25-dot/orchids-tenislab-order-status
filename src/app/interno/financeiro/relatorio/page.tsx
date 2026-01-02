"use client";

import { 
  TrendingUp, 
  ArrowLeft, 
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Order {
  id: string;
  os_number: string;
  status: string;
  entry_date: string;
  total: number;
  payment_method: string;
  pay_on_entry: boolean;
  payment_confirmed: boolean;
  clients: {
    name: string;
  } | null;
}

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const monthNamesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function RelatorioFinanceiroPage() {
  const [role, setRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem("tenislab_role");
    setRole(storedRole);
    if (storedRole === "ADMIN") {
      fetchOrders();
    }
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        id,
        os_number,
        status,
        entry_date,
        total,
        payment_method,
        pay_on_entry,
        payment_confirmed,
        clients (
          name
        )
      `)
      .order("entry_date", { ascending: false });

    if (error) {
      toast.error("Erro ao buscar dados: " + error.message);
    } else {
      setOrders(data as unknown as Order[]);
    }
    setLoading(false);
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    orders.forEach(o => {
      const year = new Date(o.entry_date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const confirmedOrders = useMemo(() => {
    return orders.filter(o => o.payment_confirmed || o.pay_on_entry);
  }, [orders]);

  const yearlyStats = useMemo(() => {
    const yearOrders = confirmedOrders.filter(o => {
      const d = new Date(o.entry_date);
      return d.getFullYear() === selectedYear;
    });
    
    const total = yearOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const count = yearOrders.length;
    
    return { total, count };
  }, [confirmedOrders, selectedYear]);

  const monthlyBreakdown = useMemo(() => {
    const months: { month: number; name: string; total: number; count: number }[] = [];
    
    for (let i = 0; i < 12; i++) {
      const monthOrders = confirmedOrders.filter(o => {
        const d = new Date(o.entry_date);
        return d.getFullYear() === selectedYear && d.getMonth() === i;
      });
      
      months.push({
        month: i,
        name: monthNames[i],
        total: monthOrders.reduce((acc, o) => acc + Number(o.total || 0), 0),
        count: monthOrders.length
      });
    }
    
    return months;
  }, [confirmedOrders, selectedYear]);

  const weeklyBreakdown = useMemo(() => {
    if (selectedMonth === null) return [];
    
    const weeks: { week: number; startDate: string; endDate: string; total: number; count: number; orders: Order[] }[] = [];
    
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    
    let weekStart = new Date(firstDay);
    let weekNum = 1;
    
    while (weekStart <= lastDay) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      if (weekEnd > lastDay) {
        weekEnd.setTime(lastDay.getTime());
      }
      
      const weekOrders = confirmedOrders.filter(o => {
        const d = new Date(o.entry_date);
        d.setHours(0, 0, 0, 0);
        const ws = new Date(weekStart);
        ws.setHours(0, 0, 0, 0);
        const we = new Date(weekEnd);
        we.setHours(23, 59, 59, 999);
        return d >= ws && d <= we;
      });
      
      weeks.push({
        week: weekNum,
        startDate: weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        endDate: weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        total: weekOrders.reduce((acc, o) => acc + Number(o.total || 0), 0),
        count: weekOrders.length,
        orders: weekOrders
      });
      
      weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() + 1);
      weekNum++;
    }
    
    return weeks;
  }, [confirmedOrders, selectedYear, selectedMonth]);

  const selectedMonthStats = useMemo(() => {
    if (selectedMonth === null) return null;
    return monthlyBreakdown[selectedMonth];
  }, [monthlyBreakdown, selectedMonth]);

  if (role !== "ADMIN") {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-12 animate-in fade-in">
        <header className="flex items-center gap-4 mb-12">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="font-black text-2xl">Tenislab</h1>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
            <TrendingUp className="w-10 h-10 text-blue-500" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-slate-900">Área Restrita</h2>
            <p className="text-slate-500 text-sm">Apenas para administradores.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col min-h-screen px-4 py-8 animate-in fade-in bg-slate-50">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/interno/financeiro">
            <Button variant="ghost" size="icon" className="rounded-full -ml-2">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Relatório Financeiro</h1>
        </div>
        <h1 className="font-black text-xl">Tenislab</h1>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <main className="flex flex-col gap-8">
          {/* SELETOR DE ANO */}
          <div className="flex items-center justify-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => setSelectedYear(y => y - 1)}
              disabled={!availableYears.includes(selectedYear - 1) && selectedYear <= Math.min(...availableYears)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-3xl font-black text-slate-900">{selectedYear}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full"
              onClick={() => setSelectedYear(y => y + 1)}
              disabled={selectedYear >= new Date().getFullYear()}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* CARD ANUAL */}
          <Card className="rounded-[2rem] border-none shadow-xl shadow-purple-200/30 bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Total Anual {selectedYear}</span>
                  <span className="text-5xl font-black tracking-tighter">R$ {yearlyStats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                  <Package className="w-4 h-4" />
                  <span className="text-sm font-bold">{yearlyStats.count} OS pagas</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Pagamentos confirmados</span>
              </div>
            </CardContent>
          </Card>

          {/* GRID MENSAL */}
          <div>
            <h2 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">Faturamento por Mês</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {monthlyBreakdown.map((m) => (
                <Card 
                  key={m.month}
                  className={`rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                    selectedMonth === m.month 
                      ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-200/50' 
                      : 'border-transparent bg-white shadow-sm hover:shadow-md'
                  }`}
                  onClick={() => setSelectedMonth(selectedMonth === m.month ? null : m.month)}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        selectedMonth === m.month ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {m.name}
                      </span>
                      <span className={`text-2xl font-black tracking-tighter ${
                        selectedMonth === m.month ? 'text-emerald-700' : 'text-slate-900'
                      }`}>
                        R$ {m.total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{m.count} OS</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* DETALHES DO MÊS SELECIONADO */}
          {selectedMonth !== null && selectedMonthStats && (
            <div className="animate-in slide-in-from-top-4 duration-300">
              {/* CARD DO MÊS */}
              <Card className="rounded-[2rem] border-none shadow-xl shadow-emerald-200/30 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden mb-6">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">{selectedMonthStats.name} {selectedYear}</span>
                      <span className="text-4xl font-black tracking-tighter">R$ {selectedMonthStats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CalendarDays className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                      <Package className="w-4 h-4" />
                      <span className="text-sm font-bold">{selectedMonthStats.count} OS</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SEMANAS DO MÊS */}
              <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">Faturamento por Semana</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {weeklyBreakdown.map((w) => (
                  <Card key={w.week} className="rounded-2xl border-none bg-white shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                            Semana {w.week}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {w.startDate} - {w.endDate}
                          </span>
                        </div>
                        <span className="text-2xl font-black tracking-tighter text-slate-900">
                          R$ {w.total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{w.count} OS</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* LISTA DE OS DO MÊS */}
              {weeklyBreakdown.some(w => w.orders.length > 0) && (
                <div className="mt-6">
                  <h3 className="text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">Ordens de Serviço</h3>
                  <Card className="rounded-2xl border-none bg-white shadow-sm overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase">OS</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase">Cliente</th>
                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase">Data</th>
                            <th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {weeklyBreakdown.flatMap(w => w.orders).map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4 font-mono font-black text-blue-600 text-sm">{order.os_number}</td>
                              <td className="px-6 py-4 font-medium text-slate-700 text-sm">{order.clients?.name || "N/A"}</td>
                              <td className="px-6 py-4 text-slate-500 text-xs">{new Date(order.entry_date).toLocaleDateString("pt-BR")}</td>
                              <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">R$ {Number(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </main>
      )}

      <footer className="mt-auto text-center pt-12 pb-4">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          Tenislab · Relatório Financeiro
        </p>
      </footer>
    </div>
  );
}
