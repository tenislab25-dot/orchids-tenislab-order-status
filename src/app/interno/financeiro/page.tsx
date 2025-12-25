"use client";

import { TrendingUp, ArrowLeft, TrendingDown, DollarSign, Wallet, Package, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = "Recebido" | "Em serviço" | "Pronto para retirada / entrega" | "Entregue" | "Cancelado";

interface Order {
  id: string;
  osNumber: string;
  clientName: string;
  pairsCount: number;
  status: Status;
  entryDate: string;
  total: number;
}

const MOCK_ORDERS: Order[] = [
  { id: "1", osNumber: "001/2025", clientName: "João Silva", pairsCount: 2, status: "Entregue", entryDate: "2025-12-01", total: 141.00 },
  { id: "2", osNumber: "002/2025", clientName: "Maria Oliveira", pairsCount: 1, status: "Pronto para retirada / entrega", entryDate: "2025-12-05", total: 80.00 },
  { id: "3", osNumber: "003/2025", clientName: "Pedro Santos", pairsCount: 3, status: "Em serviço", entryDate: "2025-12-10", total: 210.00 },
  { id: "4", osNumber: "004/2025", clientName: "Ana Costa", pairsCount: 1, status: "Recebido", entryDate: "2025-12-15", total: 45.00 },
  { id: "6", osNumber: "006/2025", clientName: "Carla Souza", pairsCount: 1, status: "Cancelado", entryDate: "2025-12-12", total: 65.00 },
];

export default function FinanceiroPage() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("tenislab_role"));
  }, []);

  const stats = useMemo(() => {
    const totalCash = MOCK_ORDERS
      .filter(o => o.status === "Entregue")
      .reduce((acc, o) => acc + o.total, 0);

    const projectedRevenue = MOCK_ORDERS
      .filter(o => o.status !== "Cancelado" && o.status !== "Entregue")
      .reduce((acc, o) => acc + o.total, 0);

    const lostRevenue = MOCK_ORDERS
      .filter(o => o.status === "Cancelado")
      .reduce((acc, o) => acc + o.total, 0);

    return { totalCash, projectedRevenue, lostRevenue };
  }, []);

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
    <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-4 py-8 animate-in fade-in bg-slate-50">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full -ml-2">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Financeiro</h1>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-black text-slate-900 tracking-tighter">TENIS</span>
          <span className="text-lg font-light text-blue-500 tracking-tighter">LAB</span>
        </div>
      </header>

      <main className="flex flex-col gap-4">
        {/* CASH BALANCE */}
        <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200 bg-slate-900 text-white overflow-hidden">
          <CardContent className="p-8">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Saldo em Caixa (Entregues)</span>
              <span className="text-4xl font-black tracking-tighter">R$ {stats.totalCash.toFixed(2)}</span>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Operacional Ativo</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PROJECTIONS */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projeção</span>
                <span className="text-lg font-black text-slate-900">R$ {stats.projectedRevenue.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancelados</span>
                <span className="text-lg font-black text-red-600">R$ {stats.lostRevenue.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* LOST REVENUE INFO */}
        <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="px-6 py-4 border-b border-slate-50">
            <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Receita Perdida
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Ordens de serviço canceladas representam uma perda de potencial de faturamento de <span className="text-red-600 font-bold">R$ {stats.lostRevenue.toFixed(2)}</span>. 
              Este valor não é contabilizado no saldo em caixa.
            </p>
          </CardContent>
        </Card>
      </main>

      <footer className="mt-auto text-center pt-12 pb-4">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          TENISLAB · Gestão Financeira v1.0
        </p>
      </footer>
    </div>
  );
}
