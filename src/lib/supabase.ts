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
  
  // Função para forçar reload
  const forceReload = () => {
    if (isReloading) return;
    isReloading = true;
    console.log('Forçando reload da página...');
    window.location.reload();
  };

  // Atualizar tempo ativo constantemente
  const updateActiveTime = () => {
    lastActiveTime = Date.now();
  };

  // Heartbeat: verifica a cada 2 segundos se houve "salto" no tempo (indica que ficou em background)
  setInterval(() => {
    const now = Date.now();
    const timeSinceLastActive = now - lastActiveTime;
    
    // Se passou mais de 5 segundos desde a última atualização, significa que ficou em background
    if (timeSinceLastActive > 5000) {
      console.log(`Detectado retorno do background (${timeSinceLastActive}ms de inatividade)`);
      forceReload();
    }
    
    lastActiveTime = now;
  }, 2000);

  // Múltiplos eventos para detectar retorno
  
  // 1. visibilitychange - padrão
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('visibilitychange: visible');
      const timeSinceLastActive = Date.now() - lastActiveTime;
      if (timeSinceLastActive > 3000) {
        forceReload();
      }
      updateActiveTime();
    }
  });

  // 2. focus - quando a janela ganha foco
  window.addEventListener('focus', () => {
    console.log('window focus');
    const timeSinceLastActive = Date.now() - lastActiveTime;
    if (timeSinceLastActive > 3000) {
      forceReload();
    }
    updateActiveTime();
  });

  // 3. pageshow - quando a página é mostrada (inclui bfcache)
  window.addEventListener('pageshow', (event) => {
    console.log('pageshow, persisted:', event.persisted);
    if (event.persisted) {
      forceReload();
    }
    const timeSinceLastActive = Date.now() - lastActiveTime;
    if (timeSinceLastActive > 3000) {
      forceReload();
    }
    updateActiveTime();
  });

  // 4. touchstart - quando o usuário toca na tela (mobile)
  document.addEventListener('touchstart', () => {
    const timeSinceLastActive = Date.now() - lastActiveTime;
    if (timeSinceLastActive > 5000) {
      console.log('touchstart após inatividade');
      forceReload();
    }
    updateActiveTime();
  }, { passive: true });

  // 5. click - quando o usuário clica
  document.addEventListener('click', () => {
    const timeSinceLastActive = Date.now() - lastActiveTime;
    if (timeSinceLastActive > 5000) {
      console.log('click após inatividade');
      forceReload();
    }
    updateActiveTime();
  });

  // 6. online - quando a internet volta
  window.addEventListener('online', () => {
    console.log('Conexão restaurada');
    forceReload();
  });

  // 7. scroll - quando o usuário rola a página
  document.addEventListener('scroll', () => {
    updateActiveTime();
  }, { passive: true });

  // Inicializar
  updateActiveTime();
  console.log('Sistema de detecção de background inicializado');
}
