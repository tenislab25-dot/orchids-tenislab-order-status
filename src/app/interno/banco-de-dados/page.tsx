"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateTime, formatDate } from "@/lib/date-utils";
import {
  Search,
  Database,
  Eye,
  ArrowLeft,
  Loader2
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase, ensureValidSession } from "@/lib/supabase";
import { toast } from "sonner";

type Status = "Recebido" | "Em espera" | "Em serviço" | "Em finalização" | "Pronto" | "Entregue" | "Cancelado";

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

export default function BancoDadosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
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
        .or(`status.eq.Entregue,status.eq.Cancelado`)
        .lt('updated_at', thirtyDaysAgo.toISOString())
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setOrders(data as Order[]);
    } catch (error: any) {
      logger.error("Erro ao buscar banco de dados:", error);
      toast.error("Erro ao buscar banco de dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedRole = localStorage.getItem("tenislab_role");
    if (!storedRole) {
      router.push("/interno/login");
      return;
    }
    if (storedRole !== "ADMIN" && storedRole !== "ATENDENTE") {
      router.push("/interno/dashboard");
      return;
    }
    fetchOrders();
  }, [fetchOrders, router]);

  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.os_number.toLowerCase().includes(search.toLowerCase()) ||
        order.clients?.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [orders, search]);

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-7xl mx-auto px-4 lg:px-8">
      <header className="flex items-center justify-between pt-8">
        <div className="flex items-center gap-4">
          <Link href="/interno/dashboard" prefetch={false}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Database className="w-6 h-6 text-slate-400" />
              Banco de Dados
            </h1>
            <p className="text-sm text-slate-500 font-medium italic">Histórico de pedidos concluídos há mais de 30 dias</p>
          </div>
        </div>
        <h1 className="font-black text-xl">TENISLAB</h1>
      </header>

      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white grayscale-[0.5]">
        <CardHeader className="bg-white border-b border-slate-50 p-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar no arquivo..."
              className="pl-11 h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 ring-slate-500/20 font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold py-6 pl-8">OS</TableHead>
                  <TableHead className="font-bold">Cliente</TableHead>
                  <TableHead className="font-bold">Concluído em</TableHead>
                  <TableHead className="font-bold">Total</TableHead>
                  <TableHead className="font-bold pr-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        <p className="text-slate-400 font-medium">Carregando arquivo...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium uppercase tracking-widest text-xs">
                      Arquivo vazio
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                      <TableCell className="pl-8 font-mono font-bold text-slate-500">#{order.os_number}</TableCell>
                      <TableCell className="font-bold text-slate-700">{order.clients?.name}</TableCell>
                      <TableCell className="text-slate-500 text-xs font-bold">
                        {formatDateTime(order.updated_at) || formatDate(order.entry_date)}
                      </TableCell>
                      <TableCell className="font-black text-slate-400 text-sm">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(order.total || 0)}
                      </TableCell>
                      <TableCell className="pr-8">
                        <Link href={`/interno/os/${order.os_number.replace("/", "-")}`}>
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
                            <Eye className="w-4 h-4 text-slate-400" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        Estes pedidos serão excluídos permanentemente após 5 anos.
      </p>
    </div>
  );
}
