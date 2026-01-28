import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth-middleware";
import { logger } from "@/lib/logger";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação (apenas ADMIN)
    const authResult = await requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    // Buscar estado atual do cliente
    const { data: currentClient, error: fetchError } = await supabase
      .from("clients")
      .select("is_vip")
      .eq("id", clientId)
      .single();

    if (fetchError) {
      logger.error("Erro ao buscar cliente:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Inverter o estado VIP
    const newVipStatus = !currentClient.is_vip;

    // Atualizar cliente
    const { data, error } = await supabase
      .from("clients")
      .update({ is_vip: newVipStatus })
      .eq("id", clientId)
      .select()
      .single();

    if (error) {
      logger.error("Erro ao atualizar status VIP:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logger.log(`Cliente ${clientId} VIP: ${data.is_vip}`);
    return NextResponse.json({ 
      success: true, 
      is_vip: data.is_vip,
      message: data.is_vip ? "Cliente marcado como VIP" : "Cliente desmarcado como VIP"
    });
  } catch (error: any) {
    logger.error("Erro no endpoint de toggle VIP:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
