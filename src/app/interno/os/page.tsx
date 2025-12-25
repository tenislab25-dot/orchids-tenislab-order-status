"use client";

import { useState, useEffect } from "react";
import { 
  Camera, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Info, 
  ArrowLeft, 
  Share2,
  Calendar as CalendarIcon,
  User,
  Phone,
  Package,
  CreditCard,
  DollarSign,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface Service {
  id: string;
  name: string;
  price: number;
}

const SERVICE_CATALOG: Record<string, Service[]> = {
  "Higienização": [
    { id: "h1", name: "Limpeza Padrão", price: 50 },
    { id: "h2", name: "Limpeza Deep", price: 80 },
    { id: "h3", name: "Limpeza Premium", price: 120 },
  ],
  "Pintura": [
    { id: "p1", name: "Pintura Midsole", price: 60 },
    { id: "p2", name: "Repintura Completa", price: 150 },
  ],
  "Costura": [
    { id: "c1", name: "Costura Lateral", price: 40 },
    { id: "c2", name: "Colagem de Sola", price: 45 },
  ],
  "Restauração": [
    { id: "r1", name: "Unyellowing", price: 70 },
    { id: "r2", name: "Hidratação Couro", price: 30 },
  ],
  "Extra / Avulso": [
    { id: "e1", name: "Impermeabilização", price: 25 },
    { id: "e2", name: "Desodorização", price: 15 },
  ],
};

interface OSItem {
  id: string;
  index: number;
  services: Service[];
  observations: string;
  photoUploaded: boolean;
  customService?: {
    name: string;
    price: number;
  };
}

export default function InternalOSPage() {
  const [mounted, setMounted] = useState(false);
  const [osNumber, setOsNumber] = useState("");
  const [entryDate, setEntryDate] = useState("");
  
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  
  const [items, setItems] = useState<OSItem[]>([]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [payAtIntake, setPayAtIntake] = useState(false);

  useEffect(() => {
    setMounted(true);
    const now = new Date();
    const year = now.getFullYear();
    const randomNum = Math.floor(Math.random() * 900) + 100;
    setOsNumber(`${randomNum}/${year}`);
    setEntryDate(now.toISOString().split("T")[0]);
    
    // Default delivery date (7 days from now)
    const delivery = new Date();
    delivery.setDate(now.getDate() + 7);
    setDeliveryDate(delivery.toISOString().split("T")[0]);
  }, []);

  if (!mounted) return null;

  const addItem = () => {
    const newItem: OSItem = {
      id: crypto.randomUUID(),
      index: items.length + 1,
      services: [],
      observations: "",
      photoUploaded: false,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id).map((item, idx) => ({ ...item, index: idx + 1 })));
  };

  const addServiceToItem = (itemId: string, serviceId: string) => {
    if (serviceId === "custom") {
      setItems(items.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            customService: { name: "", price: 0 }
          };
        }
        return item;
      }));
      return;
    }

    const allServices = Object.values(SERVICE_CATALOG).flat();
    const service = allServices.find(s => s.id === serviceId);
    if (!service) return;

    setItems(items.map(item => {
      if (item.id === itemId) {
        if (item.services.find(s => s.id === serviceId)) return item;
        return {
          ...item,
          services: [...item.services, service]
        };
      }
      return item;
    }));
  };

  const removeServiceFromItem = (itemId: string, serviceId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          services: item.services.filter(s => s.id !== serviceId)
        };
      }
      return item;
    }));
  };

  const updateItemObservations = (itemId: string, obs: string) => {
    setItems(items.map(item => item.id === itemId ? { ...item, observations: obs } : item));
  };

  const updateCustomService = (itemId: string, name: string, price: number) => {
    setItems(items.map(item => {
      if (item.id === itemId && item.customService) {
        return {
          ...item,
          customService: { name, price }
        };
      }
      return item;
    }));
  };

  const calculateItemSubtotal = (item: OSItem) => {
    const servicesTotal = item.services.reduce((sum, s) => sum + Number(s.price || 0), 0);
    const customTotal = item.customService ? Number(item.customService.price || 0) : 0;
    return servicesTotal + customTotal;
  };

  const subtotal = items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  const deliveryFeeVal = Number(deliveryFee) || 0;
  const discountVal = (subtotal + deliveryFeeVal) * (Number(discountPercent) / 100);
  const total = subtotal + deliveryFeeVal - discountVal;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 font-sans text-slate-900">
      {/* SECTION 1 — OS IDENTIFICATION */}
      <header className="bg-white px-6 py-6 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <Link href="/interno/dashboard" className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black tracking-tighter">TENIS</span>
            <span className="text-xl font-light tracking-tighter text-blue-600">LAB</span>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ordem de Serviço</span>
          <h1 className="text-3xl font-black text-slate-900">{osNumber}</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* SECTION 2 — CLIENT DATA */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold">Dados do Cliente</h2>
          </div>
          <div className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="clientName" className="text-xs font-bold text-slate-500 uppercase ml-1">Nome Completo</Label>
              <Input 
                id="clientName" 
                placeholder="Nome do cliente" 
                className="h-12 rounded-2xl bg-slate-50 border-none focus-visible:ring-blue-500/20"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clientPhone" className="text-xs font-bold text-slate-500 uppercase ml-1">Telefone</Label>
              <Input 
                id="clientPhone" 
                type="tel" 
                placeholder="(00) 00000-0000" 
                className="h-12 rounded-2xl bg-slate-50 border-none focus-visible:ring-blue-500/20"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* SECTION 3 & 4 — PARES / ITENS */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold">Tênis / Itens</h2>
            </div>
            <Badge variant="outline" className="rounded-full bg-blue-50 text-blue-700 border-blue-100 px-3">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </Badge>
          </div>

          {items.map((item) => (
            <Card key={item.id} className="rounded-3xl border-slate-200 shadow-sm overflow-hidden bg-white">
              <div className="bg-slate-50 px-5 py-3 flex justify-between items-center border-b border-slate-100">
                <span className="font-bold text-slate-500 text-sm">Item {osNumber}.{item.index}</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 -mr-2"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-5 flex flex-col gap-5">
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 cursor-pointer hover:bg-slate-200 transition-colors shrink-0">
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase">Foto</span>
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-2">
                    <Select onValueChange={(val) => addServiceToItem(item.id, val)}>
                      <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none text-slate-600">
                        <SelectValue placeholder="Adicionar serviço" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        {Object.entries(SERVICE_CATALOG).map(([category, services]) => (
                          <SelectGroup key={category}>
                            <SelectLabel className="text-blue-600 text-[10px] uppercase font-bold tracking-wider px-4 pt-3 pb-1">{category}</SelectLabel>
                            {services.map(s => (
                              <SelectItem key={s.id} value={s.id} className="rounded-xl px-4 py-3">
                                <div className="flex justify-between items-center w-full gap-8">
                                  <span>{s.name}</span>
                                  <span className="font-bold text-slate-400">R$ {s.price}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                        <Separator className="my-1" />
                        <SelectItem value="custom" className="rounded-xl px-4 py-3 font-bold text-blue-600">
                          + Serviço Personalizado
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.services.map(s => (
                    <Badge 
                      key={s.id} 
                      className="rounded-full pl-3 pr-1 py-1 bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1 text-xs hover:bg-blue-100 transition-colors"
                    >
                      {s.name}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 rounded-full p-0 text-blue-400 hover:text-blue-700"
                        onClick={() => removeServiceFromItem(item.id, s.id)}
                      >
                        <Plus className="w-3 h-3 rotate-45" />
                      </Button>
                    </Badge>
                  ))}
                  {item.customService && (
                    <div className="w-full flex flex-col gap-2 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Serviço Personalizado</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 rounded-full p-0 text-red-400 hover:text-red-600"
                          onClick={() => setItems(items.map(it => it.id === item.id ? { ...it, customService: undefined } : it))}
                        >
                          <Plus className="w-3 h-3 rotate-45" />
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Nome do serviço" 
                          className="h-9 bg-white border-blue-100 text-xs rounded-xl flex-[2]"
                          value={item.customService.name}
                          onChange={(e) => updateCustomService(item.id, e.target.value, item.customService?.price || 0)}
                        />
                        <Input 
                          type="number" 
                          placeholder="Preço" 
                          className="h-9 bg-white border-blue-100 text-xs rounded-xl flex-1"
                          value={item.customService.price || ""}
                          onChange={(e) => updateCustomService(item.id, item.customService?.name || "", Number(e.target.value))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Textarea 
                  placeholder="Observações do item (ex: desgaste na sola, mancha persistente...)"
                  className="min-h-[80px] rounded-2xl bg-slate-50 border-none text-sm resize-none"
                  value={item.observations}
                  onChange={(e) => updateItemObservations(item.id, e.target.value)}
                />

                <div className="flex justify-end items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase">Subtotal do item:</span>
                  <span className="text-xl font-black text-slate-900">R$ {calculateItemSubtotal(item).toFixed(2)}</span>
                </div>
              </div>
            </Card>
          ))}

          <Button 
            onClick={addItem}
            variant="outline" 
            className="h-16 rounded-3xl border-dashed border-2 border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all flex gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="font-bold text-lg">Adicionar par</span>
          </Button>
        </section>

        {/* SECTION 5 — DATES */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold">Prazos e Entrega</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Data de Entrada</Label>
              <div className="h-12 rounded-2xl bg-slate-100 border-none flex items-center px-4 text-slate-500 font-medium">
                {entryDate.split("-").reverse().join("/")}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deliveryDate" className="text-xs font-bold text-slate-500 uppercase ml-1">Previsão</Label>
              <Input 
                id="deliveryDate" 
                type="date" 
                className="h-12 rounded-2xl bg-slate-50 border-none focus-visible:ring-blue-500/20"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deliveryFee" className="text-xs font-bold text-slate-500 uppercase ml-1">Taxa de Entrega (Opcional)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</span>
              <Input 
                id="deliveryFee" 
                type="number" 
                placeholder="0,00" 
                className="h-12 rounded-2xl bg-slate-50 border-none pl-10 focus-visible:ring-blue-500/20"
                value={deliveryFee || ""}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
              />
            </div>
          </div>
        </section>

        {/* SECTION 6 — FINANCIAL SUMMARY */}
        <section className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold">Resumo Financeiro</h2>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center text-slate-400 text-sm">
              <span>Subtotal dos serviços</span>
              <span className="font-bold text-white">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-sm">
              <span>Taxa de entrega</span>
              <span className="font-bold text-white">R$ {deliveryFeeVal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-sm">
              <div className="flex items-center gap-2">
                <span>Desconto</span>
                <Select onValueChange={(val) => setDiscountPercent(Number(val))}>
                  <SelectTrigger className="h-8 w-20 bg-slate-800 border-none text-[10px] rounded-lg">
                    <SelectValue placeholder="0%" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white min-w-0 w-20">
                    <SelectItem value="0" className="text-xs">0%</SelectItem>
                    <SelectItem value="5" className="text-xs">5%</SelectItem>
                    <SelectItem value="8" className="text-xs">8%</SelectItem>
                    <SelectItem value="10" className="text-xs">10%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <span className="font-bold text-red-400">- R$ {discountVal.toFixed(2)}</span>
            </div>
            
            <Separator className="bg-slate-800 my-2" />
            
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-bold text-blue-400">Total</span>
              <div className="flex flex-col items-end">
                <span className="text-4xl font-black">R$ {total.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Valor final</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7 — PAYMENT METHOD */}
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold">Pagamento</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {["Pix", "Cartão", "Dinheiro"].map(method => (
              <Button 
                key={method}
                variant={paymentMethod === method ? "default" : "outline"}
                className={`h-14 rounded-2xl font-bold flex flex-col gap-1 transition-all ${
                  paymentMethod === method 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100"
                }`}
                onClick={() => setPaymentMethod(method)}
              >
                <span className="text-sm">{method}</span>
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-2">
            <div className="flex flex-col">
              <span className="text-sm font-bold">Pagar na entrada?</span>
              <span className="text-[10px] text-slate-500 uppercase font-medium">Liquidação imediata</span>
            </div>
            <Switch checked={payAtIntake} onCheckedChange={setPayAtIntake} />
          </div>
        </section>

        {/* SECTION 8 — CONTRACT & GUARANTEE */}
        <div className="px-2 py-4 flex gap-3 bg-blue-50/50 rounded-2xl border border-blue-100">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed font-medium">
            O contrato e o termo de garantia serão enviados ao cliente após a criação da OS para aceite formal via link.
          </p>
        </div>

        {/* SECTION 9 — ACTIONS */}
        <div className="flex flex-col gap-3 mt-4">
          <Button 
            className="h-16 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-500/20 flex gap-3 transition-all active:scale-[0.98]"
            onClick={() => {
              const id = osNumber.replace("/", "");
              window.location.href = `/aceite/${id}`;
            }}
          >
            <Share2 className="w-5 h-5" />
            Gerar link para aceite
          </Button>
          <Button 
            variant="ghost" 
            className="h-14 rounded-2xl text-slate-400 hover:text-slate-900 font-bold"
            asChild
          >
            <Link href="/interno/dashboard">Voltar ao Dashboard</Link>
          </Button>
        </div>
      </main>

      <footer className="mt-8 text-center pb-12">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          © 2025 TENISLAB • Staff Interface
        </p>
      </footer>
    </div>
  );
}
