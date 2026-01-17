"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * GlobalRehydrator - Sistema global de reidratação da aplicação
 * 
 * Previne loading infinito quando usuário:
 * - Sai do navegador e volta (iOS, Android, Windows)
 * - Troca de aba e retorna
 * - Minimiza e restaura o app
 * 
 * Implementa:
 * 1. Listeners globais (visibilitychange, focus, pageshow, pagehide)
 * 2. Força re-render global
 * 3. Reinicializa estados congelados
 * 4. Revalida dados automaticamente
 * 5. Timeout global para prevenir loading infinito
 */
export function GlobalRehydrator() {
  const router = useRouter();
  const lastActiveTime = useRef<number>(Date.now());
  const isRehydrating = useRef<boolean>(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[GlobalRehydrator] Inicializado');

    // Função principal de reidratação
    const rehydrateApp = async (source: string) => {
      if (isRehydrating.current) {
        console.log('[GlobalRehydrator] Já está reidratando, ignorando...');
        return;
      }

      const now = Date.now();
      const timeAway = now - lastActiveTime.current;

      // Só reidrata se ficou mais de 2 segundos fora
      if (timeAway < 2000) {
        return;
      }

      isRehydrating.current = true;
      console.log(`[GlobalRehydrator] Reidratando via ${source} após ${Math.round(timeAway/1000)}s fora`);

      try {
        // 1. Limpar todos os timeouts e intervals globais
        const highestTimeoutId = setTimeout(() => {}, 0);
        for (let i = 0; i < highestTimeoutId; i++) {
          clearTimeout(i);
        }

        // 2. Forçar refresh do router do Next.js (revalida dados)
        router.refresh();

        // 3. Disparar evento customizado para componentes reagirem
        window.dispatchEvent(new CustomEvent('app-rehydrate', {
          detail: { timeAway, source }
        }));

        // 4. Forçar garbage collection de listeners antigos
        if (typeof window !== 'undefined') {
          // Remover event listeners órfãos
          const oldListeners = (window as any).__eventListeners || [];
          oldListeners.forEach((listener: any) => {
            try {
              window.removeEventListener(listener.type, listener.listener);
            } catch (e) {
              // Ignorar erros
            }
          });
        }

        console.log('[GlobalRehydrator] Reidratação concluída');
      } catch (err) {
        console.error('[GlobalRehydrator] Erro na reidratação:', err);
      } finally {
        isRehydrating.current = false;
      }
    };

    // Listener 1: visibilitychange (quando troca de aba ou minimiza)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        rehydrateApp('visibilitychange');
      } else {
        lastActiveTime.current = Date.now();
      }
    };

    // Listener 2: focus (quando a janela recebe foco)
    const handleFocus = () => {
      rehydrateApp('focus');
    };

    // Listener 3: pageshow (quando página é restaurada do bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('[GlobalRehydrator] Página restaurada do bfcache');
        rehydrateApp('pageshow-bfcache');
      }
    };

    // Listener 4: pagehide (quando página vai para o bfcache)
    const handlePageHide = () => {
      lastActiveTime.current = Date.now();
    };

    // Listener 5: online (quando reconecta à internet)
    const handleOnline = () => {
      console.log('[GlobalRehydrator] Conexão restaurada');
      rehydrateApp('online');
    };

    // Registrar todos os listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('online', handleOnline);

    // Timeout global: se qualquer loading durar mais de 15s, força reload
    const startGlobalLoadingWatchdog = () => {
      loadingTimeoutRef.current = setInterval(() => {
        // Verificar se há elementos de loading visíveis há muito tempo
        const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="animate-spin"]');
        
        if (loadingElements.length > 0) {
          const firstLoading = loadingElements[0] as HTMLElement;
          const loadingTime = Date.now() - (parseInt(firstLoading.dataset.loadingStart || '0') || Date.now());
          
          if (loadingTime > 15000) {
            console.warn('[GlobalRehydrator] Loading detectado há mais de 15s, forçando reload');
            window.location.reload();
          } else if (!firstLoading.dataset.loadingStart) {
            firstLoading.dataset.loadingStart = Date.now().toString();
          }
        }
      }, 5000); // Verifica a cada 5 segundos
    };

    startGlobalLoadingWatchdog();

    // Interceptar fetch global para adicionar timeout
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('[GlobalRehydrator] Fetch timeout, abortando:', args[0]);
        controller.abort();
      }, 30000); // 30s timeout

      try {
        const response = await originalFetch(args[0], {
          ...args[1],
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('online', handleOnline);
      
      if (loadingTimeoutRef.current) {
        clearInterval(loadingTimeoutRef.current);
      }

      // Restaurar fetch original
      window.fetch = originalFetch;
    };
  }, [router]);

  return null; // Componente invisível
}
