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
  Download
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
  updated_at?: string;
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

  useEffect(() => {
    const storedRole = localStorage.getItem("tenislab_role");
    
    if (!storedRole) {
      router.push("/interno/login");
      return;
    }

    setRole(storedRole);
    fetchOrders();
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
    return orders
      .filter(
        (order) =>
          order.os_number.toLowerCase().includes(search.toLowerCase()) ||
          order.clients?.name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const weightA = statusWeight[a.status];
        const weightB = statusWeight[b.status];
        if (weightA !== weightB) return weightA - weightB;
        return (
          new Date(b.updated_at || b.entry_date).getTime() -
          new Date(a.updated_at || a.entry_date).getTime()
        );
      })
      .slice(0, 20);
  }, [orders, search]);

  const recentConfirmations = useMemo(() => {
    // Orders that are "Em espera" and were updated recently
    return orders
      .filter(o => o.status === "Em espera")
      .sort((a, b) => new Date(b.updated_at || "").getTime() - new Date(a.updated_at || "").getTime())
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

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-7xl mx-auto px-4 lg:px-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-8">
        <div className="flex flex-col gap-4">
          <h1 className="font-black text-2xl">TENISLAB</h1>
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

      {/* RECENT NOTIFICATIONS / CONFIRMATIONS */}
      {recentConfirmations.length > 0 && (
        <section className="animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Ações Necessárias: OS Confirmadas</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentConfirmations.map((order) => (
              <Card key={order.id} className="border-none shadow-lg shadow-slate-100 rounded-[2rem] overflow-hidden bg-white hover:ring-2 ring-amber-400/30 transition-all cursor-pointer group" onClick={() => router.push(`/interno/os/${order.os_number.replace("/", "-")}`)}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OS Aceita em: {new Date(order.updated_at || "").toLocaleDateString('pt-BR')}</span>
                        <span className="text-xl font-black text-blue-600">{order.os_number}</span>
                      </div>
                      <Badge className="bg-green-100 text-green-700 border-none px-2 py-0.5 text-[10px] font-bold">
                        ACEITO PELO CLIENTE
                      </Badge>
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
                    <TableHead className="font-bold text-slate-500 py-6 pl-8">Nº</TableHead>
                    <TableHead className="font-bold text-slate-500">Cliente</TableHead>
                  <TableHead className="font-bold text-slate-500 text-center">Pares</TableHead>
                  <TableHead className="font-bold text-slate-500">Entrada</TableHead>
                  <TableHead className="font-bold text-slate-500">Previsão</TableHead>
                  <TableHead className="font-bold text-slate-500">Status</TableHead>
                  <TableHead className="font-bold text-slate-500 pr-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sincronizando...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : sortedAndFilteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-20 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-12 h-12 opacity-10" />
                        <span className="font-bold uppercase tracking-widest text-xs">Nenhuma ordem encontrada</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {sortedAndFilteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group">
                          <TableCell className="pl-8 py-5">
                              <div className="flex flex-col">
                                <span className="font-mono font-black text-blue-600 text-base">{order.os_number}</span>
                                {(order.status === "Em espera" || order.status === "Em serviço") && (
                                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter flex items-center gap-1">
                                    <CheckCircle2 className="w-2 h-2" /> ACEITO PELO CLIENTE
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
                        <TableCell className="text-slate-500 text-xs font-bold">
                          {order.delivery_date
                            ? new Date(order.delivery_date).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
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
                      <TableCell colSpan={7} className="py-6 px-8">
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
