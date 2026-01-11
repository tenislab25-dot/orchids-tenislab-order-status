"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Search,
    Package,
      Eye,
      ArrowLeft,
      Calendar,
      User as UserIcon,
      MessageCircle,
      ArrowUp,
      ArrowDown,
      ArrowUpDown,
      Star,
      ChevronLeft,
      ChevronRight
    } from "lucide-react";


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type Status = "Recebido" | "Em espera" | "Em serviço" | "Em finalização" | "Pronto" | "Entregue" | "Cancelado";

interface Order {
  id: string;
  os_number: string;
  status: Status;
  entry_date: string;
  delivery_date?: string;
  total?: number;
  priority: boolean;
  updated_at?: string;
  items: any[];
  clients: {
    name: string;
    phone: string;
  } | null;
}

const PAGE_SIZE = 20;

export default function TodosPedidosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: 'updated_at',
    direction: 'desc'
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

    const getSortIcon = (key: string) => {
      if (sortConfig.key !== key || sortConfig.direction === null) {
        return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
      }
      return sortConfig.direction === 'asc' ? 
        <ArrowUp className="w-3 h-3 ml-1 text-blue-600" /> : 
        <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />;
    };

    const togglePriority = async (orderId: string, currentPriority: boolean) => {
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
      }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("service_orders")
      .select(`
        *,
        clients (
          name,
          phone
        )
      `, { count: 'exact' });

    if (debouncedSearch) {
      query = query.or(`os_number.ilike.%${debouncedSearch}%,clients.name.ilike.%${debouncedSearch}%`);
    }

    if (sortConfig.key && sortConfig.direction) {
      const column = sortConfig.key === 'client' ? 'clients(name)' : sortConfig.key;
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
    } else {
      query = query.order('updated_at', { ascending: false });
    }

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Erro ao buscar ordens: " + error.message);
    } else {
      setOrders(data as Order[]);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [currentPage, debouncedSearch, sortConfig]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleShareLink = (order: Order) => {
    if (!order.clients?.phone) {
      toast.error("Cliente sem telefone cadastrado");
      return;
    }
    
    const cleanPhone = order.clients.phone.replace(/\D/g, "");
    const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    
    const acceptanceLink = `${window.location.origin}/aceite/${order.id}`;
    const message = encodeURIComponent(
      `Olá ${order.clients.name}! Sua Ordem de Serviço #${order.os_number} está no sistema da TENISLAB.\n\n` +
      `📍 *IMPORTANTE:* O prazo de entrega do seu tênis só começa a contar a partir do momento do seu *ACEITE DIGITAL* no link abaixo.\n\n` +
      `Para conferir os detalhes e autorizar o serviço, acesse:\n${acceptanceLink}\n\n` +
      `Qualquer dúvida, estamos à disposição!`
    );
    
    window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
  };

      const getStatusBadge = (status: Status) => {
        const styles = {
          Recebido: "bg-blue-100 text-blue-700",
          "Em espera": "bg-orange-100 text-orange-700",
          "Em serviço": "bg-amber-100 text-amber-700",
          "Em finalização": "bg-indigo-100 text-indigo-700",
          "Pronto": "bg-green-100 text-green-700",
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
      <header className="flex items-center justify-between pt-8">
          <div className="flex items-center gap-4">
            <Link href="/interno/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Todas as OS</h1>
              <p className="text-sm text-slate-500 font-medium">Lista completa de OS ativas</p>
            </div>
          </div>
          <h1 className="font-black text-xl">TENISLAB</h1>
        </header>

      <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="bg-white border-b border-slate-50 p-8">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por OS ou cliente..."
              className="pl-11 h-12 bg-slate-50 border-none rounded-2xl focus-visible:ring-2 ring-blue-500/20 font-medium"
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
                    <TableHead 
                      className="font-bold py-6 pl-8 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('os_number')}
                    >
                      <div className="flex items-center">
                        Nº {getSortIcon('os_number')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('client')}
                    >
                      <div className="flex items-center">
                        Cliente {getSortIcon('client')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-bold cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => handleSort('entry_date')}
                    >
                      <div className="flex items-center">
                        Entrada {getSortIcon('entry_date')}
                      </div>
                    </TableHead>
                      <TableHead 
                        className="font-bold cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort('delivery_date')}
                      >
                        <div className="flex items-center">
                          Entrega {getSortIcon('delivery_date')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-bold cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status {getSortIcon('status')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-bold cursor-pointer hover:text-blue-600 transition-colors text-center"
                        onClick={() => handleSort('priority')}
                      >
                        <div className="flex items-center justify-center">
                          <Star className="w-4 h-4" /> {getSortIcon('priority')}
                        </div>
                      </TableHead>
                      <TableHead className="font-bold pr-8">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-20">Carregando...</TableCell></TableRow>
                    ) : orders.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-20 text-slate-400">Nenhuma OS encontrada</TableCell></TableRow>
                    ) : (
                    orders.map((order) => (
                        <TableRow key={order.id} className={`hover:bg-slate-50/50 border-b border-slate-50 ${order.priority ? 'bg-amber-50/30' : ''}`}>
                          <TableCell className="pl-8 font-mono font-black text-blue-600">{order.os_number}</TableCell>
                          <TableCell className="font-bold text-slate-700">
                            <div className="flex flex-col">
                              <span>{order.clients?.name}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{order.clients?.phone}</span>
                            </div>
                          </TableCell>
                        <TableCell className="text-slate-500 text-xs font-bold">
                          {new Date(order.entry_date).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {order.delivery_date ? (
                            <span className={`text-xs font-black ${
                              new Date(order.delivery_date) < new Date(new Date().setHours(0,0,0,0)) 
                              ? "text-red-500" 
                              : "text-slate-500"
                            }`}>
                              {new Date(order.delivery_date).toLocaleDateString("pt-BR")}
                            </span>
                          ) : "--/--"}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePriority(order.id, order.priority)}
                            className={`rounded-full transition-all ${order.priority ? 'text-amber-500 hover:text-amber-600' : 'text-slate-200 hover:text-slate-400'}`}
                          >
                            <Star className={`w-5 h-5 ${order.priority ? 'fill-current' : ''}`} />
                          </Button>
                        </TableCell>
                        <TableCell className="pr-8">

                        <div className="flex items-center gap-2">
                          <Link href={`/interno/os/${order.os_number.replace("/", "-")}`}>
                            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-blue-50 hover:text-blue-600">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleShareLink(order)}
                            className="rounded-xl hover:bg-green-50 hover:text-green-600"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
</CardContent>
          <CardFooter className="border-t border-slate-100 p-6 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {totalCount} OS no total · Página {currentPage} de {totalPages || 1}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="h-10 w-10 rounded-xl border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-bold text-slate-600 px-3">{currentPage}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages || loading}
                className="h-10 w-10 rounded-xl border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
    </div>
  );
}
