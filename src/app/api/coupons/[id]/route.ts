import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireAdmin } from "@/lib/auth-middleware";
import { UpdateCouponSchema, validateSchema } from "@/schemas";
import { logger } from "@/lib/logger";

// GET /api/coupons/[id] - Detalhes do cupom
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação (apenas ADMIN)
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await context.params;

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .select(`
        *,
        coupon_usage (
          id,
          client_id,
          service_order_id,
          discount_amount,
          used_at,
          clients (
            name,
            phone
          ),
          service_orders (
            os_number
          )
        )
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Cupom não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    logger.error("Erro ao buscar cupom:", error);
    return NextResponse.json(
      { error: "Erro ao buscar cupom: " + error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/coupons/[id] - Atualizar cupom
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação (apenas ADMIN)
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await context.params;
    const body = await request.json();

    // Validar dados
    const validation = validateSchema(UpdateCouponSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.errors },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("coupons")
      .update(validation.data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Cupom não encontrado" },
        { status: 404 }
      );
    }

    logger.log("Cupom atualizado:", id);
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error("Erro ao atualizar cupom:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar cupom: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/coupons/[id] - Deletar cupom
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação (apenas ADMIN)
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await context.params;

    const { error } = await supabaseAdmin
      .from("coupons")
      .delete()
      .eq("id", id);

    if (error) throw error;

    logger.log("Cupom deletado:", id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Erro ao deletar cupom:", error);
    return NextResponse.json(
      { error: "Erro ao deletar cupom: " + error.message },
      { status: 500 }
    );
  }
}
