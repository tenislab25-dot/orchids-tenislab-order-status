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

// Sistema de detecção de retorno do background e reload automático
if (typeof window !== 'undefined') {
  let lastActiveTime = Date.now();
  let backgroundStartTime: number | null = null;
  let isReloading = false;
  
  // Tempo mínimo em background antes de considerar reload (5 segundos)
  // Isso evita reload quando o usuário apenas clica em um link do WhatsApp
  const MIN_BACKGROUND_TIME = 5000;
  
  // Função para forçar reload
  const forceReload = (reason: string) => {
    if (isReloading) return;
    isReloading = true;
    console.log(`Forçando reload: ${reason}`);
    window.location.reload();
  };

  // Verificar se precisa reload após voltar do background
  const checkAndReload = (eventName: string) => {
    const now = Date.now();
    
    // Se não estava em background, apenas atualizar tempo
    if (backgroundStartTime === null) {
      lastActiveTime = now;
      return;
    }
    
    const timeInBackground = now - backgroundStartTime;
    console.log(`${eventName}: ficou ${timeInBackground}ms em background`);
    
    // Só força reload se ficou mais de 5 segundos em background
    if (timeInBackground > MIN_BACKGROUND_TIME) {
      forceReload(`${eventName} após ${timeInBackground}ms em background`);
      return;
    }
    
    // Se ficou menos de 5 segundos, apenas resetar e continuar
    backgroundStartTime = null;
    lastActiveTime = now;
  };

  // Heartbeat: verifica a cada 2 segundos
  setInterval(() => {
    const now = Date.now();
    const timeSinceLastActive = now - lastActiveTime;
    
    // Se passou mais de 10 segundos desde a última atualização, significa que ficou em background
    if (timeSinceLastActive > 10000 && backgroundStartTime !== null) {
      const timeInBackground = now - backgroundStartTime;
      if (timeInBackground > MIN_BACKGROUND_TIME) {
        forceReload(`Heartbeat detectou ${timeInBackground}ms em background`);
        return;
      }
    }
    
    // Só atualiza se não estiver em background
    if (backgroundStartTime === null) {
      lastActiveTime = now;
    }
  }, 2000);

  // 1. visibilitychange - quando a aba muda de visibilidade
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      backgroundStartTime = Date.now();
      console.log('Página foi para background');
    } else if (document.visibilityState === 'visible') {
      checkAndReload('visibilitychange');
    }
  });

  // 2. blur/focus - quando a janela perde/ganha foco
  window.addEventListener('blur', () => {
    if (backgroundStartTime === null) {
      backgroundStartTime = Date.now();
      console.log('Janela perdeu foco');
    }
  });
  
  window.addEventListener('focus', () => {
    checkAndReload('focus');
  });

  // 3. pageshow - quando a página é mostrada (inclui bfcache)
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      forceReload('pageshow persisted (bfcache)');
      return;
    }
    checkAndReload('pageshow');
  });

  // 4. pagehide - quando a página vai ser escondida
  window.addEventListener('pagehide', () => {
    if (backgroundStartTime === null) {
      backgroundStartTime = Date.now();
    }
  });

  // 5. online - quando a internet volta
  window.addEventListener('online', () => {
    // Só recarrega se estava em background por mais de 5 segundos
    if (backgroundStartTime !== null) {
      const timeInBackground = Date.now() - backgroundStartTime;
      if (timeInBackground > MIN_BACKGROUND_TIME) {
        forceReload('conexão restaurada após background');
      }
    }
  });

  // Inicializar
  lastActiveTime = Date.now();
  console.log('Sistema de detecção de background inicializado (v3 - com delay de 5s)');
}
