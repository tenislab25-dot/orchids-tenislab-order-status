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
  BarChart3,
  CalendarDays,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Ticket,
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase, ensureValidSession } from "@/lib/supabase";
import { formatDate } from "@/lib/date-utils";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
  payment_confirmed_at: string | null;
  machine_fee: number;
  discount_percent: number;
  discount_amount: number;
  card_discount: number;
  delivery_fee: number;
  coupon_code: string | null;
  mp_payment_id: string | null;
  items: any[];
  clients: {
    name: string;
  } | null;
}

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const monthNamesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function FinanceiroPage() {
  const [role, setRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"visao-geral" | "projecao-mensal">("visao-geral");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(0);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoalValue, setNewGoalValue] = useState<string>("");

  useEffect(() => {
    const storedRole = localStorage.getItem("tenislab_role");
    setRole(storedRole);
    if (storedRole === "ADMIN") {
      fetchOrders();
      fetchMonthlyGoal();
    }
  }, []);

  const fetchMonthlyGoal = async () => {
    try {
      const { data, error } = await supabase
        .from("financial_settings")
        .select("monthly_goal")
        .limit(1)
        .single();

      if (error) {
        logger.error("Erro ao buscar meta mensal:", error);
      } else if (data) {
        setMonthlyGoal(Number(data.monthly_goal || 0));
      }
    } catch (err) {
      logger.error("Erro ao buscar meta mensal:", err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
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
          payment_confirmed_at,
          machine_fee,
          discount_percent,
          discount_amount,
          card_discount,
          delivery_fee,
          coupon_code,
          mp_payment_id,
          items,
          clients (
            name
          )
        `)
        .order("entry_date", { ascending: false });

      if (error) {
        toast.error("Erro ao buscar dados financeiros: " + (error.message || "Tente novamente"));
      } else {
        setOrders(data as unknown as Order[]);
      }
    } catch (err: any) {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // CÁLCULOS PARA ABA 1: VISÃO GERAL
  // ============================================
  
  const stats = useMemo(() => {
    const confirmedOrders = orders.filter(o => o.payment_confirmed);
    
    // Calcular descontos corretamente
    let totalCouponDiscounts = 0;
    let totalPixDiscounts = 0;
    let totalCardFees = 0;
    
    confirmedOrders.forEach(o => {
      // Desconto de Cupom (discount_amount)
      totalCouponDiscounts += Number(o.discount_amount || 0);
      
      // Desconto do Pix (0,99% quando payment_method = 'Pix' E tem mp_payment_id)
      // Só desconta se foi pelo sistema (Mercado Pago), não desconta Pix manual
      if (o.payment_method === 'Pix' && o.mp_payment_id) {
        totalPixDiscounts += Number(o.total || 0) * 0.0099;
      }
      
      // Taxa de Cartão (machine_fee + card_discount)
      totalCardFees += Number(o.machine_fee || 0) + Number(o.card_discount || 0);
    });
    
    const totalDiscounts = totalCouponDiscounts + totalPixDiscounts + totalCardFees;
    
    // Valor Recebido (Líquido) = Total - Todos os Descontos
    const totalReceived = confirmedOrders.reduce((acc, o) => {
      const pixDiscount = (o.payment_method === 'Pix' && o.mp_payment_id) ? Number(o.total || 0) * 0.0099 : 0;
      const cardFee = Number(o.machine_fee || 0) + Number(o.card_discount || 0);
      return acc + (Number(o.total || 0) - pixDiscount - cardFee);
    }, 0);

    // Este Mês (confirmados - líquido)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const thisMonthTotal = confirmedOrders
      .filter(o => {
        const d = new Date(o.entry_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((acc, o) => {
        const pixDiscount = (o.payment_method === 'Pix' && o.mp_payment_id) ? Number(o.total || 0) * 0.0099 : 0;
        const cardFee = Number(o.machine_fee || 0) + Number(o.card_discount || 0);
        return acc + (Number(o.total || 0) - pixDiscount - cardFee);
      }, 0);

    // Esta Semana (confirmados - líquido)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    const thisWeekTotal = confirmedOrders
      .filter(o => {
        const d = new Date(o.entry_date);
        return d >= startOfWeek && d <= endOfWeek;
      })
      .reduce((acc, o) => {
        const pixDiscount = (o.payment_method === 'Pix' && o.mp_payment_id) ? Number(o.total || 0) * 0.0099 : 0;
        const cardFee = Number(o.machine_fee || 0) + Number(o.card_discount || 0);
        return acc + (Number(o.total || 0) - pixDiscount - cardFee);
      }, 0);

    // A Receber: apenas ordens entregues e não pagas
    const projectedRevenue = orders
      .filter(o => o.status === "Entregue" && !(o.payment_confirmed))
      .reduce((acc, o) => acc + Number(o.total || 0), 0);

    // Projeção Total: Tudo que não foi cancelado
    const totalProjected = orders
      .filter(o => o.status !== "Cancelado")
      .reduce((acc, o) => acc + Number(o.total || 0), 0);

    const lostRevenue = orders
      .filter(o => o.status === "Cancelado")
      .reduce((acc, o) => acc + Number(o.total || 0), 0);

    const activeOrders = orders.filter(o => o.status !== "Cancelado");
    const averageTicket = activeOrders.length > 0 
      ? activeOrders.reduce((acc, o) => acc + Number(o.total || 0), 0) / activeOrders.length 
      : 0;

    // Payment method breakdown (líquido)
    const paymentBreakdown: Record<string, number> = {};
    confirmedOrders.forEach(o => {
      const method = o.payment_method || "Não informado";
      const pixDiscount = (o.payment_method === 'Pix' && o.mp_payment_id) ? Number(o.total || 0) * 0.0099 : 0;
      const cardFee = Number(o.machine_fee || 0) + Number(o.card_discount || 0);
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (Number(o.total || 0) - pixDiscount - cardFee);
    });

    return { 
      totalReceived, 
      projectedRevenue, 
      totalProjected, 
      lostRevenue, 
      paymentBreakdown, 
      averageTicket, 
      thisMonthTotal, 
      thisWeekTotal, 
      totalDiscounts,
      totalCouponDiscounts,
      totalPixDiscounts,
      totalCardFees
    };
  }, [orders]);

  // Últimos Pagamentos (ordenados por data de confirmação)
  const recentPayments = useMemo(() => {
    return orders
      .filter(o => o.payment_confirmed && o.payment_confirmed_at)
      .sort((a, b) => {
        const dateA = new Date(a.payment_confirmed_at!).getTime();
        const dateB = new Date(b.payment_confirmed_at!).getTime();
        return dateB - dateA; // Mais recente primeiro
      })
      .slice(0, 10); // Últimos 10 pagamentos
  }, [orders]);

  // Serviços Mais Vendidos (Top 5)
  const topServices = useMemo(() => {
    const servicesCount: Record<string, { count: number; revenue: number }> = {};
    
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.services && Array.isArray(item.services)) {
            item.services.forEach((service: any) => {
              const name = service.name || 'Desconhecido';
              if (!servicesCount[name]) {
                servicesCount[name] = { count: 0, revenue: 0 };
              }
              servicesCount[name].count += 1;
              servicesCount[name].revenue += Number(service.price || 0);
            });
          }
        });
      }
    });

    return Object.entries(servicesCount)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }));
  }, [orders]);

  // ============================================
  // CÁLCULOS PARA ABA 2: PROJEÇÃO MENSAL
  // ============================================
  
  const confirmedOrders = useMemo(() => {
    return orders.filter(o => o.payment_confirmed);
  }, [orders]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    orders.forEach(o => {
      const year = new Date(o.entry_date).getFullYear();
      years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
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

  const monthlyChartData = useMemo(() => {
    return monthlyBreakdown.map(m => ({
      name: monthNamesShort[m.month],
      valor: m.total,
    }));
  }, [monthlyBreakdown]);

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

  // ============================================
  // FUNÇÕES DA META MENSAL
  // ============================================
  
  const handleSaveGoal = async () => {
    const goalValue = parseFloat(newGoalValue.replace(/[^0-9,]/g, '').replace(',', '.'));
    
    if (isNaN(goalValue) || goalValue < 0) {
      toast.error("Por favor, insira um valor válido");
      return;
    }

    try {
      const { error } = await supabase
        .from("financial_settings")
        .update({ monthly_goal: goalValue, updated_at: new Date().toISOString() })
        .eq("id", "3048ab63-fa82-455c-a1ef-43a21a0e2728"); // ID do registro criado

      if (error) {
        toast.error("Erro ao salvar meta: " + error.message);
        logger.error(error);
      } else {
        setMonthlyGoal(goalValue);
        setIsEditingGoal(false);
        setNewGoalValue("");
        toast.success("Meta mensal atualizada com sucesso!");
      }
    } catch (err) {
      toast.error("Erro ao salvar meta");
      logger.error(err);
    }
  };

  const handleOpenEditGoal = () => {
    setNewGoalValue(monthlyGoal.toFixed(2));
    setIsEditingGoal(true);
  };

  // ============================================
  // FUNÇÕES DE EXPORTAÇÃO
  // ============================================
  
  const handleExportPDF = () => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF();
      const now = new Date();
      const dateStr = now.toLocaleDateString("pt-BR");
      
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("TENISLAB - Relatório Financeiro", 105, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em: ${dateStr}`, 105, 28, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo", 14, 40);

      const summaryData = [
        ["Este Mês (Líquido)", `R$ ${stats.thisMonthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ["Esta Semana (Líquido)", `R$ ${stats.thisWeekTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ["Total Recebido (Líquido)", `R$ ${stats.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ["Descontos de Cupom", `R$ ${stats.totalCouponDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ["Descontos do Pix (0,99%)", `R$ ${stats.totalPixDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ["Taxas de Cartão", `R$ ${stats.totalCardFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ["Total de Descontos", `R$ ${stats.totalDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ["A Receber", `R$ ${stats.projectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ["Projeção Total", `R$ ${stats.totalProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ["Ticket Médio", `R$ ${stats.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ];

      autoTable(doc, {
        startY: 45,
        head: [["Métrica", "Valor"]],
        body: summaryData,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      });

      const lastY = (doc as any).lastAutoTable.finalY + 10;

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Últimos Pagamentos", 14, lastY);

      const paymentsData = recentPayments.map(o => [
        o.os_number,
        o.clients?.name || "N/A",
        formatDate(o.payment_confirmed_at || o.entry_date),
        o.payment_method || "N/A",
        `R$ ${Number(o.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: lastY + 5,
        head: [["OS", "Cliente", "Data Pagamento", "Método", "Valor"]],
        body: paymentsData,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: { 4: { halign: "right" } },
      });

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
        doc.text("TENISLAB - O Laboratório do seu Tênis", 105, 295, { align: "center" });
      }

      doc.save(`relatorio_financeiro_tenislab_${now.toISOString().split('T')[0]}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar PDF");
      logger.error(error);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = selectedMonth !== null 
        ? weeklyBreakdown.flatMap(w => w.orders)
        : confirmedOrders.filter(o => new Date(o.entry_date).getFullYear() === selectedYear);
      
      const rows = dataToExport.map(o => ({
        OS: o.os_number,
        Cliente: o.clients?.name || "N/A",
        Data: formatDate(o.entry_date),
        Valor: Number(o.total || 0).toFixed(2),
        Pagamento: o.payment_method || "N/A",
        Status: o.status
      }));
      
      const headers = Object.keys(rows[0] || {}).join(",");
      const csvRows = rows.map(r => Object.values(r).map(v => `"${v}"`).join(","));
      const csv = "\uFEFF" + [headers, ...csvRows].join("\n");
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_financeiro_${selectedYear}${selectedMonth !== null ? `_${monthNamesShort[selectedMonth]}` : ''}.csv`;
      link.click();
      
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar relatório");
    }
  };

  if (role !== "ADMIN") {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-12 animate-in fade-in">
        <header className="flex items-center gap-4 mb-12">
          <Link href="/menu-principal" prefetch={false}>
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
      <header className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/menu-principal" prefetch={false}>
              <Button variant="ghost" size="icon" className="rounded-full -ml-2">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </Button>
            </Link>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">Financeiro</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full">
          <Button 
            onClick={handleExportPDF}
            disabled={exportingPdf}
            className="flex-1 md:flex-none rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {exportingPdf ? "..." : "Exportar PDF"}
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="visao-geral" className="text-sm font-bold">
              📊 Visão Geral
            </TabsTrigger>
            <TabsTrigger value="projecao-mensal" className="text-sm font-bold">
              📈 Projeção Mensal
            </TabsTrigger>
          </TabsList>

          {/* ============================================ */}
          {/* ABA 1: VISÃO GERAL */}
          {/* ============================================ */}
          <TabsContent value="visao-geral" className="space-y-8">
            {/* CARDS TOP - ESTE MÊS E ESTA SEMANA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-[2rem] border-none shadow-xl shadow-emerald-200/30 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Este Mês</span>
                      <span className="text-4xl font-black tracking-tighter">R$ {stats.thisMonthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CalendarIcon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full w-fit">
                    <div className="w-2 h-2 rounded-full bg-white" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Faturamento Líquido</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-xl shadow-blue-200/30 bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Esta Semana</span>
                      <span className="text-4xl font-black tracking-tighter">R$ {stats.thisWeekTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CalendarDays className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full w-fit">
                    <div className="w-2 h-2 rounded-full bg-white" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Faturamento Líquido</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CARDS SECUNDÁRIOS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-slate-900 text-white overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Recebido (Líquido)</span>
                    <span className="text-3xl font-black tracking-tighter">R$ {stats.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="mt-6 flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full w-fit">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/70">Confirmado</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8">
                <div className="flex flex-col gap-2 h-full justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
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
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projeção Total</span>
                    <span className="text-2xl font-black text-slate-900">R$ {stats.totalProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Potencial Total</p>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8">
                <div className="flex flex-col gap-2 h-full justify-between">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio</span>
                    <span className="text-2xl font-black text-purple-600">R$ {stats.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Média por OS</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* SEÇÃO DE DESCONTOS DETALHADOS */}
            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  Descontos Detalhados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                    <div className="flex items-center gap-3 mb-2">
                      <Ticket className="w-5 h-5 text-orange-600" />
                      <span className="text-xs font-black text-orange-600 uppercase tracking-widest">Cupons</span>
                    </div>
                    <span className="text-3xl font-black text-orange-600">R$ {stats.totalCouponDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-3 mb-2">
                      <Banknote className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Pix (0,99%)</span>
                    </div>
                    <span className="text-3xl font-black text-blue-600">R$ {stats.totalPixDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard className="w-5 h-5 text-purple-600" />
                      <span className="text-xs font-black text-purple-600 uppercase tracking-widest">Taxas Cartão</span>
                    </div>
                    <span className="text-3xl font-black text-purple-600">R$ {stats.totalCardFees.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="bg-red-50 p-6 rounded-2xl border-2 border-red-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                        <TrendingDown className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-red-600 uppercase tracking-widest block">Total de Descontos</span>
                        <span className="text-[10px] text-red-500">Soma de todos os descontos e taxas</span>
                      </div>
                    </div>
                    <span className="text-4xl font-black text-red-600">R$ {stats.totalDiscounts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ÚLTIMOS PAGAMENTOS */}
            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-green-500" />
                  Últimos Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-black uppercase text-[10px]">OS</TableHead>
                        <TableHead className="font-black uppercase text-[10px]">Cliente</TableHead>
                        <TableHead className="font-black uppercase text-[10px]">Data</TableHead>
                        <TableHead className="font-black uppercase text-[10px]">Método</TableHead>
                        <TableHead className="text-right font-black uppercase text-[10px]">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentPayments.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-bold">{order.os_number}</TableCell>
                          <TableCell>{order.clients?.name || "N/A"}</TableCell>
                          <TableCell className="text-xs text-slate-500">
                            {formatDate(order.payment_confirmed_at || order.entry_date)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.payment_method === 'Pix' ? 'default' : 'secondary'} className="text-[10px]">
                              {order.payment_method || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            R$ {Number(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* SERVIÇOS MAIS VENDIDOS */}
            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Top 5 Serviços Mais Vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topServices.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-white rounded-2xl border border-purple-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-500 text-white flex items-center justify-center font-black text-xl">
                          {index + 1}
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-900">{service.name}</span>
                          <p className="text-xs text-slate-500 font-bold">{service.count} vendas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-purple-600">
                          R$ {service.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <p className="text-xs text-slate-500 font-bold">Faturamento</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* META MENSAL COM PROGRESSO */}
            <Card className="rounded-[2rem] border-none shadow-xl shadow-emerald-200/30 bg-gradient-to-br from-emerald-50 to-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Meta Mensal
                  </CardTitle>
                  <Button
                    onClick={handleOpenEditGoal}
                    size="sm"
                    className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                  >
                    Editar Meta
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-6 rounded-2xl border-2 border-emerald-200">
                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Meta</span>
                    <p className="text-3xl font-black text-emerald-600 mt-2">
                      R$ {monthlyGoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border-2 border-blue-200">
                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Realizado</span>
                    <p className="text-3xl font-black text-blue-600 mt-2">
                      R$ {stats.thisMonthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border-2 border-slate-200">
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Falta</span>
                    <p className="text-3xl font-black text-slate-900 mt-2">
                      R$ {Math.max(0, monthlyGoal - stats.thisMonthTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* BARRA DE PROGRESSO */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">Progresso</span>
                    <span className="text-sm font-black text-emerald-600">
                      {monthlyGoal > 0 ? Math.min(100, (stats.thisMonthTotal / monthlyGoal) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-6 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${monthlyGoal > 0 ? Math.min(100, (stats.thisMonthTotal / monthlyGoal) * 100) : 0}%` }}
                    >
                      {monthlyGoal > 0 && (stats.thisMonthTotal / monthlyGoal) * 100 > 10 && (
                        <span className="text-xs font-black text-white">
                          {Math.min(100, (stats.thisMonthTotal / monthlyGoal) * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {stats.thisMonthTotal >= monthlyGoal && monthlyGoal > 0 && (
                  <div className="bg-emerald-100 border-2 border-emerald-500 p-4 rounded-2xl">
                    <p className="text-center text-sm font-black text-emerald-700">
                      🎉 Parabéns! Você atingiu a meta deste mês!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MODAL DE EDIÇÃO DA META */}
            {isEditingGoal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-md rounded-[2rem] border-none shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-black uppercase tracking-tight">Editar Meta Mensal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 mb-2 block">Valor da Meta (R$)</label>
                      <input
                        type="text"
                        value={newGoalValue}
                        onChange={(e) => setNewGoalValue(e.target.value)}
                        placeholder="0,00"
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl font-bold text-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsEditingGoal(false)}
                        variant="outline"
                        className="flex-1 rounded-xl font-bold"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveGoal}
                        className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                      >
                        Salvar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ============================================ */}
          {/* ABA 2: PROJEÇÃO MENSAL */}
          {/* ============================================ */}
          <TabsContent value="projecao-mensal" className="space-y-8">
            {/* SELETOR DE ANO */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-lg">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedYear(prev => prev - 1)}
                disabled={!availableYears.includes(selectedYear - 1)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <span className="text-2xl font-black text-slate-900">{selectedYear}</span>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Ano Selecionado</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedYear(prev => prev + 1)}
                disabled={!availableYears.includes(selectedYear + 1)}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* RESUMO DO ANO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-[2rem] border-none shadow-xl shadow-blue-200/30 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Total do Ano</span>
                      <span className="text-4xl font-black tracking-tighter">R$ {yearlyStats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CalendarIcon className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full w-fit">
                    <div className="w-2 h-2 rounded-full bg-white" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">{yearlyStats.count} OS Confirmadas</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8">
                <div className="flex items-center gap-2 mb-4">
                  <Download className="w-5 h-5 text-slate-600" />
                  <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Exportar Dados</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleExportExcel}
                    className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                  >
                    Excel/CSV
                  </Button>
                </div>
              </Card>
            </div>

            {/* GRÁFICO MENSAL */}
            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase tracking-tight">Faturamento Mensal - {selectedYear}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                    <Tooltip 
                      formatter={(value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="valor" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* BREAKDOWN MENSAL */}
            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50">
              <CardHeader>
                <CardTitle className="text-lg font-black uppercase tracking-tight">Detalhamento por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthlyBreakdown.map((month) => (
                    <div
                      key={month.month}
                      onClick={() => setSelectedMonth(selectedMonth === month.month ? null : month.month)}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                        selectedMonth === month.month
                          ? 'bg-blue-50 border-blue-500 shadow-lg'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-black text-slate-900 uppercase">{month.name}</span>
                        <Badge variant={month.count > 0 ? 'default' : 'secondary'} className="text-xs">
                          {month.count} OS
                        </Badge>
                      </div>
                      <span className="text-2xl font-black text-blue-600">
                        R$ {month.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* DETALHAMENTO SEMANAL (quando um mês é selecionado) */}
            {selectedMonth !== null && weeklyBreakdown.length > 0 && (
              <Card className="rounded-[2rem] border-none shadow-xl shadow-blue-200/30 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader>
                  <CardTitle className="text-lg font-black uppercase tracking-tight text-blue-900">
                    Detalhamento Semanal - {monthNames[selectedMonth]} {selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {weeklyBreakdown.map((week) => (
                      <div key={week.week} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <span className="text-sm font-black text-slate-900 uppercase">Semana {week.week}</span>
                            <p className="text-xs text-slate-500 font-bold">{week.startDate} - {week.endDate}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-blue-600">
                              R$ {week.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <p className="text-xs text-slate-500 font-bold">{week.count} OS</p>
                          </div>
                        </div>
                        {week.orders.length > 0 && (
                          <div className="space-y-2">
                            {week.orders.map((order) => (
                              <div key={order.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-black text-slate-900">{order.os_number}</span>
                                  <span className="text-xs text-slate-600">{order.clients?.name || "N/A"}</span>
                                </div>
                                <span className="text-sm font-bold text-green-600">
                                  R$ {Number(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
