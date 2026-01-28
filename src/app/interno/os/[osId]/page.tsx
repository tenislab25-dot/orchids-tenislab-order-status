"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
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
    Loader2,
    DollarSign
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
import { useParams, useRouter } from "next/navigation";
import { supabase, ensureValidSession } from "@/lib/supabase";
import { toast } from "sonner";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { useAuth } from "@/hooks/useAuth";
import { canChangeToStatus, getAllowedStatuses, type UserRole } from "@/lib/auth";
import { compressImage } from "@/lib/image-utils";

type Status = "Recebido" | "Em espera" | "Em serviço" | "Em finalização" | "Pronto" | "Entregue" | "Cancelado";

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
  discount_amount?: number;
  final_amount?: number;
  coupon_code?: string;
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
  const [confirmRevertPaymentOpen, setConfirmRevertPaymentOpen] = useState(false);
  const [confirmStatusChangeOpen, setConfirmStatusChangeOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);

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
    try {
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
        toast.error("Erro ao carregar OS: " + (error.message || "Tente novamente"));
      } else {
        setOrder(data as OrderData);
      }
    } catch (err: any) {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
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

      setIsConfirmingPayment(false);
      toast.success("Pagamento Confirmado!");
    }
  };

  const handleRevertPayment = async () => {
    setConfirmRevertPaymentOpen(false);
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
        `Já estão aguardando sua retirada ou serão entregues pelo nosso entregador em breve.\n\n` +
        `📸 Veja o antes e depois do seu tênis:\nhttps://www.tenislab.app.br/consulta?os=${encodeURIComponent(order.os_number)}&phone=${cleanPhone}\n\n` +
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
        `Já estão aguardando sua retirada ou serão entregues pelo nosso entregador em breve.\n\n` +
        `📸 Veja o antes e depois do seu tênis:\nhttps://www.tenislab.app.br/consulta?os=${encodeURIComponent(order.os_number)}&phone=${cleanPhone}\n\n` +
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
        // Preparar dados para atualização
        const updateData: any = { 
          status: newStatus,
          updated_at: new Date().toISOString()
        };
        
        // Se mudar para "Pronto", atualizar delivery_date para hoje
        if (newStatus === "Pronto") {
          const today = new Date();
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          updateData.delivery_date = todayStr;
        }
        
        const { error } = await supabase
          .from("service_orders")
          .update(updateData)
          .eq("id", order.id);

        if (error) throw error;

        toast.success(`Status atualizado para: ${newStatus}`);
        
        // Atualiza o estado local imediatamente
        setOrder(prev => prev ? { ...prev, status: newStatus } : null);
        
        // Notificação via API (opcional, não trava o processo)
        fetch("/api/notifications/status-change", { method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: newStatus,
            clientName: order.clients?.name || "Cliente",
            osNumber: order.os_number,
          }),
        }).catch(console.error);

        // WhatsApp automático para status específicos
        if (newStatus === "Pronto" && order.clients) {
          handleSendReadyNotification();
        }

      } catch (error: any) {
        logger.error("Erro na atualização:", error);
        toast.error("Falha ao atualizar status: " + error.message);
      } finally {
        setStatusUpdating(null);
      }
    };

    const handleEntregueClick = () => {
      if (!order) return;
      if (order.status === "Entregue") return;
      
      if (!order.payment_confirmed && !order.pay_on_entry) {
        setDeliveryModalOpen(true);
      } else {
        handleStatusUpdate("Entregue");
      }
    };

  const [deletePhotoModalOpen, setDeletePhotoModalOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<{itemIdx: number, photoIdx: number, type: 'before' | 'after'} | null>(null);
  const [uploadingAfterPhoto, setUploadingAfterPhoto] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const handleAddAfterPhoto = async (itemIdx: number, file: File) => {
    if (!order) return;
    
    setUploadingAfterPhoto(itemIdx);
    
    try {
      // Comprime a imagem para não ficar pesada no banco de dados
      setUploadProgress("Comprimindo imagem...");
      const compressedFile = await compressImage(file, 1080, 0.7);
      const fileExt = 'jpg';
      const fileName = `${order.id}_item${itemIdx}_after_${Date.now()}.${fileExt}`;
      const filePath = `service-orders/${fileName}`;
      
      setUploadProgress("Enviando foto...");
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, compressedFile);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);
      
      const newItems = [...order.items];
      const currentPhotosAfter = newItems[itemIdx].photosAfter || [];
      newItems[itemIdx].photosAfter = [...currentPhotosAfter, publicUrl];
      
      setUploadProgress("Salvando...");
      const { error: updateError } = await supabase
        .from("service_orders")
        .update({ items: newItems })
        .eq("id", order.id);
      
      if (updateError) throw updateError;
      
      setOrder({ ...order, items: newItems });
      toast.success("Foto DEPOIS adicionada com sucesso!");
    } catch (error: any) {
      logger.error("Erro no upload:", error);
      toast.error("Erro ao adicionar foto: " + (error.message || "Erro desconhecido"));
    } finally {
      setUploadingAfterPhoto(null);
      setUploadProgress("");
    }
  };

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
        `Olá ${order.clients?.name}! Seu pedido #${order.os_number} foi entregue! 📦\n\n` +
        `Valor total: R$ ${Number(order.total).toFixed(2)}\n\n` +
        `Para realizar o pagamento, acesse o link abaixo:\n${paymentLink}\n\n` +
        `Gostou do resultado? Se puder nos avaliar no Google, ajuda muito nosso laboratório:\nhttps://g.page/r/CWIZ5KPcIIJVEBM/review\n\n` +
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
        `Olá ${order.clients?.name}! Seu pedido #${order.os_number} foi entregue! 📦\n\n` +
        `Valor total: R$ ${Number(order.total).toFixed(2)}\n\n` +
        `Para realizar o pagamento, acesse o link abaixo:\n${paymentLink}\n\n` +
        `Gostou do resultado? Se puder nos avaliar no Google, ajuda muito nosso laboratório:\nhttps://g.page/r/CWIZ5KPcIIJVEBM/review\n\n` +
        `Obrigado pela preferência!`
      );
      
      window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
    };

  const handleDeletePhoto = async () => {
    if (!order || !photoToDelete) return;
    
    const { itemIdx, photoIdx, type } = photoToDelete;
    const newItems = [...order.items];
    
    if (type === 'before') {
      const photos = [...(newItems[itemIdx].photos || [])];
      photos.splice(photoIdx, 1);
      newItems[itemIdx].photos = photos;
    } else {
      const photos = [...(newItems[itemIdx].photosAfter || [])];
      photos.splice(photoIdx, 1);
      newItems[itemIdx].photosAfter = photos;
    }

    const { error } = await supabase
      .from("service_orders")
      .update({ items: newItems })
      .eq("id", order.id);

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
        "Pronto": "bg-green-100 text-green-700",
        Entregue: "bg-slate-100 text-slate-700",
        Cancelado: "bg-red-100 text-red-700",
      };
      return (
        <Badge className={`${styles[status]} border-none px-3 py-1 font-bold text-center leading-tight whitespace-normal h-auto min-h-7`}>
          {status === "Pronto" ? (
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
          <Link href="/interno/dashboard" prefetch={false}>Voltar ao Dashboard</Link>
        </Button>
      </div>
    );

    return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="grid grid-cols-3 items-center max-w-6xl mx-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full -ml-2 w-fit"
            onClick={() => window.location.href = '/interno/dashboard'}
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
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
                        OS aceita em: {formatDateTime(order.accepted_at)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(order.status)}
                {(order as any).tipo_entrega && (
                  <Badge className={`${
                    (order as any).tipo_entrega === 'entrega' 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'bg-purple-50 text-purple-600'
                  } border-none px-3 py-1 font-bold text-xs`}>
                    {(order as any).tipo_entrega === 'entrega' ? '🚚 Entrega' : '🏠 Retirada'}
                  </Badge>
                )}
              </div>
            </div>

            {(role === "ADMIN" || role === "ATENDENTE") && (
              <Button 
                onClick={handleWhatsAppDirect}
                className="w-full h-12 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold gap-2 shadow-lg shadow-green-100 transition-all active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp do Cliente
              </Button>
            )}

{(role === "ADMIN" || role === "ATENDENTE") && (
  <Button
    onClick={handleShareLink}
    className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-lg shadow-blue-100"
  >
    <Share2 className="w-4 h-4" />
    Gerar link para aceite
  </Button>
)}
                {(role === "ADMIN" || role === "ATENDENTE") && (
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <Link href={`/interno/os/${osIdRaw}/editar`} className="w-full">
                      <Button 
                        variant="outline"
                        className="w-full h-12 rounded-2xl border-slate-200 text-slate-700 font-bold gap-2 hover:bg-slate-50 transition-all active:scale-[0.98]"
                      >
                        <Pencil className="w-4 h-4" />
                        Editar OS
                      </Button>
                    </Link>
                    <Link href={`/interno/os/${osIdRaw}/imprimir`} className="w-full">
                      <Button 
                        variant="outline"
                        className="w-full h-12 rounded-2xl border-slate-200 text-slate-700 font-bold gap-2 hover:bg-slate-50 transition-all active:scale-[0.98]"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir OS
                      </Button>
                    </Link>
                  </div>
                )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-500" /> Entrada
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {formatDate(order.entry_date)}
                    </span>
                  </div>
                    {order.delivery_date && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Package className="w-3 h-3 text-blue-500" /> Prev. Entrega
                        </span>
                        <span className={`text-xs font-bold ${getDeadlineStatus(order.delivery_date).color}`}>
                          {formatDate(order.delivery_date)}
                        </span>
                      </div>
                    )}

                  </div>
          </section>
        </div>

        <div className="lg:col-span-8 lg:row-start-1 lg:row-span-10 flex flex-col gap-4">
          <div className="flex items-center justify-between mx-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pares de Tênis</h3>
                
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
                        variant={item.status === 'Pronto' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleItemStatus(idx)}
                        className={`h-7 text-[9px] font-bold uppercase tracking-wider gap-1 px-3 ${
                          item.status === 'Pronto' 
                          ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
                          : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {item.status === 'Pronto' ? 'Pronto' : 'Pendente'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {item.services?.map((s: any, i: number) => (
                        <Badge key={i} className="bg-blue-50 text-blue-700 border-blue-100 font-bold text-[10px] rounded-lg px-3 py-1">
                          {s.name} - R$ {Number(s.price).toFixed(2)}
                        </Badge>
                      ))}
                      {item.customService?.name && (
                        <Badge className="bg-purple-50 text-purple-700 border-purple-100 font-bold text-[10px] rounded-lg px-3 py-1">
                          {item.customService.name} - R$ {Number(item.customService.price).toFixed(2)}
                        </Badge>
                      )}
                    </div>

                    {item.notes && (
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl">
                        <p className="text-xs text-amber-800 font-medium">{item.notes}</p>
                      </div>
                    )}

                    {((item.photos && item.photos.length > 0) || (item.photosBefore && item.photosBefore.length > 0)) && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Fotos ANTES (Recebimento)
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {[...(item.photos || []), ...(item.photosBefore || [])].map((photo: string, pIdx: number) => (
                            <div 
                              key={pIdx} 
                              className="relative aspect-square rounded-2xl overflow-hidden border-2 border-blue-200 cursor-pointer group"
                              onClick={() => setSelectedImage(photo)}
                            >
                              <img src={photo} alt={`Foto ${pIdx + 1}`}className="w-full h-full object-cover" loading="lazy" />
                              <div className="absolute top-1 left-1">
                                <Badge className="bg-blue-500 text-white text-[8px] font-bold">ANTES</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

{(role === "ADMIN" || role === "ATENDENTE") && (
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Fotos DEPOIS (Finalizado)
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            {item.photosAfter?.map((photo: string, pIdx: number) => (
                              <div 
                                key={pIdx} 
                                className="relative aspect-square rounded-2xl overflow-hidden border-2 border-green-200 cursor-pointer group"
                                onClick={() => setSelectedImage(photo)}
                              >
                                <img src={photo} alt={`Foto depois ${pIdx + 1}`}className="w-full h-full object-cover" loading="lazy" />
                                <div className="absolute top-1 left-1">
                                  <Badge className="bg-green-500 text-white text-[8px] font-bold">DEPOIS</Badge>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPhotoToDelete({ itemIdx: idx, photoIdx: pIdx, type: 'after' });
                                    setDeletePhotoModalOpen(true);
                                  }}
                                  className="absolute top-1 right-1 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg active:scale-90"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                            {(!item.photosAfter || item.photosAfter.length === 0) && (
                              <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 bg-slate-50 flex items-center justify-center opacity-40 grayscale">
                                <img src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=200&height=200&resize=contain" 
                                  alt="Sem foto" 
                                  width={60} 
                                  height={60} 
                                  className="w-full h-full object-contain opacity-20" loading="lazy" />
                                <span className="absolute bottom-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest">Sem Foto Depois</span>
                              </div>
                            )}
                            <label className="relative aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-green-300 cursor-pointer flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 transition-colors">
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden"
                                disabled={uploadingAfterPhoto === idx}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleAddAfterPhoto(idx, file);
                                  e.target.value = '';
                                }}
                              />
                              {uploadingAfterPhoto === idx ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                                  {uploadProgress && (
                                    <span className="text-[8px] font-bold text-green-600">{uploadProgress}</span>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <Camera className="w-6 h-6 text-green-500" />
                                  <span className="text-[8px] font-bold text-green-600 mt-1">ADICIONAR</span>
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      )}

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
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Desconto Manual ({order.discount_percent}%)</span>
                  <span className="text-sm font-bold text-red-400">- R$ {((order.items.reduce((acc: number, i: any) => acc + Number(i.subtotal || 0), 0) * order.discount_percent) / 100).toFixed(2)}</span>
                </div>
              )}
              {Number(order.discount_amount) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Cupom {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
                  <span className="text-sm font-bold text-purple-400">- R$ {Number(order.discount_amount).toFixed(2)}</span>
                </div>
              )}
              {Number(order.delivery_fee) > 0 && (
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
              <div className="flex items-center justify-center">
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status do Pagamento</span>
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

              {(role === "ADMIN" || role === "ATENDENTE") && (
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <Button 
                    onClick={handleSharePaymentLink}
                    disabled={order.pay_on_entry || order.payment_confirmed}
                    className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    {order.pay_on_entry ? "Pago na Entrada" : order.payment_confirmed ? "Já Pago" : "Enviar Link de Pagamento"}
                  </Button>
                  {order.payment_confirmed || order.pay_on_entry ? (
                    <Button 
                      onClick={() => setConfirmRevertPaymentOpen(true)}
                      variant="outline"
                      className="h-10 rounded-xl border-amber-200 text-amber-600 font-bold text-xs hover:bg-amber-50"
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                  ) : null}
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
                {(role === "ADMIN" || role === "ATENDENTE" 
                  ? ["Recebido", "Em espera", "Em serviço", "Em finalização", "Pronto", "Entregue", "Cancelado"] as Status[]
                  : getAllowedStatuses(role as UserRole)
                ).map((status) => (
                    <Button
                      key={status}
                      variant={order.status === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (status === "Entregue") {
                          handleEntregueClick();
                        } else {
                          setPendingStatus(status);
                          setConfirmStatusChangeOpen(true);
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
                      {status === "Pronto" ? "Pronto" : status}
                    </Button>
                ))}
              </div>

             {order.status === "Pronto" && role !== "OPERACIONAL" && (
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


      <Dialog open={deliveryModalOpen} onOpenChange={setDeliveryModalOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black">Marcar como Entregue</DialogTitle>
            <DialogDescription>
              O pagamento ainda não foi confirmado. Deseja enviar o link de pagamento?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-4 flex-col sm:flex-row">
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
              <img src={selectedImage} alt="Foto ampliada"className="w-full h-full object-contain" loading="lazy" />
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

      {/* Modal de Confirmação - Reverter Pagamento */}
      <Dialog open={confirmRevertPaymentOpen} onOpenChange={setConfirmRevertPaymentOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Reverter Pagamento?</DialogTitle>
            <DialogDescription className="text-slate-600">
              Esta ação marcará o pagamento como <strong>pendente</strong>. O cliente precisará pagar novamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmRevertPaymentOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRevertPayment}
              className="rounded-xl bg-amber-600 hover:bg-amber-700"
            >
              <Clock className="w-4 h-4 mr-2" />
              Sim, Reverter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação - Mudança de Status */}
      <Dialog open={confirmStatusChangeOpen} onOpenChange={setConfirmStatusChangeOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Confirmar Mudança de Status?</DialogTitle>
            <DialogDescription className="text-slate-600">
              Você está prestes a mudar o status de <strong>{order?.status}</strong> para <strong>{pendingStatus}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmStatusChangeOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setConfirmStatusChangeOpen(false);
                if (pendingStatus) handleStatusUpdate(pendingStatus);
              }}
              className="rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Sim, Alterar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
