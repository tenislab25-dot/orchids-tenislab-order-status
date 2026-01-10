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
          router.push("/interno/login");
          return;
        }

        // Atualiza no banco de dados
        const { error } = await supabase
          .from("service_orders")
          .update({ status: newStatus })
          .eq("id", order.id);

        if (error) throw error;

        // Atualiza o estado local
        setOrder(prev => prev ? { ...prev, status: newStatus } : null);
        toast.success(`Status atualizado para ${newStatus}`);

        // Envia notificação via API
        fetch("/api/notifications/status-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: newStatus,
            clientName: order.clients?.name || "Cliente",
            osNumber: order.os_number,
          }),
        }).catch(console.error);

        // Lógica de WhatsApp para status específicos
        if (newStatus === "Pronto para entrega ou retirada") {
          handleSendReadyNotification();
        } else if (newStatus === "Entregue") {
          const cleanPhone = order.clients?.phone.replace(/\D/g, "") || "";
          const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
          const paymentLink = `${window.location.origin}/pagamento/${order.id}`;
          
          const message = encodeURIComponent(
            `Olá ${order.clients?.name}! Seu pedido #${order.os_number} foi entregue! 📦\n\n` +
            `Valor total: R$ ${Number(order.total).toFixed(2)}\n\n` +
            `Para realizar o pagamento via Pix ou ver os detalhes, acesse o link abaixo:\n${paymentLink}\n\n` +
            `Gostou do resultado? Se puder nos avaliar no Google, ajuda muito nosso laboratório:\nhttps://g.page/r/CWIZ5KPcIIJVEBM/review\n\n` +
            `Obrigado pela preferência!`
          );
          window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
        }

      } catch (error: any) {
        console.error(error);
        toast.error("Erro ao atualizar status: " + error.message);
      } finally {
        setStatusUpdating(null);
      }
    };

    // O restante do arquivo continua igual...
