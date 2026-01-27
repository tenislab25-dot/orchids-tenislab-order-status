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
    const supabase = await createClient();

    // Pegar dados do body
    const { serviceOrderId, amount } = await request.json();

    if (!serviceOrderId || !amount) {
      return NextResponse.json(
        { error: 'serviceOrderId e amount são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar dados da OS
    const { data: serviceOrder, error: osError } = await supabase
      .from('service_orders')
      .select('*, clients(*)')
      .eq('id', serviceOrderId)
      .single();

    if (osError || !serviceOrder) {
      return NextResponse.json({ error: 'Ordem de serviço não encontrada' }, { status: 404 });
    }

    // Criar pagamento PIX no Mercado Pago
    const paymentData = {
      transaction_amount: Number(amount),
      description: `Lavagem de tênis - OS #${serviceOrder.os_number}`,
      payment_method_id: 'pix',
      payer: {
        email: serviceOrder.clients?.email || 'cliente@tenislab.app.br',
        first_name: serviceOrder.clients?.name?.split(' ')[0] || 'Cliente',
        last_name: serviceOrder.clients?.name?.split(' ').slice(1).join(' ') || 'TenisLab',
      },
    };

    const mpPayment = await payment.create({ body: paymentData });

    // Extrair dados do PIX
    const pixData = mpPayment.point_of_interaction?.transaction_data;
    
    if (!pixData || !pixData.qr_code || !pixData.qr_code_base64) {
      return NextResponse.json(
        { error: 'Erro ao gerar PIX no Mercado Pago' },
        { status: 500 }
      );
    }

    // Salvar pagamento no Supabase
    const { data: paymentRecord, error: paymentError } = await supabase
      .from('payments')
      .insert({
        service_order_id: serviceOrderId,
        mp_payment_id: String(mpPayment.id),
        amount: Number(amount),
        total_amount: Number(amount),
        fee_amount: 0,
        payment_method: 'pix',
        status: 'pending',
        pix_qr_code: pixData.qr_code,
        pix_qr_code_base64: pixData.qr_code_base64,
        pix_copy_paste: pixData.qr_code,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Expira em 30 minutos
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
      qr_code: pixData.qr_code,
      qr_code_base64: pixData.qr_code_base64,
    });
  } catch (error) {
    console.error('Erro ao criar pagamento PIX:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pagamento PIX' },
      { status: 500 }
    );
  }
}
