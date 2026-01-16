import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
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
      
      if (timeUntilExpiry < 300) {
        const { data, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !data.session) {
          console.warn('Falha ao renovar sessão:', refreshError);
          return false;
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Erro ao verificar sessão:', err);
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
    // Remover todos os canais existentes
    const channels = supabase.getChannels();
    for (const channel of channels) {
      await supabase.removeChannel(channel);
    }
    console.log('Realtime: canais removidos para reconexão');
  } catch (err) {
    console.error('Erro ao reconectar Realtime:', err);
  }
}

// Inicializar listener de visibilidade para reconectar quando volta ao foco
if (typeof window !== 'undefined') {
  let wasHidden = false;
  
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
      wasHidden = true;
    } else if (document.visibilityState === 'visible' && wasHidden) {
      wasHidden = false;
      console.log('App voltou ao foco - reconectando...');
      
      // Pequeno delay para garantir que a conexão de rede está estável
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verificar sessão
      const isValid = await ensureValidSession();
      if (!isValid) {
        const renewed = await refreshSession();
        if (!renewed) {
          console.warn('Sessão expirada após voltar ao foco');
          // Não redirecionar aqui, deixar o useAuth fazer isso
        }
      }
      
      // Forçar reconexão do Realtime removendo canais antigos
      // Os componentes vão recriar os canais quando re-renderizarem
      await reconnectRealtime();
    }
  });

  // Para iOS/Safari que pode não disparar visibilitychange corretamente
  window.addEventListener('focus', async () => {
    if (wasHidden) {
      wasHidden = false;
      console.log('Window focus após hidden - reconectando...');
      await new Promise(resolve => setTimeout(resolve, 500));
      await ensureValidSession();
      await reconnectRealtime();
    }
  });

  // Detectar quando a conexão de rede volta
  window.addEventListener('online', async () => {
    console.log('Conexão de rede restaurada - reconectando...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await ensureValidSession();
    await reconnectRealtime();
  });
}
