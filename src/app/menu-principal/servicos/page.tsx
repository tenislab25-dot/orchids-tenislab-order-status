"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Edit2, LayoutGrid, Search, ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { supabase, ensureValidSession } from "@/lib/supabase";
import { toast } from "sonner";

export default function ServicesManagement() {
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingService, setEditingService] = useState<any | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isManagingCategories, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newService, setNewService] = useState({ name: "", category: "", default_price: 0, description: "" });
  const [role, setRole] = useState<string | null>(null);

  const isAdmin = role === "ADMIN";

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("type", "Service")
      .order("name");
    
    if (!error && data) {
      setCategories(data);
      if (data.length > 0 && !newService.category) {
        setNewService(prev => ({ ...prev, category: data[0].name }));
      }
    }
  }, [newService.category]);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedRole = localStorage.getItem("tenislab_role");
    setRole(storedRole);
    fetchServices();
    fetchCategories();
  }, [fetchServices, fetchCategories]);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { data, error } = await supabase
      .from("categories")
      .insert([{ name: newCategoryName.trim(), type: "Service" }])
      .select();
    
    if (error) {
      toast.error("Erro ao adicionar categoria");
    } else {
      setCategories([...categories, data[0]]);
      setNewCategoryName("");
      toast.success("Categoria adicionada");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Erro ao excluir categoria (pode haver serviços nela)");
    } else {
      setCategories(categories.filter(c => c.id !== id));
      toast.success("Categoria excluída");
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!isAdmin) return;
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("Erro ao excluir serviço");
    } else {
      setServices(services.filter(s => s.id !== id));
      toast.success("Serviço excluído permanentemente");
    }
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
        default_price: editingService.default_price,
        description: editingService.description
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

  const handleAddService = async () => {
    if (!newService.name || newService.default_price < 0) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const { data, error } = await supabase
      .from("services")
      .insert([{
        ...newService,
        status: "Active",
        is_editable: false
      }])
      .select();

    if (error) {
      toast.error("Erro ao adicionar serviço");
    } else {
      setServices(prev => [...prev, data[0]]);
      setIsAdding(false);
      setNewService({ name: "", category: "Higienização", default_price: 0, description: "" });
      toast.success("Serviço adicionado com sucesso");
      fetchServices();
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex flex-col gap-6 md:gap-8 mb-8">
          <div className="flex justify-between items-start">
            <Link href="/menu-principal" prefetch={false} className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors font-bold uppercase text-[10px] tracking-widest">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar ao Painel</span>
              <span className="sm:hidden">Voltar</span>
            </Link>
            <img 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=400&height=400&resize=contain" 
              alt="TENISLAB Logo" 
              className="h-8 md:h-10 w-auto object-contain"
            />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                Gestão de Serviços
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">Administração do catálogo de preços da TENISLAB</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Dialog open={isManagingCategories} onOpenChange={setIsAddingCategory}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-slate-200 text-slate-600 font-bold flex items-center gap-2">
                        Categorias
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-lg rounded-[2rem]">
                      <DialogHeader>
                        <DialogTitle>Gerenciar Categorias de Serviço</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Nova categoria..." 
                            value={newCategoryName}
                            onChange={(e ) => setNewCategoryName(e.target.value)}
                            className="h-12 rounded-xl"
                          />
                          <Button onClick={handleAddCategory} className="h-12 px-6 rounded-xl bg-slate-900 text-white">Adicionar</Button>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-2">
                          {categories.map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                              <span className="font-medium">{cat.name}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteCategory(cat.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={isAdding} onOpenChange={setIsAdding}>
                    <DialogTrigger asChild>
                      <Button className="flex-1 sm:flex-none h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        <span className="hidden sm:inline">Novo Serviço</span>
                        <span className="sm:hidden">Novo</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[95vw] sm:max-w-lg rounded-[2rem]">
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Serviço</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <label className="text-sm font-bold">Nome do Serviço</label>
                          <Input 
                            placeholder="Ex: Pintura de Solado"
                            value={newService.name} 
                            onChange={(e) => setNewService({...newService, name: e.target.value})}
                            className="h-12 rounded-xl"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-bold">Categoria</label>
                          <select 
                            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={newService.category}
                            onChange={(e) => setNewService({...newService, category: e.target.value})}
                          >
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-bold">Preço Padrão (R$)</label>
                          <Input 
                            type="number" 
                            placeholder="0.00"
                            value={newService.default_price} 
                            onChange={(e) => setNewService({...newService, default_price: Number(e.target.value)})}
                            className="h-12 rounded-xl"
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-sm font-bold">Descrição</label>
                          <Input 
                            placeholder="Opcional..."
                            value={newService.description} 
                            onChange={(e) => setNewService({...newService, description: e.target.value})}
                            className="h-12 rounded-xl"
                          />
                        </div>
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsAdding(false)} className="h-12 rounded-xl">Cancelar</Button>
                        <Button onClick={handleAddService} className="h-12 rounded-xl bg-slate-900 text-white hover:bg-slate-800">Criar Serviço</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Buscar serviço..." 
                  className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold text-slate-900 min-w-[150px]">Serviço</TableHead>
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
                      <Badge variant="outline" className="font-normal whitespace-nowrap">
                        {service.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(service.default_price)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={service.status === "Active"} 
                          onCheckedChange={() => toggleStatus(service.id, service.status)}
                        />
                        <span className={`text-[10px] font-bold uppercase ${service.status === "Active" ? "text-green-600" : "text-slate-400"} hidden sm:inline`}>
                          {service.status === "Active" ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingService(service)} className="h-8 w-8">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          {editingService && (
                            <DialogContent className="max-w-[95vw] sm:max-w-lg rounded-[2rem]">
                              <DialogHeader>
                                <DialogTitle>Editar Serviço</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <label className="text-sm font-bold">Nome do Serviço</label>
                                  <Input 
                                    value={editingService.name} 
                                    onChange={(e) => setEditingService({...editingService, name: e.target.value})}
                                    className="h-12 rounded-xl"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <label className="text-sm font-bold">Categoria</label>
                                  <select 
                                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={editingService.category}
                                    onChange={(e) => setEditingService({...editingService, category: e.target.value})}
                                  >
                                    {categories.map(cat => (
                                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="grid gap-2">
                                  <label className="text-sm font-bold">Preço Padrão (R$)</label>
                                  <Input 
                                    type="number" 
                                    disabled={!isAdmin}
                                    value={editingService.default_price} 
                                    onChange={(e) => setEditingService({...editingService, default_price: Number(e.target.value)})}
                                    className="h-12 rounded-xl"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <label className="text-sm font-bold">Descrição</label>
                                  <Input 
                                    value={editingService.description || ""} 
                                    onChange={(e) => setEditingService({...editingService, description: e.target.value})}
                                    className="h-12 rounded-xl"
                                  />
                                </div>
                              </div>
                              <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setEditingService(null)} className="h-12 rounded-xl">Cancelar</Button>
                                <Button onClick={handleEditSave} className="h-12 rounded-xl bg-slate-900 text-white">Salvar</Button>
                              </DialogFooter>
                            </DialogContent>
                          )}
                        </Dialog>

                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteService(service.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
