import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 5;

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

export async function POST(request: Request) {
  try {
    const { action, userId, email, code } = await request.json();

    if (!action || !userId) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimitKey = `${ip}-${userId}`;

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um momento." }, { status: 429 });
    }

    if (action === "send") {
      if (!email) {
        return NextResponse.json({ error: "Email é obrigatório" }, { status: 400 });
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

      console.log(`[2FA] Código para ${email}: ${newCode}`);

      return NextResponse.json({ success: true, message: "Código enviado" });
    }

    if (action === "verify") {
      if (!code) {
        return NextResponse.json({ error: "Código é obrigatório" }, { status: 400 });
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
        return NextResponse.json({ error: "Código inválido", verified: false }, { status: 400 });
      }

      await supabaseAdmin.from("two_factor_codes").delete().eq("user_id", userId);

      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    console.error("2FA error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
