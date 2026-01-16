"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  ChevronLeft,
  MoreVertical,
  Pencil,
  Trash2,
  Gift,
  Star
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string; // DEPRECATED: mantido por compatibilidade
  plus_code?: string;
  coordinates?: string;
  complement?: string;
  created_at: string;
}

interface LoyaltyData {
  total_services: number;
  free_services_available: number;
  progress_to_next: number;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loyaltyDialog, setLoyaltyDialog] = useState<{ open: boolean; client: Client | null; data: LoyaltyData | null }>({
    open: false,
    client: null,
    data: null
  });
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    plus_code: "",
    coordinates: "",
    complement: ""
  });

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
    setRole(storedRole);
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar clientes: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.phone.includes(search)
  );

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        phone: client.phone,
        email: client.email || "",
        plus_code: client.plus_code || "",
        coordinates: client.coordinates || "",
        complement: client.complement || ""
      });
    } else {
      setEditingClient(null);
      setFormData({ name: "", phone: "", email: "", plus_code: "", coordinates: "", complement: "" });
    }
    setIsDialogOpen(true);
  };

    const handleSubmit = async () => {
    console.log('[CLIENTE] Iniciando cadastro/edição...');
    console.log('[CLIENTE] Dados do formulário:', formData);
    
    if (!formData.name || !formData.phone) {
      console.log('[CLIENTE] Validação falhou');
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    setLoading(true);
    const formattedName = formData.name.toUpperCase();
    const cleanPhone = formData.phone.replace(/\D/g, "");
    const finalPhone = cleanPhone.startsWith("55") ? cleanPhone.slice(2) : cleanPhone;
    
    const finalData = {
      ...formData,
      name: formattedName,
      phone: finalPhone
    };

    try {
      if (editingClient) {
        const { error } = await supabase
          .from("clients")
          .update(finalData)
          .eq("id", editingClient.id);
        if (error) throw error;
        toast.success("Cliente atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("clients")
          .insert([finalData]);
        if (error) throw error;
        toast.success("Cliente cadastrado com sucesso");
      }
      setIsDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      toast.error("Erro ao salvar cliente: " + (error.message || "Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Cliente excluído com sucesso");
      fetchClients();
    } catch (error: any) {
      toast.error("Erro ao excluir cliente: " + error.message);
    }
  };

  const openLoyaltyDialog = async (client: Client) => {
    try {
      const response = await fetch(`/api/loyalty?clientId=${client.id}`);
      const data = await response.json();
      setLoyaltyDialog({ open: true, client, data });
    } catch (error) {
      toast.error("Erro ao carregar fidelidade");
    }
  };

  const useFreeService = async () => {
    if (!loyaltyDialog.client) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      const response = await fetch("/api/loyalty", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          clientId: loyaltyDialog.client.id,
          action: "use_free_service"
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        toast.error(data.error);
        return;
      }

      toast.success(data.message);
      openLoyaltyDialog(loyaltyDialog.client);
    } catch (error) {
      toast.error("Erro ao usar serviço grátis");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/interno/dashboard" prefetch={false}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500" />
              Clientes
            </h1>
            <p className="text-sm text-slate-500">Gerencie o cadastro de clientes da TENISLAB</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </header>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              className="pl-9 bg-slate-50 border-slate-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando clientes...</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-4">
              <Users className="w-12 h-12 text-slate-200" />
              <p className="text-slate-500 font-medium">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <div key={client.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-bold text-slate-900">{client.name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {client.phone}
                      </span>
                      {client.email && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {client.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                      onClick={() => openLoyaltyDialog(client)}
                      title="Programa de Fidelidade"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(client)} className="gap-2">
                            <Pencil className="w-4 h-4" /> Editar
                          </DropdownMenuItem>
{role === "ADMIN" && (
                              <DropdownMenuItem onClick={() => handleDelete(client.id)} className="gap-2 text-red-600 focus:text-red-600">
                                <Trash2 className="w-4 h-4" /> Excluir
                              </DropdownMenuItem>
                            )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (Opcional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="joao@email.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Plus Code ou Coordenadas (Opcional)</Label>
              <Input
                id="plus_code"
                value={formData.plus_code}
                onChange={(e) => setFormData({ ...formData, plus_code: e.target.value })}
                placeholder="Ex: 8C7X+2G ou -9.123456,-35.123456"
              />
              <p className="text-xs text-slate-500">Para obter: abra Google Maps, clique no local e copie o Plus Code ou as coordenadas</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="complement">Complemento (Opcional)</Label>
              <Input
                id="complement"
                value={formData.complement}
                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                placeholder="Condomínio, Bloco, Apartamento"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={loading}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Salvando...
                </span>
              ) : (
                editingClient ? "Salvar Alterações" : "Cadastrar Cliente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loyaltyDialog.open} onOpenChange={(open) => setLoyaltyDialog({ ...loyaltyDialog, open })}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500" />
              Programa de Fidelidade
            </DialogTitle>
          </DialogHeader>
          {loyaltyDialog.client && loyaltyDialog.data && (
            <div className="flex flex-col gap-6 py-4">
              <div className="text-center">
                <p className="text-sm text-slate-500 mb-1">Cliente</p>
                <p className="font-bold text-lg">{loyaltyDialog.client.name}</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Total de serviços</p>
                    <p className="text-3xl font-black text-amber-700">{loyaltyDialog.data.total_services}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-600 font-bold uppercase tracking-wider">Grátis disponíveis</p>
                    <p className="text-3xl font-black text-green-600">{loyaltyDialog.data.free_services_available}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 mb-2">
                    <span>Progresso para próximo grátis</span>
                    <span>{loyaltyDialog.data.progress_to_next}/10</span>
                  </div>
                  <Progress value={loyaltyDialog.data.progress_to_next * 10} className="h-3" />
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Faltam {10 - loyaltyDialog.data.progress_to_next} serviços para ganhar 1 higienização grátis
                  </p>
                </div>
              </div>

              {loyaltyDialog.data.free_services_available > 0 && (
                <Button 
                  onClick={useFreeService}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                >
                  <Gift className="w-4 h-4" />
                  Usar 1 Higienização Grátis
                </Button>
              )}

              <p className="text-xs text-slate-400 text-center">
                A cada 10 serviços realizados, o cliente ganha 1 higienização grátis!
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
