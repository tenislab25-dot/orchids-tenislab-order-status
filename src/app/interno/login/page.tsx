"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push("/interno");
          return;
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setIsChecking(false);
      }
    };
    checkSession();
  }, [router]);

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
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (profileError || !profileData) {
          setError("Perfil não encontrado. Entre em contato com o administrador.");
          setLoading(false);
          return;
        }

        localStorage.setItem("tenislab_role", profileData.role);
        router.push("/interno");
      }
    } catch (err) {
      setError("Erro ao realizar login");
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12 bg-slate-50 animate-in fade-in duration-500">
      <div className="w-full max-w-sm flex flex-col gap-10">
            {/* SECTION 1 — BRAND */}
                  <header className="flex flex-col items-center gap-6">
                    <img 
                      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=8000&height=8000&resize=contain" 
                      alt="TENISLAB Logo" 
                      className="h-40 w-auto object-contain"
                    />
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
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
            </form>
          </CardContent>
          
          {/* SECTION 7 — FOOTER */}
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
