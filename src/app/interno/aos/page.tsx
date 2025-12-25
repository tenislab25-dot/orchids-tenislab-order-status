"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, 
  Camera, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  CreditCard, 
  Wallet, 
  Banknote,
  Info,
  ChevronRight,
  User,
  Smartphone,
  Calendar,
  Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";

// MOCK DATA
const SERVICES_CATALOG = [
  { id: "higienizacao", name: "Higienização", price: 60 },
  { id: "pintura", name: "Pintura", price: 80 },
  { id: "costura", name: "Costura", price: 40 },
  { id: "clareamento", name: "Clareamento", price: 50 },
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
  observations: string;
  photos: string[];
}

export default function AOSPage() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [items, setItems] = useState<Item[]>([
    { id: "1", orderInOS: 1, services: [], observations: "", photos: [] }
  ]);
  const [extraServiceName, setExtraServiceName] = useState("");
  const [extraServiceValue, setExtraServiceValue] = useState<number>(0);
  const [discount, setDiscount] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [entryDate, setEntryDate] = useState("");

  useEffect(() => {
    setEntryDate(new Date().toISOString().split("T")[0]);
  }, []);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [paymentStatus, setPaymentStatus] = useState("Pendente");
  const [contractAccepted, setContractAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-fill phone mock
  useEffect(() => {
    if (clientName.toLowerCase() === "joao silva") {
      setClientPhone("(82) 99999-9999");
    }
  }, [clientName]);

  const addItem = () => {
    const nextOrder = items.length + 1;
    setItems([...items, { 
      id: Math.random().toString(36).substr(2, 9), 
      orderInOS: nextOrder, 
      services: [], 
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

  const updateItemObservations = (itemId: string, obs: string) => {
    setItems(items.map(item => item.id === itemId ? { ...item, observations: obs } : item));
  };

  // Financial Summary Calculations
  const servicesTotal = useMemo(() => {
    return items.reduce((acc, item) => {
      const itemTotal = item.services.reduce((sAcc, sId) => {
        const service = SERVICES_CATALOG.find(s => s.id === sId);
        return sAcc + (service?.price || 0);
      }, 0);
      return acc + itemTotal;
    }, 0);
  }, [items]);

  const subtotal = servicesTotal + extraServiceValue + deliveryFee;
  const discountAmount = subtotal * discount;
  const finalTotal = subtotal - discountAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientPhone || !contractAccepted) {
      alert("Por favor, preencha os dados do cliente e aceite o contrato.");
      return;
    }

    setLoading(true);
    // Simulate generation
    setTimeout(() => {
      alert("Ordem de Serviço 006/2025 gerada com sucesso!");
      router.push("/interno/dashboard");
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Nova OS</h1>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-sm font-black text-slate-900 tracking-tighter">TENIS</span>
          <span className="text-sm font-light text-blue-500 tracking-tighter">LAB</span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 flex flex-col gap-6">
        
        {/* CLIENT SECTION */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-500" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Cliente</h2>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="clientName" className="text-xs font-bold text-slate-500 uppercase ml-1">Nome Completo</Label>
              <Input 
                id="clientName"
                placeholder="Ex: João Silva" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
                className="rounded-xl border-slate-200 h-12"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="clientPhone" className="text-xs font-bold text-slate-500 uppercase ml-1">Telefone / WhatsApp</Label>
              <Input 
                id="clientPhone"
                placeholder="(00) 00000-0000" 
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                required
                className="rounded-xl border-slate-200 h-12"
              />
            </div>
          </div>
        </section>

        {/* ITEMS SECTION */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                <Package className="w-4 h-4 text-amber-500" />
              </div>
              <h2 className="text-base font-bold text-slate-800">Tênis</h2>
            </div>
            <Button 
              type="button" 
              onClick={addItem}
              variant="outline" 
              size="sm" 
              className="rounded-full gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" /> Add Par
            </Button>
          </div>

          {items.map((item, index) => (
            <Card key={item.id} className="rounded-3xl border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-slate-50/50 py-3 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-700">
                  Item 001/2025.{item.orderInOS}
                </CardTitle>
                {items.length > 1 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeItem(item.id)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Photo Placeholder */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400">
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase">Foto Frontal</span>
                  </div>
                  <div className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 bg-slate-50 text-slate-400">
                    <Camera className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase">Foto Lateral</span>
                  </div>
                </div>

                {/* Services Checkboxes */}
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Serviços</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {SERVICES_CATALOG.map(service => (
                      <div 
                        key={service.id} 
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          item.services.includes(service.id) 
                            ? "bg-blue-50 border-blue-200 ring-1 ring-blue-100" 
                            : "bg-white border-slate-100"
                        }`}
                        onClick={() => toggleService(item.id, service.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            id={`s-${item.id}-${service.id}`}
                            checked={item.services.includes(service.id)}
                            onCheckedChange={() => {}} // handled by div click
                          />
                          <Label className="font-medium text-slate-700">{service.name}</Label>
                        </div>
                        <span className="text-sm font-bold text-slate-900">R$ {service.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observations */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Observações / Avarias</Label>
                  <Textarea 
                    placeholder="Manchas, rasgos, etc..." 
                    value={item.observations}
                    onChange={(e) => updateItemObservations(item.id, e.target.value)}
                    className="rounded-xl border-slate-200 min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* EXTRA SERVICE */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
              <Plus className="w-4 h-4 text-slate-500" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Serviço Extra (Opcional)</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Descrição</Label>
              <Input 
                placeholder="Ex: Troca de cadarço" 
                value={extraServiceName}
                onChange={(e) => setExtraServiceName(e.target.value)}
                className="rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Valor (R$)</Label>
              <Input 
                type="number"
                placeholder="0.00" 
                value={extraServiceValue || ""}
                onChange={(e) => setExtraServiceValue(Number(e.target.value))}
                className="rounded-xl border-slate-200"
              />
            </div>
          </div>
        </section>

        {/* DATES & LOGISTICS */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Datas & Entrega</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Entrada</Label>
              <div className="h-12 px-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center text-slate-500 text-sm font-medium">
                {new Date(entryDate).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Previsão</Label>
              <Input 
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="rounded-xl border-slate-200 h-12"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Taxa de Entrega (Opcional)</Label>
            <Input 
              type="number"
              placeholder="0.00" 
              value={deliveryFee || ""}
              onChange={(e) => setDeliveryFee(Number(e.target.value))}
              className="rounded-xl border-slate-200"
            />
          </div>
        </section>

        {/* FINANCIAL SUMMARY */}
        <section className="bg-slate-900 rounded-3xl p-6 shadow-xl text-white flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Resumo Financeiro</h2>
            <Badge variant="outline" className="border-white/20 text-white/60 font-mono">
              TOTAL
            </Badge>
          </div>

          <div className="space-y-3 border-b border-white/10 pb-6">
            <div className="flex justify-between text-sm text-white/60">
              <span>Serviços ({items.length} {items.length === 1 ? 'par' : 'pares'})</span>
              <span>R$ {servicesTotal.toFixed(2)}</span>
            </div>
            {extraServiceValue > 0 && (
              <div className="flex justify-between text-sm text-white/60">
                <span>Extra ({extraServiceName || 'Serviço'})</span>
                <span>R$ {extraServiceValue.toFixed(2)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-sm text-white/60">
                <span>Taxa de Entrega</span>
                <span>R$ {deliveryFee.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between gap-4 pt-2">
              <span className="text-sm text-white/60">Desconto</span>
              <div className="flex gap-1">
                {DISCOUNTS.map(d => (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setDiscount(d.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      discount === d.value 
                        ? "bg-blue-500 text-white" 
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
              <span className="text-xs text-white/40 font-bold uppercase tracking-widest">Valor Final</span>
              <span className="text-4xl font-black tracking-tighter">
                R$ {finalTotal.toFixed(2)}
              </span>
            </div>
            {discount > 0 && (
              <span className="text-xs font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded-full mb-1">
                - R$ {discountAmount.toFixed(2)}
              </span>
            )}
          </div>
        </section>

        {/* PAYMENT */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-slate-500" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Pagamento</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Método</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Pix', icon: Smartphone },
                  { id: 'Cartão', icon: CreditCard },
                  { id: 'Dinheiro', icon: Banknote }
                ].map(method => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                      paymentMethod === method.id 
                        ? "bg-slate-900 border-slate-900 text-white" 
                        : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    <method.icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">{method.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="rounded-xl h-12 border-slate-200">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">A pagar na entrega</SelectItem>
                  <SelectItem value="Parcial">Pago Parcial (50%)</SelectItem>
                  <SelectItem value="Pago">Pago Integral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* CONTRACT */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="bg-slate-50 rounded-2xl p-4 text-[10px] text-slate-500 leading-relaxed font-medium">
            <h4 className="font-bold mb-2 uppercase text-slate-700">Contrato e Garantia</h4>
            <p className="mb-2">A TENISLAB oferece garantia de 30 dias para os serviços realizados. Não nos responsabilizamos por danos em calçados com vida útil excedida ou materiais ressecados.</p>
            <p>O prazo de entrega é estimado e pode variar conforme a complexidade do serviço. Calçados não retirados em até 90 dias serão doados.</p>
          </div>
          <div className="flex items-start gap-3 p-2">
            <Checkbox 
              id="terms" 
              checked={contractAccepted}
              onCheckedChange={(checked) => setContractAccepted(checked as boolean)}
              className="mt-1"
            />
            <Label htmlFor="terms" className="text-sm font-medium text-slate-600 leading-snug">
              O cliente está ciente e de acordo com os termos de serviço e prazos estabelecidos.
            </Label>
          </div>
        </section>

        {/* SUBMIT */}
        <Button 
          type="submit" 
          disabled={loading || !contractAccepted}
          className="h-16 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98] mt-4"
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Finalizar Ordem de Serviço
            </div>
          )}
        </Button>

      </form>
    </div>
  );
}
