"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  ArrowLeft, 
  Plus, 
  Camera, 
  Trash2, 
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  QrCode,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { INITIAL_SERVICES } from "@/lib/services-data";
import { supabase } from "@/lib/supabase";
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
}

export default function OSPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [osNumber, setOsNumber] = useState("");
  const [entryDate, setEntryDate] = useState("");
  
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [items, setItems] = useState<OSItem[]>([]);
  
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [payOnEntry, setPayOnEntry] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedRole = localStorage.getItem("tenislab_role");
    setRole(storedRole);

    if (storedRole !== "ADMIN" && storedRole !== "ATENDENTE") {
      router.push("/interno/dashboard");
      return;
    }

    generateOSNumber();
    
    const today = new Date();
    setEntryDate(today.toISOString().split('T')[0]);

    fetchClients();
  }, []);

  const generateOSNumber = async () => {
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
  };

  const fetchClients = async () => {
    const { data } = await supabase.from("clients").select("*").order("name");
    if (data) setClients(data);
  };

  const handleClientSelect = (clientId: string) => {
    if (clientId === "new") {
      setSelectedClientId("new");
      setClientName("");
      setClientPhone("");
      return;
    }
    
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setSelectedClientId(clientId);
      setClientName(client.name);
      setClientPhone(client.phone);
    }
  };

  if (!mounted) return null;

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
        Object.values(SERVICE_CATALOG).forEach(category => {
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

  const handleCreateOS = async () => {
    if (!clientName || !clientPhone) {
      toast.error("Preencha os dados do cliente");
      return;
    }

    if (items.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    try {
      let clientId = selectedClientId;

      if (selectedClientId === "new") {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert([{ name: clientName, phone: clientPhone }])
          .select()
          .single();
        
        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      const { error: osError } = await supabase
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
          items: items,
          status: "Recebido"
        }]);

      if (osError) throw osError;

      toast.success("Ordem de Serviço criada com sucesso!");
      router.push("/interno/dashboard");
    } catch (error: any) {
      toast.error("Erro ao criar OS: " + error.message);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-32">
      <header className="bg-slate-900 text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Link href="/interno/dashboard" className="p-2 -ml-2 rounded-full active:bg-white/10">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          
          <div className="relative w-24 h-10">
            <Image 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/IMG_8889-1766755171009.JPG?width=8000&height=8000&resize=contain"
              alt="TENISLAB"
              fill
              className="object-contain brightness-0 invert"
            />
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest text-white/50 block">OS</span>
            <h1 className="text-lg font-black tracking-tighter">#{osNumber}</h1>
          </div>
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
                  <div className="space-y-2">
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
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Pares / Itens</h2>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={addItem}
              className="rounded-full gap-2 border-blue-200 text-blue-600 font-bold bg-blue-50"
            >
              <Plus className="w-4 h-4" />
              Adicionar par
            </Button>
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
                <div className="aspect-video w-full rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 active:bg-slate-200 transition-colors cursor-pointer">
                  <Camera className="w-8 h-8" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Tirar foto do par</span>
                </div>

                <div className="space-y-2">
                  <Label>Serviços</Label>
                  <Select onValueChange={(val) => updateItemService(item.id, val)}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl">
                      <SelectValue placeholder="Selecionar serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_CATALOG).map(([category, services]) => (
                        <SelectGroup key={category}>
                          <SelectLabel>{category}</SelectLabel>
                          {services.map(service => (
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

          {items.length === 0 && (
            <div className="py-12 px-6 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-center bg-white/50">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Plus className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Nenhum par adicionado</h3>
                <p className="text-sm text-slate-500 mt-1">Clique no botão acima para adicionar um novo par à OS.</p>
              </div>
            </div>
          )}
        </section>

        <section>
          <Card className="border-none shadow-sm overflow-hidden rounded-3xl">
            <CardHeader className="bg-white border-b border-slate-100 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Prazos e Entrega</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Entrada</Label>
                  <Input 
                    type="date" 
                    value={entryDate} 
                    readOnly 
                    className="h-12 bg-slate-100 border-slate-200 text-slate-500 pointer-events-none rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prev. de Entrega</Label>
                  <Input 
                    type="date" 
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Taxa de Entrega (R$)</Label>
                <Input 
                  type="number" 
                  placeholder="0,00" 
                  value={deliveryFee || ""}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="h-12 bg-slate-50 border-slate-200 rounded-xl"
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
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70 font-medium">Taxa de entrega</span>
                  <span className="font-bold">R$ {Number(deliveryFee).toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-3 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Aplicar Desconto</span>
                  <div className="flex gap-2">
                    {[0, 5, 8, 10].map((p) => (
                      <Button 
                        key={p}
                        variant={discountPercent === p ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDiscountPercent(p)}
                        className={`flex-1 rounded-xl border-white/20 h-10 ${
                          discountPercent === p 
                          ? "bg-blue-500 hover:bg-blue-600 border-blue-500 text-white" 
                          : "bg-transparent text-white hover:bg-white/10"
                        }`}
                      >
                        {p}%
                      </Button>
                    ))}
                  </div>
                </div>
                {discountValue > 0 && (
                  <div className="flex justify-between items-center text-sm text-red-400 font-bold pt-2">
                    <span>Desconto ({discountPercent}%)</span>
                    <span>- R$ {Number(discountValue).toFixed(2)}</span>
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
          >
            Gerar link para aceite
          </Button>
          <Button 
            variant="ghost" 
            className="w-full h-14 rounded-2xl text-slate-500 font-bold"
            asChild
          >
            <Link href="/interno/dashboard">Voltar ao Dashboard</Link>
          </Button>
        </section>

      </main>

      <div className="h-10" />
    </div>
  );
}
