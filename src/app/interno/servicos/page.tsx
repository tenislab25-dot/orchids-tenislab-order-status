"use client";

import { useState, useEffect } from "react";
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
import { Edit2, LayoutGrid, Search, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { Service } from "@/lib/services-data";

export default function ServicesManagement() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingService, setEditingService] = useState<any | null>(null);
  
  // Simulation of Admin access
  const isAdmin = true;

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar serviços");
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    
    const { error } = await supabase
      .from("services")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      setServices(prev => prev.map(s => 
        s.id === id ? { ...s, status: newStatus } : s
      ));
      toast.success("Status atualizado");
    }
  };

  const handleEditSave = async () => {
    if (!editingService) return;
    
    const { error } = await supabase
      .from("services")
      .update({ 
        name: editingService.name,
        default_price: editingService.default_price
      })
      .eq("id", editingService.id);

    if (error) {
      toast.error("Erro ao salvar alterações");
    } else {
      setServices(prev => prev.map(s => s.id === editingService.id ? editingService : s));
      setEditingService(null);
      toast.success("Serviço atualizado");
    }
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
              <h1 className="font-black text-2xl">TENISLAB</h1>
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-200" />
                  </TableCell>
                </TableRow>
              ) : filteredServices.map((service) => (
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
                      : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.default_price)
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={service.status === "Active"} 
                        onCheckedChange={() => toggleStatus(service.id, service.status)}
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
                                value={editingService.default_price} 
                                onChange={(e) => setEditingService({...editingService, default_price: Number(e.target.value)})}
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
