let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playNotificationSound() {
  try {
    const ctx = getAudioContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (error) {
    logger.error("Error playing notification sound:", error);
  }
}

export function playAcceptedSound() {
  try {
    const ctx = getAudioContext();
    
    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    oscillator1.frequency.setValueAtTime(523, ctx.currentTime);
    oscillator1.frequency.setValueAtTime(659, ctx.currentTime + 0.25);
    oscillator1.frequency.setValueAtTime(784, ctx.currentTime + 0.5);
    oscillator1.frequency.setValueAtTime(1047, ctx.currentTime + 0.75);
    
    oscillator2.frequency.setValueAtTime(659, ctx.currentTime);
    oscillator2.frequency.setValueAtTime(784, ctx.currentTime + 0.25);
    oscillator2.frequency.setValueAtTime(1047, ctx.currentTime + 0.5);
    oscillator2.frequency.setValueAtTime(1319, ctx.currentTime + 0.75);
    
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime + 0.9);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
    
    oscillator1.start(ctx.currentTime);
    oscillator2.start(ctx.currentTime);
    oscillator1.stop(ctx.currentTime + 1.0);
    oscillator2.stop(ctx.currentTime + 1.0);
  } catch (error) {
    logger.error("Error playing accepted sound:", error);
  }
}

export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

export function showBrowserNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
    });
  }
}

export interface Alert {
  id: string;
  type: "warning" | "danger" | "info";
  title: string;
  message: string;
  osNumber?: string;
  clientName?: string;
}

export async function checkOrderAlerts(orders: any[]): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // Buscar alertas manuais não resolvidos
  try {
    const { createClient } = await import('@/lib/supabase');
    const supabase = createClient();
    
    const { data: manualAlerts, error } = await supabase
      .from('manual_alerts')
      .select(`
        id,
        order_id,
        type,
        title,
        description,
        created_at,
        service_orders!inner (
          os_number,
          clients (
            name
          )
        )
      `)
      .eq('resolved', false)
      .order('created_at', { ascending: false });

    if (!error && manualAlerts) {
      manualAlerts.forEach((alert: any) => {
        const alertTypeMap: Record<string, 'warning' | 'danger' | 'info'> = {
          bloqueio: 'danger',
          cliente_perguntou: 'warning',
          observacao: 'info'
        };

        const titlePrefix: Record<string, string> = {
          bloqueio: '🔴',
          cliente_perguntou: '🟡',
          observacao: '🔵'
        };

        alerts.push({
          id: `manual-${alert.id}`,
          type: alertTypeMap[alert.type] || 'info',
          title: `${titlePrefix[alert.type] || ''} ${alert.title || alert.type.toUpperCase()}`,
          message: `OS ${alert.service_orders.os_number}: ${alert.description}`,
          osNumber: alert.service_orders.os_number,
          clientName: alert.service_orders.clients?.name
        });
      });
    }
  } catch (error) {
    console.error('Erro ao buscar alertas manuais:', error);
  }

  orders.forEach((order) => {
    if (order.status === "Entregue" && !(order.payment_confirmed)) {
      const deliveredAt = new Date(order.updated_at || order.entry_date);
      if (deliveredAt < sevenDaysAgo) {
        alerts.push({
          id: `payment-overdue-${order.id}`,
          type: "danger",
          title: "Pagamento Pendente há 7+ dias",
          message: `OS ${order.os_number} entregue há mais de 7 dias sem confirmação de pagamento`,
          osNumber: order.os_number,
          clientName: order.clients?.name,
        });
      }
    }

    if (order.status === "Pronto") {
      const readyAt = new Date(order.updated_at || order.entry_date);
      if (readyAt < threeDaysAgo) {
        alerts.push({
          id: `ready-waiting-${order.id}`,
          type: "warning",
          title: "Pronto há 3+ dias",
          message: `OS ${order.os_number} está pronta há mais de 3 dias aguardando retirada`,
          osNumber: order.os_number,
          clientName: order.clients?.name,
        });
      }
    }

    if (
      order.delivery_date &&
      order.status !== "Entregue" &&
      order.status !== "Cancelado"
    ) {
      const deliveryDate = new Date(order.delivery_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deliveryDate < today) {
        alerts.push({
          id: `overdue-${order.id}`,
          type: "danger",
          title: "OS Atrasada",
          message: `OS ${order.os_number} passou do prazo de entrega`,
          osNumber: order.os_number,
          clientName: order.clients?.name,
        });
      }
    }
  });

  return alerts;
}
