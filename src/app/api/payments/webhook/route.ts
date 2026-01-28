import { NextRequest, NextResponse } from 'next/server';
import { createWebhookClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.log('[WEBHOOK] Recebido:', JSON.stringify(body, null, 2));
    
    // Verificar tipo
    if (body.type !== 'payment') {
      logger.log('[WEBHOOK] Tipo ignorado:', body.type);
      return NextResponse.json({ received: true });
    }

    // Verificar ação
    if (!body.action || (!body.action.includes('payment.created') && !body.action.includes('payment.updated'))) {
      logger.log('[WEBHOOK] Ação ignorada:', body.action);
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    
    if (!paymentId) {
      logger.error('[WEBHOOK] Payment ID não encontrado');
      return NextResponse.json({ received: true });
    }

    logger.log('[WEBHOOK] Processando payment:', paymentId);

    // Criar cliente Supabase
    const supabase = createWebhookClient();

    // Buscar pagamento no banco pelo mp_payment_id
    const { data: existingPayment, error: findError } = await supabase
      .from('payments')
      .select('*, service_orders!inner(id, os_number)')
      .eq('mp_payment_id', String(paymentId))
      .single();

    if (findError || !existingPayment) {
      logger.error('[WEBHOOK] Pagamento não encontrado:', paymentId, findError);
      return NextResponse.json({ received: true });
    }

    logger.log('[WEBHOOK] Pagamento encontrado:', existingPayment.id);
    logger.log('[WEBHOOK] OS:', existingPayment.service_orders?.os_number);

    // Determinar status
    // payment.updated geralmente significa aprovado
    const newStatus = body.action === 'payment.updated' ? 'approved' : 'pending';

    logger.log('[WEBHOOK] Atualizando para:', newStatus);

    // Atualizar TODOS os pagamentos pendentes da mesma OS
    // Isso garante que mesmo que haja vários QR Codes gerados, todos sejam marcados como aprovados
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('service_order_id', existingPayment.service_order_id)
      .in('status', ['pending', 'in_process']);

    if (updateError) {
      logger.error('[WEBHOOK] Erro ao atualizar payments:', updateError);
      return NextResponse.json({ received: true, error: updateError.message });
    }

    logger.log('[WEBHOOK] Status dos payments atualizado com sucesso!');

    // TAMBÉM atualizar payment_confirmed na service_orders
    if (newStatus === 'approved') {
      const { error: osUpdateError } = await supabase
        .from('service_orders')
        .update({
          payment_confirmed: true,
          payment_confirmed_at: new Date().toISOString(),
        })
        .eq('id', existingPayment.service_order_id);

      if (osUpdateError) {
        logger.error('[WEBHOOK] Erro ao atualizar service_orders:', osUpdateError);
      } else {
        logger.log('[WEBHOOK] payment_confirmed atualizado na OS!');
      }

      // Registrar uso do cupom APENAS quando pagamento for aprovado
      const { data: serviceOrder } = await supabase
        .from('service_orders')
        .select('coupon_id, discount_amount, client_id')
        .eq('id', existingPayment.service_order_id)
        .single();

      if (serviceOrder?.coupon_id) {
        logger.log('[WEBHOOK] Registrando uso do cupom:', serviceOrder.coupon_id);

        // Registrar uso do cupom
        const { error: usageError } = await supabase
          .from('coupon_usage')
          .insert({
            coupon_id: serviceOrder.coupon_id,
            client_id: serviceOrder.client_id,
            service_order_id: existingPayment.service_order_id,
            discount_amount: serviceOrder.discount_amount || 0
          });

        if (usageError) {
          logger.error('[WEBHOOK] Erro ao registrar uso do cupom:', usageError);
        } else {
          logger.log('[WEBHOOK] Uso do cupom registrado com sucesso!');
        }

        // Incrementar contador de uso do cupom
        const { error: incrementError } = await supabase.rpc('increment_coupon_usage', {
          coupon_id_param: serviceOrder.coupon_id
        });

        if (incrementError) {
          logger.error('[WEBHOOK] Erro ao incrementar uso do cupom:', incrementError);
          // Fallback: incrementar manualmente
          const { data: coupon } = await supabase
            .from('coupons')
            .select('times_used')
            .eq('id', serviceOrder.coupon_id)
            .single();

          if (coupon) {
            await supabase
              .from('coupons')
              .update({ times_used: coupon.times_used + 1 })
              .eq('id', serviceOrder.coupon_id);
            logger.log('[WEBHOOK] Contador do cupom incrementado manualmente!');
          }
        } else {
          logger.log('[WEBHOOK] Contador do cupom incrementado com sucesso!');
        }
      }
    }

    return NextResponse.json({
      received: true,
      updated: true,
      paymentId,
      newStatus,
    });
  } catch (error) {
    logger.error('[WEBHOOK] Erro:', error);
    return NextResponse.json({ 
      received: true,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export const dynamic = 'force-dynamic';
