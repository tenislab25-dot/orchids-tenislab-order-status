"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Plus, 
  Camera, 
  ImagePlus,
  Trash2, 
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
  Users
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { INITIAL_SERVICES } from "@/lib/services-data";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image-utils";
import { toast } from "sonner";

const SERVICE_CATALOG = INITIAL_SERVICES.reduce((acc, service) => {
  if (service.status === "Inactive") return acc;
  if (service.id === "17") return acc; 
  
  if (!acc[service.category]) acc[service.category] = [];
  acc[service.category].push({
    id: service.id,
    name: service.name,
    price: service.defaultPrice
  });
  return acc;
}, {} as Record<string, { id: string, name: string, price: number }[]>);

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
}

  export default function OSPage() {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [services, setServices] = useState<any[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [osNumber, setOsNumber] = useState("");
    const [entryDate, setEntryDate] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const [clientName, setClientName] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientPlusCode, setClientPlusCode] = useState("");
    const [clientCoordinates, setClientCoordinates] = useState("");
    const [clientComplement, setClientComplement] = useState("");
    const [isSearchingClient, setIsSearchingClient] = useState(false);

    useEffect(() => {
      const searchClient = async () => {
        const cleanPhone = clientPhone.replace(/\D/g, "");
        if (cleanPhone.length >= 10 && selectedClientId === "new") {
          setIsSearchingClient(true);
          const { data, error } = await supabase
            .from("clients")
            .select("*")
            .ilike("phone", `%${cleanPhone}%`)
            .limit(1)
            .single();

          if (data && !error) {
            setSelectedClientId(data.id);
            setClientName(data.name);
            setClientPhone(data.phone);
            setClientEmail(data.email || "");
            setClientPlusCode(data.plus_code || "");
            setClientCoordinates(data.coordinates || "");
            setClientComplement(data.complement || "");
            toast.success("Cliente recorrente encontrado!");
          }
          setIsSearchingClient(false);
        }
      };

      const timer = setTimeout(searchClient, 500);
      return () => clearTimeout(timer);
    }, [clientPhone, selectedClientId]);

  const [items, setItems] = useState<OSItem[]>([]);
  
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState("Pix");
    const [payOnEntry, setPayOnEntry] = useState(false);
    
    const [createdOS, setCreatedOS] = useState<any>(null);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

     // 1. Primeiro definimos as funções
  const fetchServices = useCallback(async () => {
    setLoadingServices(true);
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("status", "Active");
    
    if (error) {
      toast.error("Erro ao carregar serviços");
    } else {
      setServices(data || []);
    }
    setLoadingServices(false);
  }, []);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    if (data) setClients(data);
  }, []);

  const generateOSNumber = useCallback(async () => {
    const year = new Date().getFullYear();
    const { data, error } = await supabase
      .from("service_orders")
      .select("os_number")
      .ilike("os_number", `%/${year}`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error generating OS number:", error);
      const sequence = Math.floor(1000 + Math.random() * 9000);
      setOsNumber(`${sequence}/${year}`);
    } else if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].os_number.split("/")[0]);
      const nextNumber = (lastNumber + 1).toString().padStart(3, "0");
      setOsNumber(`${nextNumber}/${year}`);
    } else {
      setOsNumber(`001/${year}`);
    }
  }, []);

  // 2. Depois usamos elas no useEffect
  useEffect(() => {
    setMounted(true);
    const storedRole = localStorage.getItem("tenislab_role");
    setRole(storedRole);

    if (!storedRole) {
      router.push("/interno/login");
      return;
    }

    if (storedRole !== "ADMIN" && storedRole !== "ATENDENTE") {
      router.push("/interno/dashboard");
      return;
    }

    generateOSNumber();
    
    const today = new Date();
    setEntryDate(today.toISOString().split('T')[0]);

    fetchClients();
    fetchServices();
  }, [router, generateOSNumber, fetchClients, fetchServices]);

  const serviceCatalog = useMemo(() => {
    if (!services || !Array.isArray(services)) return {};
    return services.reduce((acc, service) => {
      if (!service || !service.category) return acc;
      if (!acc[service.category]) acc[service.category] = [];
      acc[service.category].push({
        id: service.id,
        name: service.name || "Sem nome",
        price: Number(service.default_price) || 0
      });
      return acc;
    }, {} as Record<string, { id: string, name: string, price: number }[]>);
  }, [services]);
    const handleClientSelect = (clientId: string) => {
      if (clientId === "new") {
        setSelectedClientId("new");
        setClientName("");
        setClientPhone("");
        setClientEmail("");
        setClientPlusCode("");
        setClientCoordinates("");
        setClientComplement("");
        return;
      }
      
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setSelectedClientId(clientId);
        setClientName(client.name);
        setClientPhone(client.phone);
        setClientEmail(client.email || "");
        setClientPlusCode(client.plus_code || "");
        setClientCoordinates(client.coordinates || "");
        setClientComplement(client.complement || "");
      }
    };

  if (!mounted) return null;

  const handleFileChange = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      toast.loading(`Comprimindo e enviando ${files.length} foto(s)...`, { id: "upload" });
      
      const newPhotoUrls = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        toast.loading(`Processando foto ${i + 1}/${files.length}...`, { id: "upload" });
        const compressedFile = await compressImage(file, 1080, 0.7);
        
        const fileExt = 'jpg';
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from('photos')
          .upload(filePath, compressedFile);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(filePath);
          
        newPhotoUrls.push(publicUrl);
      }

      setItems(items.map(item => {
        if (item.id === itemId) {
          const photos = [...(item.photos || []), ...newPhotoUrls];
          return { ...item, photos };
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
          const services = [...item.services, foundService];
          const subtotal = calculateItemSubtotal(services, item.customService);
          return { ...item, services, subtotal };
        }
      }
      return item;
    }));
  };

  const removeServiceFromItem = (itemId: string, serviceId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const services = item.services.filter(s => s.id !== serviceId);
        const subtotal = calculateItemSubtotal(services, item.customService);
        return { ...item, services, subtotal };
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

    const handleCreateOS = async () => {
      if (!clientName || !clientPhone) {
        toast.error("Preencha os dados do cliente");
        return;
      }

      if (items.length === 0) {
        toast.error("Adicione pelo menos um item");
        return;
      }

      const itemsWithoutService = items.filter(item => item.services.length === 0 && !item.customService?.name);
      if (itemsWithoutService.length > 0) {
        toast.error("Todos os itens devem ter pelo menos um serviço selecionado");
        return;
      }

      setIsCreating(true);
      try {

      let clientId = selectedClientId;

      const formattedName = clientName.toUpperCase().trim();
      const formattedPhone = clientPhone.replace(/\D/g, "").replace(/^55/, "");

        if (selectedClientId === "new") {
          const { data: newClient, error: clientError } = await supabase
            .from("clients")
            .insert([{ 
              name: formattedName, 
              phone: formattedPhone,
              email: clientEmail.trim() || null,
              plus_code: clientPlusCode.trim() || null,
              coordinates: clientCoordinates.trim() || null,
              complement: clientComplement.trim() || null
            }])
            .select()
            .single();
          
          if (clientError) throw clientError;
          clientId = newClient.id;
        } else {
          await supabase
            .from("clients")
            .update({ 
              name: formattedName, 
              phone: formattedPhone,
              email: clientEmail.trim() || null,
              plus_code: clientPlusCode.trim() || null,
              coordinates: clientCoordinates.trim() || null,
              complement: clientComplement.trim() || null
            })
            .eq("id", selectedClientId);
        }

      const itemsWithPhotosBefore = items.map(item => ({
        ...item,
        photosBefore: item.photos || [],
        photos: undefined
      }));

      const { data: newOS, error: osError } = await supabase
        .from("service_orders")
        .insert([{
          os_number: osNumber,
          client_id: clientId,
          entry_date: entryDate,
          delivery_date: deliveryDate || null,
          delivery_fee: deliveryFee,
          discount_percent: discountPercent,
          payment_method: paymentMethod,
          pay_on_entry: payOnEntry,
          total: finalTotal,
          items: itemsWithPhotosBefore,
          status: "Recebido"
        }])
        .select()
        .single();

        if (osError) throw osError;

        setIsCreating(false);
        setCreatedOS(newOS);
        setShowSuccessDialog(true);
        toast.success("Ordem de Serviço criada com sucesso!");
      } catch (error: any) {
        setIsCreating(false);
        toast.error("Erro ao criar OS: " + error.message);
      }
    };

      const sendWhatsAppLink = () => {
        if (!createdOS) return;
        
        const cleanPhone = clientPhone.replace(/\D/g, "");
        const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
        
        const acceptanceLink = `${window.location.origin}/aceite/${createdOS.id}`;
        const message = encodeURIComponent(
          `Olá ${clientName}! Sua Ordem de Serviço #${osNumber} foi criada na TENISLAB.\n\n` +
          `📍 *IMPORTANTE:* O prazo de entrega do seu tênis só começa a contar a partir do momento do seu *ACEITE DIGITAL* no link abaixo.\n\n` +
          `Para conferir os detalhes e autorizar o serviço, acesse:\n${acceptanceLink}\n\n` +
          `Qualquer dúvida, estamos à disposição!`
        );
        
        window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
        router.push("/interno/dashboard");
      };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-32">
      <header className="bg-slate-900 text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="grid grid-cols-3 items-center max-w-md mx-auto">
          <Link href="/interno/dashboard" className="p-2 -ml-2 rounded-full active:bg-white/10 w-fit">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          
              <div className="text-center">
                <h1 className="text-lg font-black tracking-tighter">{osNumber}</h1>
              </div>

          <div />
        </div>
      </header>

      <main className="flex flex-col gap-6 p-4 max-w-md mx-auto w-full animate-in fade-in duration-500">
        
        <section>
          <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-white border-b border-slate-100 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="space-y-2">
                <Label>Selecionar Cliente</Label>
                <Select onValueChange={handleClientSelect} value={selectedClientId}>
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl">
                    <SelectValue placeholder="Selecione um cliente ou 'Novo'" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new" className="font-bold text-blue-600">
                      + Cadastrar Novo Cliente
                    </SelectItem>
                    <SelectGroup>
                      <SelectLabel>Clientes Cadastrados</SelectLabel>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.phone})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {selectedClientId && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input 
                      id="nome" 
                      placeholder="Ex: João Silva" 
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                      readOnly={selectedClientId !== "new"}
                    />
                  </div>
                      <div className="space-y-2 relative">
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input 
                          id="telefone" 
                          type="tel"
                          placeholder="(00) 00000-0000" 
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                          readOnly={selectedClientId !== "new"}
                        />
                        {isSearchingClient && (
                          <div className="absolute right-3 top-[38px]">
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail (Opcional)</Label>
                        <Input 
                          id="email" 
                          type="email"
                          placeholder="exemplo@email.com" 
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Plus Code ou Coordenadas (Opcional)</Label>
                        <Input 
                          id="pluscode" 
                          placeholder="Ex: 8C7X+2G ou -9.123456,-35.123456" 
                          value={clientPlusCode}
                          onChange={(e) => setClientPlusCode(e.target.value)}
                          className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                        />
                        <p className="text-xs text-slate-500">Abra Google Maps, clique no local e copie o Plus Code ou coordenadas</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="complement">Complemento (Opcional)</Label>
                        <Input 
                          id="complement" 
                          placeholder="Condomínio, Bloco, Apartamento" 
                          value={clientComplement}
                          onChange={(e) => setClientComplement(e.target.value)}
                          className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                        />
                      </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Pares / Itens</h2>
            </div>

            {items.map((item) => (
            <Card key={item.id} className="border-none shadow-sm relative overflow-hidden animate-in slide-in-from-right-4 rounded-3xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-mono text-[10px] rounded-lg">
                  ITEM {item.itemNumber}
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
                              <div 
                                key={pIdx} 
                                className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 group cursor-pointer active:scale-[0.98] transition-all"
                              >
                                <Image src={photo} alt="Foto do par" fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setItems(items.map(it => {
                                        if (it.id === item.id) {
                                          return { ...it, photos: it.photos?.filter((_, i) => i !== pIdx) };
                                        }
                                        return it;
                                      }));
                                    }}
                                    className="bg-red-500 text-white p-4 rounded-full shadow-2xl transform scale-75 group-hover:scale-100 group-active:scale-100 transition-transform flex items-center justify-center"
                                  >
                                    <Trash2 className="w-6 h-6" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        <label className="aspect-video w-full rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-200 hover:border-slate-300 transition-all cursor-pointer">
                          <Camera className="w-8 h-8" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-center px-1">Tirar foto</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            className="hidden" 
                            onChange={(e) => handleFileChange(item.id, e)}
                          />
                        </label>
                        <label className="aspect-video w-full rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 hover:bg-slate-200 hover:border-slate-300 transition-all cursor-pointer">
                          <ImagePlus className="w-8 h-8" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-center px-1">Galeria / Arquivos</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple
                            className="hidden" 
                            onChange={(e) => handleFileChange(item.id, e)}
                          />
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

            {items.length > 0 && (
              <Button 
                variant="outline" 
                onClick={addItem}
                className="w-full h-16 rounded-[2rem] border-2 border-dashed border-blue-200 text-blue-600 font-bold bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Plus className="w-5 h-5" />
                Adicionar outro par
              </Button>
            )}

            {items.length === 0 && (
              <button 
                onClick={addItem}
                className="w-full py-12 px-6 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-center bg-white/50 hover:bg-slate-50 hover:border-slate-300 transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-500 transition-all">
                  <Plus className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Adicionar Par</h3>
                  <p className="text-sm text-slate-500 mt-1">Clique para adicionar o primeiro par à OS.</p>
                </div>
              </button>
            )}
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

                <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Atalhos (Dias Úteis)</Label>
                <div className="grid grid-cols-4 gap-2">
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
                        const date = addBusinessDays(new Date(), shortcut.days);
                        setDeliveryDate(date.toISOString().split('T')[0]);
                      }}
                    >
                      {shortcut.label}
                    </Button>
                  ))}
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
                  <p className="text-[9px] text-slate-400 font-medium px-1">
                    A taxa de entrega NÃO sofre desconto e é adicionada ao total.
                  </p>
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

      <section className="px-1">
        <div className="flex gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-xs leading-relaxed text-amber-800 font-medium">
            O contrato e o termo de garantia serão enviados ao cliente após a criação da OS para aceite digital via link.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 mt-4">
          <Button 
            className="w-full h-16 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white text-lg font-black shadow-xl shadow-blue-100 transition-all active:scale-[0.98] gap-3"
            onClick={handleCreateOS}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              "Gerar link para aceite"
            )}
          </Button>

        <Button 
          variant="ghost" 
          className="w-full h-14 rounded-2xl text-slate-500 font-bold"
          asChild
        >
          <Link href="/interno/dashboard">Voltar ao Dashboard</Link>
        </Button>
      </section>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="rounded-[2.5rem] max-w-sm">
          <DialogHeader className="items-center text-center gap-4">
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black">OS Criada!</DialogTitle>
                <DialogDescription className="font-medium text-slate-600 text-center">
                  A Ordem de Serviço <strong>{osNumber}</strong> foi registrada com sucesso.
                </DialogDescription>
              </div>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 pt-4">
            <Button 
              onClick={sendWhatsAppLink}
              className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
            >
              <QrCode className="w-5 h-5" />
              Enviar Link via WhatsApp
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => router.push("/interno/dashboard")}
              className="w-full h-12 rounded-2xl text-slate-500 font-bold"
            >
              Ir para o Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        </main>

      <div className="h-10" />
    </div>
  );
}
