"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Package,
    Eye,
    Plus,
    Bell,
    CheckCircle2,
    Calendar,
    User as UserIcon,
    DollarSign,
    Database,
    History,
    ArrowRight,
    Download,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Star
  } from "lucide-react";


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Status = "Recebido" | "Em espera" | "Em serviço" | "Em finalização" | "Pronto para entrega ou retirada" | "Entregue" | "Cancelado";

interface Order {
  id: string;
  os_number: string;
  status: Status;
  entry_date: string;
  delivery_date?: string;
  total?: number;
  priority: boolean;
  updated_at?: string;
  accepted_at?: string;
  items: any[];
  clients: {
    name: string;
  } | null;
}

const statusWeight: Record<Status, number> = {
  "Em espera": 0,
  "Em serviço": 1,
  "Em finalização": 2,
  "Recebido": 3,
  "Pronto para entrega ou retirada": 4,
  "Entregue": 5,
  "Cancelado": 6,
};

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: 'status',
    direction: 'asc'
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key || sortConfig.direction === null) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-3 h-3 ml-1 text-blue-600" /> : 
      <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
  };

  const togglePriority = async (orderId: string, currentPriority: boolean) => {
    // Restrict to ADMIN and ATENDENTE
    if (role !== "ADMIN" && role !== "ATENDENTE") {
      toast.error("Apenas administradores e atendentes podem alterar a prioridade.");
      return;
    }

    const { error } = await supabase
      .from("service_orders")
      .update({ priority: !currentPriority })
      .eq("id", orderId);

    if (error) {
      toast.error("Erro ao atualizar prioridade: " + error.message);
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, priority: !currentPriority } : o));
      toast.success(!currentPriority ? "Marcado como Prioridade!" : "Prioridade Removida");
    }
  };

  useEffect(() => {
    const storedRole = localStorage.getItem("tenislab_role");
    
    if (!storedRole) {
      router.push("/interno/login");
      return;
    }

    setRole(storedRole);
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel("dashboard_orders")
      .on(
        "postgres_changes",
        { event: "*", table: "service_orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        *,
        clients (
          name
        )
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Erro ao buscar ordens: " + error.message);
    } else {
      // Filter out archived ones for the dashboard
      const dashboardOrders = data?.filter((o: any) => {
        const isDone = o.status === "Entregue" || o.status === "Cancelado";
        if (!isDone) return true;
        const updatedAt = new Date(o.updated_at || o.created_at);
        return updatedAt > thirtyDaysAgo;
      });
      setOrders(dashboardOrders as Order[]);
    }
    setLoading(false);
  };

  const handleExportCSV = async (type: 'clients' | 'services' | 'finance') => {
    setExporting(true);
    try {
      let data: any[] = [];
      let filename = "";

      if (type === 'clients') {
        const { data: clients, error } = await supabase.from('clients').select('*');
        if (error) throw error;
        data = clients || [];
        filename = "backup_clientes_tenislab.csv";
      } else if (type === 'services') {
        const { data: services, error } = await supabase.from('services').select('*');
        if (error) throw error;
        data = services || [];
        filename = "backup_servicos_tenislab.csv";
      } else if (type === 'finance') {
        const { data: orders, error } = await supabase
          .from('service_orders')
          .select('*, clients(name)');
        if (error) throw error;
        data = (orders || []).map(o => ({
          os: o.os_number,
          cliente: o.clients?.name,
          data: o.entry_date,
          status: o.status,
          total: o.total,
          metodo_pagamento: o.payment_method
        }));
        filename = "backup_financeiro_tenislab.csv";
      }

      if (data.length === 0) {
        toast.error("Sem dados para exportar");
        return;
      }

      const headers = Object.keys(data[0]).join(",");
      const rows = data.map(obj => 
        Object.values(obj)
          .map(val => `"${String(val).replace(/"/g, '""')}"`)
          .join(",")
      );
      const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Backup de ${type} exportado!`);
    } catch (error: any) {
      toast.error("Erro ao exportar: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: Status) => {
    const { error } = await supabase
      .from("service_orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
    } else {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      toast.success("Status atualizado!");

      if (newStatus === "Pronto para entrega ou retirada") {
        toast.info("Certifique-se de enviar notificação ao cliente que o pedido esta pronto.", { duration: 6000 });
      } else if (newStatus === "Entregue") {
        toast.info("Certifique-se de enviar o link p/pagamento.", { duration: 6000 });
      }
    }
  };

  const sortedAndFilteredOrders = useMemo(() => {
    let result = orders.filter(
      (order) =>
        order.os_number.toLowerCase().includes(search.toLowerCase()) ||
        order.clients?.name.toLowerCase().includes(search.toLowerCase())
    );

    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'os_number':
            aValue = a.os_number;
            bValue = b.os_number;
            break;
          case 'client':
            aValue = a.clients?.name || '';
            bValue = b.clients?.name || '';
            break;
          case 'entry_date':
            aValue = new Date(a.entry_date).getTime();
            bValue = new Date(b.entry_date).getTime();
            break;
          case 'status':
            const weightA = statusWeight[a.status];
            const weightB = statusWeight[b.status];
            if (weightA !== weightB) {
              return sortConfig.direction === 'asc' ? weightA - weightB : weightB - weightA;
            }
            aValue = new Date(a.updated_at || a.entry_date).getTime();
            bValue = new Date(b.updated_at || b.entry_date).getTime();
            break;
          case 'priority':
            aValue = a.priority ? 1 : 0;
            bValue = b.priority ? 1 : 0;
            break;
          case 'delivery_date':
            aValue = new Date(a.delivery_date || '9999-12-31').getTime();
            bValue = new Date(b.delivery_date || '9999-12-31').getTime();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default sorting if no direction
      result.sort((a, b) => {
        const weightA = statusWeight[a.status];
        const weightB = statusWeight[b.status];
        if (weightA !== weightB) return weightA - weightB;
        return (
          new Date(b.updated_at || b.entry_date).getTime() -
          new Date(a.updated_at || a.entry_date).getTime()
        );
      });
    }

    return result.slice(0, 20);
  }, [orders, search, sortConfig]);

  const recentConfirmations = useMemo(() => {
    // Orders that are "Em espera" and were updated recently
    return orders
      .filter(o => o.status === "Em espera")
      .sort((a, b) => new Date(b.accepted_at || b.updated_at || "").getTime() - new Date(a.accepted_at || a.updated_at || "").getTime())
      .slice(0, 3);
  }, [orders]);

    const getStatusBadge = (status: Status) => {
      const styles = {
        Recebido: "bg-blue-100 text-blue-700",
        "Em espera": "bg-orange-100 text-orange-700",
        "Em serviço": "bg-amber-100 text-amber-700",
        "Em finalização": "bg-indigo-100 text-indigo-700",
        "Pronto para entrega ou retirada": "bg-green-100 text-green-700",
        Entregue: "bg-slate-100 text-slate-700",
        Cancelado: "bg-red-100 text-red-700",
      };
    return (
      <Badge className={`${styles[status]} border-none px-3 py-1`}>
        {status}
      </Badge>
    );
  };

  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTotal = orders
      .filter(o => {
        const entryDate = new Date(o.entry_date);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear && o.status !== "Cancelado";
      })
      .reduce((acc, o) => acc + (o.total || 0), 0);

    const pendingAcceptance = orders.filter(o => o.status === "Recebido").length;
    const inProduction = orders.filter(o => ["Em espera", "Em serviço", "Em finalização"].includes(o.status)).length;
    
    const overdue = orders.filter(o => {
      if (!o.delivery_date || o.status === "Entregue" || o.status === "Cancelado") return false;
      const delivery = new Date(o.delivery_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return delivery < today;
    }).length;

    return { monthlyTotal, pendingAcceptance, inProduction, overdue };
  }, [orders]);

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-7xl mx-auto px-4 lg:px-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-8">
        <div className="flex flex-col gap-4">
          <Link href="/interno">
            <h1 className="font-black text-2xl hover:text-blue-600 transition-colors cursor-pointer">TENISLAB</h1>
          </Link>
          <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Dashboard Interno
              </h1>
              <p className="text-slate-500 font-medium">
                Gestão de OS TENISLAB
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {(role === "ADMIN") && (
              <Link href="/interno/financeiro">
                <Button variant="outline" className="border-emerald-200 text-emerald-600 font-bold rounded-xl gap-2 h-11">
                  <DollarSign className="w-4 h-4" />
                  Financeiro
                </Button>
              </Link>
            )}
            {(role === "ADMIN" || role === "ATENDENTE") && (
              <>
                <Link href="/interno/clientes">
                  <Button variant="outline" className="border-blue-200 text-blue-600 font-bold rounded-xl gap-2 h-11">
                    <UserIcon className="w-4 h-4" />
                    Clientes
                  </Button>
                </Link>
                <Link href="/interno/os">
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl gap-2 h-11 px-6 shadow-lg shadow-slate-200">
                    <Plus className="w-4 h-4" />
                    Nova OS
                  </Button>
                </Link>
              </>
            )}
          </div>
      </header>

      {/* KPI METRICS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500 delay-75">
        <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Mês</span>
            </div>
            <p className="text-2xl font-black text-slate-900">R$ {metrics.monthlyTotal.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Search className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando Aceite</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{metrics.pendingAcceptance}</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Package className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Em Produção</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{metrics.inProduction}</p>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-sm rounded-3xl bg-white overflow-hidden ${metrics.overdue > 0 ? 'ring-2 ring-red-100' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${metrics.overdue > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OS Atrasadas</span>
            </div>
            <p className={`text-2xl font-black ${metrics.overdue > 0 ? 'text-red-600' : 'text-slate-900'}`}>{metrics.overdue}</p>
          </CardContent>
        </Card>
      </section>

      {/* RECENT NOTIFICATIONS / CONFIRMATIONS */}
      {recentConfirmations.length > 0 && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Ações Necessárias: OS Confirmadas</h2>
          </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentConfirmations.map((order) => {
                  const isVeryRecent = order.accepted_at && (new Date().getTime() - new Date(order.accepted_at).getTime()) < 1000 * 60 * 60 * 2; // 2 hours

                  return (
                    <Card 
                      key={order.id} 
                      className={`border-none shadow-lg shadow-slate-100 rounded-[2rem] overflow-hidden bg-white transition-all cursor-pointer group relative ${isVeryRecent ? 'ring-4 ring-red-500 animate-pulse-red' : 'hover:ring-2 ring-amber-400/30'}`} 
                      onClick={() => router.push(`/interno/os/${order.os_number.replace("/", "-")}`)}
                    >
                      {isVeryRecent && (
                        <div className="absolute top-4 right-4 z-10">
                          <Badge className="bg-red-500 text-white border-none px-2 py-0.5 text-[10px] font-black animate-bounce shadow-lg">
                            NOVO ACEITE
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              {isVeryRecent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-blink" />}
                              Aceito em: {new Date(order.accepted_at || order.updated_at || "").toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>

                            <span className="text-xl font-black text-blue-600">{order.os_number}</span>
                          </div>
                          {!isVeryRecent && (
                            <Badge className="bg-green-100 text-green-700 border-none px-2 py-0.5 text-[10px] font-bold">
                              ACEITO PELO CLIENTE
                            </Badge>
                          )}
                        </div>

                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{order.clients?.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{order.items?.length} par(es) • R$ {order.total?.toFixed(2)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" className="w-full justify-between rounded-xl bg-slate-50 group-hover:bg-blue-50 group-hover:text-blue-600 font-bold text-xs transition-colors">
                    Iniciar Produção
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* MAIN LIST */}
      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-50 p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <CardTitle className="flex items-center gap-3 text-slate-900 font-black text-xl uppercase tracking-tight">
              <Package className="w-6 h-6 text-blue-500" />
              Gestão de Ordens
            </CardTitle>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por OS ou cliente..."
                className="pl-11 h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 ring-blue-500/20 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                    <TableRow>
                      <TableHead 
                        className="font-bold text-slate-500 py-6 pl-8 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort('os_number')}
                      >
                        <div className="flex items-center">
                          Nº {getSortIcon('os_number')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-bold text-slate-500 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort('client')}
                      >
                        <div className="flex items-center">
                          Cliente {getSortIcon('client')}
                        </div>
                      </TableHead>
                    <TableHead className="font-bold text-slate-500 text-center">Pares</TableHead>
                    <TableHead 
                      className="font-bold text-slate-500 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('entry_date')}
                    >
                      <div className="flex items-center">
                        Entrada {getSortIcon('entry_date')}
                      </div>
                    </TableHead>
                      <TableHead 
                        className="font-bold text-slate-500 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort('delivery_date')}
                      >
                        <div className="flex items-center">
                          Previsão {getSortIcon('delivery_date')}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold text-slate-500 text-center">Pagamento</TableHead>
                      <TableHead 
                        className="font-bold text-slate-500 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort('status')}
                      >

                      <div className="flex items-center">
                        Status {getSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold text-slate-500 text-center cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('priority')}
                    >
                      <div className="flex items-center justify-center">
                        <Star className="w-4 h-4" /> {getSortIcon('priority')}
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-slate-500 pr-8">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : sortedAndFilteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-20 text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="w-12 h-12 opacity-10" />
                          <span className="font-bold uppercase tracking-widest text-xs">Nenhuma ordem encontrada</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                            {sortedAndFilteredOrders.map((order) => {
                              const isVeryRecent = order.accepted_at && (new Date().getTime() - new Date(order.accepted_at).getTime()) < 1000 * 60 * 60 * 2; // 2 hours


                            return (
                              <TableRow key={order.id} className={`hover:bg-slate-50/50 transition-colors border-b border-slate-50 group ${order.priority ? 'bg-amber-50/30' : ''} ${isVeryRecent ? 'bg-red-50/10 border-l-4 border-l-red-500' : ''}`}>
                                  <TableCell className="pl-8 py-5">
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono font-black text-blue-600 text-base">{order.os_number}</span>
                                          {isVeryRecent && (
                                            <Badge className="bg-red-500 text-white border-none px-1.5 py-0 text-[8px] font-black animate-blink">
                                              NOVO
                                            </Badge>
                                          )}
                                        </div>
                                          {(order.status === "Em espera" || order.status === "Em serviço") && (
                                            <span className={`text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 ${isVeryRecent ? 'text-red-500' : 'text-amber-500'}`}>
                                              {isVeryRecent && <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />}
                                              ACEITO {order.accepted_at ? `ÀS ${new Date(order.accepted_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'PELO CLIENTE'}
                                            </span>
                                          )}
                                      </div>
                                  </TableCell>


                          <TableCell className="font-bold text-slate-700">
                            {order.clients?.name || "Cliente não encontrado"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="rounded-lg font-black text-slate-500 border-slate-200">
                              {order.items?.length || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs font-bold">
                            {new Date(order.entry_date).toLocaleDateString("pt-BR")}
                          </TableCell>
                            <TableCell>
                              {order.delivery_date ? (
                                <span className={`text-xs font-black ${
                                  new Date(order.delivery_date) < new Date(new Date().setHours(0,0,0,0)) 
                                  ? "text-red-500 animate-pulse" 
                                  : "text-slate-500"
                                }`}>
                                  {new Date(order.delivery_date).toLocaleDateString("pt-BR")}
                                </span>
                              ) : "--/--"}
                            </TableCell>
                            <TableCell className="text-center">
                              {order.payment_confirmed ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-none text-[10px] font-bold">PAGO</Badge>
                              ) : order.pay_on_entry ? (
                                <Badge className="bg-blue-100 text-blue-700 border-none text-[10px] font-bold">NA ENTREG.</Badge>
                              ) : (
                                <Badge className="bg-slate-100 text-slate-400 border-none text-[10px] font-bold">PENDENTE</Badge>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(order.status)}</TableCell>

                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => togglePriority(order.id, order.priority)}
                                className={`rounded-full transition-all ${order.priority ? 'text-amber-500 hover:text-amber-600' : 'text-slate-200 hover:text-slate-400'} ${role !== "ADMIN" && role !== "ATENDENTE" ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <Star className={`w-5 h-5 ${order.priority ? 'fill-current' : ''}`} />
                              </Button>
                            </TableCell>
                          <TableCell className="pr-8">
                            <div className="flex gap-2">
                              <Select
                                value={order.status}
                                disabled={
                                  order.status === "Entregue" ||
                                  order.status === "Cancelado"
                                }
                                onValueChange={(v) =>
                                  handleStatusChange(order.id, v as Status)
                                }
                              >
                                <SelectTrigger className="w-[140px] h-10 text-xs rounded-xl border-slate-100 bg-white font-bold shadow-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                      <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                        {(role === "ADMIN" || role === "ATENDENTE" || role === "OPERACIONAL") && (
                                          <>
                                              <SelectItem value="Recebido" className="font-bold text-xs">Recebido</SelectItem>
                                              <SelectItem value="Em espera" className="font-bold text-xs">Em espera</SelectItem>
                                              <SelectItem value="Em serviço" className="font-bold text-xs">Em serviço</SelectItem>
                                              <SelectItem value="Em finalização" className="font-bold text-xs">Em finalização</SelectItem>
                                              <SelectItem value="Pronto para entrega ou retirada" className="font-bold text-xs">Pronto para entrega ou retirada</SelectItem>
                                            </>
                                        )}
                                      {(role === "ADMIN" || role === "ATENDENTE") && (
                                        <>
                                          <SelectItem value="Entregue" className="font-bold text-xs">Entregue</SelectItem>
                                          <SelectItem value="Cancelado" className="font-bold text-xs">Cancelado</SelectItem>
                                        </>
                                      )}
                                    </SelectContent>
                              </Select>
      
                              <Link
                                href={`/interno/os/${order.os_number.replace("/", "-")}`}
                              >
                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95 shadow-sm bg-white border border-slate-50">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50/30">
                        <TableCell colSpan={8} className="py-6 px-8">
                          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              Mostrando as 20 ordens mais recentes
                            </p>
                              {(role === "ADMIN" || role === "ATENDENTE") && (
                                  <div className="flex gap-3">
                                      <Link href="/interno/todos">
                                        <Button variant="outline" className="rounded-xl font-bold text-xs h-10 gap-2 border-slate-200">
                                          <History className="w-3.5 h-3.5" />
                                          Ver Todas as OS
                                          <ArrowRight className="w-3.5 h-3.5" />
                                        </Button>
                                      </Link>
                                  </div>
                                )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* BACKUP SECTION */}
        {(role === "ADMIN") && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-slate-400" />
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Backup do Sistema (CSV)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                disabled={exporting}
                onClick={() => handleExportCSV('clients')}
                className="h-16 rounded-2xl bg-white border-slate-200 hover:bg-slate-50 font-bold gap-3 shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <UserIcon className="w-4 h-4" />
                </div>
                Backup Clientes
                <Download className="w-4 h-4 ml-auto opacity-30" />
              </Button>

              <Button 
                variant="outline" 
                disabled={exporting}
                onClick={() => handleExportCSV('services')}
                className="h-16 rounded-2xl bg-white border-slate-200 hover:bg-slate-50 font-bold gap-3 shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Package className="w-4 h-4" />
                </div>
                Backup Serviços
                <Download className="w-4 h-4 ml-auto opacity-30" />
              </Button>

              <Button 
                variant="outline" 
                disabled={exporting}
                onClick={() => handleExportCSV('finance')}
                className="h-16 rounded-2xl bg-white border-slate-200 hover:bg-slate-50 font-bold gap-3 shadow-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <DollarSign className="w-4 h-4" />
                </div>
                Backup Financeiro
                <Download className="w-4 h-4 ml-auto opacity-30" />
              </Button>
            </div>
          </section>
        )}

      <footer className="mt-auto text-center pt-8 opacity-30">
        <p className="text-slate-900 text-[10px] uppercase tracking-[0.3em] font-black">
          tenislab o laboratorio do seu tenis
        </p>
      </footer>
    </div>
  );
}
