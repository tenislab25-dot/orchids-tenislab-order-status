"use client";

import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useParams } from "next/navigation";
import { 
  CheckCircle2, 
  Copy, 
  QrCode, 
  CreditCard,
  Loader2,
  AlertCircle,
  ExternalLink,
  Ticket,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

interface OrderData {
  id: string;
  os_number: string;
  total: number;
  delivery_fee: number;
  payment_confirmed: boolean;
  client_id: string;
  clients: {
    name: string;
  } | null;
}

export default function PaymentPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPix, setGeneratingPix] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
  } | null>(null);
  const [cardData, setCardData] = useState<{
    init_point: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Estados do cupom
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  useEffect(() => {
    fetchOrder();
    
    // Realtime: Atualizar quando payment_confirmed mudar
    const channel = supabase
      .channel(`payment_${id}`)
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public",
          table: "service_orders",
          filter: `id=eq.${id}`
        },
        (payload) => {
          logger.log("Realtime payment update:", payload);
          // Atualizar apenas se payment_confirmed mudou
          if (payload.new && 'payment_confirmed' in payload.new) {
            setOrder((prev: any) => prev ? { ...prev, payment_confirmed: payload.new.payment_confirmed } : null);
            if (payload.new.payment_confirmed) {
              toast.success("Pagamento confirmado! ✅");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchOrder = async () => {
    try {
      // Tenta buscar primeiro pelo ID (UUID)
      let query = supabase
        .from("service_orders")
        .select(`
          id,
          os_number,
          total,
          delivery_fee,
          payment_confirmed,
          client_id,
          clients (
            name
          )
        `);

      // Verifica se o ID parece um UUID ou um número de OS
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      
      if (isUUID) {
        const { data, error } = await query.eq("id", id).single();
        if (!error && data) {
          setOrder(data as any);
          setLoading(false);
          return;
        }
      }

      // Se não for UUID ou não encontrar, tenta pelo número da OS
      const formattedId = id.replace("-", "/");
      const { data: dataByOS, error: errorByOS } = await query
        .or(`os_number.eq.${id},os_number.eq.${formattedId}`)
        .single();

      if (errorByOS) throw errorByOS;
      setOrder(dataByOS as any);
    } catch (error: any) {
      logger.error("Erro ao carregar OS:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Digite um código de cupom');
      return;
    }

    if (!order) return;

    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.toUpperCase(),
          clientId: order.client_id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setCouponError(data.error || 'Cupom inválido');
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon(data.coupon);
      setCouponError('');
      toast.success(`Cupom aplicado! ${data.coupon.discount_percent}% de desconto`);
    } catch (error) {
      setCouponError('Erro ao validar cupom');
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setAppliedCoupon(null);
    setCouponError('');
    toast.info('Cupom removido');
  };

  // Calcular valores com desconto
  const serviceValue = order ? order.total - (order.delivery_fee || 0) : 0;
  const discountAmount = appliedCoupon 
    ? (serviceValue * appliedCoupon.discount_percent) / 100 
    : 0;
  const finalServiceValue = serviceValue - discountAmount;
  const finalTotal = finalServiceValue + (order?.delivery_fee || 0);

  const handleGeneratePix = async () => {
    if (!order) return;
    
    setGeneratingPix(true);
    try {
      const response = await fetch('/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceOrderId: order.id,
          amount: finalTotal,
          couponId: appliedCoupon?.id || null,
          discountAmount: discountAmount,
          couponCode: appliedCoupon?.code || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar PIX');
      }

      setPixData({
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
      });

      toast.success('QR Code PIX gerado com sucesso!');
    } catch (error) {
      logger.error('Erro ao gerar PIX:', error);
      toast.error('Erro ao gerar PIX. Tente novamente.');
    } finally {
      setGeneratingPix(false);
    }
  };

  const handleGenerateCard = async () => {
    if (!order) return;
    
    setGeneratingCard(true);
    try {
      const response = await fetch('/api/payments/create-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceOrderId: order.id,
          amount: finalTotal,
          couponId: appliedCoupon?.id || null,
          discountAmount: discountAmount,
          couponCode: appliedCoupon?.code || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar link de pagamento');
      }

      setCardData({
        init_point: data.init_point,
      });

      toast.success('Link de pagamento gerado com sucesso!');
      
      // Redirecionar para o Mercado Pago
      window.location.href = data.init_point;
    } catch (error) {
      logger.error('Erro ao gerar link de pagamento:', error);
      toast.error('Erro ao gerar link de pagamento. Tente novamente.');
    } finally {
      setGeneratingCard(false);
    }
  };

  const handleCopyPixCode = () => {
    if (!pixData) return;
    navigator.clipboard.writeText(pixData.qr_code);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center gap-4">
        <AlertCircle className="w-12 h-12 text-slate-300" />
        <h1 className="text-xl font-bold text-slate-900">Pedido não encontrado</h1>
        <p className="text-slate-500">Verifique o link ou entre em contato conosco.</p>
        <Button asChild variant="outline" className="rounded-2xl">
          <Link href="/consulta" prefetch={false}>Consultar Status</Link>
        </Button>
      </div>
    );
  }

  if (order.payment_confirmed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900">Pagamento Confirmado!</h1>
          <p className="text-slate-500">Obrigado pela preferência, {order.clients?.name}!</p>
        </div>
        <Button asChild variant="outline" className="rounded-2xl h-12 px-8">
          <Link href="/" prefetch={false}>Voltar para página inicial</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white border-b border-slate-100 px-6 py-8 flex flex-col items-center gap-4">
        <div className="relative h-10 w-32">
          <img 
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/logo-1766879913032.PNG" 
            alt="TENISLAB"
            className="w-full h-full object-contain" 
            loading="eager" 
          />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-bold text-slate-900">Pagamento do Pedido</h1>
          <p className="text-xs font-bold text-blue-500 uppercase tracking-widest">OS #{order.os_number}</p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-6 space-y-6">
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6"
        >
          {/* Campo de Cupom */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">Cupom de Desconto</h3>
            </div>

            {!appliedCoupon ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Digite o código"
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 uppercase"
                    disabled={isValidatingCoupon}
                    onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponCode.trim()}
                    className="px-4 py-2 bg-amber-600 text-white text-sm rounded-xl font-bold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isValidatingCoupon ? '...' : 'Aplicar'}
                  </button>
                </div>
                {couponError && (
                  <p className="text-red-500 text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {couponError}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-amber-300">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{appliedCoupon.code}</p>
                    <p className="text-xs text-amber-600">-{appliedCoupon.discount_percent}% de desconto</p>
                  </div>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Resumo de Valores */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Serviço</span>
              <span>R$ {serviceValue.toFixed(2)}</span>
            </div>

            {appliedCoupon && (
              <div className="flex justify-between text-sm text-amber-600 font-bold">
                <span>Desconto ({appliedCoupon.discount_percent}%)</span>
                <span>- R$ {discountAmount.toFixed(2)}</span>
              </div>
            )}

            {order.delivery_fee > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>Frete</span>
                <span>R$ {order.delivery_fee.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
              <span className="font-bold text-lg text-slate-900">Total</span>
              <span className="font-black text-2xl text-blue-600">
                R$ {finalTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <Tabs defaultValue="pix" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 rounded-2xl">
              <TabsTrigger value="pix" className="rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <QrCode className="w-4 h-4 mr-2" />
                PIX
              </TabsTrigger>
              <TabsTrigger value="card" className="rounded-xl data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <CreditCard className="w-4 h-4 mr-2" />
                Cartão
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pix" className="space-y-4 mt-6">
              {!pixData ? (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-slate-600">
                      Valor a pagar
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      R$ {finalTotal.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      ✅ Aprovação instantânea
                    </p>
                  </div>

                  <Button 
                    onClick={handleGeneratePix}
                    disabled={generatingPix}
                    className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    {generatingPix ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando QR Code...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 mr-2" />
                        Gerar QR Code PIX
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 flex items-center justify-center">
                    <Image
                      src={`data:image/png;base64,${pixData.qr_code_base64}`}
                      alt="QR Code PIX"
                      width={200}
                      height={200}
                      className="w-full max-w-[200px] h-auto"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-center text-slate-500">
                      Ou copie o código PIX Copia e Cola:
                    </p>
                    <Button
                      onClick={handleCopyPixCode}
                      variant="outline"
                      className="w-full h-12 rounded-xl"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar Código PIX
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-center text-slate-500">
                    Abra o app do seu banco, escolha pagar com PIX e cole o código ou escaneie o QR Code
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="card" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-slate-600">
                    Valor a pagar
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {finalTotal.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">
                    💳 Pagamento seguro via Mercado Pago
                  </p>
                </div>

                <Button 
                  onClick={handleGenerateCard}
                  disabled={generatingCard}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {generatingCard ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando Link...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Gerar Link de Pagamento
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-slate-500">
                  Você será redirecionado para o Mercado Pago para finalizar o pagamento com cartão
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </motion.section>
      </main>
    </div>
  );
}
