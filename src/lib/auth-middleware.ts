import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type UserRole = 'ADMIN' | 'ATENDENTE' | 'OPERACIONAL' | 'ENTREGADOR';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Middleware de autenticação para API routes
 * Verifica se o usuário está autenticado e tem a role necessária
 */
export async function requireAuth(
  request: NextRequest,
  allowedRoles?: UserRole[]
): Promise<{ user: AuthenticatedUser } | NextResponse> {
  try {
    const supabase = await createClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado. Faça login para continuar.' },
        { status: 401 }
      );
    }
    
    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, name')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Perfil de usuário não encontrado.' },
        { status: 403 }
      );
    }
    
    // Verificar role se especificado
    if (allowedRoles && !allowedRoles.includes(profile.role as UserRole)) {
      return NextResponse.json(
        { 
          error: 'Acesso negado. Você não tem permissão para esta operação.',
          required_roles: allowedRoles,
          your_role: profile.role
        },
        { status: 403 }
      );
    }
    
    // Retornar usuário autenticado
    return {
      user: {
        id: user.id,
        email: user.email!,
        role: profile.role as UserRole,
      }
    };
  } catch (error) {
    console.error('[AUTH] Erro na autenticação:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar autenticação.' },
      { status: 500 }
    );
  }
}

/**
 * Helper para verificar se é admin
 */
export async function requireAdmin(request: NextRequest) {
  return requireAuth(request, ['ADMIN']);
}

/**
 * Helper para verificar se é admin ou atendente
 */
export async function requireAdminOrAtendente(request: NextRequest) {
  return requireAuth(request, ['ADMIN', 'ATENDENTE']);
}

/**
 * Helper para verificar se é admin, atendente ou entregador
 */
export async function requireStaff(request: NextRequest) {
  return requireAuth(request, ['ADMIN', 'ATENDENTE', 'ENTREGADOR']);
}
