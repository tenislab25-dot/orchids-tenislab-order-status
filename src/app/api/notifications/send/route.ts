import { NextResponse } from "next/server";
import { verifyAuth, canManageOrders } from "@/lib/api-auth";

export async function POST(request: Request) {
  const auth = await verifyAuth(request);

  if (!auth || !canManageOrders(auth.role)) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401 }
    );
  }

  // Push desativado temporariamente
  return NextResponse.json({
    success: true,
    message: "Status alterado (push desativado)",
  });
}
