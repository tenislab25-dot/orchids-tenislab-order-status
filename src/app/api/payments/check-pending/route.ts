import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { logger } from '@/lib/logger';

// GET /api/payments/check-pending - Verificar e atualizar pagamentos pendentes
export async function GET(request: NextRequest) {
  try {
    logger.log('[CHECK-PENDING] Iniciando verificação de pagamentos pendentes...');

    // Buscar todos os pagamentos PIX pendentes dos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: pendingPayments, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select('*, service_orders!inner(id, os_number)')
      .eq('payment_method', 'pix')
      .eq('status', 'pending')
      .gte('created_at', sevenDaysAgo.toISOString())
      .not('mp_payment_id', 'is', null);

    if (fetchError) {
      logger.error('[CHECK-PENDING] Erro ao buscar pagamentos:', fetchError);
      return NextResponse.json({ error: 'Erro ao buscar pagamentos' }, { status: 500 });
    }

    if (!pendingPayments || pendingPayments.length === 0) {
      logger.log('[CHECK-PENDING] Nenhum pagamento pendente encontrado');
      return NextResponse.json({ 
        message: 'Nenhum pagamento pendente encontrado',
        checked: 0,
        updated: 0
      });
    }

    logger.log(`[CHECK-PENDING] Encontrados ${pendingPayments.length} pagamentos pendentes`);

    const mpAccessToken = process.env.MP_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpAccessToken) {
      logger.error('[CHECK-PENDING] Token do Mercado Pago não configurado');
      return NextResponse.json({ error: 'Token do Mercado Pago não configurado' }, { status: 500 });
    }

    let updatedCount = 0;
    const results = [];

    for (const payment of pendingPayments) {
      try {
        logger.log(`[CHECK-PENDING] Verificando pagamento ${payment.mp_payment_id} da OS ${payment.service_orders?.os_number}`);

        // Consultar API do Mercado Pago
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment.mp_payment_id}`, {
          headers: {
            'Authorization': `Bearer ${mpAccessToken}`
          }
        });

        if (!mpResponse.ok) {
          logger.error(`[CHECK-PENDING] Erro ao consultar MP para pagamento ${payment.mp_payment_id}:`, mpResponse.status);
          results.push({
            os_number: payment.service_orders?.os_number,
            mp_payment_id: payment.mp_payment_id,
            status: 'error',
            message: `Erro ao consultar MP: ${mpResponse.status}`
          });
          continue;
        }

        const mpData = await mpResponse.json();
        const newStatus = mpData.status;

        logger.log(`[CHECK-PENDING] Status do MP para ${payment.mp_payment_id}: ${newStatus}`);

        // Se o status mudou, atualizar
        if (newStatus !== 'pending') {
          // Atualizar pagamento
          const { error: updateError } = await supabaseAdmin
            .from('payments')
            .update({
              status: newStatus,
              paid_at: newStatus === 'approved' ? new Date().toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', payment.id);

          if (updateError) {
            logger.error(`[CHECK-PENDING] Erro ao atualizar pagamento ${payment.id}:`, updateError);
            results.push({
              os_number: payment.service_orders?.os_number,
              mp_payment_id: payment.mp_payment_id,
              status: 'error',
              message: `Erro ao atualizar: ${updateError.message}`
            });
            continue;
          }

          // Se aprovado, atualizar OS
          if (newStatus === 'approved') {
            const { error: osError } = await supabaseAdmin
              .from('service_orders')
              .update({ payment_confirmed: true })
              .eq('id', payment.service_order_id);

            if (osError) {
              logger.error(`[CHECK-PENDING] Erro ao atualizar OS ${payment.service_orders?.os_number}:`, osError);
            } else {
              logger.log(`[CHECK-PENDING] ✅ OS ${payment.service_orders?.os_number} atualizada para pago`);
            }
          }

          updatedCount++;
          results.push({
            os_number: payment.service_orders?.os_number,
            mp_payment_id: payment.mp_payment_id,
            old_status: 'pending',
            new_status: newStatus,
            status: 'updated'
          });
        } else {
          results.push({
            os_number: payment.service_orders?.os_number,
            mp_payment_id: payment.mp_payment_id,
            status: 'still_pending'
          });
        }
      } catch (error: any) {
        logger.error(`[CHECK-PENDING] Erro ao processar pagamento ${payment.mp_payment_id}:`, error);
        results.push({
          os_number: payment.service_orders?.os_number,
          mp_payment_id: payment.mp_payment_id,
          status: 'error',
          message: error.message
        });
      }
    }

    logger.log(`[CHECK-PENDING] Verificação concluída. ${updatedCount} pagamentos atualizados de ${pendingPayments.length} verificados`);

    return NextResponse.json({
      message: 'Verificação concluída',
      checked: pendingPayments.length,
      updated: updatedCount,
      results
    });
  } catch (error: any) {
    logger.error('[CHECK-PENDING] Erro geral:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
