"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase, ensureValidSession, refreshSession } from "@/lib/supabase";
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
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);

  const signOut = useCallback(async () => {
    try {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      await supabase.auth.signOut();
      localStorage.removeItem("tenislab_role");
      setUser(null);
      setRole(null);
      window.location.href = "/interno/login";
    } catch (error) {
      console.error("Erro ao sair:", error);
      window.location.href = "/interno/login";
    }
  }, []);

  // Efeito principal - roda apenas uma vez na montagem
  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Se já inicializou e tem usuário, não precisa verificar novamente
      if (hasInitialized.current && user) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (pathname?.startsWith("/interno") && pathname !== "/interno/login") {
            router.push("/interno/login");
          }
          if (isMounted) setLoading(false);
          return;
        }

        // Tentar usar role do localStorage primeiro para evitar loading
        const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
        if (cachedRole && isMounted) {
          setUser({ id: session.user.id, email: session.user.email || "" });
          setRole(cachedRole);
          setLoading(false);
          hasInitialized.current = true;
        }

        // Buscar role atualizado do banco em background
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
          hasInitialized.current = true;

          if (pathname?.startsWith("/interno") && !canAccessPage(userRole, pathname)) {
            router.push("/interno");
          }
        } else if (!cachedRole && isMounted) {
          router.push("/login");
        }
      } catch {
        if (isMounted) {
          // Se tiver cache, mantém o usuário logado
          const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
          if (!cachedRole) {
            router.push("/login");
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuth();

    // Configurar renovação automática de sessão a cada 4 minutos
    if (!refreshIntervalRef.current) {
      refreshIntervalRef.current = setInterval(async () => {
        const isValid = await ensureValidSession();
        if (!isValid && pathname?.startsWith("/interno") && pathname !== "/interno/login") {
          console.warn("Sessão expirada, tentando renovar...");
          const renewed = await refreshSession();
          if (!renewed) {
            console.error("Falha ao renovar sessão, redirecionando para login");
            window.location.href = "/interno/login";
          }
        }
      }, 4 * 60 * 1000);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setRole(null);
        localStorage.removeItem("tenislab_role");
        hasInitialized.current = false;
        router.push("/interno/login");
      } else if (event === "SIGNED_IN" && session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUser({ id: session.user.id, email: session.user.email || "" });
          setRole(profile.role as UserRole);
          localStorage.setItem("tenislab_role", profile.role);
          hasInitialized.current = true;
          setLoading(false);
        }
      } else if (event === "TOKEN_REFRESHED" && session) {
        console.log("Token renovado automaticamente");
      } else if (event === "USER_UPDATED" && session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUser({ id: session.user.id, email: session.user.email || "" });
          setRole(profile.role as UserRole);
          localStorage.setItem("tenislab_role", profile.role);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, []); // Removido pathname e router das dependências

  // Efeito separado para verificar permissões quando pathname muda
  useEffect(() => {
    if (role && pathname?.startsWith("/interno") && !canAccessPage(role, pathname)) {
      router.push("/interno");
    }
  }, [pathname, role, router]);

  return { user, role, loading, signOut };
}
