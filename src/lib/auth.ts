export type UserRole = 'OPERACIONAL' | 'ATENDENTE' | 'ADMIN';

export type Status = "Recebido" | "Em espera" | "Em serviço" | "Em finalização" | "Pronto para entrega ou retirada" | "Entregue" | "Cancelado";

const ROLE_STATUS_PERMISSIONS: Record<UserRole, Status[]> = {
  OPERACIONAL: ["Recebido", "Em espera", "Em serviço", "Em finalização"],
  ATENDENTE: ["Recebido", "Em espera", "Em serviço", "Em finalização", "Pronto para entrega ou retirada", "Entregue", "Cancelado"],
  ADMIN: ["Recebido", "Em espera", "Em serviço", "Em finalização", "Pronto para entrega ou retirada", "Entregue", "Cancelado"],
};

const ROLE_PAGES: Record<UserRole, string[]> = {
  OPERACIONAL: ['/app', '/app/dashboard', '/app/os', '/app/todos'],
  ATENDENTE: ['/app', '/app/dashboard', '/app/os', '/app/todos', '/app/clientes', '/app/servicos', '/app/financeiro'],
  ADMIN: ['/app', '/app/dashboard', '/app/os', '/app/todos', '/app/clientes', '/app/servicos', '/app/financeiro', '/app/banco-de-dados'],
};

export function canChangeToStatus(role: UserRole, status: Status, currentStatus?: Status): boolean {
  if (currentStatus === "Entregue" && role === "OPERACIONAL") return false;
  return ROLE_STATUS_PERMISSIONS[role]?.includes(status) ?? false;
}

export function getAllowedStatuses(role: UserRole): Status[] {
  return ROLE_STATUS_PERMISSIONS[role] ?? [];
}

export function canAccessPage(role: UserRole, path: string): boolean {
  if (role === 'ADMIN') return true;
  
  const allowedPages = ROLE_PAGES[role] ?? [];
  return allowedPages.some(allowed => path === allowed || path.startsWith(allowed + '/'));
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    OPERACIONAL: 'Operacional',
    ATENDENTE: 'Atendente',
    ADMIN: 'Administrador',
  };
  return labels[role] ?? role;
}

export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MINUTES = 15;
