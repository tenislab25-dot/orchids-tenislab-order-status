"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  Star,
  AlertTriangle,
  X,
  Phone,
  Volume2,
  VolumeX,
  Filter,
  MessageCircle,
  Loader2
} from "lucide-react";

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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { 
  playNotificationSound, 
  playAcceptedSound,
  requestNotificationPermission, 
  showBrowserNotification,
  checkOrderAlerts,
  type Alert 
} from "@/lib/notifications";
import { useAuth } from "@/hooks/useAuth";

type Status = "Recebido" | "Em espera" | "Em serviço" | "Em finalização" | "Pronto para entrega ou retirada" | "Entregue" | "Cancelado";

interface Order {
  id: string;
  os_number: string;
  status: Status;
  entry_date: string;
  delivery_date?: string;
  total?: number;
  priority: boolean;
  payment_confirmed: boolean;
  pay_on_entry: boolean;
  updated_at?: string;
  accepted_at?: string;
  items: any[];
  clients: {
    name: string;
    phone?: string;
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


const OrderCardSkeleton = () => (
  <Card className="border-none shadow-lg shadow-slate-100 rounded-[2rem] overflow-hidden bg-white">
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="w-10 h-10 rounded-2xl" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
    </CardContent>
  </Card>
);

const MetricCardSkeleton = () => (
  <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-center gap-3 mb-2">
        <Skeleton className="w-8 h-8 rounded-xl" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-16" />
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const router = useRouter();
  const { role: userRole, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [filter, setFilter] = useState<string>("smart");
  const [exporting, setExporting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [changedOrderId, setChangedOrderId] = useState<string | null>(null);
  const previousOrdersRef = useRef<Order[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'smart',
    direction: 'asc'
  });

  const sortOptions = [
    { label: "INTELIGENTE", value: "smart" },
    { label: "ENTRADA", value: "Recebido" },
    { label: "ENTREGA", value: "Pronto para entrega ou retirada" },
    { label: "OS", value: "os_number" },
    { label: "PAGAMENTOS PENDENTES", value: "pendentes" },
  ];

  const handleSort = (value: string) => {
    setFilter(value);
    if (value === "os_number") {
      setSortConfig({ key: 'os_number', direction: 'asc' });
    } else {
      setSortConfig({ key: 'smart', direction: 'asc' });
    }
  };

  const togglePriority = async (orderId: string, currentPriority: boolean) => {
    if (userRole !== "ADMIN" && userRole !== "ATENDENTE") {
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

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  useEffect(() => {
    if (authLoading) return;
    if (!userRole) {
      router.push("/interno/login");
      return;
    }

    requestNotificationPermission();
    fetchOrders();

    const channel = supabase
      .channel("dashboard_orders")
      .on(
        "postgres_changes",
        { event: "*", table: "service_orders" },
        (payload) => {
          if (payload.eventType === "INSERT" && soundEnabledRef.current) {
            playNotificationSound();
            showBrowserNotification("Nova OS Criada", `OS ${(payload.new as any).os_number} foi criada`);
            toast.success("Nova OS criada!", { duration: 5000 });
          }
          
          if (payload.eventType === "UPDATE" && soundEnabledRef.current) {
            const newData = payload.new as any;
            const oldData = payload.old as any;
            
            if (oldData.status === "Recebido" && newData.status !== "Recebido" && newData.accepted_at) {
              playAcceptedSound();
              showBrowserNotification("Cliente Aceitou!", `OS ${newData.os_number} foi aceita pelo cliente`);
              toast.success(`OS ${newData.os_number} aceita pelo cliente!`, { 
                duration: 8000,
                style: { background: '#22c55e', color: 'white' }
              });
            }
          }
          
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authLoading, userRole]);

  const fetchOrders = async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        *,
        clients (
          name,
          phone
        )
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Erro ao buscar ordens: " + error.message);
    } else {
      const dashboardOrders = data?.filter((o: any) => {
        const isDone = o.status === "Entregue" || o.status === "Cancelado";
        if (!isDone) return true;
        const updatedAt = new Date(o.updated_at || o.created_at);
        return updatedAt > thirtyDaysAgo;
      });
      setOrders(dashboardOrders as Order[]);
      
      const orderAlerts = checkOrderAlerts(dashboardOrders || []);
      setAlerts(orderAlerts);
      
      previousOrdersRef.current = dashboardOrders as Order[];
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
    if (userRole === 'OPERACIONAL' && !['Recebido', 'Em espera', 'Em serviço', 'Em finalização'].includes(newStatus)) {
      toast.error("Você não tem permissão para alterar para este status");
      return;
    }
    setChangedOrderId(orderId);
    
    const { error, data } = await supabase
      .from("service_orders")
      .update({ status: newStatus })
      .eq("id", orderId)
      .select(`*, clients(name, phone)`)
      .single();

    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
    } else {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      toast.success("Status atualizado!");

      fetch("/api/notifications/status-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          clientName: data?.clients?.name || "Cliente",
          osNumber: data?.os_number,
        }),
      }).catch(console.error);

      if (newStatus === "Pronto para entrega ou retirada" && data?.clients) {
        const cleanPhone = data.clients.phone?.replace(/\D/g, "") || "";
        const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
        const message = encodeURIComponent(
          `Olá ${data.clients.name}! Seus tênis estão prontinhos e limpos na Tenislab. ✨\n\n` +
          `Já estão aguardando sua retirada ou serão entregues pelo nosso motoboy em breve.\n\n` +
          `Qualquer dúvida, estamos à disposição!`
        );
        window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
      } else if (newStatus === "Entregue" && data?.clients) {
        const cleanPhone = data.clients.phone?.replace(/\D/g, "") || "";
        const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
        const paymentLink = `${window.location.origin}/pagamento/${data.id}`;
        
        const message = encodeURIComponent(
          `Olá ${data.clients.name}! Seu pedido #${data.os_number} foi entregue! 📦\n\n` +
          `Valor total: R$ ${Number(data.total).toFixed(2)}\n\n` +
          `Para realizar o pagamento via Pix ou ver os detalhes, acesse o link abaixo:\n${paymentLink}\n\n` +
          `Gostou do resultado? Se puder nos avaliar no Google, ajuda muito nosso laboratório:\nhttps://g.page/r/CWIZ5KPcIIJVEBM/review\n\n` +
          `Obrigado pela preferência!`
        );
        window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
      }
    }
    
    setTimeout(() => setChangedOrderId(null), 600);
  };

  const sortedAndFilteredOrders = useMemo(() => {
    let result = orders.filter((order) => {
      const searchLower = globalSearch.toLowerCase();
      return (
        order.os_number.toLowerCase().includes(searchLower) ||
        order.clients?.name.toLowerCase().includes(searchLower) ||
        order.clients?.phone?.includes(globalSearch)
      );
    });

    if (filter === "pendentes") {
      result = result.filter(o => o.status === "Entregue" && !(o.payment_confirmed || o.pay_on_entry));
    } else if (filter !== "smart" && filter !== "os_number") {
      result = result.filter(o => o.status === filter);
    }

    if (sortConfig.key === 'smart') {
      result.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority ? -1 : 1;
        
        const aOverdue = a.delivery_date && new Date(a.delivery_date) < new Date() && a.status !== "Entregue" && a.status !== "Cancelado";
        const bOverdue = b.delivery_date && new Date(b.delivery_date) < new Date() && b.status !== "Entregue" && b.status !== "Cancelado";
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        
        const weightA = statusWeight[a.status] ?? 99;
        const weightB = statusWeight[b.status] ?? 99;
        if (weightA !== weightB) return weightA - weightB;
        
        return new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime();
      });
    } else if (sortConfig.key === 'os_number') {
      result.sort((a, b) => a.os_number.localeCompare(b.os_number));
    }

    return result;
  }, [orders, globalSearch, sortConfig, filter]);

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
      <Badge className={`${styles[status] || "bg-slate-100 text-slate-700"} border-none px-3 py-1 h-auto whitespace-normal text-center transition-all duration-300`}>
        {status === "Pronto para entrega ou retirada" ? (
          <span className="flex flex-col leading-none py-0.5">
            <span>Pronto p/</span>
            <span>entrega</span>
          </span>
        ) : status}
      </Badge>
    );
  };

  const OrderCard = ({ order, index }: { order: Order; index: number }) => {
    const isVeryRecent = order.accepted_at && (new Date().getTime() - new Date(order.accepted_at).getTime()) < 1000 * 60 * 60 * 2;
    const isOverdue = order.delivery_date && new Date(order.delivery_date) < new Date(new Date().setHours(0,0,0,0)) && order.status !== "Entregue" && order.status !== "Cancelado";
    const isChanged = changedOrderId === order.id;

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        layout
      >
        <Card 
          onClick={() => router.push(`/interno/os/${order.os_number.replace("/", "-")}`)}
          className={`border-none shadow-lg shadow-slate-100 rounded-[2rem] overflow-hidden bg-white transition-all-smooth hover:ring-2 ring-blue-400/30 group relative cursor-pointer ${order.priority ? 'bg-amber-50/20 ring-1 ring-amber-200' : ''} ${isVeryRecent ? 'ring-4 ring-red-500 animate-pulse-red' : ''} ${isChanged ? 'animate-status-change' : ''}`}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  {order.status === "Recebido" ? "ENTRADA: " : "ACEITO EM: "}
                  {new Date(order.accepted_at || order.entry_date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight mt-1">{order.os_number}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                {getStatusBadge(order.status)}
                {order.delivery_date && (
                  <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-tight flex items-center gap-1 ${isOverdue ? 'text-red-500 animate-pulse' : 'text-slate-900'}`}>
                    ENTREGA: {new Date(order.delivery_date).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' })}
                  </span>
                )}
              </div>
            </div>

              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-50 flex items-center justify-center relative">
                  <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePriority(order.id, order.priority);
                    }}
                    className={`absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full shadow-sm bg-white border border-slate-100 transition-all ${order.priority ? 'text-amber-500' : 'text-slate-200'}`}
                  >
                    <Star className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${order.priority ? 'fill-current' : ''}`} />
                  </Button>
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-700 truncate">{order.clients?.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold">{order.items?.length} par(es) • R$ {order.total?.toFixed(2)}</span>
                  </div>
                </div>
                {(userRole === "ADMIN" || userRole === "ATENDENTE") && order.clients?.phone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      const cleanPhone = order.clients?.phone?.replace(/\D/g, "") || "";
                      const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
                      window.open(`https://wa.me/${whatsappPhone}`, "_blank");
                    }}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-green-50 hover:bg-green-100 text-green-600"
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                )}
              </div>

            <div className="flex flex-col gap-2">
              <Button 
                variant="ghost" 
                className="w-full justify-between rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 font-bold text-[10px] sm:text-xs h-10 sm:h-12 px-3 sm:px-5 transition-all active:scale-95"
              >
                {action.label}
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-200 flex items-center justify-center bg-white group-hover:border-blue-200">
                  <action.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </div>
              </Button>

              {order.status !== "Entregue" && order.status !== "Cancelado" && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={order.status}
                    onValueChange={(v) => handleStatusChange(order.id, v as Status)}
                  >
                    <SelectTrigger className="h-7 sm:h-8 text-[8px] sm:text-[9px] rounded-lg sm:rounded-xl border-none bg-transparent hover:bg-slate-50 font-black uppercase tracking-widest text-slate-400">
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
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const metrics = useMemo(() => {
    const total = orders.length;
    const active = orders.filter(o => o.status !== "Entregue" && o.status !== "Cancelado").length;
    const priority = orders.filter(o => o.priority).length;
    const ready = orders.filter(o => o.status === "Pronto para entrega ou retirada").length;
    
    return { total, active, priority, ready };
  }, [orders]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* HEADER & SEARCH */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              Dashboard
            </h1>
            <p className="text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em] mt-2">Gestão de Ordens de Serviço</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`rounded-xl ${soundEnabled ? 'text-blue-600 bg-blue-50' : 'text-slate-400 bg-slate-50'}`}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAlerts(!showAlerts)}
                className={`rounded-xl ${alerts.length > 0 ? 'text-red-600 bg-red-50' : 'text-slate-400 bg-slate-50'}`}
              >
                <Bell className="w-5 h-5" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {alerts.length}
                  </span>
                )}
              </Button>
              
              <AnimatePresence>
                {showAlerts && alerts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 z-50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">Alertas ({alerts.length})</h3>
                      <Button variant="ghost" size="icon" onClick={() => setShowAlerts(false)} className="h-6 w-6 rounded-full">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-2">
                      {alerts.map((alert, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-red-50 border border-red-100 flex gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-red-900">{alert.title}</span>
                            <span className="text-[10px] text-red-700 font-medium leading-tight mt-1">{alert.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link href="/interno/os">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl gap-2 shadow-lg shadow-slate-200 h-10 sm:h-12 px-4 sm:px-6">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Nova OS</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-none shadow-sm rounded-2xl sm:rounded-3xl bg-white overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                </div>
                <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Ativas</span>
              </div>
              <div className="text-xl sm:text-3xl font-black text-slate-900">{metrics.active}</div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm rounded-2xl sm:rounded-3xl bg-white overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" />
                </div>
                <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridades</span>
              </div>
              <div className="text-xl sm:text-3xl font-black text-slate-900">{metrics.priority}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl sm:rounded-3xl bg-white overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                </div>
                <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Prontas</span>
              </div>
              <div className="text-xl sm:text-3xl font-black text-slate-900">{metrics.ready}</div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-2xl sm:rounded-3xl bg-white overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <History className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600" />
                </div>
                <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Últimos 30 dias</span>
              </div>
              <div className="text-xl sm:text-3xl font-black text-slate-900">{metrics.total}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar por OS, Cliente ou Telefone..."
              className="pl-12 h-12 sm:h-14 rounded-2xl sm:rounded-3xl border-none bg-white shadow-lg shadow-slate-100 text-sm sm:text-base font-medium placeholder:text-slate-400 focus-visible:ring-blue-400"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            {sortOptions.map((option) => (
              <Button
                key={option.value}
                variant={filter === option.value ? "default" : "ghost"}
                onClick={() => handleSort(option.value)}
                className={`h-12 sm:h-14 px-4 sm:px-6 rounded-2xl sm:rounded-3xl font-black text-[10px] sm:text-xs uppercase tracking-widest whitespace-nowrap transition-all ${filter === option.value ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ORDERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <OrderCardSkeleton key={i} />)
          ) : sortedAndFilteredOrders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-20 flex flex-col items-center justify-center text-center"
            >
              <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                <Package className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Nenhuma OS encontrada</h3>
              <p className="text-slate-400 font-medium max-w-xs">Tente ajustar seus filtros ou busca para encontrar o que procura.</p>
            </motion.div>
          ) : (
            sortedAndFilteredOrders.map((order, index) => (
              <OrderCard key={order.id} order={order} index={index} />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* EXPORT BUTTONS (ADMIN ONLY) */}
      {userRole === 'ADMIN' && (
        <div className="mt-12 pt-8 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-5 h-5 text-slate-400" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Exportação de Dados</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              disabled={exporting}
              onClick={() => handleExportCSV('clients')}
              className="rounded-2xl border-slate-200 text-slate-600 font-bold gap-2 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" /> Clientes
            </Button>
            <Button 
              variant="outline" 
              disabled={exporting}
              onClick={() => handleExportCSV('services')}
              className="rounded-2xl border-slate-200 text-slate-600 font-bold gap-2 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" /> Serviços
            </Button>
            <Button 
              variant="outline" 
              disabled={exporting}
              onClick={() => handleExportCSV('finance')}
              className="rounded-2xl border-slate-200 text-slate-600 font-bold gap-2 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" /> Financeiro
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
