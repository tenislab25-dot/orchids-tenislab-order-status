"use client";

import { useEffect, useState, useCallback } from "react";
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

// Função para obter role do localStorage de forma segura
function getStoredRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem("tenislab_role") as UserRole | null;
  } catch {
    return null;
  }
}

export function useAuth(): AuthContextValue {
  // IMPORTANTE: Inicializar role com valor do localStorage SINCRONAMENTE
  // Isso evita o flash de loading e redirecionamento indevido
  const [role, setRole] = useState<UserRole | null>(() => getStoredRole());
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(() => !getStoredRole()); // Se tem cache, não está loading
  const router = useRouter();
  const pathname = usePathname();

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

  // Efeito para carregar dados do usuário em background
  useEffect(() => {
    let isMounted = true;

    const loadUserData = async () => {
      try {
        const cachedRole = getStoredRole();
        
        // Se já tem role do cache, apenas buscar dados do usuário em background
        if (cachedRole) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && isMounted) {
            setUser({ id: session.user.id, email: session.user.email || "" });
          }
          return;
        }
        
        // Se não tem cache, verificar sessão do Supabase
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
          // Se der erro mas tem cache, manter usuário logado
          const cachedRole = getStoredRole();
          if (cachedRole) {
            setRole(cachedRole);
          } else if (pathname?.startsWith("/interno") && pathname !== "/interno/login") {
            router.push("/interno/login");
          }
          setLoading(false);
        }
      }
    };

    loadUserData();

    // Listener do Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setRole(null);
        localStorage.removeItem("tenislab_role");
        router.push("/interno/login");
      } else if (event === "SIGNED_IN" && session) {
        const cachedRole = getStoredRole();
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
  }, [pathname, router]);

  // Efeito separado para verificar permissões quando pathname muda
  useEffect(() => {
    if (role && pathname?.startsWith("/interno") && !canAccessPage(role, pathname)) {
      router.push("/interno");
    }
  }, [pathname, role, router]);

  return { user, role, loading, signOut };
}
