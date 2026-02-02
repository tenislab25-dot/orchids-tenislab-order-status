"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { 
  ChevronLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Crown,
  Star,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ServiceOrder {
  id: string;
  os_number: string;
  status: string;
  total: number;
  payment_confirmed: boolean;
  created_at: string;
  delivery_date?: string;
  items: any[];
}

interface ClientDetails {
  id: string;
  name: string;
  phone: string;
  email?: string;
  is_vip: boolean;
  created_at: string;
  plus_code?: string;
  coordinates?: string;
  complement?: string;
  stats: {
    total_services: number;
    total_spent: number;
    ticket_medio: number;
    first_service_date?: string;
    last_service_date?: string;
  };
  service_orders: ServiceOrder[];
}

export default function ClientDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingVip, setTogglingVip] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

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
    setUserRole(storedRole);
    fetchClientDetails();
  }, [clientId]);

  async function fetchClientDetails() {
    try {
      setLoading(true);
      console.log('Fetching client details for ID:', clientId);
      const response = await fetch(`/api/clients/${clientId}`);
      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || "Erro ao carregar detalhes do cliente");
      }
      const data = await response.json();
      console.log('Client data:', data);
      setClient(data);
    } catch (error: any) {
      toast.error("Erro ao carregar cliente: " + error.message);
      router.push("/menu-principal/clientes");
    } finally {
      setLoading(false);
    }
  }

  async function toggleVip() {
    if (!client) return;
    
    setTogglingVip(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/toggle-vip`, {
        method: "POST",
      });
      
      if (!response.ok) throw new Error("Erro ao alterar status VIP");
      
      const data = await response.json();
      toast.success(data.message);
      
      // Atualizar estado local
      setClient({
        ...client,
        is_vip: data.is_vip,
      });
    } catch (error: any) {
      toast.error("Erro ao alterar status VIP: " + error.message);
    } finally {
      setTogglingVip(false);
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Recebido": "bg-blue-100 text-blue-700",
      "Em espera": "bg-yellow-100 text-yellow-700",
      "Em serviço": "bg-purple-100 text-purple-700",
      "Em finalização": "bg-orange-100 text-orange-700",
      "Pronto": "bg-green-100 text-green-700",
      "Em Rota": "bg-indigo-100 text-indigo-700",
      "Entregue": "bg-slate-100 text-slate-700",
      "Cancelado": "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-slate-100 text-slate-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Carregando detalhes do cliente...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-500">Cliente não encontrado</p>
          <Link href="/menu-principal/clientes">
            <Button className="mt-4">Voltar para Clientes</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/menu-principal/clientes" prefetch={false}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">{client.name}</h1>
              {client.is_vip && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-bold">
                  <Crown className="w-4 h-4" />
                  VIP
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">Detalhes e histórico do cliente</p>
          </div>
        </div>
        {userRole === 'ADMIN' && (
          <Button 
            onClick={toggleVip}
            disabled={togglingVip}
            className={`gap-2 font-bold ${
              client.is_vip 
                ? "bg-amber-600 hover:bg-amber-700 text-white" 
                : "bg-slate-200 hover:bg-slate-300 text-slate-700"
            }`}
          >
            <Star className={`w-4 h-4 ${client.is_vip ? "fill-current" : ""}`} />
            {togglingVip ? "Alterando..." : client.is_vip ? "Remover VIP" : "Marcar como VIP"}
          </Button>
        )}
      </header>

      {/* Informações do Cliente */}
      <Card className="border-none shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <User className="w-5 h-5" />
            Informações do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase">Telefone</p>
                <p className="text-lg font-bold text-slate-900">{client.phone}</p>
                <a 
                  href={`https://wa.me/55${client.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline flex items-center gap-1 mt-1"
                >
                  Abrir WhatsApp <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {client.email && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase">Email</p>
                  <p className="text-lg font-bold text-slate-900">{client.email}</p>
                </div>
              </div>
            )}

            {(client.plus_code || client.coordinates) && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase">Localização</p>
                  <p className="text-sm font-medium text-slate-900">{client.plus_code || client.coordinates}</p>
                  {client.complement && (
                    <p className="text-xs text-slate-500 mt-1">{client.complement}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase">Cliente desde</p>
                <p className="text-lg font-bold text-slate-900">
                  {client.stats.first_service_date 
                    ? formatDate(client.stats.first_service_date)
                    : formatDate(client.created_at)
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total de Serviços</p>
                <p className="text-3xl font-black text-blue-600 mt-1">{client.stats.total_services}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Gasto</p>
                <p className="text-3xl font-black text-green-600 mt-1">{formatCurrency(client.stats.total_spent)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Ticket Médio</p>
                <p className="text-3xl font-black text-purple-600 mt-1">{formatCurrency(client.stats.ticket_medio)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Ordens de Serviço */}
      <Card className="border-none shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <ShoppingBag className="w-5 h-5" />
            Histórico de Ordens de Serviço ({client.service_orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {client.service_orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">Nenhuma ordem de serviço encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Nº OS</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Valor</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">Pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {client.service_orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/menu-principal/os/${order.os_number.replace("/", "-")}`} className="font-bold text-blue-600 hover:underline cursor-pointer">
                          #{order.os_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{formatDate(order.created_at)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-slate-900">{formatCurrency(order.total)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {order.payment_confirmed ? (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            Pago
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                            Pendente
                          </span>
                        )}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
