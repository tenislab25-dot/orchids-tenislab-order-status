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
    const channels = supabase.getChannels();
    for (const channel of channels) {
      await supabase.removeChannel(channel);
    }
    console.log('Realtime: canais removidos para reconexão');
  } catch (err) {
    console.error('Erro ao reconectar Realtime:', err);
  }
}

// Inicializar listener de visibilidade para recarregar página quando volta do background
if (typeof window !== 'undefined') {
  let hiddenTime: number | null = null;
  const RELOAD_THRESHOLD = 30000; // 30 segundos - se ficou mais que isso em background, recarrega
  
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Guardar o momento em que a página foi para background
      hiddenTime = Date.now();
      console.log('Página foi para background');
    } else if (document.visibilityState === 'visible') {
      console.log('Página voltou ao foco');
      
      // Se ficou mais de 30 segundos em background, recarregar a página
      if (hiddenTime !== null) {
        const timeInBackground = Date.now() - hiddenTime;
        console.log(`Tempo em background: ${timeInBackground}ms`);
        
        if (timeInBackground > RELOAD_THRESHOLD) {
          console.log('Tempo em background excedeu limite, recarregando página...');
          // Usar location.reload() para garantir que tudo seja reinicializado
          window.location.reload();
          return;
        }
      }
      
      hiddenTime = null;
    }
  });

  // Para iOS/Safari que pode não disparar visibilitychange corretamente
  window.addEventListener('pageshow', (event) => {
    // Se a página foi restaurada do cache (bfcache), recarregar
    if (event.persisted) {
      console.log('Página restaurada do cache, recarregando...');
      window.location.reload();
    }
  });

  // Detectar quando a conexão de rede volta
  window.addEventListener('online', () => {
    console.log('Conexão de rede restaurada, recarregando página...');
    window.location.reload();
  });
}
