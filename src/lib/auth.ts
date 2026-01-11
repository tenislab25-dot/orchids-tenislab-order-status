export type UserRole = 'OPERACIONAL' | 'ATENDENTE' | 'ADMIN' | 'ENTREGADOR';

export type Status = "Recebido" | "Em espera" | "Em serviço" | "Em finalização" | "Pronto" | "Entregue" | "Cancelado";

const ROLE_STATUS_PERMISSIONS: Record<UserRole, Status[]> = {
  OPERACIONAL: ["Recebido", "Em espera", "Em serviço", "Em finalização"],
  ATENDENTE: ["Recebido", "Em espera", "Em serviço", "Em finalização", "Pronto", "Entregue", "Cancelado"],
  ADMIN: ["Recebido", "Em espera", "Em serviço", "Em finalização", "Pronto", "Entregue", "Cancelado"],
  ENTREGADOR: ["Entregue"],
};

const ROLE_PAGES: Record<UserRole, string[]> = {
  OPERACIONAL: ['/interno', '/interno/dashboard', '/interno/os', '/interno/todos', '/interno/os/[osId]'],
  ATENDENTE: ['/interno', '/interno/dashboard', '/interno/os', '/interno/todos', '/interno/clientes', '/interno/servicos', '/interno/financeiro'],
  ADMIN: ['/interno', '/interno/dashboard', '/interno/os', '/interno/todos', '/interno/clientes', '/interno/servicos', '/interno/financeiro', '/interno/banco-de-dados'],
  ENTREGADOR: ['/interno', '/interno/todos', '/interno/entregas'],
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
  
  // Verifica se o caminho exato ou o início do caminho é permitido
  const isAllowed = allowedPages.some(allowed => {
    if (allowed.includes('[osId]')) {
      const base = allowed.replace('/[osId]', '');
      return path.startsWith(base + '/');
    }
    return path === allowed || path.startsWith(allowed + '/');
  });

  return isAllowed;
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    OPERACIONAL: 'Operacional',
    ATENDENTE: 'Atendente',
    ADMIN: 'Administrador',
    ENTREGADOR: 'Entregador',
  };
  return labels[role] ?? role;
}

export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_DURATION_MINUTES = 15;
