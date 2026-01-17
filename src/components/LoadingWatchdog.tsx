"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function LoadingWatchdog() {
  const pathname = usePathname();

  useEffect(() => {
    let loadingStartTime = Date.now();
    let checkInterval: NodeJS.Timeout;

    // Verificar a cada 1 segundo se a página está travada em loading
    checkInterval = setInterval(() => {
      const loadingTime = Date.now() - loadingStartTime;
      
      // Se passou mais de 5 segundos em loading, força reload
      if (loadingTime > 5000) {
        console.warn('Loading infinito detectado, forçando reload...');
        window.location.reload();
      }
    }, 1000);

    // Resetar o timer quando a página muda
    return () => {
      clearInterval(checkInterval);
      loadingStartTime = Date.now();
    };
  }, [pathname]);

  // Detectar quando volta do background
  useEffect(() => {
    let lastVisibleTime = Date.now();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeInBackground = Date.now() - lastVisibleTime;
        
        // Se ficou mais de 10 segundos em background, força reload
        if (timeInBackground > 10000) {
          console.log('Voltou do background após muito tempo, recarregando...');
          window.location.reload();
        }
      } else {
        lastVisibleTime = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}
