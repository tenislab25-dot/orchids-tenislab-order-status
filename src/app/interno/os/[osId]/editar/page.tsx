"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Trash2, 
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Save,
  Loader2,
  Plus,
  Eye,
  Camera
} from "lucide-react";
import { compressImage } from "@/lib/image-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface SelectedService {
  id: string;
  name: string;
  price: number;
}

interface OSItem {
  id: string;
  itemNumber: string;
  services: SelectedService[];
  customService?: {
    name: string;
    price: number;
  };
  notes: string;
  subtotal: number;
  photos?: string[];
  photosBefore?: string[];
  photosAfter?: string[];
  status?: string;
}

export default function EditOSPage() {
  const params = useParams();
  const router = useRouter();
  const osIdRaw = params.osId as string;
  const osNumber = osIdRaw.replace("-", "/");

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  
  const [order, setOrder] = useState<any>(null);
  const [entryDate, setEntryDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [payOnEntry, setPayOnEntry] = useState(false);
  const [items, setItems] = useState<OSItem[]>([]);
  const [photoToDelete, setPhotoToDelete] = useState<{ itemId: string; type: 'photos' | 'photosBefore' | 'photosAfter'; index: number } | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [tipoEntrega, setTipoEntrega] = useState<'entrega' | 'retirada'>('entrega');


  const handleAddPhoto = async (itemId: string, file: File) => {
    try {
      const compressedFile = await compressImage(file, 1080, 0.7);
      const fileExt = 'jpg';
      const fileName = `${order.id}_item${itemId}_before_${Date.now()}.${fileExt}`;
      const filePath = `service-orders/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, compressedFile);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);
      
      setItems(prevItems => prevItems.map(it => {
        if (it.id === itemId) {
          const currentPhotos = it.photosBefore || [];
          return { ...it, photosBefore: [...currentPhotos, publicUrl] };
        }
        return it;
      }));
    } catch (error: any) {
      toast.error("Erro ao adicionar foto: " + error.message);
    }
  };

    // 1. Primeiro, definimos as funções de busca para que possam ser usadas depois
  const fetchServices = useCallback(async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("status", "Active");
    if (data) setServices(data);
  }, []);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_orders")
      .select(`*, clients (name, phone)`)
      .eq("os_number", osNumber)
      .single();

    if (error) {
      toast.error("Erro ao carregar OS");
      router.push("/interno/dashboard");
    } else {
      setOrder(data);
      setEntryDate(data.entry_date || "");
      setDeliveryDate(data.delivery_date || "");
      setDeliveryFee(data.delivery_fee || 0);
      setDiscountPercent(data.discount_percent || 0);
      setPaymentMethod(data.payment_method || "Pix");
      setPayOnEntry(data.pay_on_entry || false);
      setItems(data.items || []);
      setTipoEntrega(data.tipo_entrega || 'entrega');
    }
    setLoading(false);
  }, [osNumber, router]);

  // 2. Agora, usamos as funções no useEffect, que verifica a segurança
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/interno/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile || (profile.role !== "ADMIN" && profile.role !== "ATENDENTE")) {
        toast.error("Você não tem permissão para acessar esta página.");
        router.push("/interno/dashboard");
        return;
      }
      
      setRole(profile.role);
      fetchOrder();
      fetchServices();
    };

    checkAuthAndFetch();
  }, [fetchOrder, fetchServices, router]);

  const serviceCatalog = useMemo(() => {
    return services.reduce((acc, service) => {
      if (!acc[service.category]) acc[service.category] = [];
      acc[service.category].push({
        id: service.id,
        name: service.name,
        price: service.default_price
      });
      return acc;
    }, {} as Record<string, { id: string, name: string, price: number }[]>);
  }, [services]);

  const addItem = () => {
    const nextItemIndex = items.length + 1;
    const newItem: OSItem = {
      id: Math.random().toString(36).substr(2, 9),
      itemNumber: `${osNumber}.${nextItemIndex}`,
      services: [],
      notes: "",
      subtotal: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemService = (itemId: string, serviceId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        let foundService: SelectedService | undefined;
        Object.values(serviceCatalog).forEach(category => {
          const service = category.find(s => s.id === serviceId);
          if (service) foundService = service;
        });

        if (foundService) {
          const updatedServices = [...item.services, foundService];
          const subtotal = calculateItemSubtotal(updatedServices, item.customService);
          return { ...item, services: updatedServices, subtotal };
        }
      }
      return item;
    }));
  };

  const removeServiceFromItem = (itemId: string, serviceId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updatedServices = item.services.filter(s => s.id !== serviceId);
        const subtotal = calculateItemSubtotal(updatedServices, item.customService);
        return { ...item, services: updatedServices, subtotal };
      }
      return item;
    }));
  };

  const updateCustomService = (itemId: string, name: string, price: number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const customService = { name, price };
        const subtotal = calculateItemSubtotal(item.services, customService);
        return { ...item, customService, subtotal };
      }
      return item;
    }));
  };

  const calculateItemSubtotal = (services: SelectedService[], custom?: { price: number }) => {
    const servicesTotal = services.reduce((acc, curr) => acc + Number(curr.price), 0);
    const customTotal = custom ? Number(custom.price) : 0;
    return servicesTotal + customTotal;
  };

  const globalSubtotal = items.reduce((acc, curr) => acc + Number(curr.subtotal), 0);
  const discountValue = (globalSubtotal * Number(discountPercent)) / 100;
  const finalTotal = globalSubtotal - discountValue + Number(deliveryFee);

  const confirmDeletePhoto = async () => {
    if (!photoToDelete || !order) return;

    const { itemId, type, index } = photoToDelete;
    const item = items.find(it => it.id === itemId);
    if (!item) return;

    // 1. Identifica a URL correta baseada no tipo (antes ou depois)
    let photoUrlToDelete: string | undefined;
    if (type === 'photosBefore') {
      photoUrlToDelete = item.photosBefore?.[index];
    } else if (type === 'photosAfter') {
      photoUrlToDelete = item.photosAfter?.[index];
    } else if (type === 'photos') {
      photoUrlToDelete = item.photos?.[index];
    }

    if (photoUrlToDelete) {
      try {
        // 2. Tenta excluir do servidor (Supabase Storage)
        // Extraímos o caminho após o nome do bucket 'photos'
        const pathParts = photoUrlToDelete.split('/storage/v1/object/public/photos/');
        const filePath = pathParts.length > 1 ? pathParts[1] : null;

        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from('photos')
            .remove([filePath]);
          
          if (storageError) console.warn("Aviso: Foto não encontrada no servidor, mas será removida da tela.");
        }

        // 3. Remove da tela (estado local) independente do resultado do servidor
        setItems(items.map(it => {
          if (it.id === itemId) {
            if (type === 'photosBefore') {
              return { ...it, photosBefore: it.photosBefore?.filter((_, i) => i !== index) };
            } else if (type === 'photosAfter') {
              return { ...it, photosAfter: it.photosAfter?.filter((_, i) => i !== index) };
            } else if (type === 'photos') {
              return { ...it, photos: it.photos?.filter((_, i) => i !== index) };
            }
          }
          return it;
        }));

        toast.success("Foto removida com sucesso!");
      } catch (error: any) {
        console.error("Erro ao processar exclusão:", error);
        toast.error("Erro ao remover foto.");
      }
    }

    setPhotoToDelete(null);
  };


  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    const itemsWithoutService = items.filter(item => item.services.length === 0 && !item.customService?.name);
    if (itemsWithoutService.length > 0) {
      toast.error("Todos os itens devem ter pelo menos um serviço selecionado");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("service_orders")
        .update({
          entry_date: entryDate,
          delivery_date: deliveryDate || null,
          delivery_fee: deliveryFee,
          discount_percent: discountPercent,
          payment_method: paymentMethod,
          pay_on_entry: payOnEntry,
          total: finalTotal,
          items: items,
          tipo_entrega: tipoEntrega
        })
        .eq("os_number", osNumber);

      if (error) throw error;
      toast.success("OS atualizada com sucesso!");
      router.push(`/interno/os/${osIdRaw}`);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + (error.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  if (!order) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-32">
      <header className="bg-slate-900 text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="grid grid-cols-3 items-center max-w-md mx-auto">
          <Link href={`/interno/os/${osIdRaw}`} className="p-2 -ml-2 rounded-full active:bg-white/10 w-fit">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-black tracking-tighter">Editar</h1>
            <span className="text-xs text-white/60">{osNumber}</span>
          </div>
          <div />
        </div>
      </header>

      <main className="flex flex-col gap-6 p-4 max-w-md mx-auto w-full animate-in fade-in duration-500">
        
        <section>
          <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-white border-b border-slate-100 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold text-slate-900">{order.clients?.name}</span>
                <span className="text-sm text-slate-500">{order.clients?.phone}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Pares / Itens</h2>
          </div>

          {items.map((item, idx) => (
            <Card key={item.id} className="border-none shadow-sm relative overflow-hidden animate-in slide-in-from-right-4 rounded-3xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-mono text-[10px] rounded-lg">
                  ITEM {idx + 1}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeItem(item.id)}
                  className="h-8 w-8 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardHeader>
<CardContent className="p-4 space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Fotos ANTES (Na Entrada)
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            {item.photos?.map((photo: string, pIdx: number) => (
                              <div key={`photo-${pIdx}`} className="relative aspect-video rounded-2xl overflow-hidden border-2 border-amber-200 group">
                                <img src={photo} alt="Foto antes" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute top-2 left-2">
                                  <Badge className="bg-amber-500 text-white text-[8px] font-bold">ANTES</Badge>
                                </div>
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                  <button 
                                    type="button"
                                    onClick={() => setSelectedPhoto(photo)}
                                    className="bg-blue-500 text-white p-2.5 rounded-full shadow-lg"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => setPhotoToDelete({ itemId: item.id, type: 'photos', index: pIdx })}
                                    className="bg-red-500 text-white p-2.5 rounded-full shadow-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {item.photosBefore?.map((photo: string, pIdx: number) => (
                              <div key={`before-${pIdx}`} className="relative aspect-video rounded-2xl overflow-hidden border-2 border-amber-200 group">
                                <img src={photo} alt="Foto antes" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute top-2 left-2">
                                  <Badge className="bg-amber-500 text-white text-[8px] font-bold">ANTES</Badge>
                                </div>
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                  <button 
                                    type="button"
                                    onClick={() => setSelectedPhoto(photo)}
                                    className="bg-blue-500 text-white p-2.5 rounded-full shadow-lg"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={() => setPhotoToDelete({ itemId: item.id, type: 'photosBefore', index: pIdx })}
                                    className="bg-red-500 text-white p-2.5 rounded-full shadow-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
<label className="relative aspect-video rounded-2xl overflow-hidden border-2 border-dashed border-amber-300 cursor-pointer flex flex-col items-center justify-center bg-amber-50/50 hover:bg-amber-50 transition-colors">
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  multiple
                                  className="hidden"
                                  disabled={uploadingPhoto === item.id}
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length > 0) {
                                      setUploadingPhoto(item.id);
                                      for (const file of files) {
                                        await handleAddPhoto(item.id, file);
                                      }
                                      setUploadingPhoto(null);
                                      toast.success(`${files.length} foto${files.length > 1 ? 's' : ''} adicionada${files.length > 1 ? 's' : ''}!`);
                                    }
                                    e.target.value = '';
                                  }}
                                />
                                {uploadingPhoto === item.id ? (
                                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                                ) : (
                                  <>
                                    <Camera className="w-6 h-6 text-amber-500" />
                                    <span className="text-[9px] font-black text-amber-600 mt-1 uppercase tracking-widest">Adicionar Foto</span>
                                  </>
                                )}
                              </label>
                            </div>
                          </div>

                          {item.photosAfter && item.photosAfter.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-green-500 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              Fotos DEPOIS (Finalizado)
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              {item.photosAfter.map((photo: string, pIdx: number) => (
                                <div key={`after-${pIdx}`} className="relative aspect-video rounded-2xl overflow-hidden border-2 border-green-200 group">
                                  <img src={photo} alt="Foto depois" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                                  <div className="absolute top-2 left-2">
                                    <Badge className="bg-green-500 text-white text-[8px] font-bold">DEPOIS</Badge>
                                  </div>
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                    <button 
                                      type="button"
                                      onClick={() => setSelectedPhoto(photo)}
                                      className="bg-blue-500 text-white p-2.5 rounded-full shadow-lg"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setPhotoToDelete({ itemId: item.id, type: 'photosAfter', index: pIdx })}
                                      className="bg-red-500 text-white p-2.5 rounded-full shadow-lg"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          )}

                  <div className="space-y-2">
                  <Label>Serviços</Label>
                  <Select onValueChange={(val) => updateItemService(item.id, val)}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl">
                      <SelectValue placeholder="Selecionar serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(serviceCatalog).map(([category, services]) => (
                        <SelectGroup key={category}>
                          <SelectLabel>{category}</SelectLabel>
                          {services.map((service: any) => (
                            <SelectItem key={service.id} value={service.id}>
                              <div className="flex justify-between w-full gap-4">
                                <span>{service.name}</span>
                                <span className="text-slate-500 font-bold">R$ {service.price}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {item.services.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.services.map((s, i) => (
                      <Badge key={`${s.id}-${i}`} className="bg-blue-50 text-blue-700 border-blue-100 py-1 pl-3 pr-1 gap-1 flex items-center rounded-lg">
                        <span className="text-[10px] font-bold">{s.name} - R$ {s.price}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 rounded-full p-0 hover:bg-blue-100"
                          onClick={() => removeServiceFromItem(item.id, s.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Serviço Personalizado (Opcional)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input 
                        placeholder="Nome do serviço" 
                        value={item.customService?.name || ""}
                        onChange={(e) => updateCustomService(item.id, e.target.value, item.customService?.price || 0)}
                        className="h-10 text-sm bg-white rounded-xl"
                      />
                    </div>
                    <div>
                      <Input 
                        type="number" 
                        placeholder="R$" 
                        value={item.customService?.price || ""}
                        onChange={(e) => updateCustomService(item.id, item.customService?.name || "", Number(e.target.value))}
                        className="h-10 text-sm bg-white rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea 
                    placeholder="Detalhes sobre manchas, rasgos, etc..." 
                    className="bg-slate-50 border-slate-200 resize-none rounded-2xl"
                    value={item.notes}
                    onChange={(e) => {
                      setItems(items.map(it => it.id === item.id ? { ...it, notes: e.target.value } : it));
                    }}
                  />
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 py-3 px-4 flex justify-between items-center border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Subtotal Item</span>
                <span className="text-lg font-black text-slate-900">R$ {Number(item.subtotal).toFixed(2)}</span>
              </CardFooter>
            </Card>
          ))}

          <Button 
            variant="outline" 
            onClick={addItem}
            className="w-full h-16 rounded-[2rem] border-2 border-dashed border-blue-200 text-blue-600 font-bold bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Adicionar outro par
          </Button>
        </section>

        <section>
          <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-white border-b border-slate-100 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Prazos e Entrega</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entrada</Label>
                  <Input 
                    type="date" 
                    value={entryDate} 
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="h-11 bg-white border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Prev. Entrega</Label>
                  <Input 
                    type="date" 
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="h-11 bg-white border-blue-200 focus:border-blue-500 ring-blue-500 rounded-xl text-xs"
                  />
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {[
                      { label: "1 dia", days: 1 },
                      { label: "3 dias", days: 3 },
                      { label: "5 dias", days: 5 },
                      { label: "7 dias", days: 7 }
                    ].map((shortcut) => (
                      <Button
                        key={shortcut.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-10 px-0 text-[10px] font-bold bg-white border-slate-200 text-slate-600 active:bg-blue-50 active:text-blue-600 active:border-blue-200"
                        onClick={() => {
                          const addBusinessDays = (date: Date, days: number) => {
                            let count = 0;
                            const newDate = new Date(date);
                            while (count < days) {
                              newDate.setDate(newDate.getDate() + 1);
                              if (newDate.getDay() !== 0 && newDate.getDay() !== 6) {
                                count++;
                              }
                            }
                            return newDate;
                          };
                          const date = addBusinessDays(new Date(), shortcut.days);
                          setDeliveryDate(date.toISOString().split('T')[0]);
                        }}
                      >
                        {shortcut.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-50">
                <Label className="text-xs">Taxa de Entrega (R$)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  value={deliveryFee || ""}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-none shadow-md bg-slate-900 text-white overflow-hidden rounded-[2.5rem]">
            <CardHeader className="py-4 border-b border-white/10">
              <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70 font-medium">Subtotal dos itens</span>
                  <span className="font-bold">R$ {Number(globalSubtotal).toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-3 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Aplicar Desconto</span>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {[5, 8, 10, 15, 20].map((p) => (
                      <Button 
                        key={p}
                        variant={discountPercent === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDiscountPercent(p)}
                        className={`min-w-[50px] flex-1 rounded-xl border-white/20 h-10 ${
                          discountPercent === p 
                          ? "bg-blue-500 hover:bg-blue-600 border-blue-500 text-white" 
                          : "bg-transparent text-white hover:bg-white/10"
                        }`}
                      >
                        {p}%
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-1 bg-white/5 p-3 rounded-2xl border border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 whitespace-nowrap">Personalizado</span>
                    <div className="relative flex-1">
                      <Input 
                        type="number"
                        placeholder="%"
                        value={discountPercent || ""}
                        onChange={(e) => setDiscountPercent(Number(e.target.value))}
                        className="h-10 bg-white/10 border-white/10 text-white placeholder:text-white/20 rounded-xl pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs font-bold">%</span>
                    </div>
                  </div>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between items-center text-sm text-red-400 font-bold pt-2">
                    <span>Desconto ({discountPercent}%)</span>
                    <span>- R$ {Number(discountValue).toFixed(2)}</span>
                  </div>
                )}
                {deliveryFee > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-400 font-bold pt-2">
                    <span>Taxa de Entrega</span>
                    <span>+ R$ {Number(deliveryFee).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <Separator className="bg-white/10" />
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 mb-1">Total Final</span>
                <span className="text-4xl font-black tracking-tighter text-blue-400">
                  R$ {Number(finalTotal).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-white border-b border-slate-100 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "Pix", icon: QrCode },
                  { id: "Cartão", icon: CreditCard },
                  { id: "Dinheiro", icon: Banknote }
                ].map((method) => (
                  <Button
                    key={method.id}
                    variant={paymentMethod === method.id ? "default" : "outline"}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`h-20 flex-col gap-2 rounded-2xl transition-all ${
                      paymentMethod === method.id 
                      ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                      : "bg-white text-slate-500 border-slate-200"
                    }`}
                  >
                    <method.icon className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase">{method.id}</span>
                  </Button>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${payOnEntry ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-400"}`}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Pagar na entrada</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Pagamento antecipado</p>
                  </div>
                </div>
                <Switch 
                  checked={payOnEntry}
                  onCheckedChange={setPayOnEntry}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-white border-b border-slate-100 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Tipo de Serviço</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTipoEntrega('entrega')}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                    tipoEntrega === 'entrega'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🚚 Entrega
                </button>
                <button
                  type="button"
                  onClick={() => setTipoEntrega('retirada')}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                    tipoEntrega === 'retirada'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🏠 Retirada
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">
                {tipoEntrega === 'entrega' 
                  ? '🚚 Esta OS aparecerá na página de entregas'
                  : '🏠 Cliente vai retirar na loja'
                }
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-3 mt-4">
          <Button 
            className="w-full h-16 rounded-[2rem] bg-green-600 hover:bg-green-700 text-white text-lg font-black shadow-xl shadow-green-100 transition-all active:scale-[0.98] gap-3"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Save className="w-6 h-6" />
                Salvar Alterações
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full h-14 rounded-2xl text-slate-500 font-bold"
            asChild
          >
            <Link href={`/interno/os/${osIdRaw}`}>Cancelar</Link>
          </Button>
</section>
        </main>

        <AlertDialog open={!!photoToDelete} onOpenChange={() => setPhotoToDelete(null)}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta foto? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePhoto} className="bg-red-500 hover:bg-red-600 rounded-xl">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {selectedPhoto && (
          <div 
            className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <button
              className="absolute top-4 right-4 bg-white/20 text-white p-3 rounded-full z-[101] hover:bg-white/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPhoto(null);
              }}
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedPhoto}
              alt="Foto ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl shadow-white/5"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }