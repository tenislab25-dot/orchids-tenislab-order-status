"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { checkOrderAlerts, type Alert } from "@/lib/notifications";

export default function FloatingAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Verificar role do usuário
    const storedRole = localStorage.getItem("tenislab_role");
    setRole(storedRole);
    
    // Não mostrar alertas para entregador (OPERACIONAL)
    if (storedRole === "OPERACIONAL") {
      return;
    }

    // Detectar mobile
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Buscar alertas
    fetchAlerts();

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchAlerts, 30000);

    return () => {
      window.removeEventListener("resize", checkMobile);
      clearInterval(interval);
    };
  }, []);

  async function fetchAlerts() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Buscar OSs dos últimos 30 dias (igual ao painel)
      const { data, error } = await supabase
        .from("service_orders")
        .select(`
          *,
          clients (
            name,
            phone,
            is_vip
          )
        `)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[FloatingAlerts] Erro ao buscar OSs:", error);
        return;
      }

      // Filtrar OSs ativas (igual ao painel)
      const dashboardOrders = data?.filter((o: any) => {
        const isDone = o.status === "Entregue" || o.status === "Cancelado";
        if (!isDone) return true;
        const updatedAt = new Date(o.updated_at || o.created_at);
        return updatedAt > thirtyDaysAgo;
      });

      // Usar a mesma função do painel para gerar alertas
      const orderAlerts = await checkOrderAlerts(dashboardOrders || []);

      // Filtrar alertas dismissed
      const stored = localStorage.getItem("dismissed_alerts");
      let dismissedSet = new Set<string>();
      if (stored) {
        try {
          dismissedSet = new Set(JSON.parse(stored));
        } catch (e) {
          console.error("Erro ao carregar dismissed alerts", e);
        }
      }

      const filteredAlerts = orderAlerts.filter(alert => !dismissedSet.has(alert.id));
      setAlerts(filteredAlerts);
    } catch (error) {
      console.error("[FloatingAlerts] Erro ao carregar alertas:", error);
    }
  }

  function confirmDismiss(alertId: string) {
    setAlertToDelete(alertId);
    setDeleteConfirmOpen(true);
  }

  function dismissAlert() {
    if (!alertToDelete) return;
    
    const stored = localStorage.getItem("dismissed_alerts");
    let dismissedSet = new Set<string>();
    if (stored) {
      try {
        dismissedSet = new Set(JSON.parse(stored));
      } catch (e) {
        console.error("Erro ao carregar dismissed alerts", e);
      }
    }
    dismissedSet.add(alertToDelete);
    localStorage.setItem("dismissed_alerts", JSON.stringify(Array.from(dismissedSet)));
    setAlerts(prev => prev.filter(a => a.id !== alertToDelete));
    setDeleteConfirmOpen(false);
    setAlertToDelete(null);
  }

  function handleAlertClick(osNumber?: string) {
    if (osNumber) {
      const osIdFormatted = osNumber.replace('/', '-');
      router.push(`/menu-principal/os/${osIdFormatted}`);
    }
  }

  function getAlertColors(type: string) {
    switch (type) {
      case 'danger':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900',
          button: 'bg-red-500 hover:bg-red-600',
          badge: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-900',
          button: 'bg-amber-500 hover:bg-amber-600',
          badge: 'bg-amber-500'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-900',
          button: 'bg-blue-500 hover:bg-blue-600',
          badge: 'bg-blue-500'
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900',
          button: 'bg-red-500 hover:bg-red-600',
          badge: 'bg-red-500'
        };
    }
  }

  // Não mostrar para entregador
  if (role === "OPERACIONAL") {
    return null;
  }

  // Mobile: Botão flutuante + Modal
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-red-500 text-white hover:bg-red-600 transition-all flex items-center justify-center"
        >
          <Bell className="w-6 h-6" />
          {alerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
              {alerts.length}
            </span>
          )}
        </button>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>🚨 Alertas do Sistema ({alerts.length})</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nenhum alerta no momento</p>
              ) : (
                alerts.map((alert) => {
                  const colors = getAlertColors(alert.type);
                  return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      handleAlertClick(alert.osNumber);
                      setIsModalOpen(false);
                    }}
                    className={`p-4 rounded-xl border-2 ${colors.bg} ${colors.border} ${colors.text} relative cursor-pointer hover:opacity-90 transition-colors`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDismiss(alert.id);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-red-50 z-10"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                    <h3 className="font-bold text-sm mb-1">{alert.title}</h3>
                    <p className="text-xs mb-2">{alert.message}</p>
                    {alert.clientName && (
                      <p className="text-xs font-medium">Cliente: {alert.clientName}</p>
                    )}
                    {alert.osNumber && (
                      <p className="text-xs font-medium">OS: #{alert.osNumber}</p>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: Alertas flutuantes no canto esquerdo
  if (alerts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
      {isExpanded && (
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-hide">
          {alerts.slice(0, 4).map((alert) => {
            const colors = getAlertColors(alert.type);
            return (
            <div
              key={alert.id}
              onClick={() => handleAlertClick(alert.osNumber)}
              className={`w-64 p-4 rounded-xl border-2 ${colors.bg} ${colors.border} ${colors.text} relative transition-all cursor-pointer hover:opacity-90`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDismiss(alert.id);
                }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-red-50 z-10"
              >
                <X className={`w-4 h-4 ${colors.text}`} />
              </button>
              <div className="flex items-start gap-2 mb-2">
                <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <h3 className="font-bold text-sm">{alert.title}</h3>
              </div>
              <p className="text-xs mb-2">{alert.message}</p>
              {alert.clientName && (
                <p className="text-xs font-medium">Cliente: {alert.clientName}</p>
              )}
              {alert.osNumber && (
                <p className="text-xs font-medium">OS: #{alert.osNumber}</p>
              )}
            </div>
            );
          })}
        </div>
      )}
      
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="outline"
        size="icon"
        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white border-red-600"
      >
        {isExpanded ? <X className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        {!isExpanded && alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
            {alerts.length}
          </span>
        )}
      </Button>

      {/* Modal de confirmação de exclusão */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">Tem certeza que deseja dispensar este alerta?</p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={dismissAlert}>
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
