import { NextResponse } from "next/server";
import { sendPushToAll, getStatusMessage } from "@/lib/push-notifications";
import { verifyAuth, canManageOrders } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await verifyAuth(request);
  if (!auth || !canManageOrders(auth.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { status, clientName, osNumber } = await request.json();

    if (!status || !clientName || !osNumber) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const message = getStatusMessage(status, clientName, osNumber);
    
    if (!message) {
      return NextResponse.json({ sent: 0, message: "Status não requer notificação" });
    }

    const result = await sendPushToAll(message);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Status notification error:", error);
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 });
  }
}
