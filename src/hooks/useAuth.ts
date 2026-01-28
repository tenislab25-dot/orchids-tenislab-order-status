"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { canAccessPage, type UserRole } from "@/lib/auth";

interface AuthContextValue {
  user: { id: string; email: string } | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthContextValue {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const hasCheckedAuth = useRef(false);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("tenislab_role");
      setUser(null);
      setRole(null);
      window.location.href = "/interno/login";
    } catch (error) {
      logger.error("Erro ao sair:", error);
      window.location.href = "/interno/login";
    }
  }, []);

  useEffect(() => {
    // Evitar múltiplas verificações
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    let isMounted = true;

    const checkAuth = async () => {
      try {
        // PRIMEIRO: Verificar localStorage SINCRONAMENTE
        const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
        
        logger.log("useAuth: cachedRole =", cachedRole, "pathname =", pathname);
        
        if (cachedRole) {
          // TEM CACHE - usar imediatamente e NÃO redirecionar
          if (isMounted) {
            setRole(cachedRole);
            setLoading(false);
          }
          
          // Em background, tentar obter dados do usuário
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session && isMounted) {
              setUser({ id: session.user.id, email: session.user.email || "" });
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
            setUser({ id: session.user.id, email: session.user.email || "" });
            setRole(userRole);
            localStorage.setItem("tenislab_role", userRole);
            setLoading(false);

            if (pathname?.startsWith("/interno") && !canAccessPage(userRole, pathname)) {
              router.push("/interno");
            }
          } else if (isMounted) {
            // Sem perfil, redirecionar para login
            if (pathname?.startsWith("/interno") && pathname !== "/interno/login") {
              router.push("/interno/login");
            }
            setLoading(false);
          }
        } else {
          // SEM sessão E SEM cache - redirecionar para login
          if (pathname?.startsWith("/interno") && pathname !== "/interno/login") {
            router.push("/interno/login");
          }
          if (isMounted) setLoading(false);
        }
      } catch (err) {
        logger.error("Erro ao verificar autenticação:", err);
        if (isMounted) {
          // Se der erro, verificar cache novamente
          const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
          if (cachedRole) {
            setRole(cachedRole);
          } else if (pathname?.startsWith("/interno") && pathname !== "/interno/login") {
            router.push("/interno/login");
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
        setUser(null);
        setRole(null);
        localStorage.removeItem("tenislab_role");
        router.push("/interno/login");
      } else if (event === "SIGNED_IN" && session) {
        const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
        if (cachedRole) {
          setUser({ id: session.user.id, email: session.user.email || "" });
          setRole(cachedRole);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Array vazio - roda apenas uma vez

  // Efeito separado para verificar permissões quando pathname muda
  useEffect(() => {
    if (role && pathname?.startsWith("/interno") && !canAccessPage(role, pathname)) {
      router.push("/interno");
    }
  }, [pathname, role, router]);

  return { user, role, loading, signOut };
}
