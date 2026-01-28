import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth-middleware";
import { CreateCouponSchema, validateSchema } from "@/schemas";
import { logger } from "@/lib/logger";

// GET /api/coupons - Listar todos os cupons
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação (apenas ADMIN)
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .select(`
        *,
        coupon_usage (
          id,
          client_id,
          discount_amount,
          used_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Calcular estatísticas para cada cupom
    const couponsWithStats = data.map((coupon: any) => ({
      ...coupon,
      usage_count: coupon.coupon_usage?.length || 0,
      remaining: coupon.total_limit - (coupon.coupon_usage?.length || 0),
      is_expired: new Date(coupon.expires_at) < new Date(),
      is_available: 
        coupon.is_active && 
        new Date(coupon.expires_at) >= new Date() &&
        (coupon.coupon_usage?.length || 0) < coupon.total_limit
    }));

    return NextResponse.json(couponsWithStats);
  } catch (error: any) {
    logger.error("Erro ao buscar cupons:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cupons: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/coupons - Criar novo cupom
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação (apenas ADMIN)
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    
    // Validar dados com Zod
    const validation = validateSchema(CreateCouponSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.errors },
        { status: 400 }
      );
    }

    // Validação adicional: data de expiração deve ser futura
    if (new Date(validation.data.expires_at) <= new Date()) {
      return NextResponse.json(
        { error: "Data de expiração deve ser futura" },
        { status: 400 }
      );
    }

    // Criar cupom
    const { data, error } = await supabaseAdmin
      .from("coupons")
      .insert({
        code: validation.data.code,
        discount_percent: validation.data.discount_percent,
        expires_at: validation.data.expires_at,
        total_limit: validation.data.total_limit,
        is_active: validation.data.is_active ?? true
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") { // Unique constraint violation
        return NextResponse.json(
          { error: "Já existe um cupom com este código" },
          { status: 409 }
        );
      }
      throw error;
    }

    logger.log("Cupom criado:", data.code);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    logger.error("Erro ao criar cupom:", error);
    return NextResponse.json(
      { error: "Erro ao criar cupom: " + error.message },
      { status: 500 }
    );
  }
}
