const NOTIFICATION_SOUND_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACBhYqFbF1fdH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19fXh3eX19fYOIiIWCfn58fH19";

let audioContext: AudioContext | null = null;

export function playNotificationSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error("Error playing notification sound:", error);
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

export function checkOrderAlerts(orders: any[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  orders.forEach((order) => {
    if (order.status === "Entregue" && !(order.payment_confirmed || order.pay_on_entry)) {
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

    if (order.status === "Pronto para entrega ou retirada") {
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
