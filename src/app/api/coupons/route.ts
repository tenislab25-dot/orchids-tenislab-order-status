import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/coupons - Listar todos os cupons
export async function GET() {
  try {
    const { data, error } = await supabase
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
    console.error("Erro ao buscar cupons:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cupons: " + error.message },
      { status: 500 }
    );
  }
}

// POST /api/coupons - Criar novo cupom
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, discount_percent, expires_at, total_limit } = body;

    // Validações
    if (!code || !discount_percent || !expires_at || !total_limit) {
      return NextResponse.json(
        { error: "Campos obrigatórios: code, discount_percent, expires_at, total_limit" },
        { status: 400 }
      );
    }

    if (discount_percent <= 0 || discount_percent > 100) {
      return NextResponse.json(
        { error: "Desconto deve estar entre 1% e 100%" },
        { status: 400 }
      );
    }

    if (total_limit <= 0) {
      return NextResponse.json(
        { error: "Limite total deve ser maior que 0" },
        { status: 400 }
      );
    }

    if (new Date(expires_at) <= new Date()) {
      return NextResponse.json(
        { error: "Data de expiração deve ser futura" },
        { status: 400 }
      );
    }

    // Criar cupom
    const { data, error } = await supabase
      .from("coupons")
      .insert({
        code: code.toUpperCase().trim(),
        discount_percent,
        expires_at,
        total_limit,
        is_active: true
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

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar cupom:", error);
    return NextResponse.json(
      { error: "Erro ao criar cupom: " + error.message },
      { status: 500 }
    );
  }
}
