import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { canChangeToStatus, type UserRole, type Status } from "@/lib/auth";
import { requireAdminOrAtendente } from "@/lib/auth-middleware";
import { UpdateOrderStatusSchema, validateSchema } from "@/schemas";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await requireAdminOrAtendente(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { user } = authResult;
    
    const body = await request.json();
    
    // Validar dados com Zod
    const validation = validateSchema(UpdateOrderStatusSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.errors },
        { status: 400 }
      );
    }

    const { order_id, status } = validation.data;

    // Buscar pedido atual
    const { data: currentOrder, error: fetchError } = await supabaseAdmin
      .from("service_orders")
      .select("status")
      .eq("id", order_id)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }

    // Verificar permissão para mudar status
    if (!canChangeToStatus(user.role as UserRole, status as Status, currentOrder.status)) {
      return NextResponse.json(
        { error: "Você não tem permissão para alterar para este status ou o pedido já foi entregue" },
        { status: 403 }
      );
    }

    // Atualizar status
    const { error: updateError } = await supabaseAdmin
      .from("service_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", order_id);

    if (updateError) {
      logger.error("Erro ao atualizar status:", updateError);
      return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 });
    }

    logger.log(`Status atualizado: ${order_id} -> ${status}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error("Erro no update-status:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
