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
  ArrowUpDown
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "Recebido" | "Em serviço" | "Pronto para retirada / entrega" | "Entregue";

interface Order {
  id: string;
  osNumber: string;
  clientName: string;
  pairsCount: number;
  status: Status;
  entryDate: string;
  deliveryDate?: string;
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
  },
  {
    id: "2",
    osNumber: "002/2025",
    clientName: "Maria Oliveira",
    pairsCount: 1,
    status: "Pronto para retirada / entrega",
    entryDate: "2025-12-05",
    deliveryDate: "2025-12-08",
  },
  {
    id: "3",
    osNumber: "003/2025",
    clientName: "Pedro Santos",
    pairsCount: 3,
    status: "Em serviço",
    entryDate: "2025-12-10",
    deliveryDate: "2025-12-15",
  },
  {
    id: "4",
    osNumber: "004/2025",
    clientName: "Ana Costa",
    pairsCount: 1,
    status: "Recebido",
    entryDate: "2025-12-15",
    deliveryDate: "2025-12-20",
  },
  {
    id: "5",
    osNumber: "005/2025",
    clientName: "Lucas Lima",
    pairsCount: 2,
    status: "Em serviço",
    entryDate: "2025-12-08",
    deliveryDate: "2025-12-13",
  },
];

const statusWeight: Record<Status, number> = {
  "Recebido": 1,
  "Em serviço": 0, // Should appear first or among first
  "Pronto para retirada / entrega": 2,
  "Entregue": 3,
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [search, setSearch] = useState("");

  const handleStatusChange = (orderId: string, newStatus: Status) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
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
      case "Pronto para retirada / entrega":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-1">Pronto</Badge>;
      case "Entregue":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none px-3 py-1">Entregue</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard Interno</h1>
          <p className="text-slate-500 font-medium">Gerencie as ordens de serviço da TENISLAB</p>
        </div>
        <div className="flex gap-1 items-baseline">
          <span className="text-2xl font-black text-slate-900">TENIS</span>
          <span className="text-2xl font-light text-blue-500">LAB</span>
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
                      >
                        <SelectTrigger className="h-9 w-[140px] text-xs font-medium border-slate-200 rounded-lg">
                          <SelectValue placeholder="Mudar status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Recebido">Recebido</SelectItem>
                          <SelectItem value="Em serviço">Em serviço</SelectItem>
                          <SelectItem value="Pronto para retirada / entrega">Pronto</SelectItem>
                          <SelectItem value="Entregue">Entregue</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-slate-100">
                        <Eye className="w-4 h-4 text-slate-400" />
                      </Button>
                    </div>
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
      
      <footer className="text-center py-4 border-t border-slate-100">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          Painel de Controle Interno • Acesso Restrito
        </p>
      </footer>
    </div>
  );
}
