"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Trash2, 
  Camera, 
  ChevronLeft, 
  LayoutDashboard, 
  Link as LinkIcon,
  X,
  AlertTriangle,
  Calendar as CalendarIcon,
  DollarSign,
  User,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";

// --- MOCK DATA ---
const SERVICES_CATALOG = [
  { category: "Higienização", items: [
    { id: "h1", name: "Higienização Simples", price: 60 },
    { id: "h2", name: "Higienização Pro", price: 90 },
    { id: "h3", name: "Higienização de Botas", price: 110 },
  ]},
  { category: "Pintura", items: [
    { id: "p1", name: "Pintura de Entressola", price: 80 },
    { id: "p2", name: "Retoque de Cor", price: 50 },
    { id: "p3", name: "Customização Total", price: 250 },
  ]},
  { category: "Costura", items: [
    { id: "c1", name: "Costura de Sola", price: 70 },
    { id: "c2", name: "Remendo Interno", price: 40 },
    { id: "c3", name: "Troca de Passador", price: 30 },
  ]},
  { category: "Restauração", items: [
    { id: "r1", name: "Un-yellowing (Degelo)", price: 60 },
    { id: "r2", name: "Colagem Reestrutural", price: 90 },
    { id: "r3", name: "Troca de Mesh", price: 150 },
  ]},
  { category: "Extra / Avulso", items: [
    { id: "e1", name: "Cadarço Novo", price: 25 },
    { id: "e2", name: "Palmilha Ortopédica", price: 45 },
    { id: "e3", name: "Impermeabilização", price: 35 },
  ]},
];

// --- TYPES ---
interface Service {
  id: string;
  name: string;
  price: number;
}

interface OSItem {
  id: string;
  orderInOS: number;
  services: Service[];
  observations: string;
  customServiceName?: string;
  customServicePrice?: string;
}

export default function CreateOSPage() {
  const [mounted, setMounted] = useState(false);
  const [osNumber, setOsNumber] = useState("");
  const [entryDate, setEntryDate] = useState("");
  
  // Client State
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Items State
  const [items, setItems] = useState<OSItem[]>([]);
  
  // Dates State
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");

  // Financial State
  const [discountPercent, setDiscountPercent] = useState<"0" | "5" | "8" | "10">("0");
  const [paymentMethod, setPaymentMethod] = useState<"Pix" | "Cartão" | "Dinheiro">("Pix");
  const [payAtEntry, setPayAtEntry] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-generate OS Number: 001/2025
    const year = new Date().getFullYear();
    const mockId = Math.floor(Math.random() * 900) + 100;
    setOsNumber(`${mockId}/${year}`);
    
    // Auto-fill entry date
    setEntryDate(new Date().toISOString().split('T')[0]);
    
    // Start with one item
    addPair();
  }, []);

  const addPair = () => {
    setItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        orderInOS: prev.length + 1,
        services: [],
        observations: "",
      }
    ]);
  };

  const removeItem = (id: string) => {
    setItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      return filtered.map((item, index) => ({
        ...item,
        orderInOS: index + 1
      }));
    });
  };

  const addServiceToItem = (itemId: string, service: Service) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        // Prevent duplicate services
        if (item.services.find(s => s.id === service.id)) return item;
        return {
          ...item,
          services: [...item.services, service]
        };
      }
      return item;
    }));
  };

  const removeServiceFromItem = (itemId: string, serviceId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          services: item.services.filter(s => s.id !== serviceId)
        };
      }
      return item;
    }));
  };

  const updateItem = (itemId: string, updates: Partial<OSItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) return { ...item, ...updates };
      return item;
    }));
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => {
      const itemServicesTotal = item.services.reduce((sAcc, s) => sAcc + s.price, 0);
      const customPrice = Number(item.customServicePrice) || 0;
      return acc + itemServicesTotal + customPrice;
    }, 0);
  }, [items]);

  const deliveryFeeNum = Number(deliveryFee) || 0;
  const discountVal = (subtotal * (Number(discountPercent) || 0)) / 100;
  const finalTotal = subtotal + deliveryFeeNum - discountVal;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full -ml-2">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-slate-900 leading-none tracking-tight uppercase">Nova Ordem de Serviço</h1>
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{osNumber}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-black text-slate-900 tracking-tighter">TENIS</span>
          <span className="text-sm font-light text-blue-500 tracking-tighter">LAB</span>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 flex flex-col gap-6">
        
        {/* SECTION 2 — CLIENT DATA */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-blue-500" />
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dados do Cliente</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="clientName" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo *</Label>
              <Input 
                id="clientName"
                placeholder="Ex: João Silva"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus-visible:ring-blue-500/20 font-bold"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="clientPhone" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Telefone *</Label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <Input 
                  id="clientPhone"
                  type="tel"
                  placeholder="(00) 00000-0000"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="h-12 pl-11 rounded-2xl border-slate-200 bg-slate-50/50 focus-visible:ring-blue-500/20 font-bold"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 — PARES / ITENS */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Pares / Itens</h2>
            <Button 
              onClick={addPair}
              variant="outline"
              size="sm"
              className="rounded-full h-8 px-4 border-blue-200 text-blue-600 font-bold text-[10px] uppercase tracking-wider"
            >
              <Plus className="w-3 h-3 mr-1" /> Adicionar Par
            </Button>
          </div>

          {items.map((item) => (
            <Card key={item.id} className="rounded-[2rem] border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="bg-slate-50/50 py-3 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  ITEM {osNumber}.{item.orderInOS}
                </CardTitle>
                {items.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-red-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Photo Placeholder */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fotos do Tênis</span>
                  <div className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-400 active:bg-slate-50 transition-colors">
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Tirar Fotos</span>
                  </div>
                </div>

                {/* Service Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Serviços do Catálogo</span>
                  <Select onValueChange={(val) => {
                    const [catIdx, itemIdx] = val.split('-').map(Number);
                    const service = SERVICES_CATALOG[catIdx].items[itemIdx];
                    addServiceToItem(item.id, service);
                  }}>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold focus:ring-blue-500/20">
                      <SelectValue placeholder="Selecione um serviço..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {SERVICES_CATALOG.map((cat, cIdx) => (
                        <SelectGroup key={cat.category}>
                          <SelectLabel className="text-[10px] font-black uppercase tracking-widest text-blue-500 px-3 py-2">
                            {cat.category}
                          </SelectLabel>
                          {cat.items.map((srv, iIdx) => (
                            <SelectItem 
                              key={srv.id} 
                              value={`${cIdx}-${iIdx}`}
                              className="font-medium text-sm py-2"
                            >
                              {srv.name} — R$ {srv.price}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Custom Service */}
                  <div className="mt-4 pt-4 border-t border-slate-50 space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Serviço Adicional (Manual)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        placeholder="Nome do serviço"
                        value={item.customServiceName || ""}
                        onChange={(e) => updateItem(item.id, { customServiceName: e.target.value })}
                        className="h-10 rounded-xl text-xs border-slate-200 font-bold"
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">R$</span>
                        <Input 
                          placeholder="Preço"
                          type="number"
                          value={item.customServicePrice || ""}
                          onChange={(e) => updateItem(item.id, { customServicePrice: e.target.value })}
                          className="h-10 pl-8 rounded-xl text-xs border-slate-200 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Selected Services Tags */}
                  {item.services.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {item.services.map((s) => (
                        <Badge 
                          key={s.id} 
                          variant="secondary" 
                          className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-in zoom-in-95 duration-200"
                        >
                          <span className="text-[10px] font-bold">{s.name} (R$ {s.price})</span>
                          <X 
                            className="w-3 h-3 cursor-pointer opacity-50 hover:opacity-100" 
                            onClick={() => removeServiceFromItem(item.id, s.id)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Observations */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Observações</span>
                  <Textarea 
                    placeholder="Ex: Mancha persistente no bico, cadarço desfiando..."
                    value={item.observations}
                    onChange={(e) => updateItem(item.id, { observations: e.target.value })}
                    className="rounded-2xl border-slate-200 bg-slate-50/50 min-h-[80px] text-xs font-medium resize-none"
                  />
                </div>

                {/* Item Subtotal */}
                <div className="flex justify-end pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtotal Item:</span>
                    <span className="text-sm font-black text-slate-900">
                      R$ {(item.services.reduce((acc, s) => acc + s.price, 0) + (Number(item.customServicePrice) || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* SECTION 5 — DATES */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <CalendarIcon className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Prazos e Taxas</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Data de Entrada</Label>
              <Input 
                type="date"
                value={entryDate}
                disabled
                className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold text-slate-500"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Previsão de Entrega *</Label>
              <Input 
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="h-12 rounded-2xl border-slate-200 font-bold focus:ring-blue-500/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Taxa de Entrega (Opcional)</Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <Input 
                  type="number"
                  placeholder="0,00"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="h-12 pl-11 rounded-2xl border-slate-200 font-bold focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6 — FINANCIAL SUMMARY */}
        <section className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resumo Financeiro</h2>
            <Badge className="bg-blue-500/20 text-blue-400 border-none font-black text-[10px] uppercase tracking-wider">
              {paymentMethod}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-bold">Subtotal</span>
              <span className="font-black">R$ {subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400 font-bold">Taxa de Entrega</span>
              <span className="font-black">R$ {deliveryFeeNum.toFixed(2)}</span>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desconto</span>
              <div className="grid grid-cols-4 gap-2">
                {["0", "5", "8", "10"].map((d) => (
                  <Button
                    key={d}
                    variant={discountPercent === d ? "default" : "outline"}
                    className={`h-9 rounded-xl border-white/10 text-xs font-bold ${
                      discountPercent === d 
                        ? "bg-blue-500 hover:bg-blue-600 text-white border-transparent" 
                        : "bg-white/5 hover:bg-white/10 text-white"
                    }`}
                    onClick={() => setDiscountPercent(d as any)}
                  >
                    {d}%
                  </Button>
                ))}
              </div>
            </div>

            {discountVal > 0 && (
              <div className="flex justify-between items-center text-sm text-green-400 pt-1">
                <span className="font-bold">Desconto ({discountPercent}%)</span>
                <span className="font-black">- R$ {discountVal.toFixed(2)}</span>
              </div>
            )}

            <Separator className="bg-white/10 my-4" />

            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Total Geral</span>
              <span className="text-2xl font-black tracking-tight">R$ {finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* SECTION 7 — PAYMENT METHOD */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Forma de Pagamento</h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {["Pix", "Cartão", "Dinheiro"].map((m) => (
              <Button
                key={m}
                variant={paymentMethod === m ? "default" : "outline"}
                className={`h-11 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${
                  paymentMethod === m 
                    ? "bg-slate-900 text-white hover:bg-slate-800" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                onClick={() => setPaymentMethod(m as any)}
              >
                {m}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between mt-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-700">Pagar na entrada?</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Receber valor agora</span>
            </div>
            <Switch 
              checked={payAtEntry}
              onCheckedChange={setPayAtEntry}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>
        </section>

        {/* SECTION 8 — CONTRACT & GUARANTEE */}
        <section className="bg-blue-50/50 border border-blue-100 rounded-3xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[11px] font-bold text-blue-700 leading-relaxed uppercase tracking-tight">
            O contrato e o termo de garantia serão enviados ao cliente após a criação da OS.
          </p>
        </section>

        {/* SECTION 9 — ACTIONS */}
        <div className="flex flex-col gap-3 mt-4">
          <Button 
            className="w-full h-16 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-100 transition-all active:scale-[0.97] flex items-center justify-center gap-3"
            onClick={() => {
              // Mock success feedback
              alert("Gerando link de aceite...");
            }}
          >
            <LinkIcon className="w-5 h-5" />
            GERAR LINK PARA ACEITE
          </Button>

          <Link href="/interno/dashboard" className="w-full">
            <Button 
              variant="ghost"
              className="w-full h-14 rounded-2xl text-slate-500 font-black tracking-widest uppercase text-[10px] hover:bg-slate-100"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>

        <footer className="mt-8 mb-4 text-center opacity-30">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold">
            Fluxo de Recebimento · TENISLAB
          </p>
        </footer>
      </main>
    </div>
  );
}
