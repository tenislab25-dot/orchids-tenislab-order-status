import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/coupons/[id] - Detalhes do cupom
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { data, error } = await supabase
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
    console.error("Erro ao buscar cupom:", error);
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
    const { id } = await context.params;
    const body = await request.json();

    const { data, error } = await supabase
      .from("coupons")
      .update(body)
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

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro ao atualizar cupom:", error);
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
    const { id } = await context.params;

    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao deletar cupom:", error);
    return NextResponse.json(
      { error: "Erro ao deletar cupom: " + error.message },
      { status: 500 }
    );
  }
}
