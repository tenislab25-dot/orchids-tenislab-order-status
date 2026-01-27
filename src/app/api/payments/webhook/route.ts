import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createWebhookClient } from '@/lib/supabase/server';

// Configurar Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || '',
});

const payment = new Payment(client);

export async function POST(request: NextRequest) {
  try {
    console.log('[WEBHOOK] Iniciando processamento...');
    
    const body = await request.json();
    
    console.log('[WEBHOOK] Body recebido:', JSON.stringify(body, null, 2));

    // Mercado Pago envia notificações de diferentes tipos
    // Vamos processar apenas notificações de pagamento
    if (body.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    // Aceitar tanto payment.created quanto payment.updated
    if (!body.action || (!body.action.includes('payment.created') && !body.action.includes('payment.updated'))) {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    
    if (!paymentId) {
      console.error('[WEBHOOK] Payment ID não encontrado no webhook');
      return NextResponse.json({ error: 'Payment ID não encontrado' }, { status: 400 });
    }

    console.log('[WEBHOOK] Payment ID:', paymentId);
    console.log('[WEBHOOK] Action:', body.action);

    // Criar cliente Supabase para webhook (usa Service Role Key)
    console.log('[WEBHOOK] Criando cliente Supabase...');
    const supabase = createWebhookClient();
    console.log('[WEBHOOK] Cliente Supabase criado com sucesso');

    // Buscar pagamento no banco de dados
    const { data: existingPayment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('mp_payment_id', String(paymentId))
      .single();

    console.log('[WEBHOOK] Resultado da busca:', { existingPayment, findError });
    
    if (findError || !existingPayment) {
      console.error('[WEBHOOK] Pagamento não encontrado no banco:', paymentId, findError);
      return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 });
    }
    
    console.log('[WEBHOOK] Pagamento encontrado no banco:', existingPayment.id);

    // Determinar novo status baseado na ação
    // payment.updated geralmente significa que o pagamento foi aprovado
    let newStatus = 'pending';
    
    if (body.action === 'payment.updated') {
      // Buscar detalhes do pagamento no Mercado Pago para confirmar status
      try {
        console.log('[WEBHOOK] Buscando status no Mercado Pago...');
        const mpPayment = await payment.get({ id: paymentId });
        console.log('[WEBHOOK] Status MP:', mpPayment.status);
        
        const statusMap: Record<string, string> = {
          'approved': 'approved',
          'pending': 'pending',
          'in_process': 'in_process',
          'rejected': 'rejected',
          'cancelled': 'cancelled',
          'refunded': 'refunded',
        };
        
        newStatus = statusMap[mpPayment.status || 'pending'] || 'pending';
      } catch (mpError) {
        console.error('[WEBHOOK] Erro ao buscar no MP, assumindo approved:', mpError);
        // Se falhar ao buscar no MP, assume approved (pois payment.updated geralmente é aprovação)
        newStatus = 'approved';
      }
    }

    // Atualizar status do pagamento
    console.log('[WEBHOOK] Atualizando status para:', newStatus);
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPayment.id);

    if (updateError) {
      console.error('[WEBHOOK] Erro ao atualizar pagamento:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar pagamento' },
        { status: 500 }
      );
    }

    console.log(`[WEBHOOK] Pagamento ${paymentId} atualizado para status: ${newStatus}`);

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
