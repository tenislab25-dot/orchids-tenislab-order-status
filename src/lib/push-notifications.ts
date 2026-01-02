import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  "mailto:contato@tenislab.app.br",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToAll(payload: NotificationPayload) {
  try {
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (error || !subscriptions?.length) {
      return { sent: 0, failed: 0 };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      url: payload.url || "/",
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          notificationPayload
        );
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
        failed++;
      }
    }

    return { sent, failed };
  } catch (error) {
    console.error("Push notification error:", error);
    return { sent: 0, failed: 0 };
  }
}

export function getStatusMessage(status: string, clientName: string, osNumber: string): NotificationPayload | null {
  switch (status) {
    case "Em espera":
      return {
        title: "Pedido em espera",
        body: `OS ${osNumber} de ${clientName} está aguardando produção`,
        url: `/interno/os/${osNumber.replace("/", "-")}`,
      };
    case "Em serviço":
      return {
        title: "Produção iniciada!",
        body: `OS ${osNumber} de ${clientName} entrou em produção`,
        url: `/interno/os/${osNumber.replace("/", "-")}`,
      };
    case "Em finalização":
      return {
        title: "Finalizando pedido",
        body: `OS ${osNumber} de ${clientName} está em finalização`,
        url: `/interno/os/${osNumber.replace("/", "-")}`,
      };
    case "Pronto para entrega ou retirada":
      return {
        title: "Pedido pronto!",
        body: `OS ${osNumber} de ${clientName} está pronto para entrega/retirada`,
        url: `/interno/os/${osNumber.replace("/", "-")}`,
      };
    case "Entregue":
      return {
        title: "Pedido entregue!",
        body: `OS ${osNumber} de ${clientName} foi entregue com sucesso`,
        url: `/interno/os/${osNumber.replace("/", "-")}`,
      };
    default:
      return null;
  }
}
