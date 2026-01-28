'use client';

import { useState } from 'react';
import { logger } from "@/lib/logger";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Loader2, Copy, Check, CreditCard, QrCode, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrderId: string;
  amount: number;
  osNumber: string;
}

export function PaymentModal({
  open,
  onOpenChange,
  serviceOrderId,
  amount,
  osNumber,
}: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
  } | null>(null);
  const [cardData, setCardData] = useState<{
    init_point: string;
    total_amount: string;
    fee_amount: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePix = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceOrderId,
          amount,
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
      setLoading(false);
    }
  };

  const handleGenerateCard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/create-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceOrderId,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar link de pagamento');
      }

      setCardData({
        init_point: data.init_point,
        total_amount: data.total_amount,
        fee_amount: data.fee_amount,
      });

      toast.success('Link de pagamento gerado com sucesso!');
    } catch (error) {
      logger.error('Erro ao gerar link de pagamento:', error);
      toast.error('Erro ao gerar link de pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (pixData) {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cardFeePercentage = ((Number(cardData?.fee_amount || 0) / amount) * 100).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Pagamento - OS #{osNumber}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="pix" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pix" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              PIX
            </TabsTrigger>
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Cartão
            </TabsTrigger>
          </TabsList>

          {/* TAB PIX */}
          <TabsContent value="pix" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Valor a pagar</p>
                  <p className="text-3xl font-bold text-green-600">
                    R$ {amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ✅ Aprovação instantânea
                  </p>
                </div>

                {!pixData ? (
                  <Button
                    onClick={handleGeneratePix}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando QR Code...
                      </>
                    ) : (
                      'Gerar QR Code PIX'
                    )}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    {/* QR Code */}
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                        <Image
                          src={`data:image/png;base64,${pixData.qr_code_base64}`}
                          alt="QR Code PIX"
                          width={200}
                          height={200}
                        />
                      </div>
                    </div>

                    {/* Código Copia e Cola */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-center">
                        Ou copie o código:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pixData.qr_code}
                          readOnly
                          className="flex-1 px-3 py-2 text-xs border rounded-md bg-gray-50"
                        />
                        <Button
                          onClick={handleCopyPix}
                          variant="outline"
                          size="icon"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="text-center text-xs text-muted-foreground">
                      <p>⏱️ Este QR Code expira em 30 minutos</p>
                      <p className="mt-1">
                        O pagamento será confirmado automaticamente
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* TAB CARTÃO */}
          <TabsContent value="card" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Valor do serviço</p>
                  <p className="text-2xl font-semibold">R$ {amount.toFixed(2)}</p>
                  
                  {cardData && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        + Taxa de {cardFeePercentage}% (R$ {cardData.fee_amount})
                      </p>
                      <p className="text-3xl font-bold text-blue-600">
                        Total: R$ {cardData.total_amount}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        💳 Parcele em até 12x
                      </p>
                    </>
                  )}
                </div>

                {!cardData ? (
                  <Button
                    onClick={handleGenerateCard}
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando link...
                      </>
                    ) : (
                      'Gerar Link de Pagamento'
                    )}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <Button
                      onClick={() => window.open(cardData.init_point, '_blank')}
                      className="w-full"
                      size="lg"
                    >
                      Pagar com Cartão
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>

                    <div className="text-center text-xs text-muted-foreground space-y-1">
                      <p>🔒 Pagamento seguro via Mercado Pago</p>
                      <p>✅ Aprovação em até 2 minutos</p>
                      <p>💳 Aceita todos os cartões</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
