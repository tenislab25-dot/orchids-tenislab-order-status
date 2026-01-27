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
    // Garantir que o valor seja um número válido com 2 casas decimais
    const transactionAmount = parseFloat(String(amount).replace(',', '.'));
    if (isNaN(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json(
        { error: 'Valor inválido', details: `O valor "${amount}" não é um número válido` },
        { status: 400 }
      );
    }

    // Limpar e validar email
    const rawEmail = serviceOrder.clients?.email || 'contato@tenislab.app.br';
    const cleanEmail = rawEmail.trim().toLowerCase();
    
    // Limpar nome (remover caracteres especiais que podem causar problemas em HTTP headers)
    const rawName = serviceOrder.clients?.name || 'Cliente TenisLab';
    const cleanName = rawName.trim().replace(/[\r\n\t]/g, ' ');
    const nameParts = cleanName.split(' ');
    
    const paymentData = {
      transaction_amount: parseFloat(transactionAmount.toFixed(2)),
      description: 'Pagamento TenisLab',
      payment_method_id: 'pix',
      payer: {
        email: cleanEmail,
      },
    };

    console.log('[PIX] Criando pagamento no Mercado Pago:', paymentData);
    const mpPayment = await payment.create({ body: paymentData });
    console.log('[PIX] Resposta do Mercado Pago:', JSON.stringify(mpPayment, null, 2));

    // Extrair dados do PIX
    const pixData = mpPayment.point_of_interaction?.transaction_data;
    console.log('[PIX] Dados do PIX extraídos:', pixData);
    
    if (!pixData || !pixData.qr_code || !pixData.qr_code_base64) {
      console.error('[PIX] Dados do PIX inválidos:', { pixData, mpPayment });
      return NextResponse.json(
        { 
          error: 'Erro ao gerar PIX no Mercado Pago',
          details: 'Dados do QR Code não foram retornados pelo Mercado Pago',
          mpResponse: mpPayment
        },
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
  } catch (error: any) {
    console.error('[PIX] Erro ao criar pagamento PIX:', error);
    console.error('[PIX] Stack trace:', error.stack);
    console.error('[PIX] Detalhes completos do erro:', JSON.stringify(error, null, 2));
    
    // Extrair detalhes do erro do Mercado Pago
    const mpError = error?.cause || error?.response?.data || error;
    console.error('[PIX] Erro do Mercado Pago:', JSON.stringify(mpError, null, 2));
    
    return NextResponse.json(
      { 
        error: 'Erro ao criar pagamento PIX',
        message: error.message || 'Erro desconhecido',
        details: error.toString(),
        mpError: mpError,
        fullError: {
          message: error.message,
          cause: error.cause,
          response: error.response,
          status: error.status,
          statusText: error.statusText
        }
      },
      { status: 500 }
    );
  }
}
