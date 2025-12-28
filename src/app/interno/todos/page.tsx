"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Package,
    Eye,
    ArrowLeft,
    Calendar,
    User as UserIcon,
    MessageCircle
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
    phone: string;
  } | null;
}

export default function TodosPedidosPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

      useEffect(() => {
        const storedRole = localStorage.getItem("tenislab_role");
        if (!storedRole) {
          router.push("/login");
          return;
        }
        if (storedRole !== "ADMIN" && storedRole !== "ATENDENTE") {
          router.push("/interno/dashboard");
          return;
        }
        fetchOrders();
      }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch orders that are NOT completed > 30 days
    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        *,
        clients (
          name,
          phone
        )
      `)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Erro ao buscar ordens: " + error.message);
    } else {
      // Filter out archived ones in JS for simplicity, or we could do it in SQL
      const filtered = data?.filter((o: any) => {
        const isDone = o.status === "Entregue" || o.status === "Cancelado";
        if (!isDone) return true;
        const updatedAt = new Date(o.updated_at || o.created_at);
        return updatedAt > thirtyDaysAgo;
      });
      setOrders(filtered as Order[]);
    }
    setLoading(false);
  };

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
      `Para conferir os detalhes e dar o seu aceite digital, acesse o link abaixo:\n${acceptanceLink}\n\n` +
      `Qualquer dúvida, estamos à disposição!`
    );
    
    window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.os_number.toLowerCase().includes(search.toLowerCase()) ||
        order.clients?.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [orders, search]);

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
                    <TableHead className="font-bold py-6 pl-8">Nº</TableHead>
                    <TableHead className="font-bold">Cliente</TableHead>
                  <TableHead className="font-bold">Entrada</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                  <TableHead className="font-bold pr-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20">Carregando...</TableCell></TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-slate-400">Nenhuma OS encontrada</TableCell></TableRow>
                  ) : (
                  filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-slate-50/50 border-b border-slate-50">
                        <TableCell className="pl-8 font-mono font-black text-blue-600">{order.os_number}</TableCell>
                        <TableCell className="font-bold text-slate-700">{order.clients?.name}</TableCell>
                      <TableCell className="text-slate-500 text-xs font-bold">
                        {new Date(order.entry_date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
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
      </Card>
    </div>
  );
}
