"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Camera, 
  ImagePlus,
  Trash2, 
  CheckCircle2,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Save,
  Loader2,
  Plus
} from "lucide-react";

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
import { compressImage } from "@/lib/image-utils";
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

  useEffect(() => {
    const storedRole = localStorage.getItem("tenislab_role");
    if (!storedRole) {
      router.push("/login");
      return;
    }
    if (storedRole !== "ADMIN" && storedRole !== "ATENDENTE") {
      router.push("/dashboard");
      return;
    }
    setRole(storedRole);
    fetchOrder();
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("status", "Active");
    if (data) setServices(data);
  };

  const fetchOrder = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_orders")
      .select(`*, clients (name, phone)`)
      .eq("os_number", osNumber)
      .single();

    if (error) {
      toast.error("Erro ao carregar OS");
      router.push("/dashboard");
    } else {
      setOrder(data);
      setEntryDate(data.entry_date || "");
      setDeliveryDate(data.delivery_date || "");
      setDeliveryFee(data.delivery_fee || 0);
      setDiscountPercent(data.discount_percent || 0);
      setPaymentMethod(data.payment_method || "Pix");
      setPayOnEntry(data.pay_on_entry || false);
      setItems(data.items || []);
    }
    setLoading(false);
  };

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

  const handleFileChange = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      toast.loading(`Enviando ${files.length} foto(s)...`, { id: "upload" });
      const newPhotoUrls = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedFile = await compressImage(file, 1920, 0.85);
        const fileName = `${Math.random()}.jpg`;
        const { data, error } = await supabase.storage.from('photos').upload(fileName, compressedFile);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
        newPhotoUrls.push(publicUrl);
      }

      setItems(items.map(item => {
        if (item.id === itemId) {
          return { ...item, photos: [...(item.photos || []), ...newPhotoUrls] };
        }
        return item;
      }));
      toast.success(`${files.length} foto(s) enviada(s)!`, { id: "upload" });
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message, { id: "upload" });
    }
  };

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

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
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
          items: items
        })
        .eq("os_number", osNumber);

      if (error) throw error;
      toast.success("OS atualizada com sucesso!");
      router.push(`/os/${osIdRaw}`);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
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
          <Link href={`/os/${osIdRaw}`} className="p-2 -ml-2 rounded-full active:bg-white/10 w-fit">
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
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fotos do par</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {item.photos?.map((photo, pIdx) => (
                      <div key={pIdx} className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 group">
                        <Image src={photo} alt="Foto do par" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            type="button"
                            onClick={() => {
                              setItems(items.map(it => {
                                if (it.id === item.id) {
                                  return { ...it, photos: it.photos?.filter((_, i) => i !== pIdx) };
                                }
                                return it;
                              }));
                            }}
                            className="bg-red-500 text-white p-4 rounded-full shadow-2xl"
                          >
                            <Trash2 className="w-6 h-6" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <label className="aspect-video w-full rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-200 cursor-pointer">
                      <Camera className="w-8 h-8" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Tirar foto</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange(item.id, e)} />
                    </label>
                    <label className="aspect-video w-full rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-200 cursor-pointer">
                      <ImagePlus className="w-8 h-8" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Galeria</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileChange(item.id, e)} />
                    </label>
                  </div>
                </div>

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
            <Link href={`/os/${osIdRaw}`}>Cancelar</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
