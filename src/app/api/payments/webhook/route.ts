import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@/lib/supabase/server';

// Configurar Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

const payment = new Payment(client);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Webhook recebido:', JSON.stringify(body, null, 2));

    // Mercado Pago envia notificações de diferentes tipos
    // Vamos processar apenas notificações de pagamento
    if (body.type !== 'payment' && body.action !== 'payment.updated') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    
    if (!paymentId) {
      console.error('Payment ID não encontrado no webhook');
      return NextResponse.json({ error: 'Payment ID não encontrado' }, { status: 400 });
    }

    // Buscar detalhes do pagamento no Mercado Pago
    const mpPayment = await payment.get({ id: paymentId });

    console.log('Pagamento MP:', JSON.stringify(mpPayment, null, 2));

    // Criar cliente Supabase (sem autenticação, pois é webhook externo)
    const supabase = createClient();

    // Buscar pagamento no banco de dados
    const { data: existingPayment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('mp_payment_id', String(paymentId))
      .single();

    if (findError || !existingPayment) {
      console.error('Pagamento não encontrado no banco:', paymentId);
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }

    // Mapear status do Mercado Pago para nosso sistema
    const statusMap: Record<string, string> = {
      'approved': 'approved',
      'pending': 'pending',
      'in_process': 'in_process',
      'rejected': 'rejected',
      'cancelled': 'cancelled',
      'refunded': 'refunded',
    };

    const newStatus = statusMap[mpPayment.status || 'pending'] || 'pending';

    // Atualizar status do pagamento
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        metadata: mpPayment as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPayment.id);

    if (updateError) {
      console.error('Erro ao atualizar pagamento:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar pagamento' },
        { status: 500 }
      );
    }

    console.log(`Pagamento ${paymentId} atualizado para status: ${newStatus}`);

    return NextResponse.json({ received: true, status: newStatus });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}

// Permitir POST sem verificação CSRF (webhook externo)
export const dynamic = 'force-dynamic';
