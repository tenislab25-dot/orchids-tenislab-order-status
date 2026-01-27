import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[WEBHOOK] Recebido:', JSON.stringify(body, null, 2));
    
    // Responder imediatamente
    return NextResponse.json({ 
      received: true,
      message: 'Webhook funcionando!',
      paymentId: body.data?.id 
    });
  } catch (error) {
    console.error('[WEBHOOK] Erro:', error);
    return NextResponse.json({ 
      error: 'Erro ao processar webhook',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
