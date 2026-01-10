"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  ArrowLeft, 
  Calendar,
  Package,
  PackageCheck,
  Phone,
  CheckCircle2, 
  Clock, 
  Bell, 
  Printer,
  Share2,
  X,
  Trash2,
  Pencil,
  Star,
  MessageCircle,
  Camera,
  Loader2,
  ChevronRight
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
  const [cancellationReason, setCancellationReason] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  const [machineFee, setMachineFee] = useState("0");
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<Status | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<{idx: number, type: 'before' | 'after'} | null>(null);
  const [deletePhotoModalOpen, setDeletePhotoModalOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<{itemIdx: number, type: 'before' | 'after'} | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
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

      if (error) throw error;
      setOrder(data as OrderData);
    } catch (error: any) {
      toast.error("Erro ao carregar OS: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [osNumber]);

  useEffect(() => {
    if (authLoading || !role) return;
    fetchOrder();

    const channel = supabase
      .channel(`os-${osIdRaw}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "service_orders",
        filter: `os_number=eq.${osNumber}`
      }, (payload) => {
        setOrder(prev => prev ? { ...prev, ...payload.new as OrderData } : null);
        if ((payload.new as any).accepted_at && !(payload.old as any).accepted_at) {
          toast.success("O cliente acabou de aceitar a OS!");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [osNumber, osIdRaw, authLoading, role, fetchOrder]);

  const handleWhatsAppDirect = () => {
    if (!order?.clients?.phone) return;
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

  const handleStatusUpdate = async (newStatus: Status) => {
    if (!order || !role) return;
    if (!canChangeToStatus(role as UserRole, newStatus, order.status)) {
      toast.error("Você não tem permissão para alterar este status.");
      return;
    }

    setStatusUpdating(newStatus);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada");

      const response = await fetch("/api/orders/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id, status: newStatus }),
      });

      if (!response.ok) throw new Error("Erro ao atualizar status");

      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Status atualizado para ${newStatus}`);
      if (newStatus === "Pronto para entrega ou retirada") handleSendReadyNotification();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setStatusUpdating(null);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemIdx: number, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    setUploadingPhoto({ idx: itemIdx, type });
    try {
      const compressedFile = await compressImage(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `${order.id}-${itemIdx}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `orders/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("photos").upload(filePath, compressedFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(filePath);

      const newItems = [...order.items];
      if (type === 'before') newItems[itemIdx].before_photos = [...(newItems[itemIdx].before_photos || []), publicUrl];
      else newItems[itemIdx].after_photos = [...(newItems[itemIdx].after_photos || []), publicUrl];

      const { error: updateError } = await supabase.from("service_orders").update({ items: newItems }).eq("id", order.id);
      if (updateError) throw updateError;

      setOrder({ ...order, items: newItems });
      toast.success("Foto adicionada!");
    } catch (error: any) {
      toast.error("Erro ao enviar foto: " + error.message);
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleDeletePhoto = async () => {
    if (!order || !photoToDelete) return;
    const { itemIdx, type } = photoToDelete;
    try {
      const newItems = [...order.items];
      const photos = type === 'before' ? newItems[itemIdx].before_photos : newItems[itemIdx].after_photos;
      const photoUrl = photos[photos.length - 1];
      const filePath = photoUrl.split('/public/photos/')[1];

      await supabase.storage.from("photos").remove([filePath]);
      if (type === 'before') newItems[itemIdx].before_photos = photos.slice(0, -1);
      else newItems[itemIdx].after_photos = photos.slice(0, -1);

      const { error } = await supabase.from("service_orders").update({ items: newItems }).eq("id", order.id);
      if (error) throw error;

      setOrder({ ...order, items: newItems });
      toast.success("Foto excluída!");
    } catch (error: any) {
      toast.error("Erro ao excluir foto");
    } finally {
      setDeletePhotoModalOpen(false);
      setPhotoToDelete(null);
    }
  };

  const toggleItemStatus = async (itemIdx: number) => {
    if (!order) return;
    const newItems = [...order.items];
    newItems[itemIdx].status = newItems[itemIdx].status === "Pronto" ? "Pendente" : "Pronto";
    const { error } = await supabase.from("service_orders").update({ items: newItems }).eq("os_number", osNumber);
    if (error) toast.error("Erro ao atualizar item");
    else {
      setOrder({ ...order, items: newItems });
      toast.success(`Item marcado como ${newItems[itemIdx].status}`);
    }
  };

  const togglePriority = async () => {
    if (!order || (role !== "ADMIN" && role !== "ATENDENTE")) return;
    const newPriority = !order.priority;
    const { error } = await supabase.from("service_orders").update({ priority: newPriority }).eq("os_number", osNumber);
    if (error) toast.error("Erro ao atualizar prioridade");
    else {
      setOrder(prev => prev ? { ...prev, priority: newPriority } : null);
      toast.success(newPriority ? "Prioridade Ativada!" : "Prioridade Removida");
    }
  };

  const confirmPayment = async () => {
    if (!isConfirmingPayment) { setIsConfirmingPayment(true); return; }
    const { error } = await supabase.from("service_orders").update({ 
      payment_confirmed: true,
      payment_method: newPaymentMethod || order?.payment_method,
      machine_fee: Number(machineFee) || 0
    }).eq("os_number", osNumber);

    if (error) toast.error("Erro ao confirmar pagamento");
    else {
      setOrder(prev => prev ? { ...prev, payment_confirmed: true, payment_method: newPaymentMethod || prev.payment_method, machine_fee: Number(machineFee) || 0 } : null);
      setPaymentModalOpen(false);
      setIsConfirmingPayment(false);
      toast.success("Pagamento Confirmado!");
    }
  };

  const handlePrintLabel = (itemsToPrint: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const labelsHtml = itemsToPrint.map((item, idx) => {
      const servicesText = item.services.map((s: any) => s.name).join(', ') + (item.customService?.name ? `, ${item.customService.name}` : '');
      const trackingLink = `${window.location.origin}/consulta?os=${order?.os_number}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingLink)}`;
      return `
        <div class="label-container ${idx < itemsToPrint.length - 1 ? 'page-break' : ''}">
          <div class="os-header"><span class="os-number">#${order?.os_number}</span></div>
          <div class="client-name">${order?.clients?.name}</div>
          <div class="qr-section"><img src="${qrCodeUrl}" alt="QR" /></div>
          <div class="services-box"><div class="services-label">SERVIÇO:</div><div class="services-text">${servicesText}</div></div>
          <div class="footer">TENISLAB</div>
        </div>`;
    }).join('');

    printWindow.document.write(`<html><head><style>@page { size: 50mm 90mm; margin: 0; } body { font-family: sans-serif; margin: 0; width: 50mm; } .label-container { width: 50mm; height: 90mm; padding: 4mm; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; } .page-break { page-break-after: always; } .os-header { width: 100%; border-bottom: 2px solid black; } .os-number { font-size: 16pt; font-weight: 900; } .client-name { font-size: 10pt; font-weight: 800; text-transform: uppercase; margin: 2mm 0; width: 100%; } .qr-section img { width: 25mm; height: 25mm; } .services-box { width: 100%; text-align: left; flex: 1; margin-top: 2mm; } .services-label { font-size: 7pt; font-weight: 900; border-bottom: 1px solid black; } .services-text { font-size: 8pt; font-weight: 700; text-transform: uppercase; } .footer { font-size: 8pt; font-weight: 900; letter-spacing: 3px; border-top: 1px solid black; width: 100%; }</style></head><body>${labelsHtml}<script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);};</script></body></html>`);
    printWindow.document.close();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  if (!order) return <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4"><h1 className="text-xl font-bold">OS não encontrada</h1><Button asChild><Link href="/interno/dashboard">Voltar ao Dashboard</Link></Button></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header Mobile-First */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="text-center">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{order.os_number}</p>
            <h1 className="text-sm font-bold text-slate-900">Detalhes da OS</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => handlePrintLabel(order.items)}><Printer className="w-5 h-5" /></Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Card Cliente e Status */}
        <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 leading-tight">{order.clients?.name || "Cliente s/ nome"}</h2>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Phone className="w-3 h-3" />
                  <span>{order.clients?.phone || "S/ telefone"}</span>
                </div>
              </div>
              <Badge className={`font-black uppercase text-[10px] px-3 py-1.5 rounded-full border-none ${
                order.status === 'Entregue' ? 'bg-slate-100 text-slate-600' :
                order.status === 'Cancelado' ? 'bg-red-100 text-red-600' :
                'bg-blue-600 text-white'
              }`}>
                {order.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada</p>
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(order.entry_date).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previsão</p>
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('pt-BR') : "---"}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleWhatsAppDirect} className="flex-1 h-12 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold gap-2">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
              <Button onClick={handleShareLink} variant="outline" className="h-12 w-12 rounded-2xl border-slate-200 text-slate-600"><Share2 className="w-4 h-4" /></Button>
              <Button onClick={togglePriority} variant="outline" className={`h-12 w-12 rounded-2xl border-slate-200 ${order.priority ? 'text-amber-500 bg-amber-50 border-amber-200' : 'text-slate-400'}`}>
                <Star className={`w-5 h-5 ${order.priority ? 'fill-amber-500' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Itens da OS */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Itens do Pedido</h3>
          {order.items.map((item, idx) => (
            <Card key={idx} className={`rounded-3xl border-none shadow-sm overflow-hidden ${item.status === 'Pronto' ? 'ring-2 ring-green-500/20' : ''}`}>
              <div className={`px-6 py-3 flex items-center justify-between ${item.status === 'Pronto' ? 'bg-green-50' : 'bg-slate-50'}`}>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item {idx + 1}</p>
                  <p className="text-xs font-bold text-slate-700">{item.brand} {item.model}</p>
                </div>
                <Button size="sm" variant={item.status === 'Pronto' ? 'default' : 'outline'} onClick={() => toggleItemStatus(idx)} className={`h-8 rounded-full px-4 text-[10px] font-black uppercase tracking-wider ${item.status === 'Pronto' ? 'bg-green-500 hover:bg-green-600' : ''}`}>
                  {item.status === 'Pronto' ? <><PackageCheck className="w-3 h-3 mr-1.5" /> Pronto</> : 'Marcar Pronto'}
                </Button>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-wrap gap-1.5">
                  {item.services?.map((s: any, i: number) => <Badge key={i} className="bg-slate-100 text-slate-600 border-none text-[10px] font-bold">{s.name}</Badge>)}
                  {item.customService?.name && <Badge className="bg-blue-50 text-blue-600 border-none text-[10px] font-bold">{item.customService.name}</Badge>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antes</p>
                    <div className="flex flex-wrap gap-2">
                      {item.before_photos?.map((p: string, i: number) => (
                        <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-100" onClick={() => setSelectedImage(p)}>
                          <Image src={p} alt="Antes" fill className="object-cover" />
                        </div>
                      ))}
                      <label className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, idx, 'before')} />
                        {uploadingPhoto?.idx === idx && uploadingPhoto?.type === 'before' ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Camera className="w-4 h-4 text-slate-300" />}
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Depois</p>
                    <div className="flex flex-wrap gap-2">
                      {item.after_photos?.map((p: string, i: number) => (
                        <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-green-100" onClick={() => setSelectedImage(p)}>
                          <Image src={p} alt="Depois" fill className="object-cover" />
                        </div>
                      ))}
                      <label className="w-14 h-14 rounded-xl border-2 border-dashed border-green-200 bg-green-50/30 flex items-center justify-center cursor-pointer hover:bg-green-50">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, idx, 'after')} />
                        {uploadingPhoto?.idx === idx && uploadingPhoto?.type === 'after' ? <Loader2 className="w-4 h-4 animate-spin text-green-500" /> : <Camera className="w-4 h-4 text-green-400" />}
                      </label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Resumo Financeiro */}
        <Card className="rounded-3xl border-none shadow-md bg-slate-900 text-white p-6 space-y-4">
          <div className="flex justify-between items-center text-white/40 text-[10px] font-black uppercase tracking-widest">
            <span>Subtotal</span>
            <span className="text-white/70 text-sm">R$ {order.items.reduce((acc, i) => acc + Number(i.subtotal || 0), 0).toFixed(2)}</span>
          </div>
          {order.discount_percent > 0 && (
            <div className="flex justify-between items-center text-red-400 text-[10px] font-black uppercase tracking-widest">
              <span>Desconto ({order.discount_percent}%)</span>
              <span className="text-sm">- R$ {((order.items.reduce((acc, i) => acc + Number(i.subtotal || 0), 0) * order.discount_percent) / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-4 border-t border-white/10">
            <span className="text-white/60 text-xs font-black uppercase tracking-widest">Total</span>
            <span className="text-3xl font-black text-blue-400">R$ {Number(order.total).toFixed(2)}</span>
          </div>
        </Card>

        {/* Pagamento e Status */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="rounded-3xl border-none shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pagamento</p>
                <p className="text-sm font-bold text-slate-700">{order.payment_method || "Não definido"}</p>
              </div>
              <Badge className={`font-black text-[10px] px-3 py-1 rounded-full border-none ${order.payment_confirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {order.payment_confirmed ? "Confirmado" : "Pendente"}
              </Badge>
            </div>
            {role === "ADMIN" && !order.payment_confirmed && (
              <Button onClick={() => setPaymentModalOpen(true)} className="w-full h-12 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold">Confirmar Pagamento</Button>
            )}
          </Card>

          <Card className="rounded-3xl border-none shadow-sm p-6 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atualizar Status</p>
            <div className="grid grid-cols-2 gap-2">
              {getAllowedStatuses(role as UserRole).map((s) => (
                <Button key={s} variant={order.status === s ? "default" : "outline"} size="sm" onClick={() => handleStatusUpdate(s)} disabled={order.status === s || !!statusUpdating} className={`h-10 text-[10px] font-black uppercase rounded-xl ${order.status === s ? 'bg-blue-600' : 'border-slate-200 text-slate-600'}`}>
                  {statusUpdating === s ? <Loader2 className="w-3 h-3 animate-spin" /> : s === "Pronto para entrega ou retirada" ? "Pronto p/ Entrega" : s}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Ações de Perigo */}
        {(role === "ADMIN" || role === "ATENDENTE") && (
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setCancelModalOpen(true)} className="flex-1 h-12 rounded-2xl border-red-100 text-red-600 font-bold">Cancelar OS</Button>
            {role === "ADMIN" && <Button variant="outline" onClick={() => setDeleteModalOpen(true)} className="h-12 w-12 rounded-2xl border-red-100 text-red-600"><Trash2 className="w-5 h-5" /></Button>}
          </div>
        )}
      </main>

      {/* Modais */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="rounded-3xl max-w-[90vw]">
          <DialogHeader><DialogTitle className="font-black">Confirmar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Método</Label>
              <Select value={newPaymentMethod || order.payment_method} onValueChange={setNewPaymentMethod}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Cartão">Cartão</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Taxa Maquininha (R$)</Label>
              <Input type="number" value={machineFee} onChange={(e) => setMachineFee(e.target.value)} className="h-12 rounded-xl" />
            </div>
          </div>
          <DialogFooter><Button onClick={confirmPayment} className="w-full h-12 rounded-2xl bg-green-600 font-bold">{isConfirmingPayment ? "Confirmar Agora" : "Confirmar Pagamento"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] p-0 rounded-3xl overflow-hidden bg-black">
          <div className="relative aspect-square w-full">
            {selectedImage && <Image src={selectedImage} alt="Foto" fill className="object-contain" />}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 text-white bg-black/20 rounded-full"><X className="w-6 h-6" /></Button>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="rounded-3xl max-w-[90vw]">
          <DialogHeader><DialogTitle className="font-black">Cancelar OS</DialogTitle></DialogHeader>
          <div className="py-4"><Textarea placeholder="Motivo do cancelamento..." value={cancellationReason} onChange={(e) => setCancellationReason(e.target.value)} className="min-h-[100px] rounded-2xl" /></div>
          <DialogFooter><Button onClick={() => handleStatusUpdate("Cancelado")} className="w-full h-12 rounded-2xl bg-red-600 font-bold">Confirmar Cancelamento</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
