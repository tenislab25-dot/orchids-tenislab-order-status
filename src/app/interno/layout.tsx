"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, LayoutGrid, LogOut, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getRoleLabel } from "@/lib/auth";
import { useEffect, useRef } from "react";

export default function InternoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, role, loading, signOut } = useAuth();
  const isLoginPage = pathname === "/interno/login";
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timeout de segurança: se ficar em loading por mais de 10s, força reload
  useEffect(() => {
    if (loading && !isLoginPage) {
      loadingTimeoutRef.current = setTimeout(() => {
        logger.warn('Loading por mais de 10s, forçando reload...');
        window.location.reload();
      }, 10000);
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [loading, isLoginPage]);

  if (loading && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 animate-in fade-in">
      {!isLoginPage && user && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <Link href="/interno" prefetch={false} className="flex items-center gap-3 text-sm text-slate-500 w-full sm:w-auto hover:bg-slate-50 p-1 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-slate-900 truncate">{user.email}</span>
              {role && (
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                  {getRoleLabel(role)}
                </span>
              )}
            </div>
          </Link>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {role !== 'ENTREGADOR' && (
              <Link href="/interno" prefetch={false} className="flex-1 sm:flex-initial">
                <Button variant="ghost" size="sm" className="w-full rounded-xl gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden xs:inline">Menu</span>
                </Button>
              </Link>
            )}

            <Link href="/" prefetch={false} className="flex-1 sm:flex-initial">
              <Button variant="ghost" size="sm" className="w-full rounded-xl gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                <Home className="w-4 h-4" />
                <span className="hidden xs:inline">Site</span>
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="flex-1 sm:flex-initial rounded-xl gap-2 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
