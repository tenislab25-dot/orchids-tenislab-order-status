"use client";

import { useRouter } from "next/navigation";
import { logger } from "@/lib/logger";
import Link from "next/link";
import {
  Ticket,
  LayoutDashboard,
  Users,
  Wallet,
  Database,
  ChevronRight,
  ClipboardList,
  LayoutGrid,
  ShoppingBag,
  Loader2,
  Truck,
  Package
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getRoleLabel, type UserRole } from "@/lib/auth";

interface MenuButtonProps {
  href: string;
  title: string;
  icon: React.ElementType;
  description?: string;
}

function MenuButton({ href, title, icon: Icon, description }: MenuButtonProps) {
  const router = useRouter();
  
  return (
    <button 
      onClick={() => router.push(href)}
      className="flex items-center gap-4 p-6 rounded-[2rem] transition-all active:scale-[0.98] w-full text-left bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:border-slate-200"
    >
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-slate-900 text-white">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg text-slate-900 leading-tight">{title}</h3>
        {description && <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-wider">{description}</p>}
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300" />
    </button>
  );
}

export default function InternoPage() {
  const { role, loading } = useAuth();
  const router = useRouter();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!role) {
    logger.log("Role is null or undefined");
    return null;
  }

  logger.log("Current user role:", role);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-6 py-12 animate-in fade-in duration-700">
      <div className="w-full max-w-md flex flex-col gap-10">
        {/* HEADER */}
        <header className="flex flex-col items-center gap-6">
          <Link href="/menu-principal" prefetch={false}>
            <img 
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=8000&height=8000&resize=contain" 
              alt="TENISLAB Logo" 
              className="h-12 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Menu Principal</h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
              Bem-vindo, {getRoleLabel(role as UserRole)}
            </p>
          </div>
        </header>

        {/* MENU */}
        <main className="flex flex-col gap-4">
          {(role === 'ADMIN' || role === 'ATENDENTE' || role === 'OPERACIONAL') && (
            <MenuButton 
              href="/menu-principal/painel"
              title="Painel"
              icon={LayoutDashboard}
              description="Visão Geral"
            />
          )}

          {(role === 'ADMIN' || role === 'ATENDENTE') && (
            <MenuButton 
              href="/menu-principal/os"
              title="Nova OS"
              icon={ClipboardList}
              description="Criar Ordem de Serviço"
            />
          )}

          {(role === 'ADMIN' || role === 'ATENDENTE') && (
            <MenuButton 
              href="/menu-principal/clientes"
              title="Clientes"
              icon={Users}
              description="Base de Clientes"
            />
          )}

          {(role === 'ADMIN' || role === 'ATENDENTE') && (
            <MenuButton 
              href="/menu-principal/todos"
              title="Todas as OS"
              icon={Package}
              description="Lista completa de OS ativas"
            />
          )}

          {role === 'ADMIN' && (
            <MenuButton 
              href="/menu-principal/cupons"
              title="Cupons"
              icon={Ticket}
              description="Cupons de Desconto"
            />
          )}

          {role === 'ADMIN' && (
            <MenuButton 
              href="/menu-principal/financeiro"
              title="Financeiro"
              icon={Wallet}
              description="Relatórios Financeiros"
            />
          )}

          {role === 'ADMIN' && (
            <MenuButton 
              href="/menu-principal/servicos"
              title="Serviços"
              icon={LayoutGrid}
              description="Catálogo de Preços"
            />
          )}

          {role === 'ADMIN' && (
            <MenuButton 
              href="/menu-principal/produtos"
              title="Produtos"
              icon={ShoppingBag}
              description="Itens para Venda"
            />
          )}

          {(role === 'ADMIN' || role === 'ATENDENTE' || role === 'ENTREGADOR') && (
            <MenuButton 
              href="/menu-principal/entregas" 
              title="Entregas" 
              icon={Truck} 
              description="Ver pedidos prontos para entrega" 
            />
          )}
        </main>

        {/* FOOTER / LOGOUT */}
        <footer className="mt-4 flex flex-col gap-8">
          <p className="text-slate-300 text-[10px] uppercase tracking-[0.4em] font-black text-center">
            TENISLAB v2.0
          </p>
        </footer>
      </div>
    </div>
  );
}
