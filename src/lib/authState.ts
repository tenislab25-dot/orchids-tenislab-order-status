// Estado global de autenticação que persiste entre navegações
// Isso evita re-verificações desnecessárias e redirecionamentos indevidos

import { type UserRole } from "@/lib/auth";

interface AuthState {
  role: UserRole | null;
  user: { id: string; email: string } | null;
  isAuthenticated: boolean;
  hasChecked: boolean;
}

// Estado inicial - verificar localStorage
function getInitialState(): AuthState {
  if (typeof window === 'undefined') {
    return {
      role: null,
      user: null,
      isAuthenticated: false,
      hasChecked: false
    };
  }
  
  const cachedRole = localStorage.getItem("tenislab_role") as UserRole | null;
  
  return {
    role: cachedRole,
    user: null,
    isAuthenticated: !!cachedRole,
    hasChecked: !!cachedRole // Se tem cache, já consideramos verificado
  };
}

// Estado global (singleton)
let globalAuthState: AuthState = getInitialState();

// Listeners para notificar mudanças
const listeners: Set<() => void> = new Set();

export function getAuthState(): AuthState {
  return globalAuthState;
}

export function setAuthState(newState: Partial<AuthState>): void {
  globalAuthState = { ...globalAuthState, ...newState };
  listeners.forEach(listener => listener());
}

export function subscribeToAuthState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearAuthState(): void {
  globalAuthState = {
    role: null,
    user: null,
    isAuthenticated: false,
    hasChecked: false
  };
  listeners.forEach(listener => listener());
}

// Re-inicializar estado quando o módulo é carregado no cliente
if (typeof window !== 'undefined') {
  globalAuthState = getInitialState();
}
