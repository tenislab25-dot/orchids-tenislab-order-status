"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  MoreHorizontal,
  Package,
  Eye,
  Trash2,
  AlertTriangle,
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

import { Textarea } from "@/components/ui/textarea";

type Status = "Recebido" | "Em serviço" | "Pronto" | "Entregue" | "Cancelado";

interface Order {
  id: string;
  osNumber: string;
  clientName: string;
  pairsCount: number;
  status: Status;
  entryDate: string;
  deliveryDate?: string;
  cancellationReason?: string;
  cancellationDate?: string;
  total?: number;
}

const initialOrders: Order[] = [
  {
    id: "1",
    osNumber: "001/2025",
    clientName: "João Silva",
    pairsCount: 2,
    status: "Entregue",
    entryDate: "2025-12-01",
    deliveryDate: "2025-12-05",
    total: 141,
  },
  {
    id: "2",
    osNumber: "002/2025",
    clientName: "Maria Oliveira",
    pairsCount: 1,
    status: "Pronto",
    entryDate: "2025-12-05",
    deliveryDate: "2025-12-08",
    total: 80,
  },
  {
    id: "3",
    osNumber: "003/2025",
    clientName: "Pedro Santos",
    pairsCount: 3,
    status: "Em serviço",
    entryDate: "2025-12-10",
    deliveryDate: "2025-12-15",
    total: 210,
  },
  {
    id: "4",
    osNumber: "004/2025",
    clientName: "Ana Costa",
    pairsCount: 1,
    status: "Recebido",
    entryDate: "2025-12-15",
    deliveryDate: "2025-12-20",
    total: 45,
  },
  {
    id: "5",
    osNumber: "005/2025",
    clientName: "Lucas Lima",
    pairsCount: 2,
    status: "Em serviço",
    entryDate: "2025-12-08",
    deliveryDate: "2025-12-13",
    total: 120,
  },
  {
    id: "6",
    osNumber: "006/2025",
    clientName: "Carla Souza",
    pairsCount: 1,
    status: "Cancelado",
    entryDate: "2025-12-12",
    cancellationReason: "Cliente desistiu do serviço por conta do prazo.",
    cancellationDate: "2025-12-12",
    total: 65,
  },
];

const statusWeight: Record<Status, number> = {
  "Em serviço": 0,
  "Recebido": 1,
  "Pronto": 2,
  "Entregue": 3,
  "Cancelado": 4,
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string | null>(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const isReasonValid = cancellationReason.trim().length >= 10;

  useEffect(() => {
    setRole(localStorage.getItem("tenislab_role"));
  }, []);

  const handleStatusChange = (orderId: string, newStatus: Status) => {
    const order = orders.find((o) => o.id === orderId);
    if (order?.status === "Cancelado" || order?.status === "Entregue") return;

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const sortedAndFilteredOrders = useMemo(() => {
    return orders
      .filter(
        (order) =>
          order.osNumber.toLowerCase().includes(search.toLowerCase()) ||
          order.clientName.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const weightA = statusWeight[a.status];
        const weightB = statusWeight[b.status];
        if (weightA !== weightB) return weightA - weightB;
        return (
          new Date(a.entryDate).getTime() -
          new Date(b.entryDate).getTime()
        );
      });
  }, [orders, search]);

  const confirmCancel = () => {
    if (!isReasonValid || !orderToCancel) return;

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderToCancel
          ? {
              ...order,
              status: "Cancelado",
              cancellationReason,
              cancellationDate: new Date().toISOString(),
            }
          : order
      )
    );
    setCancelModalOpen(false);
    setOrderToCancel(null);
    setCancellationReason("");
  };

  const confirmDelete = () => {
    if (!orderToDelete) return;
    setOrders((prev) => prev.filter((o) => o.id !== orderToDelete));
    setDeleteModalOpen(false);
    setOrderToDelete(null);
  };

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
    <div className="flex flex-col gap-8">
      {/* HEADER */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Dashboard Interno
          </h1>
          <p className="text-slate-500">
            Gerencie as ordens de serviço da TENISLAB
          </p>
        </div>
        <Link href="/interno/os">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
            Nova OS
          </Button>
        </Link>
      </header>

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Ordens de Serviço
          </CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por OS ou cliente..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pares</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-bold">
                    {order.osNumber}
                  </TableCell>
                  <TableCell>{order.clientName}</TableCell>
                  <TableCell className="text-center">
                    {order.pairsCount}
                  </TableCell>
                  <TableCell>
                    {new Date(order.entryDate).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    {order.deliveryDate
                      ? new Date(order.deliveryDate).toLocaleDateString("pt-BR")
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
                        <SelectTrigger className="w-[130px] h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Recebido">Recebido</SelectItem>
                          <SelectItem value="Em serviço">
                            Em serviço
                          </SelectItem>
                          <SelectItem value="Pronto">Pronto</SelectItem>
                          <SelectItem value="Entregue">Entregue</SelectItem>
                        </SelectContent>
                      </Select>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/interno/os/${order.osNumber.replace(
                                "/",
                                "-"
                              )}`}
                              className="flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" /> Ver detalhes
                            </Link>
                          </DropdownMenuItem>

                          {(role === "ADMIN" || role === "ATENDENTE") &&
                            order.status !== "Entregue" &&
                            order.status !== "Cancelado" && (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setOrderToCancel(order.id);
                                  setCancelModalOpen(true);
                                }}
                              >
                                <AlertTriangle className="w-4 h-4" />
                                Cancelar OS
                              </DropdownMenuItem>
                            )}

                          {role === "ADMIN" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setOrderToDelete(order.id);
                                  setDeleteModalOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                                Excluir permanentemente
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CANCEL MODAL */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Ordem de Serviço</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento.
            </DialogDescription>
          </DialogHeader>

          <Label>Motivo *</Label>
          <Textarea
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
          />

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCancelModalOpen(false)}
            >
              Voltar
            </Button>
            <Button
              onClick={confirmCancel}
              disabled={!isReasonValid}
              className="bg-red-600 text-white"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Excluir Permanentemente
            </DialogTitle>
            <DialogDescription>
              Essa ação não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 text-white"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
