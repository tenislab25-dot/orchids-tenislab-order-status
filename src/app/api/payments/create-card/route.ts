import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { createClient } from '@/lib/supabase/server';

// Configurar Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN!,
});

const preference = new Preference(client);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Pegar dados do body
    const { serviceOrderId, amount } = await request.json();

    if (!serviceOrderId || !amount) {
      return NextResponse.json(
        { error: 'serviceOrderId e amount são obrigatórios' },
        { status: 400 }
      );
    }

    // Calcular valor com taxa de cartão (4,99%)
    const cardFee = Number(process.env.MERCADO_PAGO_CREDIT_CARD_FEE) || 0.0499;
    const totalAmount = Number(amount) / (1 - cardFee);
    const feeAmount = totalAmount - Number(amount);

    // Buscar dados da OS
    const { data: serviceOrder, error: osError } = await supabase
      .from('service_orders')
      .select('*, clients(*)')
      .eq('id', serviceOrderId)
      .single();

    if (osError || !serviceOrder) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });
    }

    // Criar preferência de pagamento no Mercado Pago
    const preferenceData = {
      items: [
        {
          title: `Lavagem de tênis - OS #${serviceOrder.os_number}`,
          quantity: 1,
          unit_price: Number(totalAmount.toFixed(2)),
          currency_id: 'BRL',
        },
      ],
      payer: {
        name: serviceOrder.clients?.name || 'Cliente TenisLab',
        email: serviceOrder.clients?.email || 'cliente@tenislab.app.br',
        phone: {
          area_code: serviceOrder.clients?.phone?.substring(0, 2) || '82',
          number: serviceOrder.clients?.phone?.substring(2) || '999999999',
        },
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tenislab.app.br'}/interno/os/${serviceOrderId}?payment=success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tenislab.app.br'}/interno/os/${serviceOrderId}?payment=failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL || 'https://tenislab.app.br'}/interno/os/${serviceOrderId}?payment=pending`,
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
      console.error('Erro ao salvar pagamento:', paymentError);
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
    console.error('Erro ao criar pagamento com cartão:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pagamento com cartão' },
      { status: 500 }
    );
  }
}
