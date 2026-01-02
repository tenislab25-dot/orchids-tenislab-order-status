import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAuth, canManageOrders } from "@/lib/api-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  const auth = await verifyAuth(request);
  if (!auth || !canManageOrders(auth.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: overduePayments, error: paymentError } = await supabase
    .from("service_orders")
    .select(`
      id,
      os_number,
      total,
      updated_at,
      clients (
        name,
        phone
      )
    `)
    .eq("status", "Entregue")
    .eq("payment_confirmed", false)
    .eq("pay_on_entry", false)
    .lt("updated_at", sevenDaysAgo.toISOString());

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  const alerts = (overduePayments || []).map((order: any) => ({
    id: order.id,
    os_number: order.os_number,
    client_name: order.clients?.name,
    client_phone: order.clients?.phone,
    total: order.total,
    days_overdue: Math.floor(
      (new Date().getTime() - new Date(order.updated_at).getTime()) /
        (1000 * 60 * 60 * 24)
    ),
    message: `Olá ${order.clients?.name}! Gostaríamos de lembrar que o pagamento da OS #${order.os_number} no valor de R$ ${Number(order.total).toFixed(2)} ainda está pendente. Agradecemos a confirmação!`,
  }));

  return NextResponse.json({
    success: true,
    alerts,
    count: alerts.length,
  });
}

export async function POST(request: Request) {
  const auth = await verifyAuth(request);
  if (!auth || !canManageOrders(auth.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { error: "Phone and message are required" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.replace(/\D/g, "");
    const whatsappPhone = cleanPhone.startsWith("55")
      ? cleanPhone
      : `55${cleanPhone}`;

    const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      success: true,
      whatsappUrl,
      method: "whatsapp_redirect",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
