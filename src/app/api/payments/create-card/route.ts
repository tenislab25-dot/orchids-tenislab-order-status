import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Configurar Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || '',
});

const preference = new Preference(client);

export async function POST(request: NextRequest) {
  try {
    // API pública - não requer autenticação (cliente pode pagar sem login)
    const supabase = await createClient();

    // Pegar dados do body
    const { serviceOrderId, amount, couponId, discountAmount, couponCode } = await request.json();

    if (!serviceOrderId || !amount) {
      return NextResponse.json(
        { error: 'serviceOrderId e amount são obrigatórios' },
        { status: 400 }
      );
    }

    // Garantir que o valor seja um número válido
    const baseAmount = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(baseAmount) || baseAmount <= 0) {
      return NextResponse.json(
        { error: 'Valor inválido', details: `O valor "${amount}" não é um número válido` },
        { status: 400 }
      );
    }

    // Calcular valor com taxa de cartão (4,99%)
    const cardFee = Number(process.env.MERCADO_PAGO_CREDIT_CARD_FEE) || 0.0499;
    const totalAmount = baseAmount / (1 - cardFee);
    const feeAmount = totalAmount - baseAmount;

    // Buscar dados da OS
    const { data: serviceOrder, error: osError } = await supabase
      .from('service_orders')
      .select('*, clients(*)')
      .eq('id', serviceOrderId)
      .single();

    if (osError || !serviceOrder) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });
    }

    // Se tem cupom, atualizar OS e registrar uso
    if (couponId && discountAmount) {
      // Atualizar OS com cupom
      const { error: updateError } = await supabase
        .from('service_orders')
        .update({
          coupon_id: couponId,
          discount_amount: discountAmount,
          final_amount: baseAmount, // Valor final após desconto do cupom
          coupon_code: couponCode || null
        })
        .eq('id', serviceOrderId);

      if (updateError) {
        logger.error('Erro ao atualizar OS com cupom:', updateError);
      }

      // Registrar uso do cupom
      const { error: usageError } = await supabaseAdmin
        .from('coupon_usage')
        .insert({
          coupon_id: couponId,
          client_id: serviceOrder.client_id,
          service_order_id: serviceOrderId,
          discount_amount: discountAmount
        });

      if (usageError) {
        logger.error('Erro ao registrar uso do cupom:', usageError);
      }

      // Incrementar contador de uso do cupom
      const { error: incrementError } = await supabaseAdmin.rpc('increment_coupon_usage', {
        coupon_id_param: couponId
      });

      if (incrementError) {
        logger.error('Erro ao incrementar uso do cupom:', incrementError);
        // Fallback: incrementar manualmente
        const { data: coupon } = await supabaseAdmin
          .from('coupons')
          .select('times_used')
          .eq('id', couponId)
          .single();

        if (coupon) {
          await supabase
            .from('coupons')
            .update({ times_used: coupon.times_used + 1 })
            .eq('id', couponId);
        }
      }
    }

    // Limpar e validar dados do cliente
    const rawEmail = serviceOrder.clients?.email || 'contato@tenislab.app.br';
    const cleanEmail = rawEmail.trim().toLowerCase();
    const rawName = serviceOrder.clients?.name || 'Cliente TenisLab';
    const cleanName = rawName.trim().replace(/[\r\n\t]/g, ' ');
    const rawPhone = serviceOrder.clients?.phone || '82999999999';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    
    // Criar preferência de pagamento no Mercado Pago
    const preferenceData = {
      items: [
        {
          id: serviceOrderId,
          title: `Lavagem de tênis - OS #${serviceOrder.os_number}`,
          quantity: 1,
          unit_price: Number(totalAmount.toFixed(2)),
          currency_id: 'BRL',
        },
      ],
      payer: {
        name: cleanName,
        email: cleanEmail,
        phone: {
          area_code: cleanPhone.substring(0, 2) || '82',
          number: cleanPhone.substring(2) || '999999999',
        },
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tenislab.app.br'}/pagamento/${serviceOrderId}?payment=success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tenislab.app.br'}/pagamento/${serviceOrderId}?payment=failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tenislab.app.br'}/pagamento/${serviceOrderId}?payment=pending`,
      },
      auto_return: 'approved' as const,
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [
          { id: 'ticket' }, // Boleto
          { id: 'bank_transfer' }, // Transferência
          { id: 'atm' }, // Caixa eletrônico
        ],
        installments: 12, // Até 12 parcelas
      },
      statement_descriptor: 'TENISLAB',
      external_reference: serviceOrderId,
    };

    const mpPreference = await preference.create({ body: preferenceData });

    // Salvar pagamento no Supabase
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        service_order_id: serviceOrderId,
        mp_preference_id: mpPreference.id,
        amount: Number(amount),
        total_amount: Number(totalAmount.toFixed(2)),
        fee_amount: Number(feeAmount.toFixed(2)),
        payment_method: 'credit_card',
        status: 'pending',
        init_point: mpPreference.init_point,
      })
      .select()
      .single();

    if (paymentError) {
      logger.error('Erro ao salvar pagamento:', paymentError);
      return NextResponse.json(
        { error: 'Erro ao salvar pagamento no banco de dados' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: paymentRecord,
      init_point: mpPreference.init_point,
      total_amount: totalAmount.toFixed(2),
      fee_amount: feeAmount.toFixed(2),
    });
  } catch (error) {
    logger.error('Erro ao criar pagamento com cartão:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pagamento com cartão' },
      { status: 500 }
    );
  }
}
