"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { logger } from "@/lib/logger";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { canAccessPage, type UserRole } from "@/lib/auth";
import { 
  getAuthState, 
  setAuthState, 
  subscribeToAuthState, 
  clearAuthState 
} from "@/lib/authState";

interface AuthContextValue {
  user: { id: string; email: string } | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthContextValue {
  const router = useRouter();
  const pathname = usePathname();
  
  // Usar useSyncExternalStore para sincronizar com o estado global
  const authState = useSyncExternalStore(
    subscribeToAuthState,
    () => getAuthState(),
    () => ({ role: null, user: null, isAuthenticated: false, hasChecked: false })
  );

  const [loading, setLoading] = useState(!authState.hasChecked);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("tenislab_role");
      clearAuthState();
      window.location.href = "/menu-principal/login";
    } catch (error) {
      logger.error("Erro ao sair:", error);
      window.location.href = "/menu-principal/login";
    }
  }, []);

  useEffect(() => {
    // Se já verificou e tem autenticação, não precisa fazer nada
    if (authState.hasChecked && authState.isAuthenticated) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const checkAuth = async () => {
      try {
        // PRIMEIRO: Verificar localStorage SINCRONAMENTE
        const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
        
        logger.log("useAuth: cachedRole =", cachedRole, "pathname =", pathname);
        
        if (cachedRole) {
          // TEM CACHE - usar imediatamente e NÃO redirecionar
          setAuthState({
            role: cachedRole,
            isAuthenticated: true,
            hasChecked: true
          });
          
          if (isMounted) setLoading(false);
          
          // Em background, tentar obter dados do usuário
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && isMounted) {
              setAuthState({
                user: { id: session.user.id, email: session.user.email || "" }
              });
            }
          } catch (e) {
            logger.error("Erro ao obter sessão em background:", e);
          }
          
          return; // IMPORTANTE: Não continuar para evitar redirecionamento
        }
        
        // SEM CACHE - verificar sessão do Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Sessão existe - buscar role do banco
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (profile && isMounted) {
            const userRole = profile.role as UserRole;
            localStorage.setItem("tenislab_role", userRole);
            
            setAuthState({
              role: userRole,
              user: { id: session.user.id, email: session.user.email || "" },
              isAuthenticated: true,
              hasChecked: true
            });
            
            setLoading(false);

            if (pathname?.startsWith("/menu-principal") && !canAccessPage(userRole, pathname)) {
              router.push("/menu-principal");
            }
          } else if (isMounted) {
            // Sem perfil, redirecionar para login
            setAuthState({ hasChecked: true });
            if (pathname?.startsWith("/menu-principal") && pathname !== "/menu-principal/login") {
              router.push("/menu-principal/login");
            }
            setLoading(false);
          }
        } else {
          // SEM sessão E SEM cache - redirecionar para login
          setAuthState({ hasChecked: true });
          if (pathname?.startsWith("/menu-principal") && pathname !== "/menu-principal/login") {
            router.push("/menu-principal/login");
          }
          if (isMounted) setLoading(false);
        }
      } catch (err) {
        logger.error("Erro ao verificar autenticação:", err);
        if (isMounted) {
          // Se der erro, verificar cache novamente
          const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
          if (cachedRole) {
            setAuthState({
              role: cachedRole,
              isAuthenticated: true,
              hasChecked: true
            });
          } else {
            setAuthState({ hasChecked: true });
            if (pathname?.startsWith("/menu-principal") && pathname !== "/menu-principal/login") {
              router.push("/menu-principal/login");
            }
          }
          setLoading(false);
        }
      }
    };

    checkAuth();

    // Listener do Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      logger.log("useAuth: onAuthStateChange event =", event);

      if (event === "SIGNED_OUT") {
        localStorage.removeItem("tenislab_role");
        clearAuthState();
        router.push("/menu-principal/login");
      } else if (event === "SIGNED_IN" && session) {
        const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
        if (cachedRole) {
          setAuthState({
            role: cachedRole,
            user: { id: session.user.id, email: session.user.email || "" },
            isAuthenticated: true,
            hasChecked: true
          });
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router, authState.hasChecked, authState.isAuthenticated]);

  // Efeito separado para verificar permissões quando pathname muda
  useEffect(() => {
    if (authState.role && pathname?.startsWith("/menu-principal") && !canAccessPage(authState.role, pathname)) {
      router.push("/menu-principal");
    }
  }, [pathname, authState.role, router]);

  return { 
    user: authState.user, 
    role: authState.role, 
    loading, 
    signOut 
  };
}
