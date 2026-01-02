import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToAll } from "@/lib/push-notifications";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  
  const isAuthorized = 
    authHeader === `Bearer ${process.env.CRON_SECRET}` || 
    vercelCronHeader === "1";
    
  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const { data: todayOrders, error } = await supabase
      .from("service_orders")
      .select(`
        id,
        os_number,
        delivery_date,
        status,
        clients (name)
      `)
      .eq("delivery_date", today)
      .not("status", "eq", "Entregue")
      .not("status", "eq", "Cancelado");

    if (error) throw error;

    if (!todayOrders || todayOrders.length === 0) {
      return NextResponse.json({ message: "Nenhuma entrega para hoje", count: 0 });
    }

    await sendPushToAll({
      title: `${todayOrders.length} entrega(s) para HOJE!`,
      body: todayOrders.length === 1 
        ? `OS ${todayOrders[0].os_number} de ${(todayOrders[0] as any).clients?.name}`
        : `${todayOrders.map((o: any) => o.os_number).join(", ")}`,
      url: "/interno/calendario",
    });

    return NextResponse.json({ 
      message: "Alertas enviados", 
      count: todayOrders.length,
      orders: todayOrders.map((o: any) => o.os_number)
    });
  } catch (error) {
    console.error("Delivery alert error:", error);
    return NextResponse.json({ error: "Failed to check deliveries" }, { status: 500 });
  }
}
