"use client";

import { useState } from "react";
import Image from "next/image";
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

    // SECTION 6 — ERROR HANDLING
    if (!email || !password) {
      setError("Preencha email e senha");
      return;
    }

    // SECTION 3 — MOCK ROLE AUTHENTICATION
    let role: "ADMIN" | "ATENDENTE" | "FUNCIONARIO" | null = null;

    if (email === "italoysampaio@gmial.com" && password === "33254442") {
      role = "ADMIN";
    } else if (email.startsWith("admin@")) {
      role = "ADMIN";
    } else if (email.startsWith("os@")) {
      role = "ATENDENTE";
    } else if (email.startsWith("staff@")) {
      role = "FUNCIONARIO";
    }

    if (!role) {
      setError("Acesso não autorizado");
      return;
    }

    // Preserve role for future expansion (localStorage mock)
    localStorage.setItem("tenislab_role", role);

    // SECTION 4 — REDIRECT LOGIC
    if (role === "ADMIN") {
      router.push("/interno/dashboard");
    } else if (role === "ATENDENTE") {
      router.push("/interno/os");
    } else if (role === "FUNCIONARIO") {
      router.push("/interno/dashboard");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-slate-50 animate-in fade-in duration-500">
      <div className="w-full max-w-sm flex flex-col gap-10">
        {/* SECTION 1 — BRAND */}
          <header className="flex flex-col items-center gap-6">
            <div className="relative w-40 h-20">
              <Image 
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/IMG_8889-1766755171009.JPG?width=8000&height=8000&resize=contain"
                alt="TENISLAB Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          <div className="h-px w-12 bg-slate-200" />
          <p className="text-slate-500 text-sm font-medium tracking-widest uppercase text-center">
            Acesso interno ao sistema
          </p>
        </header>

        {/* SECTION 2 — LOGIN FORM */}
        <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="pt-8 pb-4 px-8">
            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Entrar</CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              Identifique-se para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@tenislab.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus-visible:ring-blue-500 text-base"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus-visible:ring-blue-500 text-base"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-600 rounded-2xl py-4 animate-in fade-in zoom-in-95 duration-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg transition-all active:scale-[0.98] mt-2 shadow-lg shadow-slate-200"
              >
                Entrar
              </Button>
            </form>
          </CardContent>
          
          {/* SECTION 7 — FOOTER */}
          <CardFooter className="flex justify-center border-t border-slate-50 bg-slate-50/30 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 text-center px-4">
              Uso exclusivo da equipe TENISLAB
            </p>
          </CardFooter>
        </Card>

        <div className="flex justify-center">
          <p className="text-slate-300 text-[10px] uppercase tracking-[0.4em] font-black">
            Área Restrita
          </p>
        </div>
      </div>
    </div>
  );
}
