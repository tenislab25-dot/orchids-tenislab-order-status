import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminOrAtendente } from "@/lib/auth-middleware";
import { CreateClientSchema, validateSchema } from "@/schemas";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await requireAdminOrAtendente(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const limit = searchParams.get("limit");
    const topOnly = searchParams.get("top") === "true";

    // Query para buscar clientes com estatísticas
    let query = supabase
      .from("clients")
      .select(`
        id,
        name,
        phone,
        email,
        is_vip,
        created_at,
        service_orders (
          id,
          total,
          created_at,
          payment_confirmed
        )
      `);

    // Se houver busca, filtrar por nome ou telefone
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: clientsData, error } = await query;

    if (error) {
      logger.error("Erro ao buscar clientes:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Processar dados para adicionar estatísticas
    const clientsWithStats = clientsData?.map((client: any) => {
      const orders = client.service_orders || [];
      const totalServices = orders.length;
      const totalSpent = orders.reduce((sum: number, order: any) => sum + (Number(order.total) || 0), 0);
      const ticketMedio = totalServices > 0 ? totalSpent / totalServices : 0;
      
      // Ordenar ordens por data para pegar primeira e última
      const sortedOrders = orders.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      const firstServiceDate = sortedOrders[0]?.created_at || null;
      const lastServiceDate = sortedOrders[sortedOrders.length - 1]?.created_at || null;

      return {
        id: client.id,
        name: client.name,
        phone: client.phone,
        email: client.email,
        is_vip: client.is_vip || false,
        created_at: client.created_at,
        total_services: totalServices,
        total_spent: totalSpent,
        ticket_medio: ticketMedio,
        first_service_date: firstServiceDate,
        last_service_date: lastServiceDate,
      };
    }) || [];

    // Ordenar por total de serviços (decrescente) e depois por total gasto (decrescente)
    clientsWithStats.sort((a, b) => {
      if (b.total_services !== a.total_services) {
        return b.total_services - a.total_services;
      }
      return b.total_spent - a.total_spent;
    });

    // Se for requisição de top clientes, limitar a 10
    if (topOnly) {
      return NextResponse.json(clientsWithStats.slice(0, 10));
    }

    // Se houver limite, aplicar
    if (limit) {
      return NextResponse.json(clientsWithStats.slice(0, parseInt(limit)));
    }

    return NextResponse.json(clientsWithStats);
  } catch (error: any) {
    logger.error("Erro no endpoint de clientes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await requireAdminOrAtendente(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    
    // Validar dados
    const validation = validateSchema(CreateClientSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.errors },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('clients')
      .insert([validation.data])
      .select()
      .single();

    if (error) {
      logger.error("Erro ao criar cliente:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.log("Cliente criado:", data.id);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    logger.error("Erro no POST de clientes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
