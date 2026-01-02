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

    const { data: overdueOrders, error } = await supabase
      .from("service_orders")
      .select(`
        id,
        os_number,
        delivery_date,
        status,
        clients (name)
      `)
      .lt("delivery_date", today)
      .not("status", "eq", "Entregue")
      .not("status", "eq", "Cancelado");

    if (error) throw error;

    if (!overdueOrders || overdueOrders.length === 0) {
      return NextResponse.json({ message: "Nenhuma OS atrasada", count: 0 });
    }

    await sendPushToAll({
      title: `${overdueOrders.length} OS ATRASADA(S)!`,
      body: overdueOrders.length <= 3 
        ? overdueOrders.map((o: any) => `${o.os_number} - ${o.clients?.name}`).join(", ")
        : `${overdueOrders.slice(0, 3).map((o: any) => o.os_number).join(", ")} e mais ${overdueOrders.length - 3}`,
      url: "/interno/calendario",
    });

    return NextResponse.json({ 
      message: "Alertas de atraso enviados", 
      count: overdueOrders.length,
      orders: overdueOrders.map((o: any) => o.os_number)
    });
  } catch (error) {
    console.error("Overdue alert error:", error);
    return NextResponse.json({ error: "Failed to check overdue orders" }, { status: 500 });
  }
}
