"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
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
  Star,
  TrendingUp,
  DollarSign,
  Award,
  Crown
} from "lucide-react";
import { supabase, ensureValidSession } from "@/lib/supabase";
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

interface ClientWithStats {
  id: string;
  name: string;
  phone: string;
  email?: string;
  is_vip: boolean;
  created_at: string;
  total_services: number;
  total_spent: number;
  ticket_medio: number;
  first_service_date?: string;
  last_service_date?: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [topClients, setTopClients] = useState<ClientWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithStats | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [showAllClients, setShowAllClients] = useState(false);
  
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
      router.push("/menu-principal/login");
      return;
    }
    if (storedRole !== "ADMIN" && storedRole !== "ATENDENTE") {
      router.push("/menu-principal");
      return;
    }
    setRole(storedRole);
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      
      // Buscar todos os clientes com estatísticas diretamente do Supabase
      const { data: clientsData, error } = await supabase
        .from("clients")
        .select(`
          id,
          name,
          phone,
          email,
          is_vip,
          created_at,
          service_orders (
            id,
            total,
            created_at,
            payment_confirmed
          )
        `);

      if (error) throw new Error(error.message);

      // Processar dados para adicionar estatísticas
      const data = clientsData?.map((client: any) => {
        const orders = client.service_orders || [];
        const totalServices = orders.length;
        const totalSpent = orders.reduce((sum: number, order: any) => sum + (Number(order.total) || 0), 0);
        const ticketMedio = totalServices > 0 ? totalSpent / totalServices : 0;
        
        const sortedOrders = orders.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        const firstServiceDate = sortedOrders[0]?.created_at || null;
        const lastServiceDate = sortedOrders[sortedOrders.length - 1]?.created_at || null;

        return {
          id: client.id,
          name: client.name,
          phone: client.phone,
          email: client.email,
          is_vip: client.is_vip || false,
          created_at: client.created_at,
          total_services: totalServices,
          total_spent: totalSpent,
          ticket_medio: ticketMedio,
          first_service_date: firstServiceDate,
          last_service_date: lastServiceDate,
        };
      }) || [];

      // Ordenar por total de serviços
      data.sort((a, b) => {
        if (b.total_services !== a.total_services) {
          return b.total_services - a.total_services;
        }
        return b.total_spent - a.total_spent;
      });
      
      setClients(data);
      
      // Top 10 já vem ordenado da API
      setTopClients(data.slice(0, 10));
    } catch (error: any) {
      toast.error("Erro ao carregar clientes: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Ordenar clientes alfabeticamente
  const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));
  
  const filteredClients = search 
    ? sortedClients.filter(client => 
        client.name.toLowerCase().includes(search.toLowerCase()) ||
        client.phone.includes(search)
      )
    : sortedClients;
  
  // Limitar a 20 clientes inicialmente, ou mostrar todos se o usuário clicar
  const displayedClients = showAllClients ? filteredClients : filteredClients.slice(0, 20);

  const handleOpenDialog = (client?: ClientWithStats) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        phone: client.phone,
        email: client.email || "",
        plus_code: "",
        coordinates: "",
        complement: ""
      });
    } else {
      setEditingClient(null);
      setFormData({ name: "", phone: "", email: "", plus_code: "", coordinates: "", complement: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    setSaving(true);
    
    const timeoutId = setTimeout(() => {
      setSaving(false);
      toast.error("Operação demorou muito. Verifique sua conexão e tente novamente.");
    }, 15000);

    const formattedName = formData.name.toUpperCase();
    const cleanPhone = formData.phone.replace(/\D/g, "");
    const finalPhone = cleanPhone.startsWith("55") ? cleanPhone.slice(2) : cleanPhone;
    
    const finalData = {
      ...formData,
      name: formattedName,
      phone: finalPhone
    };

    try {
      const isSessionValid = await ensureValidSession();
      if (!isSessionValid) {
        clearTimeout(timeoutId);
        setSaving(false);
        toast.error("Sessão expirada. Por favor, faça login novamente.");
        window.location.href = "/menu-principal/login";
        return;
      }

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
      clearTimeout(timeoutId);
      setIsDialogOpen(false);
      fetchClients();
    } catch (error: any) {
      clearTimeout(timeoutId);
      logger.error("Erro ao salvar cliente:", error);
      toast.error("Erro ao salvar cliente: " + (error.message || "Tente novamente"));
    } finally {
      setSaving(false);
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Estatísticas gerais
  const totalClients = clients.length;
  const totalVips = clients.filter(c => c.is_vip).length;
  const topClientThisMonth = clients.length > 0 ? clients[0] : null;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/menu-principal" prefetch={false}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500" />
              Gestão de Clientes
            </h1>
            <p className="text-sm text-slate-500">Visualize estatísticas e gerencie seus clientes</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </header>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total de Clientes</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{totalClients}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Clientes VIP</p>
                <p className="text-3xl font-black text-amber-600 mt-1">{totalVips}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Top Cliente</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-lg font-bold text-slate-900 truncate">
                    {topClientThisMonth ? topClientThisMonth.name : "N/A"}
                  </p>
                  {topClientThisMonth?.is_vip && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                      <Crown className="w-3 h-3" />
                      VIP
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {topClientThisMonth ? `${topClientThisMonth.total_services} serviços` : ""}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Clientes */}
      <Card className="border-none shadow-sm">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <TrendingUp className="w-5 h-5" />
            Top 10 Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando ranking...</div>
          ) : topClients.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">Nenhum cliente cadastrado ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Serviços</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Total Gasto</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Ticket Médio</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topClients.map((client, index) => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? "bg-amber-100 text-amber-700" :
                          index === 1 ? "bg-slate-200 text-slate-700" :
                          index === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link 
                          href={`/menu-principal/clientes/${client.id}`}
                          className="hover:underline"
                        >
                          <p className="font-bold text-slate-900">{client.name}</p>
                          <p className="text-xs text-slate-500">{client.phone}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-blue-600">{client.total_services}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-green-600">{formatCurrency(client.total_spent)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-slate-600">{formatCurrency(client.ticket_medio)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {client.is_vip && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                            <Crown className="w-3 h-3" />
                            VIP
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link href={`/menu-principal/clientes/${client.id}`}>
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            Ver Detalhes
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista Completa de Clientes */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 py-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-lg font-bold text-slate-900">Todos os Clientes</CardTitle>
          </div>
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
          ) : displayedClients.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-4">
              <Users className="w-12 h-12 text-slate-200" />
              <p className="text-slate-500 font-medium">Nenhum cliente encontrado</p>
            </div>
          ) : (
            <>
            <div className="divide-y divide-slate-100">
              {displayedClients.map((client) => (
                <div key={client.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        href={`/menu-principal/clientes/${client.id}`}
                        className="hover:underline"
                      >
                        <h3 className="font-bold text-slate-900">{client.name}</h3>
                      </Link>
                      {client.is_vip && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
                          <Crown className="w-3 h-3" />
                          VIP
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {client.phone}
                      </span>
                      {client.email && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {client.email}
                        </span>
                      )}
                      <span className="text-xs text-blue-600 font-medium">
                        {client.total_services} serviços
                      </span>
                      <span className="text-xs text-green-600 font-medium">
                        {formatCurrency(client.total_spent)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/menu-principal/clientes/${client.id}`}>
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        Ver Detalhes
                      </Button>
                    </Link>
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
            {!showAllClients && filteredClients.length > 20 && (
              <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAllClients(true)}
                  className="font-medium"
                >
                  Ver Mais ({filteredClients.length - 20} clientes)
                </Button>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criar/Editar Cliente */}
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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700" disabled={saving}>
              {saving ? (
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
    </div>
  );
}
