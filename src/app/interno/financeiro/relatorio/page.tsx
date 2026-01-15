"use client";

import { 
  TrendingUp, 
  ArrowLeft, 
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Package,
  Download,
  FileSpreadsheet,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/date-utils";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from "recharts";

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function RelatorioFinanceiroPage() {
  const [role, setRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const monthlyComparison = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const currentMonthOrders = confirmedOrders.filter(o => {
      const d = new Date(o.entry_date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    
    const lastMonthOrders = confirmedOrders.filter(o => {
      const d = new Date(o.entry_date);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
    });
    
    const currentTotal = currentMonthOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const lastTotal = lastMonthOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    
    const percentChange = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;
    
    return {
      currentMonth: monthNames[currentMonth],
      lastMonth: monthNames[currentMonth === 0 ? 11 : currentMonth - 1],
      currentTotal,
      lastTotal,
      currentCount: currentMonthOrders.length,
      lastCount: lastMonthOrders.length,
      percentChange
    };
  }, [confirmedOrders]);

  const paymentMethodsData = useMemo(() => {
    const methods: Record<string, number> = {};
    
    confirmedOrders.filter(o => {
      const d = new Date(o.entry_date);
      return d.getFullYear() === selectedYear;
    }).forEach(o => {
      const method = o.payment_method || "Não informado";
      methods[method] = (methods[method] || 0) + Number(o.total || 0);
    });
    
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [confirmedOrders, selectedYear]);

  const monthlyChartData = useMemo(() => {
    return monthlyBreakdown.map(m => ({
      name: monthNamesShort[m.month],
      atual: m.total,
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

  const handleExportExcel = () => {
    setExporting(true);
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
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = () => {
    setExporting(true);
    try {
      const printContent = document.getElementById('report-content');
      if (printContent) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Relatório Financeiro - Tenislab</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
                h1 { color: #1e293b; font-size: 24px; margin-bottom: 8px; }
                h2 { color: #475569; font-size: 18px; margin-top: 24px; }
                .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
                .metric { display: inline-block; margin-right: 40px; margin-bottom: 16px; }
                .metric-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
                .metric-value { font-size: 24px; font-weight: bold; color: #1e293b; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                th { background: #f8fafc; font-size: 12px; text-transform: uppercase; color: #64748b; }
                .total-row { font-weight: bold; background: #f1f5f9; }
                .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>TENISLAB - Relatório Financeiro</h1>
                <p style="color: #64748b;">${selectedMonth !== null ? `${monthNames[selectedMonth]} de ` : ''}${selectedYear}</p>
              </div>
              
              <div>
                <div class="metric">
                  <div class="metric-label">Total do Período</div>
                  <div class="metric-value">R$ ${(selectedMonth !== null ? selectedMonthStats?.total : yearlyStats.total)?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>
                <div class="metric">
                  <div class="metric-label">Qtd. de OS</div>
                  <div class="metric-value">${selectedMonth !== null ? selectedMonthStats?.count : yearlyStats.count}</div>
                </div>
              </div>
              
              <h2>Detalhamento</h2>
              <table>
                <thead>
                  <tr>
                    <th>OS</th>
                    <th>Cliente</th>
                    <th>Data</th>
                    <th style="text-align: right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${(selectedMonth !== null 
                    ? weeklyBreakdown.flatMap(w => w.orders)
                    : confirmedOrders.filter(o => new Date(o.entry_date).getFullYear() === selectedYear)
                  ).map(o => `
                    <tr>
                      <td>${o.os_number}</td>
                      <td>${o.clients?.name || "N/A"}</td>
                      <td>${formatDate(o.entry_date)}</td>
                      <td style="text-align: right;">R$ ${Number(o.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div class="footer">
                Gerado em ${new Date().toLocaleString('pt-BR')} - TENISLAB Sistema de Gestão
              </div>
            </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar PDF");
    } finally {
      setExporting(false);
    }
  };

  if (role !== "ADMIN") {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-12 animate-in fade-in">
        <header className="flex items-center gap-4 mb-12">
          <Link href="/interno/dashboard" prefetch={false}>
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
    <div className="w-full max-w-6xl mx-auto flex flex-col min-h-screen px-3 sm:px-4 py-6 sm:py-8 animate-in fade-in bg-slate-50" id="report-content">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Link href="/interno/financeiro" prefetch={false}>
            <Button variant="ghost" size="icon" className="rounded-full -ml-2">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">Relatório Financeiro</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none rounded-xl text-xs font-bold gap-2 h-10"
            onClick={handleExportExcel}
            disabled={exporting}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none rounded-xl text-xs font-bold gap-2 h-10"
            onClick={handleExportPDF}
            disabled={exporting}
          >
            <FileText className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <main className="flex flex-col gap-6 sm:gap-8">
          <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Comparativo Mensal</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl font-black">R$ {monthlyComparison.currentTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className={`text-sm font-bold flex items-center gap-1 ${monthlyComparison.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {monthlyComparison.percentChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      {Math.abs(monthlyComparison.percentChange).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">{monthlyComparison.currentMonth} ({monthlyComparison.currentCount} OS)</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Mês Anterior</p>
                  <span className="text-xl sm:text-2xl font-black text-white/70">R$ {monthlyComparison.lastTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <p className="text-xs text-white/40 mt-1">{monthlyComparison.lastMonth} ({monthlyComparison.lastCount} OS)</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{selectedYear}</span>
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

          <Card className="rounded-[2rem] border-none shadow-xl shadow-purple-200/30 bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Total Anual {selectedYear}</span>
                  <span className="text-3xl sm:text-5xl font-black tracking-tighter">R$ {yearlyStats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
              <div className="mt-4 sm:mt-6 flex items-center gap-4">
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                  <Package className="w-4 h-4" />
                  <span className="text-sm font-bold">{yearlyStats.count} OS pagas</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="px-6 py-4 border-b border-slate-50">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento']}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="atual" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="px-6 py-4 border-b border-slate-50">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight">Métodos de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {paymentMethodsData.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie
                          data={paymentMethodsData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {paymentMethodsData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {paymentMethodsData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="font-medium text-slate-600">{item.name}</span>
                          </div>
                          <span className="font-bold text-slate-900">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
                    Sem dados de pagamento
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">Faturamento por Mês</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {monthlyBreakdown.map((m) => (
                <Card 
                  key={m.month}
                  className={`rounded-xl sm:rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                    selectedMonth === m.month 
                      ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-200/50' 
                      : 'border-transparent bg-white shadow-sm hover:shadow-md'
                  }`}
                  onClick={() => setSelectedMonth(selectedMonth === m.month ? null : m.month)}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-2">
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${
                        selectedMonth === m.month ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        {m.name}
                      </span>
                      <span className={`text-xl sm:text-2xl font-black tracking-tighter ${
                        selectedMonth === m.month ? 'text-emerald-700' : 'text-slate-900'
                      }`}>
                        R$ {m.total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">{m.count} OS</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {selectedMonth !== null && selectedMonthStats && (
            <div className="animate-in slide-in-from-top-4 duration-300">
              <Card className="rounded-[2rem] border-none shadow-xl shadow-emerald-200/30 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden mb-6">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">{selectedMonthStats.name} {selectedYear}</span>
                      <span className="text-3xl sm:text-4xl font-black tracking-tighter">R$ {selectedMonthStats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                      <CalendarDays className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-6 flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full">
                      <Package className="w-4 h-4" />
                      <span className="text-sm font-bold">{selectedMonthStats.count} OS</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <h3 className="text-base sm:text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">Faturamento por Semana</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {weeklyBreakdown.map((w) => (
                  <Card key={w.week} className="rounded-xl sm:rounded-2xl border-none bg-white shadow-sm">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest">
                            Semana {w.week}
                          </span>
                          <span className="text-[8px] sm:text-[9px] font-bold text-slate-400">
                            {w.startDate} - {w.endDate}
                          </span>
                        </div>
                        <span className="text-xl sm:text-2xl font-black tracking-tighter text-slate-900">
                          R$ {w.total.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">{w.count} OS</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {weeklyBreakdown.some(w => w.orders.length > 0) && (
                <div className="mt-6">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 mb-4 uppercase tracking-tight">Ordens de Serviço</h3>
                  <Card className="rounded-xl sm:rounded-2xl border-none bg-white shadow-sm overflow-hidden">
                    <div className="max-h-[400px] overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-black text-slate-500 uppercase">OS</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-black text-slate-500 uppercase">Cliente</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-[9px] sm:text-[10px] font-black text-slate-500 uppercase hidden sm:table-cell">Data</th>
                            <th className="px-4 sm:px-6 py-3 text-right text-[9px] sm:text-[10px] font-black text-slate-500 uppercase">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {weeklyBreakdown.flatMap(w => w.orders).map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50/50">
                              <td className="px-4 sm:px-6 py-3 sm:py-4 font-mono font-black text-blue-600 text-xs sm:text-sm">{order.os_number}</td>
                              <td className="px-4 sm:px-6 py-3 sm:py-4 font-medium text-slate-700 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{order.clients?.name || "N/A"}</td>
                              <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-500 text-xs hidden sm:table-cell">{new Date(order.entry_date).toLocaleDateString("pt-BR")}</td>
                              <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-black text-slate-900 text-xs sm:text-sm">R$ {Number(order.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
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

      <footer className="mt-auto text-center pt-8 sm:pt-12 pb-4">
        <p className="text-slate-300 text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-bold">
          Tenislab · Relatório Financeiro
        </p>
      </footer>
    </div>
  );
}
