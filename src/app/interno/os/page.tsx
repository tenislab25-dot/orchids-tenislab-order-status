"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ChevronLeft, 
  Plus, 
  Camera, 
  Trash2, 
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  QrCode
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

// MOCKED SERVICES CATALOG
const SERVICE_CATALOG = {
  "Higienização": [
    { id: "h1", name: "Limpeza Standard", price: 60 },
    { id: "h2", name: "Limpeza Premium", price: 90 },
    { id: "h3", name: "Ozonização", price: 30 },
  ],
  "Pintura": [
    { id: "p1", name: "Retoque de Pintura", price: 45 },
    { id: "p2", name: "Personalização Completa", price: 150 },
    { id: "p3", name: "Pintura de Entressola", price: 80 },
  ],
  "Costura": [
    { id: "c1", name: "Reforço Interno", price: 40 },
    { id: "c2", name: "Costura de Sola (Blaqueação)", price: 70 },
  ],
  "Restauração": [
    { id: "r1", name: "Colagem Reversível", price: 50 },
    { id: "r2", name: "Hidratação de Couro", price: 35 },
  ],
  "Extra / Avulso": [
    { id: "e1", name: "Troca de Cadarço", price: 20 },
    { id: "e2", name: "Palmilha Ortopédica", price: 45 },
  ]
};

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
  const [mounted, setMounted] = useState(false);
  const [osNumber, setOsNumber] = useState("");
  const [entryDate, setEntryDate] = useState("");
  
  // Client Data
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Items
  const [items, setItems] = useState<OSItem[]>([]);
  
  // Financial
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [payOnEntry, setPayOnEntry] = useState(false);

    useEffect(() => {
      setMounted(true);
      // Generate OS Number (Sequence 0001/YEAR)
      const year = new Date().getFullYear();
      const sequence = "0001";
      setOsNumber(`${sequence}/${year}`);
      
      // Set Entry Date
      const today = new Date();
      setEntryDate(today.toISOString().split('T')[0]);
    }, []);

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
        // Find service in catalog
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-32">
      {/* SECTION 1 — OS IDENTIFICATION */}
      <header className="bg-slate-900 text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center relative justify-center mb-2">
          <Link href="/interno/dashboard" className="absolute left-0 p-2 rounded-full active:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-widest text-white/50 block">Ordem de Serviço</span>
            <h1 className="text-xl font-black tracking-tighter">#{osNumber}</h1>
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-6 p-4 max-w-md mx-auto w-full animate-in fade-in duration-500">
        
        {/* SECTION 2 — CLIENT DATA */}
        <section>
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 py-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input 
                  id="nome" 
                  placeholder="Ex: João Silva" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-12 bg-slate-50 border-slate-200"
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
                  className="h-12 bg-slate-50 border-slate-200"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 3 & 4 — PARES / ITENS */}
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

          {items.map((item, index) => (
            <Card key={item.id} className="border-none shadow-sm relative overflow-hidden animate-in slide-in-from-right-4">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-slate-100">
                <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-mono text-[10px]">
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
                {/* Photo Mock */}
                <div className="aspect-video w-full rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 active:bg-slate-200 transition-colors cursor-pointer">
                  <Camera className="w-8 h-8" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Tirar foto do par</span>
                </div>

                {/* Service Selector */}
                <div className="space-y-2">
                  <Label>Serviços</Label>
                  <Select onValueChange={(val) => updateItemService(item.id, val)}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200">
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

                {/* Selected Services Tags */}
                {item.services.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.services.map((s, i) => (
                      <Badge key={`${s.id}-${i}`} className="bg-blue-50 text-blue-700 border-blue-100 py-1 pl-3 pr-1 gap-1 flex items-center">
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

                {/* Custom Service */}
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Serviço Personalizado (Opcional)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Input 
                        placeholder="Nome do serviço" 
                        value={item.customService?.name || ""}
                        onChange={(e) => updateCustomService(item.id, e.target.value, item.customService?.price || 0)}
                        className="h-10 text-sm bg-white"
                      />
                    </div>
                    <div>
                      <Input 
                        type="number" 
                        placeholder="R$" 
                        value={item.customService?.price || ""}
                        onChange={(e) => updateCustomService(item.id, item.customService?.name || "", Number(e.target.value))}
                        className="h-10 text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea 
                    placeholder="Detalhes sobre manchas, rasgos, etc..." 
                    className="bg-slate-50 border-slate-200 resize-none"
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
            <div className="py-12 px-6 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-4 text-center">
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

        {/* SECTION 5 — DATES */}
        <section>
          <Card className="border-none shadow-sm overflow-hidden">
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
                    className="h-12 bg-slate-100 border-slate-200 text-slate-500 pointer-events-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prev. de Entrega</Label>
                  <Input 
                    type="date" 
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="h-12 bg-slate-50 border-slate-200"
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
                  className="h-12 bg-slate-50 border-slate-200"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 6 — FINANCIAL SUMMARY */}
        <section>
          <Card className="border-none shadow-md bg-slate-900 text-white overflow-hidden">
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
                        className={`flex-1 rounded-lg border-white/20 h-10 ${
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

        {/* SECTION 7 — PAYMENT METHOD */}
        <section>
          <Card className="border-none shadow-sm overflow-hidden">
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
                    className={`h-20 flex-col gap-2 rounded-xl transition-all ${
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

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
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

        {/* SECTION 8 — CONTRACT & GUARANTEE */}
        <section className="px-1">
          <div className="flex gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs leading-relaxed text-amber-800 font-medium">
              O contrato e o termo de garantia serão enviados ao cliente após a criação da OS para aceite digital via link.
            </p>
          </div>
        </section>

        {/* SECTION 9 — ACTIONS */}
        <section className="flex flex-col gap-3 mt-4">
          <Button 
            className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-black shadow-xl shadow-blue-100 transition-all active:scale-[0.98] gap-3"
            onClick={() => alert("Link gerado e enviado para: " + clientPhone)}
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

      {/* FOOTER SPACE */}
      <div className="h-10" />
    </div>
  );
}