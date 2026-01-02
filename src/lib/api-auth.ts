import { supabaseAdmin } from "./supabase-admin";

export async function verifyAuth(request: Request): Promise<{ userId: string; role: string } | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return null;
    }

    return { userId: user.id, role: profile.role };
  } catch {
    return null;
  }
}

export function isAdmin(role: string): boolean {
  return role === "admin" || role === "master";
}

export function canManageOrders(role: string): boolean {
  return ["admin", "master", "employee"].includes(role);
}
