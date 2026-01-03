import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const failedAttemptsMap = new Map<string, { count: number; blockedUntil: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 5;
const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

function checkBruteForce(key: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const record = failedAttemptsMap.get(key);
  
  if (!record) return { allowed: true };
  
  if (record.blockedUntil > now) {
    return { allowed: false, remainingTime: Math.ceil((record.blockedUntil - now) / 1000) };
  }
  
  return { allowed: true };
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const record = failedAttemptsMap.get(key) || { count: 0, blockedUntil: 0 };
  
  record.count++;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION;
    record.count = 0;
  }
  
  failedAttemptsMap.set(key, record);
}

function clearFailedAttempts(key: string) {
  failedAttemptsMap.delete(key);
}

export async function POST(request: Request) {
  try {
    const { action, userId, email, code } = await request.json();

    if (!action || !userId) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (typeof userId !== "string" || userId.length > 50) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `${ip}-${userId}`;

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um momento." }, { status: 429 });
    }

    if (action === "send") {
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return NextResponse.json({ error: "Email inválido" }, { status: 400 });
      }

      const newCode = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await supabaseAdmin
        .from("two_factor_codes")
        .delete()
        .eq("user_id", userId);

      const { error: insertError } = await supabaseAdmin
        .from("two_factor_codes")
        .insert({
          user_id: userId,
          code: newCode,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Error inserting 2FA code:", insertError);
        return NextResponse.json({ error: "Erro ao gerar código" }, { status: 500 });
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`[2FA] Código para ${email}: ${newCode}`);
      }

      return NextResponse.json({ success: true, message: "Código enviado" });
    }

    if (action === "verify") {
      if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: "Código inválido" }, { status: 400 });
      }

      const bruteForceCheck = checkBruteForce(rateLimitKey);
      if (!bruteForceCheck.allowed) {
        return NextResponse.json({ 
          error: `Muitas tentativas falhas. Tente novamente em ${bruteForceCheck.remainingTime} segundos.` 
        }, { status: 429 });
      }

      const { data: storedCode, error: fetchError } = await supabaseAdmin
        .from("two_factor_codes")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (fetchError || !storedCode) {
        return NextResponse.json({ error: "Código não encontrado. Solicite um novo." }, { status: 400 });
      }

      if (new Date(storedCode.expires_at) < new Date()) {
        await supabaseAdmin.from("two_factor_codes").delete().eq("user_id", userId);
        return NextResponse.json({ error: "Código expirado. Solicite um novo." }, { status: 400 });
      }

      if (storedCode.code !== code) {
        recordFailedAttempt(rateLimitKey);
        return NextResponse.json({ error: "Código inválido", verified: false }, { status: 400 });
      }

      await supabaseAdmin.from("two_factor_codes").delete().eq("user_id", userId);
      clearFailedAttempts(rateLimitKey);

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("2FA error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
