"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  ChevronLeft,
  MoreVertical,
  Pencil,
  Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  created_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: ""
  });

  useEffect(() => {
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
        address: client.address || ""
      });
    } else {
      setEditingClient(null);
      setFormData({ name: "", phone: "", email: "", address: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    try {
      if (editingClient) {
        const { error } = await supabase
          .from("clients")
          .update(formData)
          .eq("id", editingClient.id);
        if (error) throw error;
        toast.success("Cliente atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("clients")
          .insert([formData]);
        if (error) throw error;
        toast.success("Cliente cadastrado com sucesso");
      }
      setIsDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      toast.error("Erro ao salvar cliente: " + error.message);
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

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/interno/dashboard">
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
                        <DropdownMenuItem onClick={() => handleDelete(client.id)} className="gap-2 text-red-600 focus:text-red-600">
                          <Trash2 className="w-4 h-4" /> Excluir
                        </DropdownMenuItem>
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
              <Label htmlFor="address">Endereço (Opcional)</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, Número, Bairro"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
              {editingClient ? "Salvar Alterações" : "Cadastrar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
