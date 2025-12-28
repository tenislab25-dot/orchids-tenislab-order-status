"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, LayoutGrid, LogOut, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getRoleLabel } from "@/lib/auth";

export default function InternoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, role, loading, signOut } = useAuth();
  const isLoginPage = pathname === "/login";

  if (loading && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

    return (
      <div className="min-h-screen bg-slate-50/50">
        {!isLoginPage && user && (
          <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[200px]">{user.email}</span>
                  {role && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/80 leading-none">
                      {getRoleLabel(role)}
                    </span>
                  )}
                </div>
              </div>

              <nav className="flex items-center gap-1 sm:gap-2">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className={`h-9 px-2 sm:px-3 rounded-xl gap-2 ${pathname === "/dashboard" ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:text-slate-900"}`}>
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline font-bold">Início</span>
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost" size="sm" className="h-9 px-2 sm:px-3 rounded-xl gap-2 text-slate-500 hover:text-slate-900">
                    <Home className="w-4 h-4" />
                    <span className="hidden sm:inline font-bold">Site</span>
                  </Button>
                </Link>
                <div className="w-px h-4 bg-slate-200 mx-1 hidden sm:block" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={signOut}
                  className="h-9 px-2 sm:px-3 rounded-xl gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 font-bold"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </nav>
            </div>
          </header>
        )}
        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 animate-in fade-in duration-500">
          {children}
        </main>
      </div>
    );

}
