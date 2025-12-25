"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  Package, 
  Calendar, 
  User, 
  FileText,
  ShieldCheck,
  Image as ImageIcon,
  Phone,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

// MOCK DATA for the specific OS
const MOCK_OS = {
  number: "007/2025",
  customer: "João Silva",
  phone: "(82) 99999-9999",
  entryDate: "25/12/2025",
  deliveryDate: "30/12/2025",
  items: [
    {
      number: "007/2025.1",
      services: ["Higienização", "Pintura"],
      notes: "Cuidado especial com o logo lateral.",
      photos: ["/placeholder-shoe-1.jpg"], // Placeholder paths
      value: 140.00
    }
  ],
  financial: {
    subtotal: 140.00,
    deliveryFee: 15.00,
    discount: 14.00, // 10%
    total: 141.00
  }
};

const TERMS_TEXT = `
TERMOS DE SERVIÇO E GARANTIA - TENISLAB

1. OBJETO DO SERVIÇO
A TENISLAB compromete-se a realizar os serviços de cuidado, limpeza e restauração de calçados conforme descritos nesta Ordem de Serviço.

2. ESTADO DO PRODUTO
O cliente declara que as fotos e observações anexadas representam o estado atual do calçado. A TENISLAB não se responsabiliza por danos pré-existentes não identificados ou desgaste natural decorrente do uso após o serviço.

3. PRAZOS
O prazo de entrega é uma estimativa. Eventuais atrasos por motivos de força maior ou complexidade do serviço serão comunicados.

4. GARANTIA
Oferecemos garantia de 30 dias para serviços de pintura e costura. A garantia não cobre danos por uso inadequado, contato com produtos químicos ou lavagem doméstica.

5. RETIRADA
Calçados não retirados em até 90 dias após a comunicação de finalização poderão ser doados para instituições de caridade.
`;

export default function CustomerAcceptancePage() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsConfirmed(true);
      setLoading(false);
    }, 1500);
  };

  const handleTrackOrder = () => {
    router.push(`/?os=${MOCK_OS.number}`);
  };

  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95">
        <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Serviço Aceito!</h1>
        <p className="text-slate-500 mb-8 max-w-[280px]">
          Obrigado, {MOCK_OS.customer.split(' ')[0]}! Sua ordem de serviço foi confirmada e já estamos trabalhando nela.
        </p>
        <div className="bg-slate-50 rounded-3xl p-6 w-full max-w-xs border border-slate-100 flex flex-col gap-2 shadow-sm mb-8">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</span>
          <Badge className="w-fit mx-auto bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-4 py-1 text-xs font-bold">
            Recebido (confirmado pelo cliente)
          </Badge>
        </div>

        <Button 
          variant="outline"
          onClick={handleTrackOrder}
          className="h-14 w-full max-w-xs rounded-2xl border-slate-200 text-slate-600 font-bold flex gap-2 items-center hover:bg-slate-50 transition-all active:scale-[0.98]"
        >
          <Search className="w-5 h-5" />
          Acompanhar status do pedido
        </Button>
        
        <footer className="mt-12">
          <div className="flex items-baseline gap-1 justify-center mb-1">
            <span className="text-xl font-black text-slate-900 tracking-tighter">TENIS</span>
            <span className="text-xl font-light text-blue-500 tracking-tighter">LAB</span>
          </div>
          <p className="text-[10px] text-slate-300 uppercase tracking-[0.2em] font-bold">
            Premium Sneakers Care
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-6 flex flex-col items-center gap-3 shadow-sm sticky top-0 z-30">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-slate-900 tracking-tighter">TENIS</span>
          <span className="text-3xl font-light text-blue-500 tracking-tighter">LAB</span>
        </div>
        <p className="text-slate-500 text-xs font-bold text-center leading-tight max-w-[200px]">
          Confira os detalhes do seu serviço antes de confirmar
        </p>
      </header>

      <main className="max-w-md mx-auto p-4 flex flex-col gap-6 mt-2">
        
        {/* ORDER SUMMARY */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Número da OS</span>
              <span className="text-2xl font-black text-slate-900">{MOCK_OS.number}</span>
            </div>
            <Badge variant="outline" className="border-blue-100 text-blue-600 bg-blue-50 font-bold px-3 py-1">
              Aguardando Aceite
            </Badge>
          </div>

            <div className="grid grid-cols-1 gap-4 pt-2 border-t border-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1">Cliente</span>
                    <span className="text-sm font-bold text-slate-800">{MOCK_OS.customer}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1">WhatsApp</span>
                    <span className="text-sm font-bold text-slate-800">{MOCK_OS.phone}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1">Entrada</span>
                  <span className="text-sm font-bold text-slate-800">{MOCK_OS.entryDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none mb-1">Entrega Prevista</span>
                  <span className="text-sm font-bold text-slate-800">{MOCK_OS.deliveryDate}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ITEMS */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
              <Package className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Seus Itens</h2>
          </div>

          {MOCK_OS.items.map((item) => (
            <Card key={item.number} className="rounded-3xl border-slate-200 shadow-sm overflow-hidden border-none">
              <CardHeader className="bg-slate-50/50 py-3 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  ITEM {item.number}
                </CardTitle>
                <span className="text-xs font-black text-slate-900">
                  R$ {item.value.toFixed(2)}
                </span>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Photos View */}
                <div className="flex gap-2">
                  <div className="w-full h-40 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden relative group">
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                    <div className="absolute inset-0 bg-slate-900/10 flex items-end p-4">
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-slate-900/40 backdrop-blur-md px-3 py-1 rounded-full">
                        Foto de Entrada
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Serviços Contratados</Label>
                    <div className="flex flex-wrap gap-2">
                      {item.services.map(s => (
                        <Badge key={s} className="bg-blue-50 text-blue-600 border-none hover:bg-blue-50 px-4 py-1.5 rounded-xl font-bold text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {item.notes && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Observações</Label>
                      <p className="text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 italic leading-relaxed">
                        "{item.notes}"
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FINANCIAL SUMMARY */}
        <section className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl text-white flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/50">Resumo de Valores</h2>
            <FileText className="w-4 h-4 text-blue-400" />
          </div>

          <div className="space-y-3 pb-6 border-b border-white/10">
            <div className="flex justify-between text-xs font-bold text-white/60">
              <span>Subtotal</span>
              <span>R$ {MOCK_OS.financial.subtotal.toFixed(2)}</span>
            </div>
            {MOCK_OS.financial.deliveryFee > 0 && (
              <div className="flex justify-between text-xs font-bold text-white/60">
                <span>Taxa de Entrega</span>
                <span>R$ {MOCK_OS.financial.deliveryFee.toFixed(2)}</span>
              </div>
            )}
            {MOCK_OS.financial.discount > 0 && (
              <div className="flex justify-between text-xs font-bold text-green-400">
                <span>Desconto</span>
                <span>- R$ {MOCK_OS.financial.discount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-white/40 font-black uppercase tracking-widest">Total Final</span>
            <span className="text-4xl font-black tracking-tighter text-white">
              R$ {MOCK_OS.financial.total.toFixed(2)}
            </span>
          </div>
        </section>

        {/* TERMS & WARRANTY */}
        <section className="flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Termos & Garantia</h2>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-3xl p-6 h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
            <pre className="text-[11px] text-slate-500 whitespace-pre-wrap font-sans leading-relaxed">
              {TERMS_TEXT}
            </pre>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-start gap-4 shadow-sm active:bg-slate-50 transition-colors cursor-pointer" onClick={() => setAccepted(!accepted)}>
            <Checkbox 
              id="terms" 
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
              className="h-6 w-6 rounded-lg border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0 mt-0.5"
            />
            <label htmlFor="terms" className="text-xs font-bold text-slate-700 leading-snug cursor-pointer select-none">
              Li e concordo com os termos de serviço e garantia da TENISLAB.
            </label>
          </div>
        </section>

        {/* PRIMARY ACTION */}
        <div className="flex flex-col gap-3 mt-4 mb-10">
          <Button 
            disabled={!accepted || loading}
            onClick={handleConfirm}
            className="h-16 rounded-[2rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-lg shadow-2xl transition-all active:scale-[0.97] disabled:opacity-50 disabled:grayscale"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                CONFIRMAR E ACEITAR SERVIÇO
              </div>
            )}
          </Button>

          <Button 
            variant="outline"
            onClick={handleTrackOrder}
            className="h-14 rounded-2xl border-slate-200 text-slate-600 font-bold flex gap-2 items-center hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            <Search className="w-5 h-5" />
            Ver status do pedido
          </Button>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-8 text-center bg-slate-100">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.2em] font-bold">
          © 2025 TENISLAB • Premium Sneakers Care
        </p>
      </footer>
    </div>
  );
}
