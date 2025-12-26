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
  PieChart
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

type Status = "Recebido" | "Em serviço" | "Pronto" | "Entregue" | "Cancelado";

interface Order {
  id: string;
  os_number: string;
  status: Status;
  entry_date: string;
  total: number;
  payment_method: string;
  clients: {
    name: string;
  } | null;
}

export default function FinanceiroPage() {
  const [role, setRole] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
    const delivered = orders.filter(o => o.status === "Entregue");
    const totalCash = delivered.reduce((acc, o) => acc + Number(o.total || 0), 0);

    const projectedRevenue = orders
      .filter(o => o.status !== "Cancelado" && o.status !== "Entregue")
      .reduce((acc, o) => acc + Number(o.total || 0), 0);

    const lostRevenue = orders
      .filter(o => o.status === "Cancelado")
      .reduce((acc, o) => acc + Number(o.total || 0), 0);

    // Payment method breakdown
    const paymentBreakdown: Record<string, number> = {};
    delivered.forEach(o => {
      const method = o.payment_method || "Não informado";
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + Number(o.total || 0);
    });

    return { totalCash, projectedRevenue, lostRevenue, paymentBreakdown };
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
          <h1 className="text-2xl font-bold text-slate-900">Financeiro</h1>
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
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-black text-slate-900 tracking-tighter">TENIS</span>
          <span className="text-xl font-light text-blue-500 tracking-tighter">LAB</span>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : (
        <main className="flex flex-col gap-8">
          {/* CARDS TOP */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-slate-900 text-white overflow-hidden col-span-1 md:col-span-1">
              <CardContent className="p-8">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Saldo em Caixa (Entregues)</span>
                  <span className="text-4xl font-black tracking-tighter">R$ {stats.totalCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Receita Realizada</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8">
              <div className="flex flex-col gap-4 h-full justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita Projetada</span>
                  <span className="text-3xl font-black text-slate-900">R$ {stats.projectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Ordens em andamento/prontas</p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/50 bg-white p-8">
              <div className="flex flex-col gap-4 h-full justify-between">
                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receita Cancelada</span>
                  <span className="text-3xl font-black text-red-600">R$ {stats.lostRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Total de ordens canceladas</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* PAYMENT METHODS */}
            <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden lg:col-span-1">
              <CardHeader className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-500" />
                  Métodos de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex flex-col gap-4">
                  {Object.entries(stats.paymentBreakdown).length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-4">Nenhum pagamento registrado</p>
                  ) : (
                    Object.entries(stats.paymentBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([method, total]) => (
                        <div key={method} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                          <div className="flex items-center gap-3">
                            {method.toLowerCase().includes('pix') ? <Banknote className="w-4 h-4 text-emerald-500" /> : <CreditCard className="w-4 h-4 text-blue-500" />}
                            <span className="text-sm font-bold text-slate-700">{method}</span>
                          </div>
                          <span className="text-sm font-black text-slate-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* RECENT TRANSACTIONS */}
            <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden lg:col-span-2">
              <CardHeader className="px-8 py-6 border-b border-slate-50 bg-slate-50/30">
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  Transações Realizadas (Entregues)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="pl-8 font-bold text-slate-500">OS</TableHead>
                        <TableHead className="font-bold text-slate-500">Cliente</TableHead>
                        <TableHead className="font-bold text-slate-500">Data</TableHead>
                        <TableHead className="font-bold text-slate-500">Pagamento</TableHead>
                        <TableHead className="pr-8 text-right font-bold text-slate-500">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.filter(o => o.status === "Entregue").length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                            Nenhuma transação encontrada.
                          </TableCell>
                        </TableRow>
                      ) : (
                        orders.filter(o => o.status === "Entregue").map((order) => (
                          <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-8 font-mono font-black text-blue-600">
                              #{order.os_number}
                            </TableCell>
                            <TableCell className="font-medium text-slate-700">
                              {order.clients?.name || "N/A"}
                            </TableCell>
                            <TableCell className="text-slate-500 text-xs">
                              {new Date(order.entry_date).toLocaleDateString("pt-BR")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-bold border-slate-200 text-slate-500">
                                {order.payment_method || "N/A"}
                              </Badge>
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
