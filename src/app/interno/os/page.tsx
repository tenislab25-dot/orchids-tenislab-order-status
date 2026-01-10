"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Camera, 
  Loader2, 
  CheckCircle2,
  X,
  Star,
  Search,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Package,
  CreditCard,
  Percent,
  Truck,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-utils";

type Status = "Recebido" | "Em espera" | "Em serviço" | "Em finalização" | "Pronto para entrega ou retirada" | "Entregue" | "Cancelado";

interface Service {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface OrderItem {
  brand: string;
  model: string;
  services: Service[];
  customService: { name: string; price: number };
  before_photos: string[];
  after_photos: string[];
  status: string;
  subtotal: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Pix");
  const [payOnEntry, setPayOnEntry] = useState(false);
  const [priority, setPriority] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [osNumber, setOsNumber] = useState("");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    fetchClients();
    fetchServices();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await supabase.from("clients").select("*").order("name");
    if (!error) setClients(data);
  };

  const fetchServices = async () => {
    const { data, error } = await supabase.from("services").select("*").order("name");
    if (!error) setServices(data);
  };

  const addItem = () => {
    setItems([...items, {
      brand: "",
      model: "",
      services: [],
      customService: { name: "", price: 0 },
      before_photos: [],
      after_photos: [],
      status: "Pendente",
      subtotal: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalcular subtotal do item
    let subtotal = newItems[index].services.reduce((acc, s) => acc + s.price, 0);
    subtotal += Number(newItems[index].customService.price || 0);
    newItems[index].subtotal = subtotal;
    
    setItems(newItems);
  };

  const calculateTotal = () => {
    const itemsTotal = items.reduce((acc, item) => acc + item.subtotal, 0);
    const discount = (itemsTotal * discountPercent) / 100;
    return itemsTotal - discount + Number(deliveryFee);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, itemIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedFile = await compressImage(file);
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from("photos").upload(`temp/${fileName}`, compressedFile);
      
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("photos").getPublicUrl(data.path);
      
      const newItems = [...items];
      newItems[itemIndex].before_photos.push(publicUrl);
      setItems(newItems);
      toast.success("Foto adicionada!");
    } catch (error: any) {
      toast.error("Erro ao enviar foto: " + error.message);
    }
  };

  const handleSubmit = async () => {
    if (!selectedClient) return toast.error("Selecione um cliente");
    if (items.length === 0) return toast.error("Adicione pelo menos um item");

    setLoading(true);
    try {
      const total = calculateTotal();
      const { data: lastOrder } = await supabase.from("service_orders").select("os_number").order("created_at", { ascending: false }).limit(1).single();
      
      let nextNumber = 1;
      if (lastOrder) {
        const lastNum = parseInt(lastOrder.os_number.split("/")[0]);
        nextNumber = lastNum + 1;
      }
      const formattedOsNumber = `${nextNumber.toString().padStart(3, "0")}/${new Date().getFullYear()}`;

      const { data, error } = await supabase.from("service_orders").insert({
        client_id: selectedClient.id,
        os_number: formattedOsNumber,
        status: "Recebido",
        items,
        total,
        payment_method: paymentMethod,
        pay_on_entry: payOnEntry,
        delivery_fee: deliveryFee,
        discount_percent: discountPercent,
        priority,
        entry_date: new Date().toISOString(),
        payment_confirmed: payOnEntry
      }).select().single();

      if (error) throw error;

      setOsNumber(formattedOsNumber);
      setOrderId(data.id);
      setShowSuccessDialog(true);
      toast.success("OS Criada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao criar OS: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendWhatsAppLink = () => {
    if (!selectedClient) return;
    const cleanPhone = selectedClient.phone.replace(/\D/g, "");
    const whatsappPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const link = `${window.location.origin}/aceite/${orderId}`;
    const message = encodeURIComponent(`Olá ${selectedClient.name}! Sua OS #${osNumber} foi criada. Por favor, acesse o link para conferir e dar o aceite digital: ${link}`);
    window.open(`https://wa.me/${whatsappPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link href="/interno/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-slate-900">Nova Ordem de Serviço</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Seleção de Cliente */}
        <section className="space-y-3">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cliente</Label>
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardContent className="p-4 space-y-4">
              {!selectedClient ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Buscar cliente..." 
                      className="pl-10 h-12 rounded-2xl border-slate-100 bg-slate-50"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(client => (
                      <Button 
                        key={client.id} 
                        variant="ghost" 
                        className="w-full justify-start h-12 rounded-xl hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => setSelectedClient(client)}
                      >
                        <User className="w-4 h-4 mr-2" />
                        {client.name}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                      {selectedClient.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-blue-900">{selectedClient.name}</p>
                      <p className="text-xs text-blue-600">{selectedClient.phone}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedClient(null)} className="text-blue-400">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Itens */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens do Pedido</Label>
            <Button variant="ghost" size="sm" onClick={addItem} className="text-blue-600 font-bold text-xs">
              <Plus className="w-4 h-4 mr-1" /> Adicionar Item
            </Button>
          </div>

          {items.map((item, idx) => (
            <Card key={idx} className="rounded-3xl border-none shadow-sm overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[10px]">ITEM {idx + 1}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Marca</Label>
                    <Input 
                      placeholder="Ex: Nike" 
                      className="h-12 rounded-2xl border-slate-100 bg-slate-50"
                      value={item.brand}
                      onChange={(e) => updateItem(idx, "brand", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Modelo</Label>
                    <Input 
                      placeholder="Ex: Air Max" 
                      className="h-12 rounded-2xl border-slate-100 bg-slate-50"
                      value={item.model}
                      onChange={(e) => updateItem(idx, "model", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Serviços</Label>
                  <div className="flex flex-wrap gap-2">
                    {services.map(service => (
                      <Button
                        key={service.id}
                        variant={item.services.find(s => s.id === service.id) ? "default" : "outline"}
                        size="sm"
                        className="rounded-full text-[10px] font-bold h-8"
                        onClick={() => {
                          const exists = item.services.find(s => s.id === service.id);
                          const newServices = exists 
                            ? item.services.filter(s => s.id !== service.id)
                            : [...item.services, service];
                          updateItem(idx, "services", newServices);
                        }}
                      >
                        {service.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold">Fotos (Antes)</Label>
                  <div className="flex flex-wrap gap-2">
                    {item.before_photos.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-2xl overflow-hidden border border-slate-100">
                        <img src={url} alt="Antes" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, idx)} />
                      <Camera className="w-5 h-5 text-slate-300" />
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Resumo e Pagamento */}
        <section className="space-y-4">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pagamento e Entrega</Label>
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Método</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Cartão">Cartão</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Desconto (%)</Label>
                  <Input 
                    type="number" 
                    className="h-12 rounded-2xl border-slate-100 bg-slate-50"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Checkbox id="payOnEntry" checked={payOnEntry} onCheckedChange={(checked) => setPayOnEntry(!!checked)} />
                  <Label htmlFor="payOnEntry" className="text-xs font-bold">Pago na Entrada</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="priority" checked={priority} onCheckedChange={(checked) => setPriority(!!checked)} />
                  <Label htmlFor="priority" className="text-xs font-bold text-amber-600">Prioridade</Label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-sm font-medium text-slate-500">
                  <span>Subtotal</span>
                  <span>R$ {items.reduce((acc, item) => acc + item.subtotal, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-black text-slate-900">
                  <span>Total</span>
                  <span className="text-blue-600">R$ {calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Button 
          className="w-full h-16 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-white font-black text-lg shadow-lg shadow-blue-200"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : "CRIAR ORDEM DE SERVIÇO"}
        </Button>
      </main>

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
    </div>
  );
}
