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
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'status',
    direction: 'asc'
  });

  const sortOptions = [
    { label: "Data", value: "entry_date" },
    { label: "Entrega", value: "delivery_date" },
    { label: "OS", value: "os_number" },
    { label: "Nome", value: "client" },
  ];

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
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

  const OrderCard = ({ order }: { order: Order }) => {
    const isVeryRecent = order.accepted_at && (new Date().getTime() - new Date(order.accepted_at).getTime()) < 1000 * 60 * 60 * 2;
    const isOverdue = order.delivery_date && new Date(order.delivery_date) < new Date(new Date().setHours(0,0,0,0)) && order.status !== "Entregue" && order.status !== "Cancelado";

    // Dynamic button based on status
    const getActionButton = () => {
      switch (order.status) {
        case "Recebido":
          return { label: "Ver Detalhes", icon: Eye };
        case "Em espera":
          return { label: "Iniciar Produção", icon: CheckCircle2 };
        case "Em serviço":
          return { label: "Finalizar Serviço", icon: CheckCircle2 };
        case "Em finalização":
          return { label: "Pronto p/ Entrega", icon: CheckCircle2 };
        case "Pronto para entrega ou retirada":
          return { label: "Marcar Entregue", icon: CheckCircle2 };
        default:
          return { label: "Ver OS", icon: Eye };
      }
    };

    const action = getActionButton();

    return (
      <Card 
        className={`border-none shadow-lg shadow-slate-100 rounded-[2rem] overflow-hidden bg-white transition-all hover:ring-2 ring-blue-400/30 group relative ${order.priority ? 'bg-amber-50/20 ring-1 ring-amber-200' : ''} ${isVeryRecent ? 'ring-4 ring-red-500 animate-pulse-red' : ''}`}
      >
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                {order.status === "Recebido" ? "ENTRADA: " : "ACEITO EM: "}
                {new Date(order.accepted_at || order.entry_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-2xl font-black text-blue-600 tracking-tight mt-1">{order.os_number}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              {getStatusBadge(order.status)}
              {isOverdue && (
                <span className="text-[8px] font-black text-red-500 uppercase animate-pulse">
                  ATRASADA: {new Date(order.delivery_date!).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center relative">
              <UserIcon className="w-5 h-5 text-slate-400" />
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePriority(order.id, order.priority);
                }}
                className={`absolute -top-2 -right-2 w-6 h-6 rounded-full shadow-sm bg-white border border-slate-100 transition-all ${order.priority ? 'text-amber-500' : 'text-slate-200'}`}
              >
                <Star className={`w-3 h-3 ${order.priority ? 'fill-current' : ''}`} />
              </Button>
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-bold text-slate-700 truncate">{order.clients?.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold">{order.items?.length} par(es) • R$ {order.total?.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link href={`/interno/os/${order.os_number.replace("/", "-")}`} className="w-full">
              <Button 
                variant="ghost" 
                className="w-full justify-between rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 font-bold text-xs h-12 px-5 transition-all active:scale-95"
              >
                {action.label}
                <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center bg-white group-hover:border-blue-200">
                  <action.icon className="w-3 h-3" />
                </div>
              </Button>
            </Link>

            {order.status !== "Entregue" && order.status !== "Cancelado" && (
              <Select
                value={order.status}
                onValueChange={(v) => handleStatusChange(order.id, v as Status)}
              >
                <SelectTrigger className="h-8 text-[9px] rounded-xl border-none bg-transparent hover:bg-slate-50 font-black uppercase tracking-widest text-slate-400">
                  <SelectValue placeholder="Alterar Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                  <SelectItem value="Recebido" className="font-bold text-xs">Recebido</SelectItem>
                  <SelectItem value="Em espera" className="font-bold text-xs">Em espera</SelectItem>
                  <SelectItem value="Em serviço" className="font-bold text-xs">Em serviço</SelectItem>
                  <SelectItem value="Em finalização" className="font-bold text-xs">Em finalização</SelectItem>
                  <SelectItem value="Pronto para entrega ou retirada" className="font-bold text-xs">Pronto p/ Entrega</SelectItem>
                  <SelectItem value="Entregue" className="font-bold text-xs">Entregue</SelectItem>
                  <SelectItem value="Cancelado" className="font-bold text-xs">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>
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
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Ações Necessárias: OS Confirmadas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentConfirmations.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}

      {/* MAIN LIST */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Gestão de Ordens
            </h2>
            <div className="flex flex-wrap gap-2">
              {sortOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={sortConfig.key === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSort(opt.value)}
                  className={`rounded-full px-5 h-9 text-[10px] font-black uppercase tracking-widest transition-all ${
                    sortConfig.key === opt.value 
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100" 
                      : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-600 shadow-sm"
                  }`}
                >
                  {opt.label}
                  {sortConfig.key === opt.value && (
                    sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-2" /> : <ArrowDown className="w-3 h-3 ml-2" />
                  )}
                </Button>
              ))}
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por OS ou cliente..."
              className="pl-11 h-12 bg-white border-none rounded-2xl shadow-sm focus-visible:ring-2 ring-blue-500/20 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando Ordens...</span>
          </div>
        ) : sortedAndFilteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
            <Package className="w-16 h-16 opacity-10" />
            <span className="font-black uppercase tracking-widest text-xs">Nenhuma ordem encontrada</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedAndFilteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-100 pt-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Mostrando {sortedAndFilteredOrders.length} ordens recentes
          </p>
          {(role === "ADMIN" || role === "ATENDENTE") && (
            <Link href="/interno/todos">
              <Button variant="outline" className="rounded-2xl font-black text-[10px] uppercase tracking-widest h-12 px-8 gap-3 border-slate-200 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm">
                <History className="w-4 h-4" />
                Ver Todas as OS
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

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
