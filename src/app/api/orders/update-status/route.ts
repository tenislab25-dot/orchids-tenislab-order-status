import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { canChangeToStatus, type UserRole, type Status } from "@/lib/auth";

const VALID_STATUSES = [
  "Recebido",
  "Em espera",
  "Em serviço",
  "Em finalização",
  "Pronto",
  "Entregue",
  "Cancelado"
];

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Perfil não encontrado" }, { status: 403 });
    }

    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (typeof orderId !== "string" || orderId.length > 50) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const { data: currentOrder } = await supabaseAdmin
      .from("service_orders")
      .select("status")
      .eq("id", orderId)
      .single();

    const userRole = profile.role as UserRole;
    if (!canChangeToStatus(userRole, status as Status, currentOrder?.status)) {
      return NextResponse.json(
        { error: "Você não tem permissão para alterar para este status ou o pedido já foi entregue" },
        { status: 403 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("service_orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateError) {
      return NextResponse.json({ error: "Erro ao atualizar status" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
