"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck,
  Eye,
  ArrowUpDown,
  XCircle,
  Trash2,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
    total: 141.00,
  },
  {
    id: "2",
    osNumber: "002/2025",
    clientName: "Maria Oliveira",
    pairsCount: 1,
      status: "Pronto",
    entryDate: "2025-12-05",
    deliveryDate: "2025-12-08",
    total: 80.00,
  },
  {
    id: "3",
    osNumber: "003/2025",
    clientName: "Pedro Santos",
    pairsCount: 3,
    status: "Em serviço",
    entryDate: "2025-12-10",
    deliveryDate: "2025-12-15",
    total: 210.00,
  },
  {
    id: "4",
    osNumber: "004/2025",
    clientName: "Ana Costa",
    pairsCount: 1,
    status: "Recebido",
    entryDate: "2025-12-15",
    deliveryDate: "2025-12-20",
    total: 45.00,
  },
  {
    id: "5",
    osNumber: "005/2025",
    clientName: "Lucas Lima",
    pairsCount: 2,
    status: "Em serviço",
    entryDate: "2025-12-08",
    deliveryDate: "2025-12-13",
    total: 120.00,
  },
  {
    id: "6",
    osNumber: "006/2025",
    clientName: "Carla Souza",
    pairsCount: 1,
    status: "Cancelado",
    entryDate: "2025-12-12",
    cancellationReason: "Cliente desistiu do serviço por conta do prazo.",
    total: 65.00,
  },
];

const statusWeight: Record<Status, number> = {
  "Recebido": 1,
  "Em serviço": 0, // Should appear first or among first
    "Pronto": 2,
  "Entregue": 3,
  "Cancelado": 4,
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string | null>(null);

  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
    const [cancellationReason, setCancellationReason] = useState("");

    const isReasonValid = cancellationReason.trim().length >= 10;

    // Deletion Modal State

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("tenislab_role"));
  }, []);

  const handleStatusChange = (orderId: string, newStatus: Status) => {
    const order = orders.find(o => o.id === orderId);
    if (order?.status === "Cancelado" || order?.status === "Entregue") return;

    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const handleCancelClick = (orderId: string) => {
    setOrderToCancel(orderId);
    setCancelModalOpen(true);
    setCancellationReason("");
  };

    const confirmCancel = () => {
      if (!isReasonValid || !orderToCancel) return;

      setOrders(prev => prev.map(order => 
        order.id === orderToCancel 
          ? { ...order, status: "Cancelado", cancellationReason } 
          : order
      ));
      setCancelModalOpen(false);
      setOrderToCancel(null);
    };


  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!orderToDelete) return;
    setOrders(prev => prev.filter(order => order.id !== orderToDelete));
    setDeleteModalOpen(false);
    setOrderToDelete(null);
  };

  const sortedAndFilteredOrders = useMemo(() => {
    return orders
      .filter(order => 
        order.osNumber.toLowerCase().includes(search.toLowerCase()) ||
        order.clientName.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        // First sort by status weight (Em serviço & Recebido first)
        const weightA = statusWeight[a.status];
        const weightB = statusWeight[b.status];
        
        if (weightA !== weightB) {
          return weightA - weightB;
        }
        
        // Then sort by oldest date first
        return new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
      });
  }, [orders, search]);

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case "Recebido":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1">Recebido</Badge>;
      case "Em serviço":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-3 py-1">Em serviço</Badge>;
      case "Pronto":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-1">Pronto</Badge>;
      case "Entregue":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none px-3 py-1">Entregue</Badge>;
      case "Cancelado":
        return <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-3 py-1">Cancelado</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Interno</h1>
            <p className="text-slate-500 font-medium">Gerencie as ordens de serviço da TENISLAB</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex gap-1 items-baseline">
              <span className="text-2xl font-black text-slate-900">TENIS</span>
              <span className="text-2xl font-light text-blue-500">LAB</span>
            </div>
            <Link href="/interno/os">
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-100">
                Nova OS
              </Button>
            </Link>
          </div>
        </header>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Ordens de Serviço
            </CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar por OS ou cliente..." 
                className="pl-9 bg-white border-slate-200 rounded-xl"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px] font-bold text-slate-600">OS</TableHead>
                  <TableHead className="font-bold text-slate-600">Cliente</TableHead>
                  <TableHead className="font-bold text-slate-600 text-center">Pares</TableHead>
                  <TableHead className="font-bold text-slate-600">Data de Entrada</TableHead>
                  <TableHead className="font-bold text-slate-600">Data de Entrega</TableHead>
                  <TableHead className="font-bold text-slate-600">Status</TableHead>
                  <TableHead className="w-[180px] font-bold text-slate-600">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredOrders.map((order) => (
                <TableRow key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-mono font-bold text-slate-900">
                    {order.osNumber}
                  </TableCell>
                  <TableCell className="font-medium text-slate-700">
                    {order.clientName}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 text-xs font-bold">
                      {order.pairsCount}
                    </span>
                  </TableCell>
                    <TableCell className="text-slate-500 font-medium">
                      {new Date(order.entryDate).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-slate-500 font-medium">
                      {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('pt-BR') : "-"}
                    </TableCell>
                    <TableCell>
                    {getStatusBadge(order.status)}
                  </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={order.status} 
                          onValueChange={(value) => handleStatusChange(order.id, value as Status)}
                          disabled={order.status === "Cancelado" || order.status === "Entregue"}
                        >
                          <SelectTrigger className="h-9 w-[140px] text-xs font-medium border-slate-200 rounded-lg">
                            <SelectValue placeholder="Mudar status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Recebido">Recebido</SelectItem>
                            <SelectItem value="Em serviço">Em serviço</SelectItem>
                              <SelectItem value="Pronto">Pronto</SelectItem>
                            <SelectItem value="Entregue">Entregue</SelectItem>
                          </SelectContent>
                        </Select>

                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-slate-100" asChild>
                              <Link href={`/interno/os/${order.osNumber.replace("/", "-")}`}>
                                <Eye className="w-4 h-4 text-slate-400" />
                              </Link>
                            </Button>

                          {/* CANCEL BUTTON: Admin or Atendente, not for Entregue or already Cancelado */}
                          {(role === "ADMIN" || role === "ATENDENTE") && order.status !== "Entregue" && order.status !== "Cancelado" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-lg hover:bg-red-50 hover:text-red-500 text-slate-400"
                              onClick={() => handleCancelClick(order.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}

                          {/* DELETE BUTTON: ADMIN only */}
                          {role === "ADMIN" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-lg hover:bg-red-100 hover:text-red-600 text-slate-400"
                              onClick={() => handleDeleteClick(order.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {order.status === "Cancelado" && order.cancellationReason && (
                        <p className="text-[10px] text-red-500 font-medium mt-1 italic max-w-[200px] truncate">
                          Motivo: {order.cancellationReason}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                  {sortedAndFilteredOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-400 font-medium">
                        Nenhuma ordem de serviço encontrada.
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* CANCELLATION DIALOG */}
        <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Cancelar Ordem de Serviço
              </DialogTitle>
              <DialogDescription className="font-medium text-slate-500">
                Para cancelar a OS, é necessário informar o motivo. Esta ação impedirá futuras edições.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                Motivo do cancelamento *
              </Label>
                <Textarea 
                  id="reason"
                  placeholder="Ex: Cliente desistiu por conta do prazo..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="mt-2 rounded-2xl border-slate-200 min-h-[100px] text-sm resize-none focus-visible:ring-red-500/20"
                  required
                />
                {!isReasonValid && cancellationReason.length > 0 && (
                  <p className="text-[10px] text-red-500 mt-1 font-medium">
                    O motivo deve ter pelo menos 10 caracteres.
                  </p>
                )}

            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setCancelModalOpen(false)} className="rounded-xl font-bold">
                Voltar
              </Button>
                <Button 
                  onClick={confirmCancel} 
                  disabled={!isReasonValid}
                  className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-50"
                >
                  Confirmar cancelamento
                </Button>

            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRMATION DIALOG */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Excluir Permanentemente
              </DialogTitle>
              <DialogDescription className="font-bold text-slate-600">
                Essa ação é permanente e não poderá ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-slate-500 leading-relaxed">
                A Ordem de Serviço será removida completamente do sistema, incluindo registros financeiros e visibilidade para o cliente.
              </p>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setDeleteModalOpen(false)} className="rounded-xl font-bold">
                Cancelar
              </Button>
              <Button 
                onClick={confirmDelete} 
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Sim, excluir permanentemente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <footer className="text-center py-4 border-t border-slate-100">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          Painel de Controle Interno • Acesso Restrito
        </p>
      </footer>
    </div>
  );
}
