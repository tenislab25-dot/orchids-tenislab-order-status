import { NextRequest, NextResponse } from 'next/server';
import { createWebhookClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[WEBHOOK] Recebido:', JSON.stringify(body, null, 2));
    
    // Verificar tipo
    if (body.type !== 'payment') {
      console.log('[WEBHOOK] Tipo ignorado:', body.type);
      return NextResponse.json({ received: true });
    }

    // Verificar ação
    if (!body.action || (!body.action.includes('payment.created') && !body.action.includes('payment.updated'))) {
      console.log('[WEBHOOK] Ação ignorada:', body.action);
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    
    if (!paymentId) {
      console.error('[WEBHOOK] Payment ID não encontrado');
      return NextResponse.json({ received: true });
    }

    console.log('[WEBHOOK] Processando payment:', paymentId);

    // Criar cliente Supabase
    const supabase = createWebhookClient();

    // Buscar pagamento no banco
    const { data: existingPayment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('mp_payment_id', String(paymentId))
      .single();

    if (findError || !existingPayment) {
      console.error('[WEBHOOK] Pagamento não encontrado:', paymentId, findError);
      return NextResponse.json({ received: true });
    }

    console.log('[WEBHOOK] Pagamento encontrado:', existingPayment.id);

    // Determinar status
    // payment.updated geralmente significa aprovado
    const newStatus = body.action === 'payment.updated' ? 'approved' : 'pending';

    console.log('[WEBHOOK] Atualizando para:', newStatus);

    // Atualizar status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPayment.id);

    if (updateError) {
      console.error('[WEBHOOK] Erro ao atualizar:', updateError);
      return NextResponse.json({ received: true, error: updateError.message });
    }

    console.log('[WEBHOOK] ✅ Pagamento atualizado com sucesso!');
    
    return NextResponse.json({ 
      received: true,
      updated: true,
      paymentId,
      newStatus
    });
  } catch (error) {
    console.error('[WEBHOOK] Erro:', error);
    return NextResponse.json({ 
      received: true,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export const dynamic = 'force-dynamic';
