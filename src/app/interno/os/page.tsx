"use client";

import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  Camera, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  CreditCard, 
  Wallet, 
  Banknote,
  Smartphone,
  Calendar,
  Package,
  User,
  Search,
  Link as LinkIcon,
  LayoutDashboard,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { INITIAL_SERVICES, Category } from "@/lib/services-data";

// MOCK DATA
const MOCK_CUSTOMERS = [
  { name: "João Silva", phone: "(82) 99999-9999", whatsapp: "(82) 99999-9999" },
  { name: "Maria Oliveira", phone: "(82) 98888-8888", whatsapp: "(82) 98888-8888" },
  { name: "Pedro Santos", phone: "(82) 97777-7777", whatsapp: "(82) 97777-7777" },
];

const DISCOUNTS = [
  { label: "0%", value: 0 },
  { label: "5%", value: 0.05 },
  { label: "8%", value: 0.08 },
  { label: "10%", value: 0.10 },
];

interface Item {
  id: string;
  orderInOS: number;
  services: string[];
  customServiceLabel: string;
  customServiceValue: number | "";
  observations: string;
  photos: string[];
}

export default function OSPage() {
  const router = useRouter();
  
  // OS Identification
  const osNumber = "001/2025";
  
  // Customer State
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientWhatsApp, setClientWhatsApp] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  
  // Items State
  const [items, setItems] = useState<Item[]>([
    { 
      id: Math.random().toString(36).substr(2, 9), 
      orderInOS: 1, 
      services: [], 
      customServiceLabel: "",
      customServiceValue: "",
      observations: "", 
      photos: [] 
    }
  ]);
  
  // Dates & Delivery
  const [entryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryFee, setDeliveryFee] = useState<number | "">("");
  
  // Financial & Payment State
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [payOnEntry, setPayOnEntry] = useState(false);
  const [loading, setLoading] = useState(false);

  // Behavior: Select existing customer
  const selectCustomer = (cust: typeof MOCK_CUSTOMERS[0]) => {
    setClientName(cust.name);
    setClientPhone(cust.phone);
    setClientWhatsApp(cust.whatsapp);
    setShowCustomerSearch(false);
  };

  const addItem = () => {
    const nextOrder = items.length + 1;
    setItems([...items, { 
      id: Math.random().toString(36).substr(2, 9), 
      orderInOS: nextOrder, 
      services: [], 
      customServiceLabel: "",
      customServiceValue: "",
      observations: "", 
      photos: [] 
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id).map((item, index) => ({
        ...item,
        orderInOS: index + 1
      })));
    }
  };

  const toggleService = (itemId: string, serviceId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const services = item.services.includes(serviceId)
          ? item.services.filter(s => s !== serviceId)
          : [...item.services, serviceId];
        return { ...item, services };
      }
      return item;
    }));
  };

  const updateItem = (itemId: string, data: Partial<Item>) => {
    setItems(items.map(item => item.id === itemId ? { ...item, ...data } : item));
  };

  // Filter Active Services (Exclude Taxa de urgência as per requirements)
  const activeServices = INITIAL_SERVICES.filter(s => s.status === "Active" && s.name !== "Taxa de urgência");
  const categories: Category[] = ["Higienização", "Pintura", "Costura", "Restauração", "Extra / Avulso"];

  const groupedServices = categories.map(cat => ({
    name: cat,
    services: activeServices.filter(s => s.category === cat)
  })).filter(group => group.services.length > 0);

  // Financial Calculations - Defensive and strict to requirements
  const itemValues = useMemo(() => {
    return items.map(item => {
      const servicesSum = item.services.reduce((acc, sId) => {
        const service = INITIAL_SERVICES.find(s => s.id === sId);
        return acc + (Number(service?.defaultPrice) || 0);
      }, 0);
      const customValue = Number(item.customServiceValue) || 0;
      return servicesSum + customValue;
    });
  }, [items]);

  const subtotal = useMemo(() => {
    return itemValues.reduce((acc, val) => acc + val, 0);
  }, [itemValues]);

  const discountAmount = subtotal * (Number(discount) || 0);
  const deliveryValue = Number(deliveryFee) || 0;
  const finalTotal = subtotal - discountAmount + deliveryValue;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone) {
      alert("Nome e Telefone são obrigatórios.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      alert(`Ordem de Serviço ${osNumber} gerada com sucesso!`);
      router.push("/interno/dashboard");
      setLoading(false);
    }, 1200);
  };

  const handleGenerateLink = () => {
    if (!clientName || !clientPhone) {
      alert("Preencha os dados do cliente para gerar o link.");
      return;
    }
    alert(`Link de aceite gerado para a OS ${osNumber}. Enviando para ${clientPhone}...`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full -ml-2">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-slate-900 leading-none">Abertura de OS</h1>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{osNumber}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-black text-slate-900 tracking-tighter">TENIS</span>
          <span className="text-sm font-light text-blue-500 tracking-tighter">LAB</span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 flex flex-col gap-5">
        
        {/* SECTION 1 — OS IDENTIFICATION is in header, but let's show items as well */}

        {/* SECTION 2 — CUSTOMER DATA */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Cliente</h2>
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowCustomerSearch(!showCustomerSearch)}
              className="text-xs font-bold text-blue-600 h-8 gap-1"
            >
              <Search className="w-3 h-3" /> {showCustomerSearch ? "Fechar" : "Buscar"}
            </Button>
          </div>

          {showCustomerSearch && (
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-2 mb-2 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase ml-1">Clientes Frequentes</p>
              {MOCK_CUSTOMERS.map(cust => (
                <button
                  key={cust.phone}
                  type="button"
                  onClick={() => selectCustomer(cust)}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 text-left hover:border-blue-200 transition-all"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800">{cust.name}</span>
                    <span className="text-[10px] text-slate-500">{cust.phone}</span>
                  </div>
                  <Plus className="w-4 h-4 text-blue-400" />
                </button>
              ))}
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <Label htmlFor="clientName" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome Completo *</Label>
              <Input 
                id="clientName"
                placeholder="Nome do cliente" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="rounded-xl border-slate-200 h-11 text-sm focus:ring-blue-500/20"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="clientPhone" className="text-[10px] font-bold text-slate-400 uppercase ml-1">Telefone *</Label>
                <Input 
                  id="clientPhone"
                  placeholder="(00) 00000-0000" 
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  required
                  className="rounded-xl border-slate-200 h-11 text-sm focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="clientWhatsApp" className="text-[10px] font-bold text-slate-400 uppercase ml-1">WhatsApp</Label>
                <Input 
                  id="clientWhatsApp"
                  placeholder="(00) 00000-0000" 
                  value={clientWhatsApp}
                  onChange={(e) => setClientWhatsApp(e.target.value)}
                  className="rounded-xl border-slate-200 h-11 text-sm focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 — ITEMS (TÊNIS) & SECTION 4 — SERVICES */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                <Package className="w-4 h-4 text-amber-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Pares / Itens</h2>
            </div>
            <Button 
              type="button" 
              onClick={addItem}
              size="sm" 
              className="rounded-full gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold h-8 text-xs px-4"
            >
              <Plus className="w-3 h-3" /> Adicionar par
            </Button>
          </div>

          {items.map((item, index) => (
            <Card key={item.id} className="rounded-3xl border-slate-200 shadow-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <CardHeader className="bg-slate-50/50 py-2.5 px-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex flex-col">
                    <CardTitle className="text-xs font-black text-slate-600 uppercase tracking-widest">
                      ITEM {osNumber}.{item.orderInOS}
                    </CardTitle>
                    <span className="text-[10px] font-bold text-blue-600">
                      Valor do Item: R$ {(Number(itemValues[index]) || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {items.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(item.id)}
                        className="h-7 w-7 text-slate-400 hover:text-red-500 rounded-full"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  {/* Photo Upload (Mock) */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <div className="min-w-[80px] h-[80px] rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 bg-slate-50 text-slate-400 active:bg-slate-100 transition-colors cursor-pointer">
                      <Camera className="w-5 h-5" />
                      <span className="text-[8px] font-bold uppercase text-center">Tirar<br/>Foto</span>
                    </div>
                    <div className="min-w-[80px] h-[80px] rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-300">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Services Selection */}
                  <div className="space-y-4">
                    {groupedServices.map(group => (
                      <div key={group.name} className="space-y-2">
                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">{group.name}</Label>
                        <div className="grid grid-cols-1 gap-1.5">
                          {group.services.map(service => (
                            <div 
                              key={service.id} 
                              onClick={() => toggleService(item.id, service.id)}
                              className={`flex items-center justify-between p-3 rounded-xl border transition-all active:scale-[0.99] cursor-pointer ${
                                item.services.includes(service.id) 
                                  ? "bg-blue-600 border-blue-600 text-white shadow-sm" 
                                  : "bg-white border-slate-100 text-slate-600 hover:border-blue-200"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${
                                  item.services.includes(service.id) ? "bg-white border-white" : "border-slate-300 bg-white"
                                }`}>
                                  {item.services.includes(service.id) && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                                </div>
                                <span className="text-xs font-bold">{service.name}</span>
                              </div>
                              {service.defaultPrice > 0 && (
                                <span className={`text-xs font-black ${item.services.includes(service.id) ? "text-white" : "text-slate-900"}`}>
                                  R$ {Number(service.defaultPrice).toFixed(2)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Custom Service (one per item for practical use) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Serviço Personalizado</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          placeholder="Descrição" 
                          value={item.customServiceLabel}
                          onChange={(e) => updateItem(item.id, { customServiceLabel: e.target.value })}
                          className="rounded-xl border-slate-200 h-10 text-xs focus:ring-blue-500/20"
                        />
                        <Input 
                          type="number"
                          placeholder="Valor R$" 
                          value={item.customServiceValue}
                          onChange={(e) => updateItem(item.id, { customServiceValue: e.target.value === "" ? "" : Number(e.target.value) })}
                          className="rounded-xl border-slate-200 h-10 text-xs focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1 pt-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Notas / Observações</Label>
                    <Textarea 
                      placeholder="Detalhes adicionais sobre o estado do tênis..." 
                      value={item.observations}
                      onChange={(e) => updateItem(item.id, { observations: e.target.value })}
                      className="rounded-xl border-slate-200 min-h-[60px] text-xs resize-none focus:ring-blue-500/20"
                    />
                  </div>
                </CardContent>
            </Card>
          ))}
        </div>

        {/* SECTION 5 — DATES */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Prazos & Logística</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data de Entrada</Label>
              <div className="h-11 px-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center text-slate-500 text-xs font-bold">
                {new Date(entryDate).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data prevista entrega</Label>
              <Input 
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="rounded-xl border-slate-200 h-11 text-sm focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Taxa de entrega (Opcional)</Label>
            <Input 
              type="number"
              placeholder="0.00" 
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(e.target.value === "" ? "" : Number(e.target.value))}
              className="rounded-xl border-slate-200 h-11 text-sm focus:ring-blue-500/20"
            />
          </div>
        </section>

        {/* SECTION 6 — FINANCIAL SUMMARY */}
        <section className="bg-slate-900 rounded-[2.5rem] p-7 shadow-2xl text-white flex flex-col gap-6 -mx-1">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black uppercase tracking-widest text-white/50">Financeiro</h2>
            <Badge variant="outline" className="border-white/20 text-blue-400 font-mono text-[10px]">
              SUMMARY
            </Badge>
          </div>

          <div className="space-y-3.5 border-b border-white/10 pb-6">
            <div className="flex justify-between text-xs font-bold text-white/70">
              <span>Subtotal (soma dos itens)</span>
              <span>R$ {(Number(subtotal) || 0).toFixed(2)}</span>
            </div>
            {deliveryValue > 0 && (
              <div className="flex justify-between text-xs font-bold text-white/70">
                <span>Taxa de Entrega</span>
                <span>R$ {deliveryValue.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex flex-col gap-2 pt-2">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Seletor de Desconto</span>
              <div className="grid grid-cols-4 gap-1.5">
                {DISCOUNTS.map(d => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setDiscount(d.value)}
                    className={`h-10 rounded-xl text-xs font-black transition-all ${
                      discount === d.value 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em]">Total Final</span>
              <span className="text-4xl font-black tracking-tighter text-white">
                R$ {(Number(finalTotal) || 0).toFixed(2)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] font-black text-green-400 uppercase tracking-wider">Desconto</span>
                <span className="text-sm font-black bg-green-500/20 text-green-400 px-3 py-1 rounded-full">
                  - R$ {(Number(discountAmount) || 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 7 — PAYMENT METHOD */}
        <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col gap-6">
          <div className="space-y-4">
            <div className="space-y-2.5">
              <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Método de Pagamento</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Pix', icon: Smartphone },
                  { id: 'Card', icon: CreditCard },
                  { id: 'Cash', icon: Banknote }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border transition-all ${
                      paymentMethod === method.id 
                        ? "bg-slate-900 border-slate-900 text-white shadow-md" 
                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                    }`}
                  >
                    <method.icon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-tight">
                      {method.id === 'Card' ? 'Cartão' : method.id === 'Cash' ? 'Dinheiro' : 'Pix'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-800">Pagar na entrada</span>
                <span className="text-[10px] text-slate-500">O cliente está pagando agora?</span>
              </div>
              <Checkbox 
                id="payOnEntry" 
                checked={payOnEntry}
                onCheckedChange={(checked) => setPayOnEntry(checked as boolean)}
                className="h-6 w-6 rounded-lg border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
            </div>
          </div>
        </section>

        {/* SECTION 8 — CONTRACT & GUARANTEE (INFO ONLY) */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-800 leading-snug font-medium">
            O contrato e o termo de garantia serão enviados ao cliente após a criação da OS.
          </p>
        </div>

        {/* SECTION 9 — ACTIONS */}
        <div className="flex flex-col gap-3 mt-4">
          <Button 
            type="submit" 
            disabled={loading}
            className="h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-xl transition-all active:scale-[0.97]"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                SALVAR OS
              </div>
            )}
          </Button>

          <Button 
            type="button" 
            variant="outline"
            onClick={handleGenerateLink}
            className="h-14 rounded-2xl border-2 border-blue-600 text-blue-600 font-bold hover:bg-blue-50 transition-all active:scale-[0.97]"
          >
            <div className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              GERAR LINK PARA ACEITE
            </div>
          </Button>

          <Link href="/interno/dashboard" className="w-full">
            <Button 
              type="button" 
              variant="ghost"
              className="w-full h-12 rounded-2xl text-slate-400 font-bold hover:text-slate-600 transition-all"
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4" />
                VOLTAR AO DASHBOARD
              </div>
            </Button>
          </Link>
        </div>

      </form>
    </div>
  );
}
