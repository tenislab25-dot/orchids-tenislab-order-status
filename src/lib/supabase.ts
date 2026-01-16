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
  let isReloading = false;
  let wasInBackground = false;
  
  // Função para forçar reload
  const forceReload = (reason: string) => {
    if (isReloading) return;
    isReloading = true;
    console.log(`Forçando reload: ${reason}`);
    window.location.reload();
  };

  // Marcar que foi para background
  const markAsBackground = () => {
    wasInBackground = true;
    console.log('Página foi para background');
  };

  // Verificar se precisa reload após voltar do background
  const checkAndReload = (eventName: string) => {
    const now = Date.now();
    const timeSinceLastActive = now - lastActiveTime;
    
    console.log(`${eventName}: timeSinceLastActive=${timeSinceLastActive}ms, wasInBackground=${wasInBackground}`);
    
    // Se estava em background OU se passou mais de 2 segundos, força reload
    if (wasInBackground || timeSinceLastActive > 2000) {
      forceReload(`${eventName} após ${timeSinceLastActive}ms de inatividade`);
      return;
    }
    
    lastActiveTime = now;
  };

  // Heartbeat: verifica a cada 1 segundo
  setInterval(() => {
    const now = Date.now();
    const timeSinceLastActive = now - lastActiveTime;
    
    // Se passou mais de 3 segundos desde a última atualização, significa que ficou em background
    if (timeSinceLastActive > 3000) {
      forceReload(`Heartbeat detectou ${timeSinceLastActive}ms de inatividade`);
      return;
    }
    
    lastActiveTime = now;
  }, 1000);

  // 1. visibilitychange - quando a aba muda de visibilidade
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      markAsBackground();
    } else if (document.visibilityState === 'visible') {
      checkAndReload('visibilitychange');
    }
  });

  // 2. blur/focus - quando a janela perde/ganha foco
  window.addEventListener('blur', () => {
    markAsBackground();
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
    markAsBackground();
  });

  // 5. touchstart - quando o usuário toca na tela (mobile)
  let firstTouchAfterBackground = true;
  document.addEventListener('touchstart', () => {
    if (wasInBackground && firstTouchAfterBackground) {
      firstTouchAfterBackground = false;
      checkAndReload('touchstart');
    }
    lastActiveTime = Date.now();
  }, { passive: true });

  // 6. online - quando a internet volta
  window.addEventListener('online', () => {
    forceReload('conexão restaurada');
  });

  // Resetar flag de primeiro toque quando voltar do background
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      firstTouchAfterBackground = true;
    }
  });

  // Inicializar
  lastActiveTime = Date.now();
  console.log('Sistema de detecção de background inicializado (v2)');
}
