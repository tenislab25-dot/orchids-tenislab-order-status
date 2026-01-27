import { NextResponse } from 'next/server';
import { createWebhookClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('[TEST] Iniciando teste...');
    
    // Testar criação do cliente
    console.log('[TEST] Criando cliente Supabase...');
    const supabase = createWebhookClient();
    console.log('[TEST] Cliente criado com sucesso');
    
    // Testar query simples
    console.log('[TEST] Testando query...');
    const { data, error } = await supabase
      .from('payments')
      .select('id')
      .limit(1);
    
    console.log('[TEST] Resultado:', { data, error });
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Supabase funcionando!',
      data,
    });
  } catch (error: any) {
    console.error('[TEST] Erro:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
