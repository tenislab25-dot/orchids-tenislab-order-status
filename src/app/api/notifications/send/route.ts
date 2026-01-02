import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { verifyAuth, canManageOrders } from "@/lib/api-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  "mailto:contato@tenislab.app.br",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  const auth = await verifyAuth(request);
  if (!auth || !canManageOrders(auth.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { title, body, url, subscriptionId } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: "Título e corpo são obrigatórios" }, { status: 400 });
    }

    let query = supabase.from("push_subscriptions").select("*");
    
    if (subscriptionId) {
      query = query.eq("id", subscriptionId);
    }

    const { data: subscriptions, error } = await query;
    if (error) throw error;

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      url: url || "/",
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            payload
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
          return { success: false, endpoint: sub.endpoint, error: err.message };
        }
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled" && (r.value as any).success).length;
    const failed = results.length - successful;

    return NextResponse.json({ sent: successful, failed });
  } catch (error) {
    console.error("Send notification error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
