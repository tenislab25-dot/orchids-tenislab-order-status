import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/coupons/validate - Validar cupom para um cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, clientId } = body;

    if (!code) {
      return NextResponse.json(
        { valid: false, error: "Código do cupom é obrigatório" },
        { status: 400 }
      );
    }

    // 1. Buscar cupom pelo código (usar supabaseAdmin para bypassar RLS)
    const { data: coupon, error: couponError } = await supabaseAdmin
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase().trim())
      .single();

    if (couponError || !coupon) {
      return NextResponse.json({
        valid: false,
        error: "Cupom não encontrado"
      });
    }

    // 2. Verificar se está ativo
    if (!coupon.is_active) {
      return NextResponse.json({
        valid: false,
        error: "Cupom desativado"
      });
    }

    // 3. Verificar se expirou
    if (new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: "Cupom expirado"
      });
    }

    // 4. Verificar se atingiu o limite total
    if (coupon.times_used >= coupon.total_limit) {
      return NextResponse.json({
        valid: false,
        error: "Cupom esgotado"
      });
    }

    // 5. Verificar se o cliente já usou este cupom (se clientId fornecido)
    if (clientId) {
      const { data: usage, error: usageError } = await supabaseAdmin
        .from("coupon_usage")
        .select("id")
        .eq("coupon_id", coupon.id)
        .eq("client_id", clientId)
        .maybeSingle();

      if (usage) {
        return NextResponse.json({
          valid: false,
          error: "Você já usou este cupom"
        });
      }
    }

    // Cupom válido!
    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_percent: coupon.discount_percent,
        expires_at: coupon.expires_at
      }
    });
  } catch (error: any) {
    logger.error("Erro ao validar cupom:", error);
    return NextResponse.json(
      { valid: false, error: "Erro ao validar cupom: " + error.message },
      { status: 500 }
    );
  }
}
