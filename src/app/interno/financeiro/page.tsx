"use client";

import { 
  TrendingUp, 
  ArrowLeft, 
  Wallet,
  Receipt,
  BarChart3,
  FileText,
  ArrowRight,
  DollarSign,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function FinanceiroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/interno">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <Wallet className="h-8 w-8 text-blue-600" />
                Financeiro
              </h1>
              <p className="text-slate-600 mt-1">
                Gestão financeira completa do TenisLab
              </p>
            </div>
          </div>
        </div>

        {/* Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Dashboard */}
          <Link href="/interno/financeiro/dashboard">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-500 group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <BarChart3 className="h-6 w-6 text-blue-600" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <CardTitle className="mt-4">Dashboard</CardTitle>
                <CardDescription>
                  Visão geral de receitas, despesas e lucro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span>Métricas em tempo real</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Despesas */}
          <Link href="/interno/financeiro/despesas">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-red-500 group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                    <Receipt className="h-6 w-6 text-red-600" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-red-600 transition-colors" />
                </div>
                <CardTitle className="mt-4">Despesas</CardTitle>
                <CardDescription>
                  Controle de gastos e custos operacionais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CreditCard className="h-4 w-4 text-red-600" />
                  <span>Cadastro e relatórios</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Relatórios */}
          <Link href="/interno/financeiro/relatorio">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-purple-500 group">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <CardTitle className="mt-4">Relatórios</CardTitle>
                <CardDescription>
                  Análises detalhadas e comparações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                  <span>Gráficos e exportações</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Acesso Rápido</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">Dashboard</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Controle</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">Despesas</p>
                </div>
                <Receipt className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Análises</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">Relatórios</p>
                </div>
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
