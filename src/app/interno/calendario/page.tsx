"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Truck,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Order {
  id: string;
  os_number: string;
  status: string;
  delivery_date: string;
  total: number;
  clients: {
    name: string;
  } | null;
  items: any[];
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function CalendarioPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "delivered" | "overdue">("all");

  useEffect(() => {
    const storedRole = localStorage.getItem("tenislab_role");
    if (!storedRole) {
      router.push("/interno/login");
      return;
    }
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        id,
        os_number,
        status,
        delivery_date,
        total,
        items,
        clients (name)
      `)
      .not("delivery_date", "is", null)
      .not("status", "eq", "Cancelado")
      .order("delivery_date", { ascending: true });

    if (error) {
      toast.error("Erro ao buscar pedidos: " + error.message);
    } else {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const filteredOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return orders.filter(order => {
      if (statusFilter === "all") return true;
      
      const deliveryDate = new Date(order.delivery_date);
      const isPast = deliveryDate < today;
      
      if (statusFilter === "delivered") return order.status === "Entregue";
      if (statusFilter === "pending") return order.status !== "Entregue" && !isPast;
      if (statusFilter === "overdue") return order.status !== "Entregue" && isPast;
      
      return true;
    });
  }, [orders, statusFilter]);

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersByDate: Record<string, Order[]> = {};
    filteredOrders.forEach(order => {
      if (order.delivery_date) {
        const dateKey = order.delivery_date;
        if (!ordersByDate[dateKey]) {
          ordersByDate[dateKey] = [];
        }
        ordersByDate[dateKey].push(order);
      }
    });

    const days: Array<{
      day: number | null;
      date: string | null;
      isToday: boolean;
      isPast: boolean;
      orders: Order[];
      hasOverdue: boolean;
      hasDelivered: boolean;
      hasPending: boolean;
    }> = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, date: null, isToday: false, isPast: false, orders: [], hasOverdue: false, hasDelivered: false, hasPending: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOrders = ordersByDate[dateStr] || [];
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < today;

      const hasOverdue = dayOrders.some(o => isPast && o.status !== "Entregue");
      const hasDelivered = dayOrders.some(o => o.status === "Entregue");
      const hasPending = dayOrders.some(o => o.status !== "Entregue" && !isPast);

      days.push({
        day,
        date: dateStr,
        isToday,
        isPast,
        orders: dayOrders,
        hasOverdue,
        hasDelivered,
        hasPending
      });
    }

    return days;
  }, [currentDate, filteredOrders]);

  const selectedDayOrders = useMemo(() => {
    if (!selectedDate) return [];
    return filteredOrders.filter(o => o.delivery_date === selectedDate);
  }, [selectedDate, filteredOrders]);

  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthOrders = orders.filter(o => {
      const d = new Date(o.delivery_date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const total = monthOrders.length;
    const delivered = monthOrders.filter(o => o.status === "Entregue").length;
    const pending = monthOrders.filter(o => o.status !== "Entregue").length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = monthOrders.filter(o => {
      const d = new Date(o.delivery_date);
      return d < today && o.status !== "Entregue";
    }).length;

    return { total, delivered, pending, overdue };
  }, [currentDate, orders]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Entregue": return "bg-emerald-100 text-emerald-700";
      case "Pronto para entrega ou retirada": return "bg-green-100 text-green-700";
      case "Em finalização": return "bg-indigo-100 text-indigo-700";
      case "Em serviço": return "bg-amber-100 text-amber-700";
      case "Em espera": return "bg-orange-100 text-orange-700";
      default: return "bg-blue-100 text-blue-700";
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-10 max-w-7xl mx-auto px-4 lg:px-8">
      <header className="flex flex-col gap-4 pt-8">
        <div className="flex items-center gap-4">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Calendário de Entregas
            </h1>
            <p className="text-slate-500 font-medium text-sm">
              Visualize entregas por data
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card 
          onClick={() => setStatusFilter("all")}
          className={`border-none shadow-sm rounded-2xl bg-white cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${statusFilter === "all" ? 'ring-2 ring-blue-500' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarIcon className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Mês</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{monthStats.total}</p>
          </CardContent>
        </Card>
        <Card 
          onClick={() => setStatusFilter("delivered")}
          className={`border-none shadow-sm rounded-2xl bg-white cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${statusFilter === "delivered" ? 'ring-2 ring-emerald-500' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entregues</span>
            </div>
            <p className="text-2xl font-black text-emerald-600">{monthStats.delivered}</p>
          </CardContent>
        </Card>
        <Card 
          onClick={() => setStatusFilter("pending")}
          className={`border-none shadow-sm rounded-2xl bg-white cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${statusFilter === "pending" ? 'ring-2 ring-amber-500' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendentes</span>
            </div>
            <p className="text-2xl font-black text-amber-600">{monthStats.pending}</p>
          </CardContent>
        </Card>
        <Card 
          onClick={() => setStatusFilter("overdue")}
          className={`border-none shadow-sm rounded-2xl bg-white cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${statusFilter === "overdue" ? 'ring-2 ring-red-500' : ''} ${monthStats.overdue > 0 ? 'ring-2 ring-red-100' : ''}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atrasados</span>
            </div>
            <p className={`text-2xl font-black ${monthStats.overdue > 0 ? 'text-red-600' : 'text-slate-900'}`}>{monthStats.overdue}</p>
          </CardContent>
        </Card>
      </div>

      {statusFilter !== "all" && (
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-bold text-slate-500">
            Filtro ativo: <span className="text-blue-600 uppercase">{statusFilter === "delivered" ? "Entregues" : statusFilter === "pending" ? "Pendentes" : "Atrasados"}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => setStatusFilter("all")} className="text-xs text-slate-400 h-7 px-2">
            Limpar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg rounded-3xl bg-white lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-xl">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-slate-900">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <Button variant="outline" size="sm" onClick={goToToday} className="rounded-lg text-xs font-bold">
                  Hoje
                </Button>
              </div>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-xl">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarData.map((item, index) => (
                <motion.div
                  key={index}
                  whileHover={item.day ? { scale: 1.05 } : {}}
                  whileTap={item.day ? { scale: 0.95 } : {}}
                >
                  <button
                    disabled={!item.day}
                    onClick={() => item.date && setSelectedDate(selectedDate === item.date ? null : item.date)}
                    className={`
                      w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all relative
                      ${!item.day ? 'invisible' : ''}
                      ${item.isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : ''}
                      ${selectedDate === item.date && !item.isToday ? 'bg-slate-900 text-white' : ''}
                      ${!item.isToday && selectedDate !== item.date ? 'hover:bg-slate-50' : ''}
                      ${item.isPast && !item.isToday && selectedDate !== item.date ? 'text-slate-400' : ''}
                    `}
                  >
                    <span className="text-sm font-bold">{item.day}</span>
                    {item.orders.length > 0 && (
                      <div className="flex gap-0.5">
                        {item.hasOverdue && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        )}
                        {item.hasPending && (
                          <span className={`w-1.5 h-1.5 rounded-full ${item.isToday || selectedDate === item.date ? 'bg-white/70' : 'bg-amber-500'}`}></span>
                        )}
                        {item.hasDelivered && (
                          <span className={`w-1.5 h-1.5 rounded-full ${item.isToday || selectedDate === item.date ? 'bg-white/70' : 'bg-emerald-500'}`}></span>
                        )}
                      </div>
                    )}
                    {item.orders.length > 0 && (
                      <span className={`text-[9px] font-bold ${item.isToday || selectedDate === item.date ? 'text-white/80' : 'text-slate-400'}`}>
                        {item.orders.length}
                      </span>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-[10px] font-bold text-slate-500">Atrasado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-[10px] font-bold text-slate-500">Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-bold text-slate-500">Entregue</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg rounded-3xl bg-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                {selectedDate 
                  ? new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: '2-digit', month: 'long' })
                  : "Selecione uma data"
                }
              </h3>
            </div>

            <AnimatePresence mode="wait">
              {!selectedDate ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-slate-300"
                >
                  <CalendarIcon className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-xs font-bold text-slate-400">Clique em um dia para ver as entregas</p>
                </motion.div>
              ) : selectedDayOrders.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-slate-300"
                >
                  <Package className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-xs font-bold text-slate-400">Nenhuma entrega nesta data</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3 max-h-[500px] overflow-y-auto"
                >
                  {selectedDayOrders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/interno/os/${order.os_number.replace("/", "-")}`}>
                        <Card className="border-none shadow-sm rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-lg font-black text-blue-600">{order.os_number}</span>
                              <Badge className={`${getStatusColor(order.status)} border-none text-[9px] font-bold`}>
                                {order.status === "Pronto para entrega ou retirada" ? "PRONTO" : order.status}
                              </Badge>
                            </div>
                            <p className="text-sm font-bold text-slate-700 truncate">{order.clients?.name}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[10px] font-bold text-slate-400">{order.items?.length || 0} par(es)</span>
                              <span className="text-sm font-black text-slate-900">R$ {Number(order.total).toFixed(2)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      <footer className="mt-auto text-center pt-8 opacity-30">
        <p className="text-slate-900 text-[10px] uppercase tracking-[0.3em] font-black">
          tenislab o laboratorio do seu tenis
        </p>
      </footer>
    </div>
  );
}
