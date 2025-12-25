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
import { Edit2, LayoutGrid, Search } from "lucide-react";

type Category = "Higienização" | "Pintura" | "Costura" | "Restauração" | "Extra / Avulso";

interface Service {
  id: string;
  name: string;
  category: Category;
  defaultPrice: number;
  status: "Active" | "Inactive";
}

const INITIAL_SERVICES: Service[] = [
  // Higienização
  { id: "1", name: "Higienização Basic", category: "Higienização", defaultPrice: 35, status: "Active" },
  { id: "2", name: "Higienização Pro", category: "Higienização", defaultPrice: 65, status: "Active" },
  { id: "3", name: "Higienização Premium", category: "Higienização", defaultPrice: 90, status: "Active" },
  // Pintura
  { id: "4", name: "Pintura Parcial", category: "Pintura", defaultPrice: 80, status: "Active" },
  { id: "5", name: "Pintura Completa", category: "Pintura", defaultPrice: 120, status: "Active" },
  { id: "6", name: "Pintura de Midsole", category: "Pintura", defaultPrice: 60, status: "Active" },
  { id: "7", name: "Retoque de Pintura", category: "Pintura", defaultPrice: 40, status: "Active" },
  // Costura
  { id: "8", name: "Costura simples de cabedal", category: "Costura", defaultPrice: 60, status: "Active" },
  { id: "9", name: "Reforço estrutural", category: "Costura", defaultPrice: 80, status: "Active" },
  { id: "10", name: "Costura interna", category: "Costura", defaultPrice: 50, status: "Active" },
  // Restauração
  { id: "11", name: "Remoção de amarelado", category: "Restauração", defaultPrice: 70, status: "Active" },
  { id: "12", name: "Hidratação de couro", category: "Restauração", defaultPrice: 40, status: "Active" },
  { id: "13", name: "Revitalização de camurça/nobuck", category: "Restauração", defaultPrice: 50, status: "Active" },
  { id: "14", name: "Remoção de crease", category: "Restauração", defaultPrice: 30, status: "Active" },
  { id: "15", name: "Colagem de solado", category: "Restauração", defaultPrice: 90, status: "Active" },
  // Extra / Avulso
  { id: "16", name: "Impermeabilização", category: "Extra / Avulso", defaultPrice: 25, status: "Active" },
  { id: "17", name: "Taxa de urgência", category: "Extra / Avulso", defaultPrice: 30, status: "Active" },
  { id: "18", name: "Taxa de entrega", category: "Extra / Avulso", defaultPrice: 0, status: "Active" },
  { id: "19", name: "Serviço personalizado", category: "Extra / Avulso", defaultPrice: 0, status: "Active" },
];

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
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutGrid className="w-8 h-8 text-blue-500" />
            Gestão de Serviços
          </h1>
          <p className="text-slate-500">Administração do catálogo de serviços da TENISLAB</p>
        </div>
        
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Buscar serviço ou categoria..." 
            className="pl-10 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
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
