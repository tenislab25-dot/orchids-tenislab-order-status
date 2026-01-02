import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 10;

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
      return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
    }

    const subscription = await request.json();
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: "Dados de assinatura inválidos" }, { status: 400 });
    }

    if (!subscription.endpoint.startsWith("https://")) {
      return NextResponse.json({ error: "Endpoint inválido" }, { status: 400 });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        created_at: new Date().toISOString(),
      }, {
        onConflict: "endpoint"
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
