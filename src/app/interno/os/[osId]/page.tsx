"use client";

import { useState, useEffect, useCallback } from "react";
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
    Pencil,
    Star,
    MessageCircle,
    Camera,
    Loader2
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
import { compressImage } from "@/lib/image-utils";

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
  priority: boolean;
  accepted_at?: string;
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

    const handleWhatsAppDirect = () => {
      if (!order || !order.clients?.phone) return;
      const cleanPhone = order.clients.phone.replace(/\D/g, "");
      const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      window.open(`https://wa.me/${whatsappPhone}`, "_blank");
    };
    
        const handleShareLink = () => {
          if (!order) return;
          
          const cleanPhone = order.clients?.phone.replace(/\D/g, "") || "";
          const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
          
          const acceptanceLink = `${window.location.origin}/aceite/${order.id}`;
            const message = encodeURIComponent(
              `Olá ${order.clients?.name}! Sua Ordem de Serviço #${order.os_number} está pronta no sistema da Tenislab.\n\n` +
              `📍 *IMPORTANTE:* O prazo de entrega do seu tênis só começa a contar a partir do momento do seu *ACEITE DIGITAL* no link abaixo.\n\n` +
              `Para conferir os detalhes e autorizar o serviço, acesse:\n${acceptanceLink}\n\n` +
              `Qualquer dúvida, estamos à disposição!`
            );
          
          window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
        };
    
    const [newPaymentMethod, setNewPaymentMethod] = useState("");
    const [machineFee, setMachineFee] = useState("0");
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
    
    // 1. Primeiro definimos a função fetchOrder
  const fetchOrder = useCallback(async () => {
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
  }, [osNumber]);

  // 2. Depois usamos ela dentro do useEffect
  useEffect(() => {
    if (authLoading) return;
    if (!role) return;
    
    fetchOrder();

    const channel = supabase
      .channel(`os-${osIdRaw}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_orders",
          filter: `os_number=eq.${osNumber}`
        },
        (payload) => {
          setOrder(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              ...payload.new as OrderData
            };
          });
          
          if ((payload.new as any).accepted_at && !(payload.old as any).accepted_at) {
            toast.success("O cliente acabou de aceitar a OS!", { duration: 5000 });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [osNumber, osIdRaw, authLoading, role, fetchOrder]);

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
        `Olá ${order.clients?.name}! Seus tênis estão prontinhos e limpos na Tenislab.\n\n` +
        `Já estão aguardando sua retirada ou serão entregues pelo nosso motoboy em breve.\n\n` +
        `Gostou do resultado? Se puder nos avaliar no Google, ajuda muito nosso laboratório:\nhttps://g.page/r/CWIZ5KPcIIJVEBM/review\n\n` +
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
        `Olá ${order.clients?.name}! Seus tênis estão prontinhos e limpos na Tenislab.\n\n` +
        `Já estão aguardando sua retirada ou serão entregues pelo nosso motoboy em breve.\n\n` +
        `Gostou do resultado? Se puder nos avaliar no Google, ajuda muito nosso laboratório:\nhttps://g.page/r/CWIZ5KPcIIJVEBM/review\n\n` +
        `Qualquer dúvida, estamos à disposição!`
      );
      
      window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
    };

    const [statusUpdating, setStatusUpdating] = useState<Status | null>(null);

    const handleStatusUpdate = async (newStatus: Status) => {
      if (!order) return;
      
      // Verifica permissão básica no frontend
      if (!role || !canChangeToStatus(role as UserRole, newStatus, order.status)) {
        toast.error("Você não tem permissão para alterar este status.");
        return;
      }

      setStatusUpdating(newStatus);

      try {
        // VERIFICAÇÃO DE SEGURANÇA: Garante que o usuário está logado
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Sessão expirada. Por favor, faça login novamente.");
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
          const errorData = await response.json();
          throw new Error(errorData.error || "Erro ao atualizar status");
        }

        setOrder(prev => prev ? { ...prev, status: newStatus } : null);
        toast.success(`Status atualizado para ${newStatus}`);
        
        // Se mudar para Pronto, pergunta se quer notificar
        if (newStatus === "Pronto para entrega ou retirada") {
          handleSendReadyNotification();
        }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setStatusUpdating(null);
      }
    };

    const handleEntregueClick = () => {
      if (!order?.payment_confirmed && !order?.pay_on_entry) {
        setDeliveryModalOpen(true);
      } else {
        handleStatusUpdate("Entregue");
      }
    };

    const handleDeliveryConfirm = async (sendLink: boolean) => {
      setDeliveryModalOpen(false);
      await handleStatusUpdate("Entregue");
      
      if (sendLink) {
        handleSharePaymentLink();
      }
    };

    const handleSharePaymentLink = () => {
      if (!order) return;
      const cleanPhone = order.clients?.phone.replace(/\D/g, "") || "";
      const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      
      const paymentLink = `${window.location.origin}/pagamento/${order.id}`;
      const message = encodeURIComponent(
        `Olá ${order.clients?.name}! Seus tênis já foram entregues.\n\n` +
        `Para realizar o pagamento de R$ ${Number(order.total).toFixed(2)}, acesse nosso link seguro:\n${paymentLink}\n\n` +
        `Qualquer dúvida, estamos à disposição!`
      );
      
      window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
    };

    const [uploadingBeforePhoto, setUploadingBeforePhoto] = useState<number | null>(null);
    const [uploadingAfterPhoto, setUploadingAfterPhoto] = useState<number | null>(null);
    const [deletePhotoModalOpen, setDeletePhotoModalOpen] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState<{itemIdx: number, type: 'before' | 'after'} | null>(null);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemIdx: number, type: 'before' | 'after') => {
      const file = e.target.files?.[0];
      if (!file || !order) return;

      if (type === 'before') setUploadingBeforePhoto(itemIdx);
      else setUploadingAfterPhoto(itemIdx);

      try {
        const compressedFile = await compressImage(file);
        const fileExt = file.name.split('.').pop();
        const fileName = `${order.id}-${itemIdx}-${type}-${Date.now()}.${fileExt}`;
        const filePath = `orders/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(filePath, compressedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("photos")
          .getPublicUrl(filePath);

        const newItems = [...order.items];
        if (type === 'before') {
          newItems[itemIdx].before_photos = [...(newItems[itemIdx].before_photos || []), publicUrl];
        } else {
          newItems[itemIdx].after_photos = [...(newItems[itemIdx].after_photos || []), publicUrl];
        }

        const { error: updateError } = await supabase
          .from("service_orders")
          .update({ items: newItems })
          .eq("id", order.id);

        if (updateError) throw updateError;

        setOrder({ ...order, items: newItems });
        toast.success("Foto adicionada com sucesso!");
      } catch (error: any) {
        toast.error("Erro ao enviar foto: " + error.message);
      } finally {
        setUploadingBeforePhoto(null);
        setUploadingAfterPhoto(null);
      }
    };

    const handleDeletePhoto = async () => {
      if (!order || !photoToDelete) return;
      const { itemIdx, type } = photoToDelete;

      try {
        const newItems = [...order.items];
        const photos = type === 'before' ? newItems[itemIdx].before_photos : newItems[itemIdx].after_photos;
        
        // Pega a última foto para deletar (ou poderíamos passar o index da foto específica)
        const photoUrl = photos[photos.length - 1];
        const filePath = photoUrl.split('/public/photos/')[1];

        await supabase.storage.from("photos").remove([filePath]);

        if (type === 'before') {
          newItems[itemIdx].before_photos = photos.slice(0, -1);
        } else {
          newItems[itemIdx].after_photos = photos.slice(0, -1);
        }

        const { error } = await supabase
          .from("service_orders")
          .update({ items: newItems })
          .eq("id", order.id);

        if (error) throw error;

        setOrder({ ...order, items: newItems });
        toast.success("Foto excluída!");
      } catch (error: any) {
        toast.error("Erro ao excluir foto: " + error.message);
      } finally {
        setDeletePhotoModalOpen(false);
        setPhotoToDelete(null);
      }
    };

    const toggleItemStatus = async (itemIdx: number) => {
      if (!order) return;
      const newItems = [...order.items];
      const currentStatus = newItems[itemIdx].status;
      newItems[itemIdx].status = currentStatus === "Pronto" ? "Pendente" : "Pronto";

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

      const togglePriority = async () => {
        if (!order) return;
        
        if (role !== "ADMIN" && role !== "ATENDENTE") {
          toast.error("Apenas administradores e atendentes podem alterar a prioridade.");
          return;
        }

        const newPriority = !order.priority;
        const { error } = await supabase
          .from("service_orders")
          .update({ priority: newPriority })
          .eq("os_number", osNumber);

        if (error) {
          toast.error("Erro ao atualizar prioridade: " + error.message);
        } else {
          setOrder(prev => prev ? { ...prev, priority: newPriority } : null);
          toast.success(newPriority ? "Marcado como Prioridade!" : "Prioridade Removida");
        }
      };


    const handleDeleteOS = async () => {
    try {
      // 1. Primeiro removemos qualquer vínculo desta OS com rotas de entrega
      await supabase
        .from("route_deliveries")
        .delete()
        .eq("service_order_id", order?.id);

      // 2. Agora sim, excluímos a OS permanentemente
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
          
          const trackingLink = `${window.location.origin}/consulta?os=${order?.os_number}`;
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingLink)}`;

          return `
            <div class="label-container ${idx < itemsToPrint.length - 1 ? 'page-break' : ''}">
              <div class="os-header">
                <span class="os-number">#${order?.os_number}</span>
              </div>
              <div class="client-name">${order?.clients?.name}</div>
              <div class="qr-section">
                <img src="${qrCodeUrl}" alt="QR" />
              </div>
              <div class="services-box">
                <div class="services-label">SERVIÇO:</div>
                <div class="services-text">${servicesText}</div>
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
                  size: 50mm 90mm;
                  margin: 0;
                }
                body {
                  font-family: 'Inter', system-ui, sans-serif;
                  margin: 0;
                  padding: 0;
                  width: 50mm;
                  background: white;
                }
                .label-container {
                  width: 50mm;
                  height: 90mm;
                  padding: 4mm;
                  box-sizing: border-box;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: space-between;
                  text-align: center;
                }
                .page-break {
                  page-break-after: always;
                }
                .os-header {
                  width: 100%;
                  border-bottom: 2px solid black;
                  padding-bottom: 1mm;
                }
                .os-number { font-size: 16pt; font-weight: 900; }
                .client-name {
                  font-size: 10pt;
                  font-weight: 800;
                  text-transform: uppercase;
                  margin: 2mm 0;
                  line-height: 1.1;
                  width: 100%;
                  word-wrap: break-word;
                }
                .qr-section img {
                  width: 25mm;
                  height: 25mm;
                }
                .services-box {
                  width: 100%;
                  text-align: left;
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  margin-top: 2mm;
                  overflow: hidden;
                }
                .services-label { font-size: 7pt; font-weight: 900; border-bottom: 1px solid black; margin-bottom: 1mm; }
                .services-text { font-size: 8pt; font-weight: 700; line-height: 1.1; text-transform: uppercase; }
                .footer {
                  font-size: 8pt;
                  font-weight: 900;
                  letter-spacing: 3px;
                  margin-top: 2mm;
                  border-top: 1px solid black;
                  width: 100%;
                  padding-top: 1mm;
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

      const getDeadlineStatus = (dateStr?: string) => {
      if (!dateStr) return { color: "text-slate-700", label: "Normal" };
      const deadline = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (deadline < today) return { color: "text-red-600 animate-pulse font-black", label: "Vencido" };
      if (deadline.getTime() === today.getTime()) return { color: "text-red-500 font-black", label: "Vence hoje" };
      return { color: "text-slate-700", label: "No prazo" };
    };

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
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      onClick={togglePriority}
                      variant="outline"
                      size="sm"
                      className={`h-8 rounded-full text-[10px] font-black uppercase tracking-wider gap-1.5 transition-all ${
                        order.priority 
                        ? "bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-100" 
                        : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Star className={`w-3 h-3 ${order.priority ? "fill-white" : ""}`} />
                      {order.priority ? "Prioridade" : "Marcar Prioridade"}
                    </Button>
                  </div>

                {order.accepted_at && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-2xl animate-in zoom-in duration-500">
                    <div className="flex items-center gap-2 text-blue-700">
                      <CheckCircle2 className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                        OS aceita em: {order.accepted_at ? new Date(order.accepted_at).toLocaleString('pt-BR') : '---'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {getStatusBadge(order.status)}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entrada</span>
                <div className="flex items-center gap-2 text-slate-700">
                  <Calendar className="w-3 h-3" />
                  <span className="text-xs font-bold">{new Date(order.entry_date).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Previsão</span>
                <div className="flex items-center gap-2">
                  <Clock className={`w-3 h-3 ${getDeadlineStatus(order.delivery_date).color}`} />
                  <span className={`text-xs font-bold ${getDeadlineStatus(order.delivery_date).color}`}>
                    {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('pt-BR') : '---'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleWhatsAppDirect}
                className="flex-1 h-12 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
              <Button 
                onClick={handleShareLink}
                variant="outline"
                className="h-12 w-12 rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 p-0"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </section>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black text-slate-600 uppercase tracking-widest">Ações Rápidas</CardTitle>
              <Printer className="w-4 h-4 text-slate-400" />
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-2">
              <Button 
                onClick={() => handlePrintLabel(order.items)}
                variant="outline" 
                className="w-full h-11 rounded-xl border-slate-200 text-slate-700 font-bold text-xs justify-start px-4 hover:bg-slate-50"
              >
                <Printer className="w-4 h-4 mr-3 text-slate-400" />
                Imprimir Todas Etiquetas
              </Button>
              <Button 
                asChild
                variant="outline" 
                className="w-full h-11 rounded-xl border-slate-200 text-slate-700 font-bold text-xs justify-start px-4 hover:bg-slate-50"
              >
                <Link href={`/interno/os/editar/${order.os_number.replace("/", "-")}`}>
                  <Pencil className="w-4 h-4 mr-3 text-slate-400" />
                  Editar Ordem de Serviço
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 lg:row-start-1 flex flex-col gap-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pares de Tênis</h3>
                
              </div>
              
              {order.items.map((item: any, idx: number) => (
                <Card key={idx} className={`rounded-3xl border-slate-200 shadow-sm overflow-hidden transition-all ${item.status === 'Pronto' ? 'ring-2 ring-green-400/30' : ''}`}>
                  <CardHeader className={`py-3 px-6 border-b border-slate-100 flex flex-row items-center justify-between ${item.status === 'Pronto' ? 'bg-green-50/50' : 'bg-slate-50/50'}`}>
                    <div className="flex flex-col">
                      <CardTitle className="text-xs font-black text-slate-600 uppercase tracking-widest">
                        ITEM {idx + 1} - {item.itemNumber}
                      </CardTitle>
                      <span className="text-[10px] font-bold text-slate-400 mt-0.5">{item.brand} {item.model} ({item.color})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePrintLabel([item])}
                        className="h-8 w-8 p-0 rounded-full hover:bg-white"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                      <Button
                        size="sm"
                        variant={item.status === 'Pronto' ? 'default' : 'outline'}
                        onClick={() => toggleItemStatus(idx)}
                        className={`h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-wider transition-all ${
                          item.status === 'Pronto' 
                          ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
                          : 'bg-white text-slate-400 border-slate-200'
                        }`}
                      >
                        {item.status === 'Pronto' ? (
                          <><PackageCheck className="w-3 h-3 mr-1.5" /> PRONTO</>
                        ) : (
                          'MARCAR PRONTO'
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serviços Contratados</span>
                        <div className="flex flex-wrap gap-2">
                          {item.services.map((service: any, sIdx: number) => (
                            <Badge key={sIdx} variant="secondary" className="bg-slate-100 text-slate-600 border-none px-3 py-1 font-bold text-[10px]">
                              {service.name}
                            </Badge>
                          ))}
                          {item.customService?.name && (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none px-3 py-1 font-bold text-[10px]">
                              {item.customService.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {item.observations && (
                        <div className="space-y-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações</span>
                          <p className="text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 italic">
                            "{item.observations}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fotos do Antes</span>
                        <div className="flex flex-wrap gap-2">
                          {item.before_photos?.map((photo: string, pIdx: number) => (
                            <div key={pIdx} className="relative group">
                              <div 
                                className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-100 cursor-pointer hover:border-blue-400 transition-all"
                                onClick={() => setSelectedImage(photo)}
                              >
                                <Image src={photo} alt="Antes" fill className="object-cover" />
                              </div>
                              <button 
                                onClick={() => { setPhotoToDelete({itemIdx: idx, type: 'before'}); setDeletePhotoModalOpen(true); }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <label className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePhotoUpload(e, idx, 'before')}
                              disabled={uploadingBeforePhoto === idx}
                            />
                            {uploadingBeforePhoto === idx ? (
                              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            ) : (
                              <>
                                <Camera className="w-5 h-5 text-slate-300" />
                                <span className="text-[8px] font-bold text-slate-400 mt-1">ADD</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fotos do Depois</span>
                        <div className="flex flex-wrap gap-2">
                          {item.after_photos?.map((photo: string, pIdx: number) => (
                            <div key={pIdx} className="relative group">
                              <div 
                                className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-green-100 cursor-pointer hover:border-green-400 transition-all"
                                onClick={() => setSelectedImage(photo)}
                              >
                                <Image src={photo} alt="Depois" fill className="object-cover" />
                              </div>
                              <button 
                                onClick={() => { setPhotoToDelete({itemIdx: idx, type: 'after'}); setDeletePhotoModalOpen(true); }}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <label className="w-16 h-16 rounded-2xl border-2 border-dashed border-green-200 bg-green-50/30 flex flex-col items-center justify-center cursor-pointer hover:bg-green-50 transition-all">
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePhotoUpload(e, idx, 'after')}
                              disabled={uploadingAfterPhoto === idx}
                            />
                            {uploadingAfterPhoto === idx ? (
                              <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                            ) : (
                              <>
                                <Camera className="w-5 h-5 text-green-400" />
                                <span className="text-[8px] font-bold text-green-500 mt-1">ADD</span>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-50">
                      <span className="text-lg font-black text-slate-900">R$ {Number(item.subtotal).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}

          <Card className="rounded-3xl border-none shadow-md bg-slate-900 text-white overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Subtotal</span>
                <span className="text-sm font-bold text-white/70">R$ {order.items.reduce((acc: number, i: any) => acc + Number(i.subtotal || 0), 0).toFixed(2)}</span>
              </div>
              {order.discount_percent > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Desconto ({order.discount_percent}%)</span>
                  <span className="text-sm font-bold text-red-400">- R$ {((order.items.reduce((acc: number, i: any) => acc + Number(i.subtotal || 0), 0) * order.discount_percent) / 100).toFixed(2)}</span>
                </div>
              )}
              {order.delivery_fee > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Taxa Entrega</span>
                  <span className="text-sm font-bold text-green-400">+ R$ {Number(order.delivery_fee).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Total</span>
                <span className="text-3xl font-black text-blue-400">R$ {Number(order.total).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-black text-slate-600 uppercase tracking-widest">Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Método</span>
                  <span className="text-sm font-bold text-slate-700">{order.payment_method || "Não definido"}</span>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                  {order.payment_confirmed || order.pay_on_entry ? (
                    <Badge className="bg-green-100 text-green-700 font-bold">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {order.pay_on_entry ? "Pago na Entrada" : "Confirmado"}
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 font-bold">
                      <Clock className="w-3 h-3 mr-1" />
                      Pendente
                    </Badge>
                  )}
                </div>
              </div>

              {role === "ADMIN" && (
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  {!order.payment_confirmed && !order.pay_on_entry ? (
                    <Button 
                      onClick={() => setPaymentModalOpen(true)}
                      className="flex-1 h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmar Pagamento
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleRevertPayment}
                      variant="outline"
                      className="flex-1 h-10 rounded-xl border-amber-200 text-amber-600 font-bold text-xs hover:bg-amber-50"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Marcar como Pendente
                    </Button>
                  )}
                  <Button 
                    onClick={handleSharePaymentLink}
                    variant="outline"
                    className="h-10 rounded-xl border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-black text-slate-600 uppercase tracking-widest">Atualizar Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {getAllowedStatuses(role as UserRole).map((status) => (
                    <Button
                      key={status}
                      variant={order.status === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (status === "Entregue") {
                          handleEntregueClick();
                        } else {
                          handleStatusUpdate(status);
                        }
                      }}
                      disabled={order.status === status || (statusUpdating !== null)}
                      className={`h-auto py-2 px-3 text-[10px] font-bold uppercase tracking-wider rounded-xl whitespace-normal leading-tight ${
                        order.status === status 
                          ? "bg-blue-600 text-white border-blue-600" 
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {statusUpdating === status ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : null}
                      {status === "Pronto para entrega ou retirada" ? "Pronto p/ entrega" : status}
                    </Button>

                ))}
              </div>

              {order.status === "Pronto para entrega ou retirada" && (
                <Button 
                  onClick={handleSendReadyNotification}
                  className="w-full h-12 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Notificar Cliente (Pronto)
                </Button>
              )}
            </CardContent>
          </Card>

          {(role === "ADMIN" || role === "ATENDENTE") && (
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setCancelModalOpen(true)}
                disabled={order.status === "Cancelado" || order.status === "Entregue"}
                className="flex-1 h-12 rounded-2xl border-red-200 text-red-600 font-bold hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar OS
              </Button>
              {role === "ADMIN" && (
                <Button 
                  variant="outline"
                  onClick={() => setDeleteModalOpen(true)}
                  className="h-12 rounded-2xl border-red-200 text-red-600 font-bold hover:bg-red-50 px-4"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Cancelar OS</DialogTitle>
            <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo do cancelamento</Label>
              <Textarea
                placeholder="Descreva o motivo do cancelamento..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="min-h-[100px] rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)} className="rounded-xl">
              Voltar
            </Button>
            <Button onClick={confirmCancel} className="bg-red-600 hover:bg-red-700 rounded-xl">
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-red-600">Excluir OS Permanentemente</DialogTitle>
            <DialogDescription>
              Esta ação é IRREVERSÍVEL. A OS será excluída permanentemente do sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleDeleteOS} className="bg-red-600 hover:bg-red-700 rounded-xl">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Método de Pagamento</Label>
              <Select value={newPaymentMethod || order?.payment_method} onValueChange={setNewPaymentMethod}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
              <div className="space-y-2">
                <Label>Desconto do Cartão (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={machineFee}
                  onChange={(e) => setMachineFee(e.target.value)}
                  placeholder="0.00"
                  className="h-12 rounded-xl"
                />
              </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setPaymentModalOpen(false); setIsConfirmingPayment(false); }} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={confirmPayment} className="bg-green-600 hover:bg-green-700 rounded-xl">
              {isConfirmingPayment ? "Confirmar Definitivamente" : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deliveryModalOpen} onOpenChange={setDeliveryModalOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Marcar como Entregue</DialogTitle>
            <DialogDescription>
              O pagamento ainda não foi confirmado. Deseja enviar o link de pagamento?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => handleDeliveryConfirm(false)} 
              className="rounded-xl w-full sm:w-auto"
            >
              Apenas Marcar Entregue
            </Button>
            <Button 
              onClick={() => handleDeliveryConfirm(true)} 
              className="bg-green-600 hover:bg-green-700 rounded-xl w-full sm:w-auto"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Marcar e Enviar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-3xl p-0 rounded-3xl overflow-hidden bg-black/90">
            <DialogHeader className="sr-only">
              <DialogTitle>Visualização da Imagem</DialogTitle>
            </DialogHeader>
            <div className="relative aspect-square w-full">
            {selectedImage && (
              <Image src={selectedImage} alt="Foto ampliada" fill className="object-contain" />
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={deletePhotoModalOpen} onOpenChange={setDeletePhotoModalOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Excluir Foto {photoToDelete?.type === 'after' ? 'do Depois' : 'do Antes'}</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir esta foto?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" onClick={() => { setDeletePhotoModalOpen(false); setPhotoToDelete(null); }} className="rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleDeletePhoto} className="bg-red-600 hover:bg-red-700 rounded-xl">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
