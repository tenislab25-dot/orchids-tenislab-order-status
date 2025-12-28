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
  const isLoginPage = pathname === "/interno/login";

  if (loading && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in">
      {!isLoginPage && user && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <User className="w-4 h-4" />
            <span className="font-medium">{user.email}</span>
            {role && (
              <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {getRoleLabel(role)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/interno">
              <Button variant="ghost" size="sm" className="rounded-xl gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                <LayoutGrid className="w-4 h-4" />
                Menu Principal
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="rounded-xl gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                <Home className="w-4 h-4" />
                Ver Site
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={signOut}
              className="rounded-xl gap-2 text-red-500 hover:text-red-700 hover:bg-red-50"
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
