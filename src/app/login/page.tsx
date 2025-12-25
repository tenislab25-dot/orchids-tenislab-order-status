"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Key, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Preencha email e senha");
      return;
    }

    if (email.startsWith("admin@")) {
      router.push("/interno/dashboard");
    } else if (email.startsWith("os@")) {
      router.push("/interno/os");
    } else if (email.startsWith("staff@")) {
      router.push("/interno/dashboard");
    } else {
      setError("Acesso não autorizado");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col min-h-screen px-6 py-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* SECTION 1 — BRAND */}
      <header className="flex flex-col items-center gap-4 mb-12">
        <div className="flex items-baseline gap-1">
          <span className="text-5xl font-extrabold tracking-tighter text-slate-900">TENIS</span>
          <span className="text-5xl font-light tracking-tighter text-blue-500">LAB</span>
        </div>
        <div className="h-px w-12 bg-slate-200" />
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
          Acesso interno ao sistema
        </p>
      </header>

      <main className="flex-1">
        {/* SECTION 2 — LOGIN FORM */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:ring-blue-500 transition-all text-lg"
              />
            </div>
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:ring-blue-500 transition-all text-lg"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium animate-in zoom-in-95 duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-xl shadow-slate-200 mt-4"
          >
            Entrar
          </Button>
        </form>
      </main>

      {/* SECTION 7 — FOOTER */}
      <footer className="mt-auto pt-12 text-center">
        <p className="text-slate-300 text-[10px] uppercase tracking-[0.3em] font-bold">
          Uso exclusivo da equipe TENISLAB
        </p>
      </footer>
    </div>
  );
}
