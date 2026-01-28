import { createClient } from '@supabase/supabase-js';
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: false, // Desabilitar para controlar manualmente
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-application-name': 'tenislab-order-status',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Detectar quando volta do background e resetar Supabase
if (typeof window !== 'undefined') {
  let lastVisibilityChange = Date.now();
  
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      const timeAway = Date.now() - lastVisibilityChange;
      
      // Se ficou mais de 3 segundos fora, resetar Supabase
      if (timeAway > 3000) {
        logger.log('[Supabase] Detectado retorno do background, resetando conexões...');
        
        try {
          // 1. Remover TODOS os canais Realtime
          const channels = supabase.getChannels();
          for (const channel of channels) {
            await supabase.removeChannel(channel);
          }
          
          // 2. Renovar sessão de autenticação
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            logger.warn('[Supabase] Erro ao renovar sessão:', error);
          } else {
            logger.log('[Supabase] Sessão renovada com sucesso');
          }
          
          logger.log('[Supabase] Reset completo!');
        } catch (err) {
          logger.error('[Supabase] Erro ao resetar:', err);
        }
      }
    } else {
      lastVisibilityChange = Date.now();
    }
  });
}

// Função helper para verificar e renovar sessão
export async function ensureValidSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return false;
    }

    const expiresAt = session.expires_at;
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      
      // Se falta menos de 10 minutos para expirar, renova
      if (timeUntilExpiry < 600) {
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !data.session) {
          logger.warn('Falha ao renovar sessão:', refreshError);
          return false;
        }
      }
    }

    return true;
  } catch (err) {
    logger.error('Erro ao verificar sessão:', err);
    return false;
  }
}

// Função para forçar renovação da sessão
export async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return !error && !!data.session;
  } catch {
    return false;
  }
}

// Função para reconectar todos os canais Realtime
export async function reconnectRealtime(): Promise<void> {
  try {
    const channels = supabase.getChannels();
    for (const channel of channels) {
      await supabase.removeChannel(channel);
    }
    logger.log('Realtime: canais removidos para reconexão');
  } catch (err) {
    logger.error('Erro ao reconectar Realtime:', err);
  }
}
