"use client";

import { useEffect, useState, useCallback } from "react";
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("tenislab_role");
    setUser(null);
    setRole(null);
    router.push("/login");
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (isMounted) {
            setUser(null);
            setRole(null);
            setLoading(false);
          }
          if (pathname?.startsWith("/interno") && pathname !== "/interno/login") {
            router.push("/login");
          }
          return;
        }

        // Try to get role from state or localStorage first
        const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
        
        if (cachedRole && user?.id === session.user.id) {
          setLoading(false);
          // Still verify permissions for the current path
          const internalPath = pathname?.replace("/interno", "/app") || "/app";
          if (pathname?.startsWith("/interno") && !canAccessPage(cachedRole, internalPath)) {
            router.push("/interno");
          }
          return;
        }

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

          const internalPath = pathname?.replace("/interno", "/app") || "/app";
          if (pathname?.startsWith("/interno") && !canAccessPage(userRole, internalPath)) {
            router.push("/interno");
          }
        } else if (!profile) {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        if (isMounted) {
          setUser(null);
          setRole(null);
          localStorage.removeItem("tenislab_role");
        }
        router.push("/login");
      } else if (event === "SIGNED_IN" && session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (profile && isMounted) {
          setUser({ id: session.user.id, email: session.user.email || "" });
          setRole(profile.role as UserRole);
          localStorage.setItem("tenislab_role", profile.role);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router, user?.id]);

  return { user, role, loading, signOut };
}
