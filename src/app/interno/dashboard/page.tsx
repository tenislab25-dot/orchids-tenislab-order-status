"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Package,
  Eye,
  Plus
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

type Status = "Recebido" | "Em serviço" | "Pronto" | "Entregue" | "Cancelado";

interface Order {
  id: string;
  os_number: string;
  status: Status;
  entry_date: string;
  delivery_date?: string;
  total?: number;
  items: any[];
  clients: {
    name: string;
  } | null;
}

const statusWeight: Record<Status, number> = {
  "Em serviço": 0,
  "Recebido": 1,
  "Pronto": 2,
  "Entregue": 3,
  "Cancelado": 4,
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("tenislab_role"));
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        *,
        clients (
          name
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao buscar ordens: " + error.message);
    } else {
      setOrders(data as Order[]);
    }
    setLoading(false);
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
          new Date(b.entry_date).getTime() -
          new Date(a.entry_date).getTime()
        );
      });
  }, [orders, search]);

  const getStatusBadge = (status: Status) => {
    const styles = {
      Recebido: "bg-blue-100 text-blue-700",
      "Em serviço": "bg-amber-100 text-amber-700",
      Pronto: "bg-green-100 text-green-700",
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
    <div className="flex flex-col gap-8 pb-10">
      <header className="flex justify-between items-end">
        <div className="flex flex-col gap-4">
          <div className="relative w-32 h-12">
            <Image 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/IMG_8889-1766755171009.JPG?width=8000&height=8000&resize=contain"
              alt="TENISLAB Logo"
              fill
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Dashboard Interno
            </h1>
            <p className="text-slate-500">
              Gerencie as ordens de serviço da TENISLAB
            </p>
          </div>
        </div>
          {(role === "ADMIN" || role === "ATENDENTE") && (
            <div className="flex gap-2">
              <Link href="/interno/clientes">
                <Button variant="outline" className="border-blue-200 text-blue-600 font-bold rounded-xl gap-2">
                  Clientes
                </Button>
              </Link>
              <Link href="/interno/os">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2">
                  <Plus className="w-4 h-4" />
                  Nova OS
                </Button>
              </Link>
            </div>
          )}
      </header>

      {/* TABLE */}
      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-50 p-6">
          <CardTitle className="flex items-center gap-2 text-slate-900 font-bold">
            <Package className="w-5 h-5 text-blue-500" />
            Ordens de Serviço
          </CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por OS ou cliente..."
              className="pl-9 h-12 bg-slate-50 border-slate-100 rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="font-bold text-slate-500 py-4">OS</TableHead>
                <TableHead className="font-bold text-slate-500">Cliente</TableHead>
                <TableHead className="font-bold text-slate-500 text-center">Pares</TableHead>
                <TableHead className="font-bold text-slate-500">Entrada</TableHead>
                <TableHead className="font-bold text-slate-500">Entrega</TableHead>
                <TableHead className="font-bold text-slate-500">Status</TableHead>
                <TableHead className="font-bold text-slate-500">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                    Carregando ordens...
                  </TableCell>
                </TableRow>
              ) : sortedAndFilteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                    Nenhuma ordem encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                sortedAndFilteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-mono font-black text-blue-600">
                      #{order.os_number}
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">
                      {order.clients?.name || "Cliente não encontrado"}
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {order.items?.length || 0}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(order.entry_date).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {order.delivery_date
                        ? new Date(order.delivery_date).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
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
                          <SelectTrigger className="w-[130px] h-9 text-xs rounded-lg border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Recebido">Recebido</SelectItem>
                            <SelectItem value="Em serviço">
                              Em serviço
                            </SelectItem>
                            <SelectItem value="Pronto">Pronto</SelectItem>
                            <SelectItem value="Entregue">Entregue</SelectItem>
                            <SelectItem value="Cancelado">Cancelado</SelectItem>
                          </SelectContent>
                        </Select>

                        <Link
                          href={`/interno/os/${order.os_number.replace(
                            "/",
                            "-"
                          )}`}
                        >
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
