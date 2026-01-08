import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPushToAll } from "@/lib/push-notifications";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: any = {
    cleanup: null,
    overdue: null,
    delivery: null,
    errors: []
  };

  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Limpeza de Imagens (90 dias)
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: oldOrders, error: ordersError } = await supabaseAdmin
        .from("service_orders")
        .select("id, items, created_at")
        .lt("created_at", ninetyDaysAgo.toISOString())
        .eq("status", "Entregue");

      if (ordersError) throw ordersError;

      let deletedImagesCount = 0;
      for (const order of oldOrders || []) {
        const items = order.items || [];
        let orderHasPhotos = false;
        
        for (const item of items) {
          const allPhotos = [
            ...(item.photos || []),
            ...(item.photosBefore || []),
            ...(item.photosAfter || [])
          ];

          if (allPhotos.length > 0) orderHasPhotos = true;

          for (const photoUrl of allPhotos) {
            const pathMatch = photoUrl.match(/\/photos\/(.+)$/);
            if (pathMatch) {
              const filePath = pathMatch[1];
              await supabaseAdmin.storage.from("photos").remove([filePath]);
              deletedImagesCount++;
            }
          }
        }

        if (orderHasPhotos) {
          const cleanedItems = items.map((item: any) => ({
            ...item,
            photos: [],
            photosBefore: [],
            photosAfter: []
          }));

          await supabaseAdmin
            .from("service_orders")
            .update({ items: cleanedItems })
            .eq("id", order.id);
        }
      }

      // Limpeza de logs e 2FA (7 dias)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      await supabaseAdmin.from("login_attempts").delete().lt("created_at", sevenDaysAgoISO);
      await supabaseAdmin.from("two_factor_codes").delete().lt("created_at", sevenDaysAgoISO);

      results.cleanup = { success: true, imagesDeleted: deletedImagesCount, ordersCleaned: oldOrders?.length || 0 };
    } catch (e: any) {
      results.errors.push(`Cleanup error: ${e.message}`);
    }

    // 2. Alertas de Atraso
    try {
      const { data: overdueOrders, error: overdueError } = await supabaseAdmin
        .from("service_orders")
        .select(`id, os_number, delivery_date, status, clients (name)`)
        .lt("delivery_date", today)
        .not("status", "in", '("Entregue","Cancelado")');

      if (overdueError) throw overdueError;

      if (overdueOrders && overdueOrders.length > 0) {
        await sendPushToAll({
          title: `${overdueOrders.length} OS ATRASADA(S)!`,
          body: overdueOrders.length <= 3 
            ? overdueOrders.map((o: any) => `${o.os_number} - ${o.clients?.name}`).join(", ")
            : `${overdueOrders.slice(0, 3).map((o: any) => o.os_number).join(", ")} e mais ${overdueOrders.length - 3}`,
          url: "/interno/calendario",
        });
        results.overdue = { count: overdueOrders.length };
      } else {
        results.overdue = { count: 0 };
      }
    } catch (e: any) {
      results.errors.push(`Overdue alert error: ${e.message}`);
    }

    // 3. Alertas de Entrega Hoje
    try {
      const { data: todayOrders, error: deliveryError } = await supabaseAdmin
        .from("service_orders")
        .select(`id, os_number, delivery_date, status, clients (name)`)
        .eq("delivery_date", today)
        .not("status", "in", '("Entregue","Cancelado")');

      if (deliveryError) throw deliveryError;

      if (todayOrders && todayOrders.length > 0) {
        await sendPushToAll({
          title: `${todayOrders.length} entrega(s) para HOJE!`,
          body: todayOrders.length === 1 
            ? `OS ${todayOrders[0].os_number} de ${(todayOrders[0] as any).clients?.name}`
            : `${todayOrders.map((o: any) => o.os_number).join(", ")}`,
          url: "/interno/calendario",
        });
        results.delivery = { count: todayOrders.length };
      } else {
        results.delivery = { count: 0 };
      }
    } catch (e: any) {
      results.errors.push(`Delivery alert error: ${e.message}`);
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Global Cron Error:", error);
    return NextResponse.json({ error: error.message, partial_results: results }, { status: 500 });
  }
}
