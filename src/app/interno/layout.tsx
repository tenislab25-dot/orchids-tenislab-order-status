"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InternoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/interno/login";

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in">
      {!isLoginPage && (
        <div className="flex justify-end mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-xl gap-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
              <Home className="w-4 h-4" />
              Home
            </Button>
          </Link>
        </div>
      )}
      {children}
    </div>
  );
}
