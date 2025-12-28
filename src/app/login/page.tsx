"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Mail, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockRemainingTime, setLockRemainingTime] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/interno");
      }
    };
    checkSession();
  }, [router]);

  useEffect(() => {
    if (lockRemainingTime > 0) {
      const timer = setInterval(() => {
        setLockRemainingTime(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockRemainingTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email || !password) {
      setError("Preencha email e senha");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.locked) {
          setIsLocked(true);
          setLockRemainingTime(data.remainingSeconds || LOCKOUT_DURATION_MINUTES * 60);
        }
        setError(data.error || "Credenciais inválidas");
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Credenciais inválidas");
        setLoading(false);
        return;
      }

      if (authData.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (profileData) {
          localStorage.setItem("tenislab_role", profileData.role);
        }
        router.push("/interno");
      }
    } catch {
      setError("Erro ao realizar login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-slate-50 animate-in fade-in duration-500">
      <div className="w-full max-w-sm flex flex-col gap-10">
        <header className="flex flex-col items-center gap-6">
          <div className="relative w-48 h-40">
            <Image 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=400&height=400&resize=contain" 
              alt="TENISLAB Logo" 
              fill
              priority
              className="object-contain"
              sizes="200px"
            />
          </div>
          <div className="h-px w-12 bg-slate-200" />
          <p className="text-slate-500 text-sm font-medium tracking-widest uppercase text-center">
            Acesso interno ao sistema
          </p>
        </header>

        <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="pt-8 pb-4 px-8">
            <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Entrar</CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              Identifique-se para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            {isLocked ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-red-500" />
                </div>
                <p className="text-center text-slate-600 font-medium">
                  Acesso temporariamente bloqueado
                </p>
                <p className="text-center text-slate-400 text-sm">
                  Tente novamente em
                </p>
                <p className="text-3xl font-black text-red-500">
                  {formatTime(lockRemainingTime)}
                </p>
              </div>
            ) : (
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
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-center border-t border-slate-50 bg-slate-50/30 py-6">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 text-center px-4">
              Uso exclusivo da equipe tenislab.
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
