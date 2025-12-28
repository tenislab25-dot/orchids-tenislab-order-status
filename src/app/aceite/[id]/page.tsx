"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  Package, 
  Calendar, 
  User, 
  FileText,
  ShieldCheck,
  Phone,
  Search,
  X,
  ZoomIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const TERMS_TEXT = `
TERMOS DE SERVIÇO E GARANTIA - tenislab.

1. Condições Gerais
Ao autorizar o serviço de higienização, restauração, pintura ou qualquer outro procedimento oferecido pela TênisLab, o(a) cliente declara estar ciente e de acordo com os seguintes termos.

2. Avaliação e Execução dos Serviços
Todos os serviços são realizados com produtos profissionais e técnicas específicas para cada tipo de material. Caso o calçado apresente desgaste, manchas antigas, oxidação, descolamentos, desbotamentos, rasgos ou falhas de colagem, a TênisLab não se responsabiliza por danos preexistentes ou resultados parciais decorrentes do estado do material.

3. Manchas, Oxidações e Desgastes Permanentes
Alguns tipos de manchas, oxidações e desbotamentos podem ser irreversíveis e não podem ser totalmente removidos, mesmo com o uso das melhores técnicas e produtos disponíveis. A equipe TênisLab compromete-se a empregar o máximo esforço técnico para amenizar esses danos, mas não garante a remoção completa.

4. Prazos de Entrega
Os prazos informados (5 dias úteis, 72h ou 24h Express) começam a contar A PARTIR DO ACEITE DO CLIENTE para o pedido ser iniciado. A data de entrega prevista será calculada automaticamente após a confirmação do aceite nesta página. Situações excepcionais — como secagem prolongada, condições climáticas desfavoráveis ou intercorrências no processo — poderão prorrogar o prazo, mediante comunicação prévia ao cliente.

5. Coleta, Entrega e Armazenamento
A coleta e entrega são realizadas mediante taxa fixa previamente informada. Após a conclusão do serviço, o cliente será comunicado. Calçados não retirados em até 30 dias poderão ser destinados ao descarte ou doação, conforme previsto em direito de guarda temporária.

6. Responsabilidade Limitada
A TênisLab utiliza produtos e técnicas profissionais que preservam ao máximo a integridade dos materiais. Ainda assim, devido à diversidade de tecidos, composições químicas e ao desgaste natural dos calçados, podem ocorrer alterações leves de tonalidade, textura ou brilho, especialmente em materiais sensíveis ou já oxidados. Essas variações são naturais do processo de higienização e restauração profissional e não configuram dano ao produto.

A TênisLab não se responsabiliza por:
• Descolamentos ou falhas estruturais decorrentes de colas antigas ou materiais frágeis;
• Manchas, rachaduras ou desbotamentos pré-existentes;
• Danos decorrentes de infiltração, mofo, oxidação ou uso inadequado anterior.

7. Autorização de Imagem
O cliente autoriza, caso concorde, o uso de imagens “antes e depois” dos serviços prestados, exclusivamente para divulgação no perfil @tenislabr e em materiais promocionais da marca.

8. Aceite e Concordância
O envio do calçado para serviço, bem como a assinatura ou aceite digital da Ordem de Serviço, configuram concordância integral com esta cláusula contratual.

---

TERMO DE GARANTIA

Garantia válida por: 30 dias após a entrega do serviço.
A contagem dos 30 dias de garantia inicia-se a partir da data de entrega efetiva do calçado ao cliente.

A TenisLab oferece garantia contratual para os seguintes serviços:

1. Pintura de Solado / Cabedal
Cobertura: descascamento da tinta por falha de aplicação, manchamento causado por erro técnico, diferença evidente de tonalidade decorrente do processo de pintura.
Não cobre: danos causados por atrito excessivo, uso inadequado, contato com produtos químicos, calor, água em excesso ou desgaste natural. riscos, cortes, dobras ou abrasão gerados pelo uso.

2. Colagem
Cobertura: descolamento em áreas reparadas pela TenisLab causado por falha técnica.
Não cobre: descolamentos novos em regiões não reparadas, danos por calor excessivo, água, lavagem inadequada ou uso indevido do calçado.

3. Clareamento de Midsole / Entressola
Cobertura: retorno acelerado do amarelado quando ocorrer por falha no processo de limpeza ou neutralização.
Importante: o clareamento não impede o processo natural de oxidação do material. dependendo do grau de oxidação, o resultado pode variar e não é garantido como “permanente”.

Condições gerais da garantia
• A garantia só é aplicada mediante apresentação do calçado e análise técnica da TenisLab.
• Não cobre danos físicos causados após o uso, quedas, atrito forte, impactos, contato com substâncias químicas ou tentativa de reparo por terceiros.
• Caso seja comprovada falha técnica, o serviço será refeito sem custo dentro do prazo da garantia.
• Caso seja constatado mau uso, o cliente poderá solicitar o serviço novamente, porém será cobrado normalmente.
`;

export default function CustomerAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        *,
        clients (
          name,
          phone
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      toast.error("Ordem de serviço não encontrada");
    } else {
      setOrder(data);
      // If already accepted or in progress, show confirmed screen
      if (data.status !== "Recebido" && data.status !== "Cancelado") {
        setIsConfirmed(true);
      }
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    
    const acceptedAt = new Date().toISOString();
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    const deliveryDateStr = deliveryDate.toISOString().split('T')[0];
    
    const { error } = await supabase
      .from("service_orders")
      .update({ 
        status: "Em espera",
        accepted_at: acceptedAt,
        delivery_date: deliveryDateStr
      })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao confirmar serviço");
    } else {
      setOrder({ ...order, status: "Em espera", accepted_at: acceptedAt, delivery_date: deliveryDateStr });
      setIsConfirmed(true);
      toast.success("Serviço aceito com sucesso!");
    }
    setConfirming(false);
  };

  const handleTrackOrder = () => {
    router.push(`/consulta?os=${order.os_number}&phone=${order.clients?.phone}`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-xl font-bold">Ordem não encontrada</h1>
      <Button asChild className="mt-4">
        <button onClick={() => router.push("/")}>Voltar ao Início</button>
      </Button>
    </div>
  );

  if (order.status === "Cancelado") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <img 
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=8000&height=8000&resize=contain" 
          alt="TENISLAB Logo" 
          className="h-40 w-auto object-contain mb-8"
        />
        <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <ShieldCheck className="w-12 h-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Ordem Cancelada</h1>
        <p className="text-slate-500 mb-8 max-w-[280px]">
          Esta ordem de serviço ({order.os_number}) foi cancelada e não pode mais ser aceita.
        </p>
        <Button 
          variant="outline"
          onClick={() => router.push("/")}
          className="h-14 w-full max-w-xs rounded-2xl border-slate-200 text-slate-600 font-bold"
        >
          Voltar para Home
        </Button>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95">
        <img 
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=8000&height=8000&resize=contain" 
          alt="TENISLAB Logo" 
          className="h-40 w-auto object-contain mb-8"
        />
        <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Serviço Aceito!</h1>
        <p className="text-slate-500 mb-8 max-w-[280px]">
          Obrigado, {order.clients?.name.split(' ')[0]}! Sua ordem de serviço foi confirmada e já estamos trabalhando nela.
        </p>
        <div className="bg-slate-50 rounded-3xl p-6 w-full max-w-xs border border-slate-100 flex flex-col gap-2 shadow-sm mb-8">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</span>
            <Badge className="w-fit mx-auto bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-4 py-1 text-xs font-bold">
              {order.status}
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
      </div>
    );
  }

    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <header className="bg-white border-b border-slate-100 px-6 py-10 flex flex-col items-center gap-6 shadow-sm sticky top-0 z-30">
            <img 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766845000340.PNG?width=8000&height=8000&resize=contain" 
              alt="TENISLAB Logo" 
              className="h-24 w-auto object-contain"
            />
          <div className="flex flex-col items-center gap-1">
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Confirmação de Pedido</h1>
            <p className="text-slate-400 text-[10px] font-bold text-center leading-tight uppercase tracking-widest">
              Laboratório de Restauração de Tênis
            </p>
          </div>
        </header>
  
        <main className="max-w-md mx-auto p-4 flex flex-col gap-6 mt-4">
          <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ordem de Serviço</span>
                <span className="text-3xl font-black text-slate-900 tracking-tighter">{order.os_number}</span>
              </div>
              <div className="bg-blue-50 text-blue-600 font-black text-[10px] px-4 py-2 rounded-full uppercase tracking-widest border border-blue-100">
                Aguardando Aceite
              </div>
            </div>
  
            <div className="grid grid-cols-1 gap-6 pt-6 border-t border-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                    <User className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Cliente</span>
                    <span className="text-base font-bold text-slate-900 leading-none">{order.clients?.name}</span>
                  </div>
                </div>
  
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                      <Package className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Entrada</span>
                      <span className="text-xs font-bold text-slate-800">
                        {new Date(order.entry_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                      <Calendar className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Previsão</span>
                      <span className="text-xs font-bold text-slate-800">
                        {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('pt-BR') : '5 dias úteis'}
                      </span>
                    </div>
                  </div>
                </div>
            </div>
          </section>
  
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Itens da sua OS</h2>
              <span className="text-[10px] font-bold text-slate-400">{order.items.length} {order.items.length === 1 ? 'Par' : 'Pares'}</span>
            </div>
  
            {order.items.map((item: any) => (
              <Card key={item.itemNumber} className="rounded-[2rem] border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 py-4 px-6 border-b border-slate-100 flex flex-row items-center justify-between">
                  <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    ITEM {item.itemNumber}
                  </CardTitle>
                  <div className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm shadow-blue-100">
                    R$ {item.services.reduce((acc: number, s: any) => acc + Number(s.price || 0), 0).toFixed(2)}
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {item.photos && item.photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {item.photos.map((photo: string, pIdx: number) => (
                        <div 
                          key={pIdx} 
                          className="relative aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-sm cursor-pointer active:scale-[0.98] transition-all"
                          onClick={() => setSelectedImage(photo)}
                        >
                          <img src={photo} alt={`Foto do item ${item.itemNumber}`} className="object-cover w-full h-full" />
                          <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center border border-slate-100 shadow-sm">
                            <ZoomIn className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Serviços Contratados</Label>
                    <div className="flex flex-col gap-2">
                      {item.services.map((s: any) => (
                        <div key={s.id || s.name} className="flex flex-col bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              <span className="text-sm font-bold text-slate-800 leading-tight">{s.name}</span>
                            </div>
                            <span className="text-sm font-black text-slate-900 whitespace-nowrap">R$ {Number(s.price || 0).toFixed(2)}</span>
                          </div>
                          {s.description && (
                            <p className="text-[11px] text-slate-500 mt-1.5 ml-3.5 leading-relaxed">{s.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
  
                  {item.notes && (
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações Técnicas</Label>
                      <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 italic text-xs text-slate-600 leading-relaxed">
                        "{item.notes}"
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
  
          <section className="bg-slate-900 rounded-[2.5rem] p-8 shadow-xl text-white flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Resumo Financeiro</h2>
              <FileText className="w-5 h-5 text-blue-400/50" />
            </div>
  
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold text-white/60 uppercase tracking-widest">
                <span>Subtotal dos Itens</span>
                <span className="text-white">R$ {(Number(order.total) + Number(order.discount_percent || 0) - Number(order.delivery_fee || 0)).toFixed(2)}</span>
              </div>
              
              {order.delivery_fee > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-white/60 uppercase tracking-widest">
                  <span>Taxa de Entrega</span>
                  <span className="text-green-400">+ R$ {Number(order.delivery_fee).toFixed(2)}</span>
                </div>
              )}
              
              {order.discount_percent > 0 && (
                <div className="flex justify-between items-center text-xs font-bold text-white/60 uppercase tracking-widest">
                  <span>Desconto Aplicado</span>
                  <span className="text-red-400">- R$ {Number(order.discount_percent).toFixed(2)}</span>
                </div>
              )}
            </div>
  
            <div className="h-px bg-white/10" />
  
            <div className="flex flex-col gap-1 items-end">
              <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Valor Total do Pedido</span>
              <span className="text-5xl font-black tracking-tighter text-blue-400">
                R$ {Number(order.total).toFixed(2)}
              </span>
            </div>
          </section>
  
          <section className="flex flex-col gap-4 pt-4">
            <div className="flex items-center gap-2 px-1">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Termos de Serviço & Garantia</h2>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 h-56 overflow-y-auto shadow-inner">
              <pre className="text-[10px] text-slate-500 whitespace-pre-wrap font-sans leading-relaxed text-justify">
                {TERMS_TEXT}
              </pre>
            </div>
  
            <div 
              className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-start gap-4 ${
                accepted 
                ? "bg-blue-50 border-blue-200 shadow-sm" 
                : "bg-white border-slate-100 hover:border-slate-200"
              }`}
              onClick={() => setAccepted(!accepted)}
            >
              <Checkbox 
                id="terms" 
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked as boolean)}
                className="h-6 w-6 rounded-lg border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shrink-0 mt-0.5"
              />
              <label htmlFor="terms" className="text-xs font-bold text-slate-700 leading-snug cursor-pointer select-none">
                Confirmo que revisei todos os itens e concordo com os termos de serviço e garantia da tenislab.
              </label>
            </div>
          </section>
  
          <div className="flex flex-col gap-4 mt-6 mb-12">
            <Button 
              disabled={!accepted || confirming}
              onClick={handleConfirm}
              className="h-20 rounded-[2.5rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-xl shadow-2xl shadow-slate-200 transition-all active:scale-[0.96] disabled:opacity-50 disabled:grayscale"
            >
              {confirming ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-7 h-7" />
                  CONFIRMAR PEDIDO
                </div>
              )}
            </Button>
  
            <Button 
              variant="ghost"
              onClick={handleTrackOrder}
              className="h-14 rounded-2xl text-slate-500 font-bold flex gap-2 items-center hover:bg-slate-100 transition-all"
            >
              <Search className="w-5 h-5" />
              Apenas acompanhar status
            </Button>
          </div>
  
          {/* Lightbox e outros modais mantidos conforme original */}
          <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
            <DialogContent className="max-w-[95vw] lg:max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
              {selectedImage && (
                <div className="relative w-full h-full flex flex-col items-center justify-center animate-in zoom-in duration-300">
                  <div className="absolute top-4 right-4 z-50">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-white bg-black/40 hover:bg-black/60 rounded-full w-10 h-10"
                      onClick={() => setSelectedImage(null)}
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>
                  <img 
                    src={selectedImage} 
                    alt="Visualização ampliada" 
                    className="max-w-full max-h-[90vh] object-contain rounded-[2.5rem] shadow-2xl"
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
  
        <footer className="py-12 text-center flex flex-col gap-4">
          <p className="text-slate-300 text-[10px] uppercase tracking-[0.3em] font-black">
            tenislab. o laboratório do seu tênis
          </p>
        </footer>
      </div>
    );
}
