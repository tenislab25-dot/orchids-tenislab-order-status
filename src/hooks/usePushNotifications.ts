"use client";

import { useEffect, useState, useCallback } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const checkSupport = async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        
        const registration = await navigator.serviceWorker.ready;
        const existingSub = await registration.pushManager.getSubscription();
        setSubscription(existingSub);
      }
    };
    
    checkSupport();
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || permission !== "granted") return null;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      
      setSubscription(sub);

      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      
      return sub;
    } catch (error) {
      console.error("Failed to subscribe:", error);
      return null;
    }
  }, [isSupported, permission]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;
    
    try {
      await subscription.unsubscribe();
      setSubscription(null);

      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      
      return true;
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
      return false;
    }
  }, [subscription]);

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== "granted") return;
    
    new Notification(title, {
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      ...options,
    });
  }, [isSupported, permission]);

  return {
    isSupported,
    permission,
    subscription,
    requestPermission,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
}
