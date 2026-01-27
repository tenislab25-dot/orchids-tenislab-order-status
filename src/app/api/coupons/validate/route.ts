import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/coupons/validate - Validar cupom para um cliente
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, client_id } = body;

    if (!code || !client_id) {
      return NextResponse.json(
        { valid: false, error: "Código do cupom e ID do cliente são obrigatórios" },
        { status: 400 }
      );
    }

    // 1. Buscar cupom pelo código
    const { data: coupon, error: couponError } = await supabase
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

    // 5. Verificar se o cliente já usou este cupom
    const { data: usage, error: usageError } = await supabase
      .from("coupon_usage")
      .select("id")
      .eq("coupon_id", coupon.id)
      .eq("client_id", client_id)
      .single();

    if (usage) {
      return NextResponse.json({
        valid: false,
        error: "Você já usou este cupom"
      });
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
    console.error("Erro ao validar cupom:", error);
    return NextResponse.json(
      { valid: false, error: "Erro ao validar cupom: " + error.message },
      { status: 500 }
    );
  }
}
