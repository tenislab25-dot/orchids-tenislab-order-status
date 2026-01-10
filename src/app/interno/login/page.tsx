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
      const timeoutId = setTimeout(() => setIsChecking(false), 3000);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        clearTimeout(timeoutId);
        if (session) {
          router.push("/interno");
          return;
        }
      } catch (err) {
        console.error("Erro ao verificar sessão:", err);
      } finally {
        setIsChecking(false);
      }
    };
    checkSession();
  }, [router]);

  const send2FACode = useCallback(async (userId: string, userEmail: string) => {
    setSending2FA(true);
    try {
      const response = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", userId, email: userEmail }),
      });
      if (!response.ok) setError("Erro ao enviar código de verificação");
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
        
        // Injeta o user_role no JWT para o RLS do Supabase funcionar
        await supabase.auth.updateUser({
          data: { user_role: profileData.role }
        });

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
        await supabase.auth.updateUser({
          data: { user_role: profileData.role }
        });
      }
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
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-slate-50">
        <div className="w-full max-w-sm flex flex-col gap-10">
          <header className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-white" />
            </div>
            <p className="text-slate-500 text-sm font-medium tracking-widest uppercase text-center">
              Verificação em duas etapas
            </p>
          </header>
          <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="pt-8 pb-4 px-8">
              <CardTitle className="text-2xl font-black text-slate-900 text-center">Digite o código</CardTitle>
              <CardDescription className="text-slate-400 text-center">Enviamos um código para {pendingUser?.email}</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 flex flex-col items-center gap-6">
              <InputOTP maxLength={6} value={twoFactorCode} onChange={setTwoFactorCode} disabled={loading}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="w-12 h-14 text-xl font-bold" />)}
                </InputOTPGroup>
              </InputOTP>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <Button variant="ghost" onClick={() => pendingUser && send2FACode(pendingUser.id, pendingUser.email)} disabled={sending2FA}>
                {sending2FA ? "Enviando..." : "Reenviar código"}
              </Button>
              <Button variant="outline" onClick={() => { setShow2FA(false); supabase.auth.signOut(); }}>Voltar ao login</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-slate-50">
      <div className="w-full max-w-sm flex flex-col gap-10">
        <header className="flex flex-col items-center gap-6">
          <div className="relative h-40 w-64">
            <Image src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/logo-1766879913032.PNG" alt="Logo" fill priority className="object-contain" />
          </div>
          <p className="text-slate-500 text-sm font-medium tracking-widest uppercase text-center">Acesso interno</p>
        </header>
        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
          <CardHeader className="pt-8 pb-4 px-8">
            <CardTitle className="text-2xl font-black text-slate-900">Entrar</CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleLogin} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e ) => setEmail(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-900 text-white font-bold" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
