"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkOrderAlerts } from "@/lib/notifications";

interface Alert {
  id: string;
  type: string;
  title: string;
  description: string;
  osNumber?: string;
  clientName?: string;
}

export default function FloatingAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
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
      const supabase = createClient();
      
      // Buscar OSs dos últimos 30 dias (mesma lógica do painel)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders } = await supabase
        .from("service_orders")
        .select(`
          *,
          clients (
            id,
            name,
            phone,
            email,
            vip
          )
        `)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (!orders) return;

      // Usar checkOrderAlerts (mesma função do painel)
      const orderAlerts = await checkOrderAlerts(orders);

      // Filtrar alertas dismissed
      const dismissed = JSON.parse(localStorage.getItem("dismissed_alerts") || "[]");
      const filteredAlerts = orderAlerts.filter((alert: Alert) => !dismissed.includes(alert.id));

      setAlerts(filteredAlerts);
    } catch (error) {
      console.error("[FloatingAlerts] Erro ao carregar alertas:", error);
    }
  }

  function dismissAlert(alertId: string) {
    const dismissed = JSON.parse(localStorage.getItem("dismissed_alerts") || "[]");
    dismissed.push(alertId);
    localStorage.setItem("dismissed_alerts", JSON.stringify(dismissed));
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }

  function handleAlertClick(osNumber?: string) {
    if (osNumber) {
      router.push(`/menu-principal/os/${osNumber}`);
    }
  }

  // Mobile: Botão flutuante + Modal
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-red-500 text-white  hover:bg-red-600 transition-all flex items-center justify-center"
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
              <DialogTitle>Alertas do Sistema ({alerts.length})</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Nenhum alerta no momento</p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => {
                      handleAlertClick(alert.osNumber);
                      setIsModalOpen(false);
                    }}
                    className={`p-4 rounded-xl border-2 bg-red-50 border-red-200 text-red-900 relative cursor-pointer`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissAlert(alert.id);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white  flex items-center justify-center hover:bg-red-50"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                    <h3 className="font-bold text-sm mb-1">{alert.title}</h3>
                    <p className="text-xs mb-2">{alert.description}</p>
                    {alert.clientName && (
                      <p className="text-xs font-medium">Cliente: {alert.clientName}</p>
                    )}
                    {alert.osNumber && (
                      <p className="text-xs font-medium">OS: #{alert.osNumber}</p>
                    )}
                  </div>
                ))
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
        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto scrollbar-hide">
          {alerts.slice(0, 4).map((alert, index) => (
            <div
              key={alert.id}
              onClick={() => handleAlertClick(alert.osNumber)}
              className="w-64 p-4 rounded-xl border-2  bg-red-50 border-red-200 text-red-900 relative transition-all  cursor-pointer"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissAlert(alert.id);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white  flex items-center justify-center hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
              <div className="flex items-start gap-2 mb-2">
                <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <h3 className="font-bold text-sm">{alert.title}</h3>
              </div>
              <p className="text-xs mb-2">{alert.description}</p>
              {alert.clientName && (
                <p className="text-xs font-medium">Cliente: {alert.clientName}</p>
              )}
              {alert.osNumber && (
                <p className="text-xs font-medium">OS: #{alert.osNumber}</p>
              )}
            </div>
          ))}
        </div>
      )}
      
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="outline"
        size="icon"
        className="w-12 h-12 rounded-full  bg-red-500 hover:bg-red-600 text-white border-red-600"
      >
        {isExpanded ? <X className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        {!isExpanded && alerts.length > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
            {alerts.length}
          </span>
        )}
      </Button>
    </div>
  );
}
