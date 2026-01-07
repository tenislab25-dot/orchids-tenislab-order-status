import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuth, canManageOrders } from "@/lib/api-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const auth = await verifyAuth(request);

  if (!auth || !canManageOrders(auth.role)) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    if (!body?.title || !body?.body) {
      return NextResponse.json(
        { error: "Título e corpo são obrigatórios" },
        { status: 400 }
      );
    }

    // ⚠️ PUSH DESABILITADO TEMPORARIAMENTE
    // Endpoint existe apenas para não quebrar o build

    return NextResponse.json({
      success: true,
      message: "Notificação ignorada (push desativado)",
    });
  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
