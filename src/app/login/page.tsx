"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Preencha email e senha");
      return;
    }

    // SECTION 3 — MOCK ROLE AUTHENTICATION
    if (email.startsWith("admin@")) {
      // ADMIN: Redirect to /interno/dashboard
      router.push("/interno/dashboard");
    } else if (email.startsWith("os@")) {
      // ATENDENTE: Redirect to /interno/os
      router.push("/interno/os");
    } else if (email.startsWith("staff@")) {
      // STAFF: Redirect to /interno/dashboard
      router.push("/interno/dashboard");
    } else {
      setError("Acesso não autorizado");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-slate-50">
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* SECTION 1 — BRAND */}
        <header className="flex flex-col items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tighter text-slate-900">TENIS</span>
            <span className="text-4xl font-light tracking-tighter text-blue-500">LAB</span>
          </div>
          <div className="h-px w-8 bg-slate-200" />
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest text-center">
            Acesso interno ao sistema
          </p>
        </header>

        {/* SECTION 2 — LOGIN FORM */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold text-slate-800">Login</CardTitle>
            <CardDescription className="text-xs">Entre com suas credenciais de equipe</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-slate-100 bg-slate-50 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-slate-100 bg-slate-50 focus-visible:ring-blue-500"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-600 rounded-xl py-3 animate-in fade-in zoom-in-95 duration-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all active:scale-[0.98] mt-2">
                Entrar
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-slate-50 bg-slate-50/50 py-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Uso exclusivo da equipe TENISLAB
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* FOOTER */}
      <footer className="mt-12 text-center opacity-20">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-900">
          TENISLAB · Internal System
        </p>
      </footer>
    </div>
  );
}
