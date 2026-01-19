"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  const hasInitialized = useRef(false);

  const signOut = useCallback(async () => {
    try {
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
      // Se já inicializou, não precisa verificar novamente
      if (hasInitialized.current) {
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

        // Usar role do localStorage (mais rápido, evita loading)
        const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
        
        if (cachedRole) {
          // Tem cache, usar ele imediatamente
          if (isMounted) {
            setUser({ id: session.user.id, email: session.user.email || "" });
            setRole(cachedRole);
            setLoading(false);
            hasInitialized.current = true;
          }
        } else {
          // Não tem cache, buscar do banco (só acontece no primeiro login)
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
            setLoading(false);

            if (pathname?.startsWith("/interno") && !canAccessPage(userRole, pathname)) {
              router.push("/interno");
            }
          } else if (isMounted) {
            router.push("/interno/login");
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("Erro ao verificar autenticação:", err);
        if (isMounted) {
          // Se der erro mas tem cache, manter usuário logado
          const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
          if (cachedRole) {
            setLoading(false);
          } else {
            router.push("/interno/login");
            setLoading(false);
          }
        }
      }
    };

    checkAuth();

    // Listener do Supabase Auth - SIMPLIFICADO
    // Só reage a SIGNED_OUT e SIGNED_IN, ignora TOKEN_REFRESHED e USER_UPDATED
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setRole(null);
        localStorage.removeItem("tenislab_role");
        hasInitialized.current = false;
        router.push("/interno/login");
      } else if (event === "SIGNED_IN" && session) {
        // Usar cache se tiver, evita buscar do banco
        const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
        if (cachedRole) {
          setUser({ id: session.user.id, email: session.user.email || "" });
          setRole(cachedRole);
          hasInitialized.current = true;
          setLoading(false);
        }
      }
      // Ignorar TOKEN_REFRESHED, USER_UPDATED para não causar re-fetch
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Array vazio = roda só uma vez na montagem

  // Efeito separado para verificar permissões quando pathname muda
  useEffect(() => {
    if (role && pathname?.startsWith("/interno") && !canAccessPage(role, pathname)) {
      router.push("/interno");
    }
  }, [pathname, role, router]);

  return { user, role, loading, signOut };
}
