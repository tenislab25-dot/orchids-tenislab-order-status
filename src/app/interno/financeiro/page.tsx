"use client";

import { 
  TrendingUp, 
  ArrowLeft, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Package, 
  XCircle,
  Calendar as CalendarIcon,
  CreditCard,
  Banknote,
  PieChart,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LineChart, Line, CartesianGrid } from "recharts";

type Status = "Recebido" | "Em serviço" | "Pronto" | "Entregue" | "Cancelado";

  interface Order {
    id: string;
    os_number: string;
    status: Status;
    entry_date: string;
    total: number;
    payment_method: string;
    pay_on_entry: boolean;
    payment_confirmed: boolean;
    machine_fee: number;
    items: any[];
    clients: {
      name: string;
    } | null;
  }
  
  export default function FinanceiroPage() {
    const [role, setRole] = useState<string | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"confirmados" | "projecao">("confirmados");
  
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
          machine_fee,
          items,
          clients (
            name
          )
        `)
        .order("entry_date", { ascending: false });
  
      if (error) {
        toast.error("Erro ao buscar dados financeiros: " + error.message);
      } else {
        setOrders(data as unknown as Order[]);
      }
      setLoading(false);
    };
  
      const stats = useMemo(() => {
        const confirmedOrders = orders.filter(o => o.payment_confirmed || o.pay_on_entry);
        const totalReceived = confirmedOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
        const totalCash = confirmedOrders.reduce((acc, o) => acc + (Number(o.total || 0) - Number(o.machine_fee || 0)), 0);

        const projectedRevenue = orders
          .filter(o => o.status === "Entregue" && !(o.payment_confirmed || o.pay_on_entry))
          .reduce((acc, o) => acc + Number(o.total || 0), 0);

        const totalProjected = totalReceived + projectedRevenue;

        const lostRevenue = orders
          .filter(o => o.status === "Cancelado")
          .reduce((acc, o) => acc + Number(o.total || 0), 0);

        const activeOrders = orders.filter(o => o.status !== "Cancelado");
        const averageTicket = activeOrders.length > 0 
          ? activeOrders.reduce((acc, o) => acc + Number(o.total || 0), 0) / activeOrders.length 
          : 0;

        // Payment method breakdown
        const paymentBreakdown: Record<string, number> = {};
        confirmedOrders.forEach(o => {
          const method = o.payment_method || "Não informado";
          paymentBreakdown[method] = (paymentBreakdown[method] || 0) + Number(o.total || 0);
        });

      // Status distribution
      const statusDistribution: Record<string, number> = {
        Recebido: 0,
        "Em espera": 0,
        "Em serviço": 0,
        "Pronto para entrega ou retirada": 0,
        Entregue: 0,
        Cancelado: 0
      };
      orders.forEach(o => {
        if (statusDistribution[o.status] !== undefined) {
          statusDistribution[o.status]++;
        }
      });

      return { totalReceived, totalCash, projectedRevenue, totalProjected, lostRevenue, paymentBreakdown, averageTicket, statusDistribution };
    }, [orders]);

    const monthlyData = useMemo(() => {
      const months: Record<string, number> = {};
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      orders
        .filter(o => o.payment_confirmed || o.pay_on_entry)
        .forEach(o => {
          const date = new Date(o.entry_date);
          const key = `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
          months[key] = (months[key] || 0) + Number(o.total || 0);
        });

      return Object.entries(months)
        .slice(-6)
        .map(([month, total]) => ({ month, total }));
    }, [orders]);

    const popularServices = useMemo(() => {
      const servicesCount: Record<string, number> = {};
      
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            if (item.services && Array.isArray(item.services)) {
              item.services.forEach((service: any) => {
                const name = service.name || 'Desconhecido';
                servicesCount[name] = (servicesCount[name] || 0) + 1;
              });
            }
          });
        }
      });

      return Object.entries(servicesCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
    }, [orders]);

  if (role !== "ADMIN") {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-12 animate-in fade-in">
        <header className="flex items-center gap-4 mb-12">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="font-black text-2xl">TENISLAB</h1>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center text-center gap-6">
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
            <TrendingUp className="w-10 h-10 text-blue-500" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-slate-900">Área Restrita</h2>
            <p className="text-slate-500 text-sm leading-relaxed max-w-[280px]">
              Esta funcionalidade está disponível apenas para administradores do sistema.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col min-h-screen px-4 py-8 animate-in fade-in bg-slate-50">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full -ml-2">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Financeiro</h1>
        </div>
        <h1 className="font-black text-xl">TENISLAB</h1>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <main className="flex flex-col gap-8">
            {/* CARDS TOP */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-slate-900 text-white overflow-hidden">
                  <CardContent className="p-8">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Total Recebido</span>
                      <span className="text-3xl font-black tracking-tighter">R$ {stats.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="mt-6 flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full w-fit">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/70">Já Recebi</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8">
                  <div className="flex flex-col gap-2 h-full justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Total</span>
                      <span className="text-2xl font-black text-slate-900">R$ {stats.totalProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Projeção Final</p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8">
                  <div className="flex flex-col gap-2 h-full justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                      <TrendingDown className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">A Receber</span>
                      <span className="text-2xl font-black text-blue-600">R$ {stats.projectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Aguardando Pagamento</p>
                    </div>
                  </div>
                </Card>

              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8">
                <div className="flex flex-col gap-2 h-full justify-between">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancelado</span>
                    <span className="text-2xl font-black text-red-600">R$ {stats.lostRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Total perdido</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* MONTHLY REVENUE CHART */}
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
                  <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Faturamento Mensal
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                        <Tooltip 
                          formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento']}
                          contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        />
                        <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                          {monthlyData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === monthlyData.length - 1 ? '#3b82f6' : '#e2e8f0'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
                      Sem dados suficientes
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* POPULAR SERVICES CHART */}
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
                  <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    Serviços Mais Populares
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {popularServices.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {popularServices.map((service, idx) => {
                        const maxCount = popularServices[0]?.count || 1;
                        const percentage = (service.count / maxCount) * 100;
                        return (
                          <div key={service.name} className="flex items-center gap-4">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{service.name}</span>
                                <span className="text-xs font-black text-slate-900">{service.count}x</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
                      Sem dados de serviços
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* STATUS DISTRIBUTION */}
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden lg:col-span-1">
                <CardHeader className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
                  <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Package className="w-4 h-4 text-slate-400" />
                    Status das Ordens
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex flex-col gap-4">
                    {Object.entries(stats.statusDistribution).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">{status}</span>
                        <div className="flex items-center gap-3 flex-1 px-4">
                          <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                status === "Entregue" ? "bg-green-500" :
                                status === "Cancelado" ? "bg-red-400" :
                                status === "Pronto" ? "bg-blue-500" : "bg-amber-400"
                              }`}
                              style={{ width: `${(count / orders.length) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-black text-slate-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* PAYMENT METHODS */}
              <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden lg:col-span-1">
                <CardHeader className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
                  <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-blue-500" />
                    Por Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="flex flex-col gap-3">
                    {Object.entries(stats.paymentBreakdown).length === 0 ? (
                      <p className="text-center text-slate-400 text-sm py-4">Sem dados</p>
                    ) : (
                      Object.entries(stats.paymentBreakdown)
                        .sort(([, a], [, b]) => b - a)
                        .map(([method, total]) => (
                          <div key={method} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-600 uppercase">{method}</span>
                            <span className="text-xs font-black text-slate-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))
                    )}
                  </div>
                </CardContent>
              </Card>

                {/* RECENT TRANSACTIONS */}
                <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden lg:col-span-2">
                <CardHeader className="px-8 py-6 border-b border-slate-50 bg-slate-50/30 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    Transações
                  </CardTitle>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setActiveTab("confirmados")}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        activeTab === "confirmados" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      Confirmados
                    </button>
                    <button 
                      onClick={() => setActiveTab("projecao")}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        activeTab === "projecao" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                      }`}
                    >
                      Projeção
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[400px] overflow-y-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="pl-8 font-bold text-slate-500">Nº</TableHead>
                            <TableHead className="font-bold text-slate-500">Cliente</TableHead>
                          <TableHead className="font-bold text-slate-500">Data</TableHead>
                          <TableHead className="font-bold text-slate-500">Pagamento</TableHead>
                          <TableHead className="pr-8 text-right font-bold text-slate-500">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                          {orders.filter(o => 
                            activeTab === "confirmados" 
                              ? (o.payment_confirmed || o.pay_on_entry)
                              : (o.status === "Entregue" && !(o.payment_confirmed || o.pay_on_entry))
                          ).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                                Nenhuma transação encontrada.
                              </TableCell>
                            </TableRow>
                          ) : (
                            orders
                              .filter(o => 
                                activeTab === "confirmados" 
                                  ? (o.payment_confirmed || o.pay_on_entry)
                                  : (o.status === "Entregue" && !(o.payment_confirmed || o.pay_on_entry))
                              )
                            .map((order) => (
                              <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                <TableCell className="pl-8 font-mono font-black text-blue-600">
                                  {order.os_number}
                                </TableCell>
                              <TableCell className="font-medium text-slate-700">
                                {order.clients?.name || "N/A"}
                              </TableCell>
                              <TableCell className="text-slate-500 text-xs">
                                {new Date(order.entry_date).toLocaleDateString("pt-BR")}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1">
                                  <Badge variant="outline" className="w-fit text-[9px] font-bold border-slate-200 text-slate-500">
                                    {order.payment_method || "N/A"}
                                  </Badge>
                                  {(order.payment_confirmed || order.pay_on_entry) ? (
                                    <span className="text-[8px] font-bold text-green-500 uppercase">Pago</span>
                                  ) : (
                                    <span className="text-[8px] font-bold text-amber-500 uppercase">Pendente</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="pr-8 text-right font-black text-slate-900">
                                R$ {Number(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
          </div>
        </main>
      )}

      <footer className="mt-auto text-center pt-12 pb-4">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          TENISLAB · Sistema de Gestão Financeira Profissional
        </p>
      </footer>
    </div>
  );
}
