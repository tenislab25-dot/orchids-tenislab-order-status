import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 400 }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, login_attempts, locked_until")
      .eq("email", email.toLowerCase())
      .single();

    if (profile?.locked_until) {
      const lockedUntil = new Date(profile.locked_until);
      const now = new Date();
      
      if (lockedUntil > now) {
        const remainingSeconds = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);
        return NextResponse.json(
          { 
            error: "Acesso temporariamente bloqueado. Tente novamente mais tarde.",
            locked: true,
            remainingSeconds 
          },
          { status: 429 }
        );
      } else {
        await supabaseAdmin
          .from("profiles")
          .update({ login_attempts: 0, locked_until: null })
          .eq("id", profile.id);
      }
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      if (profile) {
        const newAttempts = (profile.login_attempts || 0) + 1;
        
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          const lockedUntil = new Date();
          lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCKOUT_DURATION_MINUTES);
          
          await supabaseAdmin
            .from("profiles")
            .update({ 
              login_attempts: newAttempts, 
              locked_until: lockedUntil.toISOString() 
            })
            .eq("id", profile.id);

          await supabaseAdmin
            .from("login_attempts")
            .insert({ email: email.toLowerCase(), success: false });

          return NextResponse.json(
            { 
              error: "Acesso temporariamente bloqueado. Tente novamente mais tarde.",
              locked: true,
              remainingSeconds: LOCKOUT_DURATION_MINUTES * 60
            },
            { status: 429 }
          );
        }

        await supabaseAdmin
          .from("profiles")
          .update({ login_attempts: newAttempts })
          .eq("id", profile.id);

        await supabaseAdmin
          .from("login_attempts")
          .insert({ email: email.toLowerCase(), success: false });
      }

      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    if (profile) {
      await supabaseAdmin
        .from("profiles")
        .update({ login_attempts: 0, locked_until: null })
        .eq("id", profile.id);

      await supabaseAdmin
        .from("login_attempts")
        .insert({ email: email.toLowerCase(), success: true });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
