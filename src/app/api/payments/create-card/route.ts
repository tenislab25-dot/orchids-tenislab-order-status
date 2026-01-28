import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Configurar Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() || '',
});

const preference = new Preference(client);

export async function POST(request: NextRequest) {
  try {
    // API pública - não requer autenticação (cliente pode pagar sem login)
    // Usar supabaseAdmin para bypassar RLS

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

    // Buscar dados da OS (usar supabaseAdmin para bypassar RLS)
    const { data: serviceOrder, error: osError } = await supabaseAdmin
      .from('service_orders')
      .select('*, clients(*)')
      .eq('id', serviceOrderId)
      .single();

    if (osError || !serviceOrder) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });
    }

    // Se tem cupom, atualizar OS e registrar uso
    if (couponId && discountAmount) {
      // Atualizar OS com cupom (usar supabaseAdmin para bypassar RLS)
      const { error: updateError } = await supabaseAdmin
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

      // NOTA: O registro de uso do cupom e incremento do contador
      // serão feitos apenas DEPOIS que o pagamento for confirmado,
      // no webhook do Mercado Pago (/api/payments/webhook)
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
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.tenislab.app.br'}/api/payments/webhook`,
    };

    const mpPreference = await preference.create({ body: preferenceData });

    // Salvar pagamento no Supabase (usar supabaseAdmin para bypassar RLS)
    const { data: paymentRecord, error: paymentError } = await supabaseAdmin
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
