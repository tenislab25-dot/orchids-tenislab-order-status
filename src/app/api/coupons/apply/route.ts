import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/coupons/apply - Aplicar cupom em uma OS
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, client_id, service_order_id, service_value, freight_value } = body;

    if (!code || !client_id || !service_order_id || service_value === undefined) {
      return NextResponse.json(
        { success: false, error: "Dados incompletos" },
        { status: 400 }
      );
    }

    // 1. Validar cupom
    const validateResponse = await fetch(`${request.nextUrl.origin}/api/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, client_id })
    });

    const validateData = await validateResponse.json();

    if (!validateData.valid) {
      return NextResponse.json({
        success: false,
        error: validateData.error
      });
    }

    const coupon = validateData.coupon;

    // 2. Calcular desconto (APENAS no valor do serviço, não no frete)
    const discount_amount = (service_value * coupon.discount_percent) / 100;
    const new_total = service_value - discount_amount + (freight_value || 0);

    // 3. Atualizar OS com cupom e desconto
    const { error: osError } = await supabase
      .from("service_orders")
      .update({
        coupon_id: coupon.id,
        discount_amount: discount_amount,
        total: new_total
      })
      .eq("id", service_order_id);

    if (osError) throw osError;

    // 4. Registrar uso do cupom
    const { error: usageError } = await supabase
      .from("coupon_usage")
      .insert({
        coupon_id: coupon.id,
        client_id: client_id,
        service_order_id: service_order_id,
        discount_amount: discount_amount
      });

    if (usageError) throw usageError;

    // 5. Incrementar contador de uso do cupom
    const { error: updateError } = await supabase
      .from("coupons")
      .update({
        times_used: coupon.times_used + 1
      })
      .eq("id", coupon.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      discount_amount: discount_amount,
      new_total: new_total,
      coupon: {
        code: coupon.code,
        discount_percent: coupon.discount_percent
      }
    });
  } catch (error: any) {
    console.error("Erro ao aplicar cupom:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao aplicar cupom: " + error.message },
      { status: 500 }
    );
  }
}
