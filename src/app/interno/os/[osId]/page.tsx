"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  LayoutDashboard,
    Calendar,
    AlertTriangle,
    Package,
    PackageCheck,
    User,
    Phone,
  CheckCircle2, 
  Clock, 
  Truck, 
  Bell, 
  Printer,
  Share2,
  Search,
  X,
  Trash2,
  Pencil
} from "lucide-react";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  import {
    Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { canChangeToStatus, getAllowedStatuses, type UserRole } from "@/lib/auth";

type Status = "Recebido" | "Em espera" | "Em serviço" | "Em finalização" | "Pronto para entrega ou retirada" | "Entregue" | "Cancelado";

interface OrderData {
  id: string;
  os_number: string;
  status: Status;
  entry_date: string;
  delivery_date?: string;
  items: any[];
  total: number;
  payment_method: string;
  pay_on_entry: boolean;
  delivery_fee: number;
  discount_percent: number;
  payment_confirmed: boolean;
  machine_fee: number;
  ready_for_pickup: boolean;
  clients: {
    name: string;
    phone: string;
  } | null;
}

export default function OSViewPage() {
  const params = useParams();
  const router = useRouter();
  const osIdRaw = params.osId as string;
  const osNumber = osIdRaw.replace("-", "/");
  
  const { role, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<{itemIdx: number, photoIdx: number} | null>(null);
    const [cancellationReason, setCancellationReason] = useState("");
    
    const handleShareLink = () => {
      if (!order) return;
      
      const cleanPhone = order.clients?.phone.replace(/\D/g, "") || "";
      const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      
      const acceptanceLink = `${window.location.origin}/aceite/${order.id}`;
      const message = encodeURIComponent(
        `Olá ${order.clients?.name}! Sua Ordem de Serviço #${order.os_number} está pronta no sistema da TENISLAB.\n\n` +
        `Para conferir os detalhes e dar o seu aceite digital, acesse o link abaixo:\n${acceptanceLink}\n\n` +
        `Qualquer dúvida, estamos à disposição!`
      );
      
      window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
    };
    
    // Payment edit states
    const [newPaymentMethod, setNewPaymentMethod] = useState("");
    const [machineFee, setMachineFee] = useState("0");
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
    
      useEffect(() => {
      if (!authLoading && role) {
        fetchOrder();
      }
    }, [osNumber, authLoading, role]);

  const fetchOrder = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        *,
        clients (
          name,
          phone
        )
      `)
      .eq("os_number", osNumber)
      .single();

    if (error) {
      toast.error("Erro ao carregar OS: " + error.message);
    } else {
      setOrder(data as OrderData);
    }
    setLoading(false);
  };

  const confirmPayment = async () => {
    if (!isConfirmingPayment) {
      setIsConfirmingPayment(true);
      return;
    }

    const { error } = await supabase
      .from("service_orders")
      .update({ 
        payment_confirmed: true,
        payment_method: newPaymentMethod || order?.payment_method,
        machine_fee: Number(machineFee) || 0
      })
      .eq("os_number", osNumber);

    if (error) {
      toast.error("Erro ao confirmar pagamento: " + error.message);
      setIsConfirmingPayment(false);
    } else {
      setOrder(prev => prev ? { 
        ...prev, 
        payment_confirmed: true,
        payment_method: newPaymentMethod || prev.payment_method,
        machine_fee: Number(machineFee) || 0
      } : null);
      setPaymentModalOpen(false);
      setIsConfirmingPayment(false);
      toast.success("Pagamento Confirmado!");
    }
  };

  const handleRevertPayment = async () => {
    const { error } = await supabase
      .from("service_orders")
      .update({ payment_confirmed: false })
      .eq("os_number", osNumber);

    if (error) {
      toast.error("Erro ao reverter pagamento: " + error.message);
    } else {
      setOrder(prev => prev ? { ...prev, payment_confirmed: false } : null);
      toast.success("Pagamento marcado como pendente");
    }
  };

  const toggleReadyForPickup = async () => {
    const newVal = !order?.ready_for_pickup;
    const { error } = await supabase
      .from("service_orders")
      .update({ ready_for_pickup: newVal })
      .eq("os_number", osNumber);

    if (error) {
      toast.error("Erro ao atualizar notificação: " + error.message);
    } else {
      setOrder(prev => prev ? { ...prev, ready_for_pickup: newVal } : null);
      
        if (newVal && order) {
          const cleanPhone = order.clients?.phone.replace(/\D/g, "") || "";
          const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
          
            const message = encodeURIComponent(
              `Olá ${order.clients?.name}! Seus tênis estão prontinhos e limpos na Tênis Lab.\n\n` +
              `Já estão aguardando sua retirada ou serão entregues pelo nosso motoboy em breve.\n\n` +
              `Qualquer dúvida, estamos à disposição!`
            );
          
          window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
        }
      }
    };

    const handleSendReadyNotification = () => {
      if (!order) return;
      const cleanPhone = order.clients?.phone.replace(/\D/g, "") || "";
      const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      
      const message = encodeURIComponent(
        `Olá ${order.clients?.name}! Seus tênis estão prontinhos e limpos na Tênis Lab.\n\n` +
        `Já estão aguardando sua retirada ou serão entregues pelo nosso motoboy em breve.\n\n` +
        `Qualquer dúvida, estamos à disposição!`
      );
      
      window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
    };

    const handleStatusUpdate = async (newStatus: Status) => {
      if (!role || !canChangeToStatus(role as UserRole, newStatus)) {
        toast.error("Você não tem permissão para alterar para este status");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        router.push("/login");
        return;
      }

      const response = await fetch("/api/orders/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order?.id, status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Erro ao atualizar status");
        return;
      }

      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success("Status atualizado!");

      if (newStatus === "Pronto para entrega ou retirada") {
        toast.info("Certifique-se de enviar notificação ao cliente que o pedido esta pronto.", { duration: 6000 });
      } else if (newStatus === "Entregue") {
        toast.info("Certifique-se de enviar o link p/pagamento.", { duration: 6000 });
      }
    };

    const [readyReminderModalOpen, setReadyReminderModalOpen] = useState(false);

    const handleEntregueClick = () => {
      if (!order) return;
      if (order.status === "Entregue") return;
      
      // Sempre mostrar o lembrete de notificação de "Pronto" antes de prosseguir para Entregue
      setReadyReminderModalOpen(true);
    };

    const proceedAfterReadyReminder = () => {
      setReadyReminderModalOpen(false);
      if (!order.payment_confirmed && !order.pay_on_entry) {
        setDeliveryModalOpen(true);
      } else {
        handleStatusUpdate("Entregue");
      }
    };

  const [deletePhotoModalOpen, setDeletePhotoModalOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<{itemIdx: number, photoIdx: number} | null>(null);

  const handleDeliveryConfirm = async (sendPaymentLink: boolean) => {
    const { error } = await supabase
      .from("service_orders")
      .update({ status: "Entregue" })
      .eq("os_number", osNumber);

    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
      return;
    }

    setOrder(prev => prev ? { ...prev, status: "Entregue" } : null);
    setDeliveryModalOpen(false);
    toast.success("Pedido marcado como entregue!");
    toast.info("Certifique-se de enviar o link p/pagamento.", { duration: 6000 });

    if (sendPaymentLink && order) {
      const cleanPhone = order.clients?.phone.replace(/\D/g, "") || "";
      const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      const paymentLink = `${window.location.origin}/pagamento/${order.id}`;
      
        const message = encodeURIComponent(
          `Olá ${order.clients?.name}! Seu pedido #${order.os_number} foi entregue!\n\n` +
          `Valor total: R$ ${Number(order.total).toFixed(2)}\n\n` +
          `Para realizar o pagamento via Pix ou ver os detalhes, acesse o link abaixo:\n${paymentLink}\n\n` +
          `Obrigado pela preferência!`
        );
      
      const waUrl = `https://wa.me/${whatsappPhone}?text=${message}`;
      
      window.open(waUrl, "_blank");
    }
  };

    const handleSharePaymentLink = () => {
      if (!order) return;
      
      const cleanPhone = order.clients?.phone.replace(/\D/g, "") || "";
      const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      const paymentLink = `${window.location.origin}/pagamento/${order.id}`;
      
      const message = encodeURIComponent(
        `Olá ${order.clients?.name}! Seu pedido #${order.os_number} foi entregue!\n\n` +
        `Valor total: R$ ${Number(order.total).toFixed(2)}\n\n` +
        `Para realizar o pagamento via Pix ou ver os detalhes, acesse o link abaixo:\n${paymentLink}\n\n` +
        `Obrigado pela preferência!`
      );
      
      window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
    };

  const handleDeletePhoto = async () => {
    if (!order || !photoToDelete) return;
    
    const { itemIdx, photoIdx } = photoToDelete;
    const newItems = [...order.items];
    const photos = [...(newItems[itemIdx].photos || [])];
    photos.splice(photoIdx, 1);
    newItems[itemIdx].photos = photos;

    const { error } = await supabase
      .from("service_orders")
      .update({ items: newItems })
      .eq("os_number", osNumber);

    if (error) {
      toast.error("Erro ao excluir foto: " + error.message);
    } else {
      setOrder({ ...order, items: newItems });
      toast.success("Foto excluída com sucesso!");
    }
    setDeletePhotoModalOpen(false);
    setPhotoToDelete(null);
  };

  const toggleItemStatus = async (itemIdx: number) => {
    if (!order) return;
    
    const newItems = [...order.items];
    const currentStatus = newItems[itemIdx].status || "Pendente";
    newItems[itemIdx].status = currentStatus === "Pendente" ? "Pronto" : "Pendente";

    const { error } = await supabase
      .from("service_orders")
      .update({ items: newItems })
      .eq("os_number", osNumber);

    if (error) {
      toast.error("Erro ao atualizar item: " + error.message);
    } else {
      setOrder({ ...order, items: newItems });
      toast.success(`Item marcado como ${newItems[itemIdx].status}`);
    }
  };

  const handleDeleteOS = async () => {
    try {
      const { error } = await supabase
        .from("service_orders")
        .delete()
        .eq("os_number", osNumber);

      if (error) throw error;

      toast.success("OS excluída permanentemente");
      router.push("/interno/dashboard");
    } catch (error: any) {
      toast.error("Erro ao excluir OS: " + error.message);
    } finally {
      setDeleteModalOpen(false);
    }
  };

  const confirmCancel = async () => {
    if (cancellationReason.trim().length < 10) {
      toast.error("Informe o motivo com pelo menos 10 caracteres");
      return;
    }

    const { error } = await supabase
      .from("service_orders")
      .update({ 
        status: "Cancelado",
        // We could add a cancellation_reason column if needed, 
        // but for now let's just update the status as per the current schema
      })
      .eq("os_number", osNumber);

    if (error) {
      toast.error("Erro ao cancelar: " + error.message);
    } else {
      setOrder(prev => prev ? { ...prev, status: "Cancelado" } : null);
      setCancelModalOpen(false);
      toast.success("OS Cancelada");
    }
  };

    const handlePrintLabel = (itemsToPrint: any[]) => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
  
      const labelsHtml = itemsToPrint.map((item, idx) => {
        const servicesText = item.services.map((s: any) => s.name).join(', ') + 
          (item.customService?.name ? `, ${item.customService.name}` : '');
        
        return `
          <div class="label-container ${idx < itemsToPrint.length - 1 ? 'page-break' : ''}">
            <div class="header">
              <span class="os-value">${order?.os_number}</span>
            </div>
            <div class="item-info">ITEM: ${item.itemNumber || (idx + 1)}</div>
            <div class="services">SRV: ${servicesText}</div>
            <div class="dates">
              <div class="date-box">
                <span class="date-label">ENTRADA</span>
                <span class="date-value">${new Date(order?.entry_date || '').toLocaleDateString('pt-BR')}</span>
              </div>
              <div class="date-box">
                <span class="date-label">ENTREGA</span>
                <span class="date-value">${order?.delivery_date ? new Date(order.delivery_date).toLocaleDateString('pt-BR') : '--/--'}</span>
              </div>
            </div>
            <div class="footer">TENISLAB</div>
          </div>
        `;
      }).join('');
  
      const html = `
        <html>
          <head>
            <title>Etiquetas OS ${order?.os_number}</title>
            <style>
              @page {
                size: 80mm 40mm;
                margin: 0;
              }
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                width: 80mm;
                background: white;
                text-align: center;
              }
              .label-container {
                padding: 3mm 4mm;
                height: 40mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .page-break {
                page-break-after: always;
              }
              .header {
                display: flex;
                justify-content: center;
                border-bottom: 1.5px solid black;
                padding-bottom: 1mm;
                margin-bottom: 1mm;
              }
              .os-value { font-size: 18pt; font-weight: 900; line-height: 1; }
              .item-info {
                font-size: 10pt;
                font-weight: 800;
                margin-bottom: 1mm;
              }
              .services {
                font-size: 8pt;
                font-weight: 600;
                line-height: 1;
                max-height: 8mm;
                overflow: hidden;
                text-transform: uppercase;
                margin-bottom: 1mm;
              }
                .dates {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: 1mm;
                  margin-top: 1mm;
                  padding-top: 1mm;
                  border-top: 1px solid black;
                }
              .date-box {
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .date-label { font-size: 6pt; font-weight: 800; color: #333; }
              .date-value { font-size: 9pt; font-weight: 800; }
              .footer {
                font-size: 7pt;
                text-align: center;
                margin-top: 1mm;
                font-weight: 900;
                letter-spacing: 2px;
              }
              @media print {
                .label-container { border-bottom: none; }
              }
            </style>
          </head>
          <body>
            ${labelsHtml}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `;
  
      printWindow.document.write(html);
      printWindow.document.close();
    };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <h1 className="text-xl font-bold">OS não encontrada</h1>
      <Button asChild>
        <Link href="/interno/dashboard">Voltar ao Dashboard</Link>
      </Button>
    </div>
  );

      const getStatusBadge = (status: Status) => {
        const styles = {
          Recebido: "bg-blue-100 text-blue-700",
          "Em espera": "bg-orange-100 text-orange-700",
          "Em serviço": "bg-amber-100 text-amber-700",
          "Em finalização": "bg-indigo-100 text-indigo-700",
          "Pronto para entrega ou retirada": "bg-green-100 text-green-700",
          Entregue: "bg-slate-100 text-slate-700",
          Cancelado: "bg-red-100 text-red-700",
        };
    return (
      <Badge className={`${styles[status]} border-none px-3 py-1 font-bold text-center leading-tight whitespace-normal h-auto min-h-7`}>
        {status === "Pronto para entrega ou retirada" ? (
          <div className="flex flex-col">
            <span>Pronto para</span>
            <span>entrega/retirada</span>
          </div>
        ) : status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="grid grid-cols-3 items-center max-w-6xl mx-auto">
          <Link href="/interno/dashboard" className="w-fit">
            <Button variant="ghost" size="icon" className="rounded-full -ml-2">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
            <div className="flex flex-col items-center text-center">
              <h1 className="text-sm font-bold text-slate-900 leading-none">Detalhes</h1>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{order.os_number}</span>
            </div>
          <div />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 lg:grid lg:grid-cols-12 lg:gap-8 items-start animate-in fade-in duration-500">
        
        {/* CLIENT INFO */}
        <div className="lg:col-span-4 lg:col-start-9 flex flex-col gap-5 mb-5 lg:mb-0">
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</span>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{order.clients?.name}</h2>
              <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                <Phone className="w-3 h-3" />
                {order.clients?.phone}
              </div>
            </div>
              {getStatusBadge(order.status)}
            </div>

<Button 
                onClick={handleShareLink}
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
              >
                <Share2 className="w-4 h-4" />
                Gerar link para aceite
              </Button>

              {(role === "ADMIN" || role === "ATENDENTE") && (
                <Link href={`/interno/os/${osIdRaw}/editar`} className="w-full">
                  <Button 
                    variant="outline"
                    className="w-full h-12 rounded-2xl border-slate-200 text-slate-700 font-bold gap-2 hover:bg-slate-50 transition-all active:scale-[0.98]"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar OS
                  </Button>
                </Link>
              )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-500" /> Entrada
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {new Date(order.entry_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {order.delivery_date && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Package className="w-3 h-3 text-blue-500" /> Prev. Entrega
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {new Date(order.delivery_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  </div>
          </section>
        </div>

        {/* ITEMS */}
        <div className="lg:col-span-8 lg:row-start-1 lg:row-span-10 flex flex-col gap-4">
          <div className="flex items-center justify-between mx-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pares de Tênis</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePrintLabel(order.items)}
                  className="h-7 text-[9px] font-bold uppercase tracking-wider gap-1.5 bg-white border-slate-200"
                >
                  <Printer className="w-3 h-3" />
                  Imprimir Todas
                </Button>
              </div>
              
              {order.items.map((item: any, idx: number) => (
                <Card key={idx} className={`rounded-3xl border-slate-200 shadow-sm overflow-hidden transition-all ${item.status === 'Pronto' ? 'ring-2 ring-green-400/30' : ''}`}>
                  <CardHeader className={`py-3 px-6 border-b border-slate-100 flex flex-row items-center justify-between ${item.status === 'Pronto' ? 'bg-green-50/50' : 'bg-slate-50/50'}`}>
                    <div className="flex flex-col">
                      <CardTitle className="text-xs font-black text-slate-600 uppercase tracking-widest">
                        ITEM {idx + 1} - {item.itemNumber}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintLabel([item])}
                        className="h-7 px-2 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleItemStatus(idx)}
                        className={`h-7 px-3 rounded-full text-[10px] font-black uppercase tracking-tighter gap-1.5 transition-all ${
                          item.status === 'Pronto' 
                          ? 'bg-green-500 text-white hover:bg-green-600' 
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                        }`}
                      >
                        {item.status === 'Pronto' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {item.status || 'Pendente'}
                      </Button>
                    </div>
                  </CardHeader>

                <CardContent className="p-6 space-y-6">
{item.photos && item.photos.length > 0 && (
                          <div className="grid grid-cols-2 gap-2 pb-2">
                              {item.photos.map((photo: string, pIdx: number) => {
                                const isActive = activePhotoIndex?.itemIdx === idx && activePhotoIndex?.photoIdx === pIdx;
                                return (
                                  <div 
                                    key={pIdx} 
                                    className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 cursor-pointer group"
                                    onClick={() => {
                                      if (isActive) {
                                        setActivePhotoIndex(null);
                                      } else {
                                        setActivePhotoIndex({itemIdx: idx, photoIdx: pIdx});
                                      }
                                    }}
                                  >
                                    <Image src={photo} alt={`Foto do item ${idx + 1}`} fill className="object-cover" />
                                    <div className={`absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center gap-3 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                      <button 
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedImage(photo);
                                          setActivePhotoIndex(null);
                                        }}
                                        className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors"
                                      >
                                        <Search className="w-6 h-6 text-white" />
                                      </button>
                                        <button 
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPhotoToDelete({itemIdx: idx, photoIdx: pIdx});
                                            setDeletePhotoModalOpen(true);
                                            setActivePhotoIndex(null);
                                          }}
                                          className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-2xl hover:bg-red-600 transition-colors"
                                        >
                                          <Trash2 className="w-6 h-6 text-white" />
                                        </button>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                      )}
                  <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Serviços</span>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <ul className="space-y-2">
                        {item.services.map((service: any, i: number) => (
                          <li key={i} className="flex flex-col gap-0.5 py-1 first:pt-0 last:pb-0 border-b border-slate-100 last:border-0">
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {service.name}
                            </div>
                            {service.description && (
                              <p className="text-[10px] text-slate-500 ml-3.5 leading-tight">
                                {service.description}
                              </p>
                            )}
                          </li>
                        ))}

                      {item.customService?.name && (
                        <li className="flex items-center gap-2 text-sm font-bold text-blue-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          {item.customService.name} (Extra)
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {item.notes && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Observações</span>
                    <div className="bg-amber-50/30 rounded-2xl p-4 border border-amber-100/50">
                      <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                        "{item.notes}"
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FINANCIAL SUMMARY */}
        {role !== "OPERACIONAL" && (
          <div className="lg:col-span-4 lg:col-start-9">
            <section>
                <Card className="rounded-3xl bg-slate-900 text-white overflow-hidden shadow-xl">
                    <CardHeader className="py-4 px-6 border-b border-white/10 flex flex-row items-center justify-between">
                      <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Resumo da OS</CardTitle>
                      {!order.payment_confirmed && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300 hover:bg-white/5"
                        onClick={() => {
                          setNewPaymentMethod(order.payment_method);
                          setMachineFee(String(order.machine_fee || 0));
                          setPaymentModalOpen(true);
                        }}
                      >
                        Editar Pgto
                      </Button>
                    )}
                  </CardHeader>
<CardContent className="p-6 flex flex-col gap-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white/60">Método de Pagamento</span>
                        <span className="font-bold">{order.payment_method}</span>
                      </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-white/60">Status de Pagamento</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${order.payment_confirmed || order.pay_on_entry ? "text-green-400" : "text-amber-400"}`}>
                              {order.payment_confirmed || order.pay_on_entry ? "Pago" : "Aguardando"}
                            </span>
                            <Badge variant="outline" className="text-[9px] border-white/20 text-white/40 uppercase">
                              {order.pay_on_entry ? "Antecipado" : "Na Entrega"}
                            </Badge>
                          </div>
                        </div>
    
                        {order.delivery_fee > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">Taxa de Entrega</span>
                            <span className="font-bold text-green-400">+ R$ {Number(order.delivery_fee).toFixed(2)}</span>
                          </div>
                        )}

                        {(order.machine_fee > 0 || order.payment_confirmed) && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-white/60">Desconto Maquineta</span>
                            <span className="font-bold text-red-400">- R$ {Number(order.machine_fee).toFixed(2)}</span>
                          </div>
                        )}
  
                      <div className="h-px bg-white/10 my-2" />
                      
                      <div className="flex flex-col gap-2 mb-2">
                        {!order.payment_confirmed ? (
                          <>
                          <Button 
                            onClick={() => {
                              setNewPaymentMethod(order.payment_method);
                              setMachineFee(String(order.machine_fee || 0));
                              setPaymentModalOpen(true);
                            }}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-10 rounded-xl text-xs"
                          >
                            Confirmar Pagamento
                          </Button>
                          <Button 
                            onClick={handleSharePaymentLink}
                            variant="outline"
                            className="w-full border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-bold h-10 rounded-xl text-xs gap-2"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Enviar Link p/ Pagamento
                          </Button>
                        </>
                      ) : (
                          <Button 
                            variant="outline"
                            onClick={handleRevertPayment}
                            className="w-full border-white/20 bg-transparent text-white/60 hover:bg-white/5 font-bold h-10 rounded-xl text-xs"
                          >
                            Estornar / Marcar como Pendente
                          </Button>
                        )}
                      </div>
  
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">
                        {order.payment_confirmed ? "Líquido Recebido" : "Total Geral"}
                      </span>
                      <span className="text-3xl font-black text-blue-400 tracking-tighter">
                        R$ {(Number(order.total) - (order.payment_confirmed ? Number(order.machine_fee || 0) : 0)).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>
          )}
  
            {/* ACTIONS */}
              <div className="lg:col-span-4 lg:col-start-9 flex flex-col gap-3 mt-4 lg:mt-0">
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Atualizar Status</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                    {role && canChangeToStatus(role as UserRole, "Em serviço") && (
                          <Button
                            onClick={() => handleStatusUpdate("Em serviço")}
                            variant="outline"
                            className={`h-12 rounded-xl font-bold border-2 ${order.status === "Em serviço" ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Em Serviço
                          </Button>
                    )}

                    {role && canChangeToStatus(role as UserRole, "Em finalização") && (
                          <Button
                            onClick={() => handleStatusUpdate("Em finalização")}
                            variant="outline"
                            className={`h-12 rounded-xl font-bold border-2 ${order.status === "Em finalização" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                          >
                            <PackageCheck className="w-4 h-4 mr-2" />
                            Em Finalização
                          </Button>
                    )}
                          
                    {role && canChangeToStatus(role as UserRole, "Pronto para entrega ou retirada") && (
                              <Button
                              onClick={() => handleStatusUpdate("Pronto para entrega ou retirada")}
                              variant="outline"
                              className={`h-12 rounded-xl font-bold border-2 leading-tight py-1 ${order.status === "Pronto para entrega ou retirada" ? "bg-green-50 border-green-200 text-green-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                            >
                              <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Pronto para</span>
                                </div>
                                <span>entrega/retirada</span>
                              </div>
                            </Button>
                    )}
      
                      {role && canChangeToStatus(role as UserRole, "Entregue") && (
                            <Button
                              onClick={handleEntregueClick}
                              className={`h-12 rounded-xl font-bold transition-all shadow-lg ${
                                order.status === "Entregue" 
                                ? "bg-green-600 hover:bg-green-700 text-white shadow-green-100" 
                                : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200"
                              }`}
                            >
                              <Truck className="w-4 h-4 mr-2" />
                              Entregue
                            </Button>
                      )}

                      {role && canChangeToStatus(role as UserRole, "Cancelado") && (
                              <Button
                                onClick={() => setCancelModalOpen(true)}
                                variant="outline"
                                className="h-12 rounded-xl border-2 border-red-100 bg-red-50 text-red-600 font-bold hover:bg-red-100"
                              >
                                Cancelar OS
                              </Button>
                      )}
                        </div>
                      </div>
    
                      {(role === "ADMIN" || role === "ATENDENTE") && (
                        <div className="flex flex-col gap-2 mt-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Notificações</p>
                          <Button
                            onClick={handleSendReadyNotification}
                            className="h-auto min-h-12 py-3 px-4 rounded-xl font-bold border-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-sm whitespace-normal"
                          >
                            <div className="flex items-center justify-center w-full">
                              <Bell className="w-4 h-4 mr-2 shrink-0" />
                              <span className="text-center leading-tight">Enviar notificação que o pedido está pronto</span>
                            </div>
                          </Button>
                        </div>
                      )}

                      {role === "ADMIN" && (
                        <div className="flex flex-col gap-2 mt-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Zona de Perigo</p>
                      <Button
                        onClick={() => setDeleteModalOpen(true)}
                        variant="destructive"
                        className="h-12 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-100"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir OS Permanentemente
                      </Button>
                    </div>
                  )}


            <Link href={role === "ATENDENTE" ? "/interno/os" : "/interno/dashboard"} className="w-full mt-4">
            <Button 
              className="w-full h-14 rounded-2xl bg-white border-2 border-slate-200 text-slate-900 font-black shadow-sm"
            >
              <LayoutDashboard className="w-5 h-5 mr-2" />
              VOLTAR AO {role === "ATENDENTE" ? "LISTAGEM" : "DASHBOARD"}
            </Button>
          </Link>
        </div>

        {/* PAYMENT MODAL */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent className="rounded-3xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">Confirmar Pagamento</DialogTitle>
              <DialogDescription className="font-medium">
                Ajuste os detalhes finais antes de confirmar.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col gap-5 py-4">
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Método de Pagamento</Label>
                <Select value={newPaymentMethod} onValueChange={setNewPaymentMethod}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200">
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Taxa/Desconto Maquineta (R$)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={machineFee}
                  onChange={(e) => setMachineFee(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 font-bold text-red-500"
                />
                <p className="text-[9px] text-slate-400 font-medium px-1">
                  Este valor será subtraído do total bruto no relatório financeiro.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Valor Bruto</span>
                  <span className="font-bold text-slate-700">R$ {Number(order.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Desconto Maquineta</span>
                  <span className="font-bold text-red-500">- R$ {Number(machineFee || 0).toFixed(2)}</span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between items-center text-sm font-black">
                  <span className="text-slate-900">VALOR LÍQUIDO</span>
                  <span className="text-blue-600">R$ {(Number(order.total) - Number(machineFee || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>

              <DialogFooter className="flex flex-col gap-2">
                <Button 
                  onClick={confirmPayment} 
                  className={`w-full h-12 rounded-xl font-bold transition-all ${isConfirmingPayment ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
                >
                  {isConfirmingPayment ? "Clique novamente para confirmar" : "Confirmar Recebimento"}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setPaymentModalOpen(false);
                    setIsConfirmingPayment(false);
                  }} 
                  className="w-full h-12 rounded-xl"
                >
                  Cancelar
                </Button>
              </DialogFooter>

          </DialogContent>
        </Dialog>

        {/* CANCELLATION DIALOG */}
    
            <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
            <DialogContent className="rounded-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Cancelar OS
                </DialogTitle>
                <DialogDescription>
                  Esta ação é irreversível e removerá a OS do fluxo de trabalho.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Motivo</Label>
                <Textarea 
                  placeholder="Descreva o motivo..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="mt-2 rounded-2xl"
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setCancelModalOpen(false)}>Voltar</Button>
                <Button onClick={confirmCancel} className="bg-red-600 text-white">Confirmar Cancelamento</Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* DELETE PHOTO DIALOG */}
            <Dialog open={deletePhotoModalOpen} onOpenChange={setDeletePhotoModalOpen}>
              <DialogContent className="rounded-[2.5rem] max-w-sm">
                <DialogHeader className="items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                    <Trash2 className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle className="text-xl font-black text-slate-900">Excluir esta foto?</DialogTitle>
                    <DialogDescription className="font-medium">
                      Tem certeza que deseja remover esta foto da Ordem de Serviço?
                    </DialogDescription>
                  </div>
                </DialogHeader>
                <DialogFooter className="flex-col gap-2 pt-4">
                  <Button 
                    variant="destructive"
                    onClick={handleDeletePhoto}
                    className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    Sim, excluir foto
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setDeletePhotoModalOpen(false);
                      setPhotoToDelete(null);
                    }}
                    className="w-full h-12 rounded-2xl text-slate-500 font-bold"
                  >
                    Cancelar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* DELETE DIALOG */}
            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
              <DialogContent className="rounded-[2.5rem] max-w-sm">
                <DialogHeader className="items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                    <Trash2 className="w-8 h-8 text-red-600" />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle className="text-xl font-black text-slate-900">Excluir Permanentemente?</DialogTitle>
                    <DialogDescription className="font-medium">
                      Esta ação <strong>NÃO pode ser desfeita</strong>. A OS {order.os_number} será removida do banco de dados para sempre.
                    </DialogDescription>
                  </div>
                </DialogHeader>
                <DialogFooter className="flex-col gap-2 pt-4">
                  <Button 
                    variant="destructive"
                    onClick={handleDeleteOS}
                    className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold"
                  >
                    Sim, excluir agora
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setDeleteModalOpen(false)}
                    className="w-full h-12 rounded-2xl text-slate-500 font-bold"
                  >
                    Manter OS
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
  
{/* IMAGE LIGHTBOX */}
            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
              <DialogContent className="max-w-[95vw] lg:max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
                {selectedImage && (
                  <div className="relative w-full h-full flex flex-col items-center justify-center animate-in zoom-in duration-300">
                    <div className="absolute top-4 right-4 z-50">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10"
                        onClick={() => setSelectedImage(null)}
                      >
                        <X className="w-6 h-6" />
                      </Button>
                    </div>
                    <img 
                      src={selectedImage} 
                      alt="Visualização ampliada" 
                      className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                    />
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* DELIVERY CONFIRMATION MODAL */}
            <Dialog open={deliveryModalOpen} onOpenChange={setDeliveryModalOpen}>
              <DialogContent className="rounded-[2.5rem] max-w-sm">
                <DialogHeader className="items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                    <Truck className="w-8 h-8 text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <DialogTitle className="text-xl font-black text-slate-900">Pagamento Pendente</DialogTitle>
                    <DialogDescription className="font-medium">
                      Este pedido ainda não foi pago. Deseja enviar o link de pagamento ao cliente?
                    </DialogDescription>
                  </div>
                </DialogHeader>
                <DialogFooter className="flex-col gap-2 pt-4">
                  <Button 
                    onClick={() => handleDeliveryConfirm(true)}
                    className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    Sim, enviar link
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleDeliveryConfirm(false)}
                    className="w-full h-12 rounded-2xl border-slate-200 text-slate-600 font-bold"
                  >
                    Não, apenas marcar como entregue
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setDeliveryModalOpen(false)}
                    className="w-full h-10 rounded-2xl text-slate-400 font-bold"
                  >
                    Cancelar
                  </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* READY NOTIFICATION REMINDER MODAL */}
          <Dialog open={readyReminderModalOpen} onOpenChange={setReadyReminderModalOpen}>
            <DialogContent className="rounded-[2.5rem] max-w-sm">
              <DialogHeader className="items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                  <Bell className="w-8 h-8 text-blue-600" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-xl font-black text-slate-900">Aviso Importante</DialogTitle>
                  <DialogDescription className="font-medium">
                    Antes de marcar como entregue, certifique-se de que já enviou a notificação informando que o pedido está pronto.
                  </DialogDescription>
                </div>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 pt-4">
                <Button 
                  onClick={proceedAfterReadyReminder}
                  className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                >
                  Continuar para Entrega
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setReadyReminderModalOpen(false);
                    handleSendReadyNotification();
                  }}
                  className="w-full h-12 rounded-2xl border-blue-200 text-blue-700 font-bold flex gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Enviar Notificação Agora
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setReadyReminderModalOpen(false)}
                  className="w-full h-10 rounded-2xl text-slate-400 font-bold"
                >
                  Cancelar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
  
        </main>

        </div>
      );
    }
