"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface PendingAction {
  id: string;
  type: "create" | "update" | "delete";
  table: string;
  data: any;
  timestamp: number;
}

const PENDING_ACTIONS_KEY = "tenislab_pending_actions";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const getPendingActions = useCallback((): PendingAction[] => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(PENDING_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  }, []);

  const savePendingActions = useCallback((actions: PendingAction[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
    setPendingCount(actions.length);
  }, []);

  const addPendingAction = useCallback((action: Omit<PendingAction, "id" | "timestamp">) => {
    const actions = getPendingActions();
    const newAction: PendingAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    actions.push(newAction);
    savePendingActions(actions);
    return newAction.id;
  }, [getPendingActions, savePendingActions]);

  const syncPendingActions = useCallback(async () => {
    if (!navigator.onLine) return;
    
    const actions = getPendingActions();
    if (actions.length === 0) return;

    setIsSyncing(true);
    const failedActions: PendingAction[] = [];

    for (const action of actions) {
      try {
        switch (action.type) {
          case "create":
            await supabase.from(action.table).insert(action.data);
            break;
          case "update":
            await supabase.from(action.table).update(action.data).eq("id", action.data.id);
            break;
          case "delete":
            await supabase.from(action.table).delete().eq("id", action.data.id);
            break;
        }
      } catch (error) {
        console.error("Sync error:", error);
        failedActions.push(action);
      }
    }

    savePendingActions(failedActions);
    setIsSyncing(false);
  }, [getPendingActions, savePendingActions]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        syncPendingActions();
      }
    };

    setPendingCount(getPendingActions().length);
    setIsOnline(navigator.onLine);

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, [getPendingActions, syncPendingActions]);

  return {
    isOnline,
    isSyncing,
    pendingCount,
    addPendingAction,
    syncPendingActions,
  };
}
