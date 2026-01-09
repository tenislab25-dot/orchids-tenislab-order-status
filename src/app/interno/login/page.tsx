"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Mail, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [pendingUser, setPendingUser] = useState<{ id: string; email: string } | null>(null);
  const [sending2FA, setSending2FA] = useState(false);
  const router = useRouter();

    useEffect(() => {
    const checkSession = async () => {
      // Define um timeout para garantir que isChecking não fique preso em true
      const timeoutId = setTimeout(() => setIsChecking(false), 3000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        clearTimeout(timeoutId); // Limpa o timeout se a sessão for verificada antes
        if (session) {
          router.push("/interno"); // Navegação mais fluida no Next.js
          return;
        }
      } catch (err) {
        console.error("Erro ao verificar sessão:", err);
      } finally {
        setIsChecking(false); // Garante que o estado de checagem seja finalizado
      }
    };
    checkSession();
  }, [router]); // Dependência do router para garantir que o efeito reaja a mudanças de rota


  const send2FACode = useCallback(async (userId: string, userEmail: string) => {
    setSending2FA(true);
    try {
      const response = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", userId, email: userEmail }),
      });

      if (!response.ok) {
        setError("Erro ao enviar código de verificação");
      }
    } catch {
      setError("Erro ao enviar código");
    } finally {
      setSending2FA(false);
    }
  }, []);

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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("Email ou senha inválidos");
        setLoading(false);
        return;
      }

      if (authData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role, two_factor_enabled")
          .eq("id", authData.user.id)
          .single();

        if (profileError || !profileData) {
          setError("Perfil não encontrado. Entre em contato com o administrador.");
          setLoading(false);
          return;
        }

        if (profileData.two_factor_enabled) {
          setPendingUser({ id: authData.user.id, email: authData.user.email || email });
          await send2FACode(authData.user.id, authData.user.email || email);
          setShow2FA(true);
          setLoading(false);
          return;
        }

localStorage.setItem("tenislab_role", profileData.role);

// Injeta o user_role no app_metadata para que apareça no JWT
const { error: updateError } = await supabase.auth.updateUser({
  data: { user_role: profileData.role }
});

if (updateError) console.error("Erro ao atualizar metadados:", updateError);

router.push("/interno");
      }
    } catch {
      setError("Erro ao realizar login");
      setLoading(false);
    }
  };

  const verify2FACode = useCallback(async () => {
    if (!pendingUser || twoFactorCode.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", userId: pendingUser.id, code: twoFactorCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.verified) {
        setError(data.error || "Código inválido");
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", pendingUser.id)
        .single();

      if (profileData) {
localStorage.setItem("tenislab_role", profileData.role);

// Esta linha é CRUCIAL: ela coloca o papel do usuário no JWT
await supabase.auth.updateUser({
  data: { user_role: profileData.role }
});

router.push("/interno");

      router.push("/interno");
    } catch {
      setError("Erro ao verificar código");
      setLoading(false);
    }
  }, [pendingUser, twoFactorCode, router]);

  useEffect(() => {
    if (twoFactorCode.length === 6) {
      verify2FACode();
    }
  }, [twoFactorCode, verify2FACode]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (show2FA) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-slate-50 animate-in fade-in duration-500">
        <div className="w-full max-w-sm flex flex-col gap-10">
          <header className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <p className="text-slate-500 text-sm font-medium tracking-widest uppercase text-center">
              Verificação em duas etapas
            </p>
          </header>

          <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="pt-8 pb-4 px-8">
              <CardTitle className="text-2xl font-black text-slate-900 tracking-tight text-center">
                Digite o código
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium text-center">
                Enviamos um código de 6 dígitos para {pendingUser?.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="flex flex-col items-center gap-6">
                <InputOTP
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(value) => setTwoFactorCode(value)}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-12 h-14 text-xl font-bold" />
                    <InputOTPSlot index={1} className="w-12 h-14 text-xl font-bold" />
                    <InputOTPSlot index={2} className="w-12 h-14 text-xl font-bold" />
                    <InputOTPSlot index={3} className="w-12 h-14 text-xl font-bold" />
                    <InputOTPSlot index={4} className="w-12 h-14 text-xl font-bold" />
                    <InputOTPSlot index={5} className="w-12 h-14 text-xl font-bold" />
                  </InputOTPGroup>
                </InputOTP>

                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-100 text-red-600 rounded-2xl py-4 animate-in fade-in zoom-in-95 duration-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs font-bold">{error}</AlertDescription>
                  </Alert>
                )}

                {loading && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Verificando...</span>
                  </div>
                )}

                <Button
                  variant="ghost"
                  onClick={() => pendingUser && send2FACode(pendingUser.id, pendingUser.email)}
                  disabled={sending2FA}
                  className="text-slate-500 hover:text-slate-700"
                >
                  {sending2FA ? "Enviando..." : "Reenviar código"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setShow2FA(false);
                    setPendingUser(null);
                    setTwoFactorCode("");
                    supabase.auth.signOut();
                  }}
                  className="text-slate-500"
                >
                  Voltar ao login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-slate-50 animate-in fade-in duration-500">
      <div className="w-full max-w-sm flex flex-col gap-10">
        <header className="flex flex-col items-center gap-6">
          <div className="relative h-40 w-64">
            <Image 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/logo-1766879913032.PNG" 
              alt="TENISLAB Logo" 
              fill
              priority
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 400px"
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
