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
  Crown
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
import { supabase, ensureValidSession } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDateTime, formatDateShort } from "@/lib/date-utils";
import { 
  playNotificationSound, 
  playAcceptedSound,
  requestNotificationPermission, 
  showBrowserNotification,
  checkOrderAlerts,
  type Alert 
} from "@/lib/notifications";

type Status = "Recebido" | "Em espera" | "Em serviço" | "Em finalização" | "Pronto" | "Em Rota" | "Entregue" | "Cancelado";

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
    is_vip?: boolean;
  } | null;
}

const statusWeight: Record<Status, number> = {
  "Em espera": 0,
  "Em serviço": 1,
  "Em finalização": 2,
  "Recebido": 3,
  "Pronto": 4,
  "Em Rota": 5,
  "Entregue": 6,
  "Cancelado": 7,
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const [filter, setFilter] = useState<Status | "all" | "pendentes" | "cadastro_pendente">("all");
  const [role, setRole] = useState<string | null>(null);
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
    { label: "✨ Inteligente", value: "smart", icon: "sparkles" },
    { label: "📅 Entrega", value: "delivery_date", icon: "calendar" },
  ];

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const togglePriority = async (orderId: string, currentPriority: boolean) => {
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

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  useEffect(() => {
    const storedRole = localStorage.getItem("tenislab_role");
    
    if (!storedRole) {
      router.push("/interno/login");
      return;
    }

    setRole(storedRole);
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
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          id, os_number, status, entry_date, delivery_date,
          total, payment_method, payment_confirmed, pay_on_entry,
          priority, updated_at, created_at, items,
          clients (
            name,
            phone,
            is_vip
          )
        `)
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) {
        toast.error("Erro ao buscar ordens: " + (error.message || "Tente novamente"));
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
    } catch (err: any) {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
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
    // Buscar o status atual da OS
    const currentOrder = orders.find(o => o.id === orderId);
    
    // Confirmação antes de cancelar
    if (newStatus === 'Cancelado') {
      if (!window.confirm('⚠️ Tem certeza que deseja CANCELAR este pedido?\n\nEsta ação não pode ser desfeita.')) {
        return;
      }
    }
    
    // Bloquear OPERACIONAL de alterar OS que já estão Pronto ou Entregue
    if (role === 'OPERACIONAL' && currentOrder && ['Pronto', 'Entregue'].includes(currentOrder.status)) {
      toast.error("Você não pode alterar o status de uma OS que já está Pronta ou Entregue");
      return;
    }
    
    // Bloquear OPERACIONAL de mudar para status que não são permitidos
    if (role === 'OPERACIONAL' && !['Recebido', 'Em espera', 'Em serviço', 'Em finalização'].includes(newStatus)) {
      toast.error("Você não tem permissão para alterar para este status");
      return;
    }
    setChangedOrderId(orderId);
    
    // Preparar dados para atualização
    const updateData: any = { status: newStatus };
    
    // Se mudar para "Pronto", atualizar delivery_date para hoje
    if (newStatus === "Pronto") {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      updateData.delivery_date = todayStr;
    }
    
    const { error, data: dataArray } = await supabase
      .from("service_orders")
      .update(updateData)
      .eq("id", orderId)
      .select(`*, clients(name, phone)`);
    
    const data = dataArray && dataArray.length > 0 ? dataArray[0] : null;

    if (error || !data) {
      toast.error("Erro ao atualizar status: " + (error?.message || "Erro desconhecido"));
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

      if (newStatus === "Pronto" && data?.clients) {
        const cleanPhone = data.clients.phone?.replace(/\D/g, "") || "";
        const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
        const message = encodeURIComponent(
          `Olá ${data.clients.name}! Seus tênis estão prontinhos e limpos na Tenislab. ✨\n\n` +
          `Já estão aguardando sua retirada ou serão entregues pelo nosso entregador em breve.\n\n` +
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

    // Filtro para OPERACIONAL: ocultar OS com status Pronto
    if (role === "OPERACIONAL") {
      result = result.filter(o => o.status !== "Pronto");
    }

    if (filter === "pendentes") {
      result = result.filter(o => o.status === "Entregue" && !(o.payment_confirmed || o.pay_on_entry));
    } else if (filter === "cadastro_pendente") {
      // OS recebidas mas sem cadastro completo (sem serviços/items)
      result = result.filter(o => 
        o.status === "Recebido" && 
        (!o.items || o.items.length === 0)
      );
    } else if (filter !== "all") {
      result = result.filter(o => o.status === filter);
    }

    if (sortConfig.key === 'smart') {
      result.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority ? -1 : 1;
        
        const aOverdue = a.delivery_date && new Date(a.delivery_date) < new Date() && a.status !== "Entregue" && a.status !== "Cancelado";
        const bOverdue = b.delivery_date && new Date(b.delivery_date) < new Date() && b.status !== "Entregue" && b.status !== "Cancelado";
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        
        const weightA = statusWeight[a.status];
        const weightB = statusWeight[b.status];
        if (weightA !== weightB) return weightA - weightB;
        
        return new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime();
      });
    } else if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'os_number':
            aValue = a.os_number;
            bValue = b.os_number;
            break;
          case 'entry_date':
            aValue = new Date(a.entry_date).getTime();
            bValue = new Date(b.entry_date).getTime();
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
    }

    return result.slice(0, 20);
  }, [orders, globalSearch, sortConfig, filter, role]);

  const getStatusBadge = (status: Status) => {
    const styles = {
      Recebido: "bg-sky-100 text-sky-700",
      "Em espera": "bg-amber-100 text-amber-700",
      "Em serviço": "bg-orange-100 text-orange-700",
      "Em finalização": "bg-purple-100 text-purple-700",
      "Pronto": "bg-emerald-100 text-emerald-700",
      "Em Rota": "bg-blue-100 text-blue-700",
      Entregue: "bg-slate-100 text-slate-700",
      Cancelado: "bg-red-100 text-red-700",
    };
    return (
      <Badge className={`${styles[status]} border-none px-3 py-1 h-auto whitespace-normal text-center transition-all duration-300`}>
        {status}
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
          return { label: "Ver Detalhes", icon: Eye, nextStatus: null };
        case "Em espera":
          return { label: "▶ Iniciar Produção", icon: ArrowRight, nextStatus: "Em serviço" };
        case "Em serviço":
          return { label: "▶ Finalizar Serviço", icon: ArrowRight, nextStatus: "Em finalização" };
        case "Em finalização":
          return { label: "✓ Marcar Pronto", icon: ArrowRight, nextStatus: "Pronto" };
        case "Pronto":
          return { label: "✓ Marcar Entregue", icon: ArrowRight, nextStatus: "Entregue" };
        default:
          return { label: "Ver OS", icon: Eye, nextStatus: null };
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
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            router.push(`/interno/os/${order.os_number.replace("/", "-")}`);
          }}
          className={`border-none shadow-lg shadow-slate-100 rounded-[2rem] overflow-hidden transition-all-smooth hover:ring-2 ring-blue-400/30 group relative cursor-pointer ${order.priority ? 'ring-1 ring-amber-200' : ''} ${isVeryRecent ? 'ring-4 ring-red-500 animate-pulse-red' : ''} ${isChanged ? 'animate-status-change' : ''} ${
            order.status === 'Recebido' ? 'bg-gradient-to-br from-sky-50 to-sky-100/30' :
            order.status === 'Em espera' ? 'bg-gradient-to-br from-amber-50 to-amber-100/30' :
            order.status === 'Em serviço' ? 'bg-gradient-to-br from-orange-50 to-orange-100/30' :
            order.status === 'Em finalização' ? 'bg-gradient-to-br from-purple-50 to-purple-100/30' :
            order.status === 'Pronto' ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/30' :
            order.status === 'Em Rota' ? 'bg-gradient-to-br from-blue-50 to-blue-100/30' :
            order.status === 'Entregue' ? 'bg-gradient-to-br from-slate-50 to-slate-100/30' :
            order.status === 'Cancelado' ? 'bg-gradient-to-br from-red-50 to-red-100/30' : 'bg-white'
          }`}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="flex flex-col">
                <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  {order.status === "Recebido" ? "ENTRADA: " : "ACEITO EM: "}
                  {formatDateTime(order.accepted_at || order.entry_date)}
                </span>
                <span className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight mt-1">{order.os_number}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                {getStatusBadge(order.status)}
                {/* Badge de Pagamento */}
                {order.payment_confirmed ? (
                  <Badge className="bg-green-50 text-green-600 border-green-200 border px-2 py-0.5 text-[9px] font-bold">
                    ✅ PAGO
                  </Badge>
                ) : (
                  <Badge className="bg-red-50 text-red-600 border-red-200 border px-2 py-0.5 text-[9px] font-bold">
                    💵 A PAGAR
                  </Badge>
                )}
                {(order as any).tipo_entrega && (
                  <Badge className={`${
                    (order as any).tipo_entrega === 'entrega' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'bg-purple-50 text-purple-600'
                  } border-none px-2 py-0.5 text-[9px] font-bold`}>
                    {(order as any).tipo_entrega === 'entrega' ? '🚚 ENTREGA' : '🏠 RETIRADA'}
                  </Badge>
                )}
                {order.delivery_date && (
                  <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-tight flex items-center gap-1 ${isOverdue ? 'text-red-500 animate-pulse' : 'text-slate-900'}`}>
                    ENTREGA: {formatDateShort(order.delivery_date)}
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-bold text-slate-700 truncate">{order.clients?.name}</span>
                    {order.clients?.is_vip && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-bold flex-shrink-0">
                        <Crown className="w-2.5 h-2.5" />
                        VIP
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold">{order.items?.length} par(es) • R$ {order.total?.toFixed(2)}</span>
                  </div>
                </div>
                {(role === "ADMIN" || role === "ATENDENTE") && order.clients?.phone && (
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
                onClick={(e) => {
                  e.stopPropagation();
                  if (action.nextStatus) {
                    handleStatusChange(order.id, action.nextStatus as Status);
                  } else {
                    router.push(`/interno/os/${order.os_number.replace("/", "-")}`);
                  }
                }}
                variant="ghost" 
                className="w-full justify-between rounded-xl sm:rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-600 font-bold text-[10px] sm:text-xs h-10 sm:h-12 px-3 sm:px-5 transition-all active:scale-95"
              >
                {action.label}
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-slate-200 flex items-center justify-center bg-white group-hover:border-blue-200">
                  <action.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const sneakersMonth = orders
      .filter(o => {
        if (o.status !== "Entregue") return false;
        const date = new Date(o.updated_at || o.entry_date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((acc, o) => acc + (Array.isArray(o.items) ? o.items.length : 0), 0);

    const pendingAcceptance = orders.filter(o => o.status === "Recebido").length;
    const inProduction = orders.filter(o => ["Em espera", "Em serviço", "Em finalização"].includes(o.status)).length;
    
    const overdue = orders.filter(o => {
      if (!o.delivery_date || o.status === "Entregue" || o.status === "Cancelado") return false;
      const delivery = new Date(o.delivery_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return delivery < today;
    }).length;

    const pendingPayments = orders.filter(o => o.status === "Entregue" && !(o.payment_confirmed || o.pay_on_entry)).length;
    const pendingAmount = orders
      .filter(o => o.status === "Entregue" && !(o.payment_confirmed || o.pay_on_entry))
      .reduce((acc, o) => acc + Number(o.total || 0), 0);
    
    const pendingCollections = orders.filter(o => o.status === "Coleta").length;
    const pendingCompletion = orders.filter(o => o.status === "Recebido" && (!o.items || o.items.length === 0)).length;

    return { sneakersMonth, pendingAcceptance, inProduction, overdue, pendingPayments, pendingAmount, pendingCollections, pendingCompletion };
  }, [orders]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pb-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
      <header className="flex flex-col gap-4 pt-6 sm:pt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-6">
          <div className="flex flex-col gap-2 sm:gap-4">
            <Link href="/interno" prefetch={false}>
              <h1 className="font-black text-xl sm:text-2xl hover:text-blue-600 transition-colors cursor-pointer">Tenislab</h1>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Dashboard Interno
              </h1>
              <p className="text-slate-500 font-medium text-sm sm:text-base">
                Gestão de OS Tenislab
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`rounded-xl h-10 sm:h-11 w-10 sm:w-11 ${soundEnabled ? 'text-blue-600' : 'text-slate-400'}`}
              title={soundEnabled ? "Som ativado" : "Som desativado"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
            </Button>
            
            {alerts.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowAlerts(!showAlerts)}
                className={`rounded-xl gap-2 h-10 sm:h-11 px-3 sm:px-4 relative ${showAlerts ? 'border-red-200 text-red-600' : 'border-amber-200 text-amber-600'}`}
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline font-bold text-xs sm:text-sm">Alertas</span>
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {alerts.length}
                </span>
              </Button>
            )}

{(role === "ADMIN") && (
                <Link href="/interno/financeiro" prefetch={false}>
                  <Button variant="outline" className="border-emerald-200 text-emerald-600 font-bold rounded-xl gap-2 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-4">
                    <DollarSign className="w-4 h-4" />
                    <span className="hidden sm:inline">Financeiro</span>
                  </Button>
                </Link>
              )}
              <Link href="/interno/calendario" prefetch={false}>
                <Button variant="outline" className="border-purple-200 text-purple-600 font-bold rounded-xl gap-2 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-4">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Calendário</span>
                </Button>
              </Link>
            {(role === "ADMIN" || role === "ATENDENTE") && (
              <>
                <Link href="/interno/clientes" prefetch={false}>
                  <Button variant="outline" className="border-blue-200 text-blue-600 font-bold rounded-xl gap-2 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-4">
                    <UserIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Clientes</span>
                  </Button>
                </Link>
                <Link href="/interno/os" prefetch={false}>
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl gap-2 h-10 sm:h-11 px-4 sm:px-6 shadow-lg shadow-slate-200 text-xs sm:text-sm">
                    <Plus className="w-4 h-4" />
                    Nova OS
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {metrics.pendingCollections > 0 && role?.toLowerCase() !== 'operacional' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="overflow-hidden"
            >
              <Card className="border-purple-200 bg-purple-50 rounded-2xl shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center">
                      <Package className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-purple-900 mb-1">
                        📦 {metrics.pendingCollections} Coleta{metrics.pendingCollections > 1 ? 's' : ''} Pendente{metrics.pendingCollections > 1 ? 's' : ''}!
                      </h3>
                      <p className="text-sm text-purple-700 font-medium">
                        Você tem coletas agendadas que precisam ser realizadas. Acesse a página de Entregas para visualizar.
                      </p>
                    </div>
                    <Link href="/interno/entregas" prefetch={false}>
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl h-12 px-6">
                        Ver Coletas
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          {metrics.pendingCompletion > 0 && role?.toLowerCase() !== 'operacional' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="overflow-hidden"
            >
              <Card className="border-orange-200 bg-orange-50 rounded-2xl shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center">
                      <AlertTriangle className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-orange-900 mb-1">
                        ⚠️ {metrics.pendingCompletion} OS Coletada{metrics.pendingCompletion > 1 ? 's' : ''} Aguardando Cadastro!
                      </h3>
                      <p className="text-sm text-orange-700 font-medium">
                        Tênis já coletado! Complete o cadastro da OS com serviços, fotos e valores.
                      </p>
                    </div>
                    <Button 
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl h-12 px-6"
                      onClick={() => {
                        // Ativa filtro de cadastro pendente
                        setFilter('cadastro_pendente');
                        // Rola até a lista de OS
                        setTimeout(() => {
                          const osList = document.querySelector('[data-os-list]');
                          if (osList) {
                            osList.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      }}
                    >
                      Concluir Cadastro
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          {showAlerts && alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-red-100 bg-red-50/50 rounded-2xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Alertas do Sistema
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => setShowAlerts(false)} className="h-6 w-6">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {alerts.map((alert) => (
                      <div key={alert.id} className={`p-3 rounded-xl text-xs ${alert.type === 'danger' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        <p className="font-bold">{alert.title}</p>
                        <p className="opacity-80">{alert.message}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
        {loading ? (
          <>
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-none shadow-sm rounded-2xl sm:rounded-3xl bg-white overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Tênis/Mês</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-slate-900">{metrics.sneakersMonth}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="border-none shadow-sm rounded-2xl sm:rounded-3xl bg-white overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Aceite</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-slate-900">{metrics.pendingAcceptance}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-none shadow-sm rounded-2xl sm:rounded-3xl bg-white overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Produção</span>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-slate-900">{metrics.inProduction}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card className={`border-none shadow-sm rounded-2xl sm:rounded-3xl bg-white overflow-hidden ${metrics.overdue > 0 ? 'ring-2 ring-red-100' : ''}`}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center ${metrics.overdue > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Atrasadas</span>
                  </div>
                  <p className={`text-xl sm:text-2xl font-black ${metrics.overdue > 0 ? 'text-red-600' : 'text-slate-900'}`}>{metrics.overdue}</p>
                </CardContent>
              </Card>
            </motion.div>

            {(role === "ADMIN" || role === "ATENDENTE") && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card 
                  onClick={() => setFilter(filter === "pendentes" ? "all" : "pendentes")}
                  className={`border-none shadow-sm rounded-2xl sm:rounded-3xl bg-white overflow-hidden cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${filter === "pendentes" ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''}`}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Receber</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-black text-slate-900">R$ {metrics.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{metrics.pendingPayments} PEND.</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </section>

      <section className="flex flex-col gap-4 sm:gap-6" data-os-list>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              Gestão de Ordens
            </h2>
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Phone className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <Input
                placeholder="Buscar OS, cliente ou telefone..."
                className="pl-9 sm:pl-11 pr-9 sm:pr-11 h-10 sm:h-12 bg-white border-none rounded-xl sm:rounded-2xl shadow-sm focus-visible:ring-2 ring-blue-500/20 font-medium text-sm"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {sortOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={sortConfig.key === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleSort(opt.value)}
                className={`rounded-full px-4 sm:px-6 h-9 sm:h-10 text-xs sm:text-sm font-bold transition-all ${
                  sortConfig.key === opt.value 
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-600 shadow-lg shadow-blue-200/50 scale-105" 
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:shadow-md shadow-sm"
                }`}
              >
                {opt.label}
                {sortConfig.key === opt.value && (
                  sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 sm:ml-2" /> : <ArrowDown className="w-3 h-3 ml-1 sm:ml-2" />
                )}
              </Button>
            ))}
            {(role === "ADMIN") && (
              <Button
                variant={filter === "pendentes" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(filter === "pendentes" ? "all" : "pendentes")}
                className={`rounded-full px-4 sm:px-6 h-9 sm:h-10 text-xs sm:text-sm font-bold transition-all ${
                  filter === "pendentes" 
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-500 shadow-lg shadow-amber-200/50 scale-105" 
                    : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:text-amber-600 hover:shadow-md shadow-sm"
                }`}
              >
                💰 Pendentes
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </div>
        ) : sortedAndFilteredOrders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 sm:py-20 text-slate-300 gap-4"
          >
            <Package className="w-12 h-12 sm:w-16 sm:h-16 opacity-10" />
            <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs">Nenhuma ordem encontrada</span>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {sortedAndFilteredOrders.map((order, index) => (
                <OrderCard key={order.id} order={order} index={index} />
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 border-t border-slate-100 pt-6 sm:pt-8">
          <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
            Mostrando {sortedAndFilteredOrders.length} ordens recentes
          </p>
          {(role === "ADMIN" || role === "ATENDENTE") && (
            <Link href="/interno/todos" prefetch={false}>
              <Button variant="outline" className="rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest h-10 sm:h-12 px-6 sm:px-8 gap-2 sm:gap-3 border-slate-200 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm w-full sm:w-auto">
                <History className="w-4 h-4" />
                Ver Todas as OS
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {(role === "ADMIN") && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest">Backup do Sistema (CSV)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Button 
              variant="outline" 
              disabled={exporting}
              onClick={() => handleExportCSV('clients')}
              className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-white border-slate-200 hover:bg-slate-50 font-bold gap-2 sm:gap-3 shadow-sm text-xs sm:text-sm"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              Backup Clientes
              <Download className="w-4 h-4 ml-auto opacity-30" />
            </Button>

            <Button 
              variant="outline" 
              disabled={exporting}
              onClick={() => handleExportCSV('services')}
              className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-white border-slate-200 hover:bg-slate-50 font-bold gap-2 sm:gap-3 shadow-sm text-xs sm:text-sm"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              Backup Serviços
              <Download className="w-4 h-4 ml-auto opacity-30" />
            </Button>

            <Button 
              variant="outline" 
              disabled={exporting}
              onClick={() => handleExportCSV('finance')}
              className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-white border-slate-200 hover:bg-slate-50 font-bold gap-2 sm:gap-3 shadow-sm text-xs sm:text-sm"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              Backup Financeiro
              <Download className="w-4 h-4 ml-auto opacity-30" />
            </Button>
          </div>
        </motion.section>
      )}

      <footer className="mt-auto text-center pt-6 sm:pt-8 opacity-30">
        <p className="text-slate-900 text-[9px] sm:text-[10px] uppercase tracking-[0.3em] font-black">
          tenislab o laboratorio do seu tenis
        </p>
      </footer>
    </div>
  );
}
