import { NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/push-notifications";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Muitas requisições. Tente novamente em um minuto." }, { status: 429 });
    }

    const { clientName, osNumber, deliveryDate, orderId } = await request.json();

    if (!clientName || !osNumber) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    if (orderId) {
      const { data: order } = await supabase
        .from("service_orders")
        .select("os_number, status")
        .eq("id", orderId)
        .single();
      
      if (!order || order.os_number !== osNumber) {
        return NextResponse.json({ error: "Ordem de serviço não encontrada" }, { status: 404 });
      }
    }

    const formattedDate = deliveryDate 
      ? new Date(deliveryDate + "T12:00:00").toLocaleDateString("pt-BR")
      : "";

    const result = await sendPushToAll({
      title: "Cliente aceitou o serviço!",
      body: `${clientName} aceitou a OS ${osNumber}${formattedDate ? `. Entrega: ${formattedDate}` : ""}`,
      url: `/interno/os/${osNumber.replace("/", "-")}`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Client acceptance notification error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
