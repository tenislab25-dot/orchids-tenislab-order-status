"use client";

import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit2, LayoutGrid, Search, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import Link from "next/link";

import { INITIAL_SERVICES, Service, Category } from "@/lib/services-data";

export default function ServicesManagement() {
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  // Simulation of Admin access
  const isAdmin = true;

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStatus = (id: string) => {
    setServices(prev => prev.map(s => 
      s.id === id ? { ...s, status: s.status === "Active" ? "Inactive" : "Active" } : s
    ));
  };

  const handleEditSave = () => {
    if (!editingService) return;
    setServices(prev => prev.map(s => s.id === editingService.id ? editingService : s));
    setEditingService(null);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex flex-col gap-8 mb-8">
          <div className="flex justify-between items-start">
            <Link href="/interno" className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold uppercase text-[10px] tracking-widest">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Painel
            </Link>
            <Logo variant="black" width={120} height={60} />
          </div>

          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <LayoutGrid className="w-6 h-6" />
                </div>
                Gestão de Serviços
              </h1>
              <p className="text-slate-500 font-medium mt-1">Administração do catálogo de preços da TENISLAB</p>
            </div>
            
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar serviço..." 
                className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="font-bold text-slate-900">Serviço</TableHead>
              <TableHead className="font-bold text-slate-900">Categoria</TableHead>
              <TableHead className="font-bold text-slate-900">Preço Padrão</TableHead>
              <TableHead className="font-bold text-slate-900">Status</TableHead>
              <TableHead className="text-right font-bold text-slate-900">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServices.map((service) => (
              <TableRow key={service.id} className={service.status === "Inactive" ? "opacity-60" : ""}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-normal">
                    {service.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  {service.category === "Extra / Avulso" && (service.name.includes("entrega") || service.name.includes("personalizado")) 
                    ? <span className="text-slate-400 italic">Editável na OS</span>
                    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.defaultPrice)
                  }
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={service.status === "Active"} 
                      onCheckedChange={() => toggleStatus(service.id)}
                    />
                    <span className={`text-xs font-bold uppercase ${service.status === "Active" ? "text-green-600" : "text-slate-400"}`}>
                      {service.status === "Active" ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setEditingService(service)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    {editingService && (
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Serviço</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <label className="text-sm font-bold">Nome do Serviço</label>
                            <Input 
                              value={editingService.name} 
                              onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-bold">Preço Padrão (R$)</label>
                            <Input 
                              type="number" 
                              disabled={!isAdmin}
                              value={editingService.defaultPrice} 
                              onChange={(e) => setEditingService({...editingService, defaultPrice: Number(e.target.value)})}
                            />
                            {!isAdmin && <p className="text-xs text-amber-600">Apenas administradores podem alterar preços.</p>}
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setEditingService(null)}>Cancelar</Button>
                          <Button onClick={handleEditSave}>Salvar Alterações</Button>
                        </DialogFooter>
                      </DialogContent>
                    )}
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h4 className="text-blue-800 font-bold text-sm mb-1">Dica de Operação:</h4>
        <p className="text-blue-700 text-sm">
          Apenas serviços marcados como <strong>Ativos</strong> aparecem na tela de criação de OS. 
          Alterações de preço afetam apenas novas ordens de serviço.
        </p>
      </div>
    </div>
  );
}
