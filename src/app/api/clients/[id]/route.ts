import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrAtendente } from "@/lib/auth-middleware";
import { UpdateClientSchema, validateSchema } from "@/schemas";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await requireAdminOrAtendente(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    // Buscar cliente com todas as suas ordens de serviço
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select(`
        *,
        service_orders (
          id,
          os_number,
          status,
          total,
          payment_confirmed,
          created_at,
          delivery_date,
          items
        )
      `)
      .eq("id", clientId)
      .single();

    if (clientError) {
      logger.error("Erro ao buscar cliente:", clientError);
      return NextResponse.json({ error: clientError.message }, { status: 500 });
    }

    if (!clientData) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }

    // Calcular estatísticas
    const orders = clientData.service_orders || [];
    const totalServices = orders.length;
    const totalSpent = orders.reduce((sum: number, order: any) => sum + (Number(order.total) || 0), 0);
    const ticketMedio = totalServices > 0 ? totalSpent / totalServices : 0;

    // Ordenar ordens por data (mais recente primeiro)
    const sortedOrders = orders.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const firstServiceDate = sortedOrders[sortedOrders.length - 1]?.created_at || null;
    const lastServiceDate = sortedOrders[0]?.created_at || null;

    // Montar resposta
    const response = {
      id: clientData.id,
      name: clientData.name,
      phone: clientData.phone,
      email: clientData.email,
      is_vip: clientData.is_vip || false,
      created_at: clientData.created_at,
      plus_code: clientData.plus_code,
      coordinates: clientData.coordinates,
      complement: clientData.complement,
      stats: {
        total_services: totalServices,
        total_spent: totalSpent,
        ticket_medio: ticketMedio,
        first_service_date: firstServiceDate,
        last_service_date: lastServiceDate,
      },
      service_orders: sortedOrders,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error("Erro no endpoint de cliente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const authResult = await requireAdminOrAtendente(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resolvedParams = await params;
    const clientId = resolvedParams.id;
    const body = await request.json();

    // Validar dados
    const validation = validateSchema(UpdateClientSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.errors },
        { status: 400 }
      );
    }

    // Atualizar cliente
    const { data, error } = await supabase
      .from("clients")
      .update(validation.data)
      .eq("id", clientId)
      .select()
      .single();

    if (error) {
      logger.error("Erro ao atualizar cliente:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.log("Cliente atualizado:", clientId);
    return NextResponse.json(data);
  } catch (error: any) {
    logger.error("Erro no endpoint de atualização de cliente:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
