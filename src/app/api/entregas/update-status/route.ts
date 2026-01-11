import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Cliente Supabase com service_role (bypassa RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const { orderId, newStatus, userRole } = await request.json();

    // Validação: apenas ENTREGADOR pode usar esta API
    if (userRole !== "ENTREGADOR") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas ENTREGADOR pode usar esta rota." },
        { status: 403 }
      );
    }

    // Validação: status permitidos para ENTREGADOR
    const allowedStatuses = ["Pronto", "Em Rota", "Entregue"];
    if (!allowedStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Status inválido. Permitidos: ${allowedStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Buscar pedido atual
    const { data: order, error: fetchError } = await supabaseAdmin
      .from("service_orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    // Validação: ENTREGADOR só pode atualizar pedidos Pronto ou Em Rota
    if (!["Pronto", "Em Rota"].includes(order.status)) {
      return NextResponse.json(
        { error: "Pedido não está disponível para entrega" },
        { status: 400 }
      );
    }

    // Atualizar status usando service_role (bypassa RLS)
    const { error: updateError } = await supabaseAdmin
      .from("service_orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("Erro ao atualizar status:", updateError);
      return NextResponse.json(
        { error: "Erro ao atualizar status: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, newStatus });
  } catch (error: any) {
    console.error("Erro na API de entregas:", error);
    return NextResponse.json(
      { error: "Erro interno: " + error.message },
      { status: 500 }
    );
  }
}
