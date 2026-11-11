import { useState, useEffect, useCallback, useRef } from "react";
import { Platform, AppState, AppStateStatus } from "react-native";

export interface NetworkStatus {
  isOffline: boolean;
  isReconnecting: boolean;
  wasOffline: boolean;
  retryConnection: () => Promise<boolean>;
}

/**
 * Global cross-platform network connectivity detector.
 * Provides resilient offline/reconnecting detection for Mati cellular blindspots.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOffline, setIsOffline] = useState<boolean>(() => {
    if (Platform.OS === "web" && typeof navigator !== "undefined") {
      return !navigator.onLine;
    }
    return false;
  });

  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const wasOfflineRef = useRef<boolean>(false);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web" && typeof navigator !== "undefined") {
      const online = navigator.onLine;
      if (!online) {
        setIsOffline(true);
        wasOfflineRef.current = true;
        setWasOffline(true);
        return false;
      }
    }

    try {
      // Lightweight probe with a 3.5s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const probeUrl =
        process.env.EXPO_PUBLIC_SUPABASE_URL || "https://www.google.com/generate_204";

      const res = await fetch(probeUrl, {
        method: "HEAD",
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      // If probe returned any response (even 401/404), network is reachable
      const online = res !== null;
      if (!online) {
        setIsOffline(true);
        wasOfflineRef.current = true;
        setWasOffline(true);
        return false;
      } else {
        if (wasOfflineRef.current) {
          // Trigger brief reconnected state
          setWasOffline(true);
          setTimeout(() => {
            wasOfflineRef.current = false;
            setWasOffline(false);
          }, 3000);
        }
        setIsOffline(false);
        return true;
      }
    } catch {
      setIsOffline(true);
      wasOfflineRef.current = true;
      setWasOffline(true);
      return false;
    }
  }, []);

  const retryConnection = useCallback(async (): Promise<boolean> => {
    setIsReconnecting(true);
    try {
      const ok = await checkConnectivity();
      return ok;
    } finally {
      setIsReconnecting(false);
    }
  }, [checkConnectivity]);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const handleOnline = () => {
        setIsOffline(false);
        if (wasOfflineRef.current) {
          setWasOffline(true);
          setTimeout(() => {
            wasOfflineRef.current = false;
            setWasOffline(false);
          }, 3000);
        }
      };

      const handleOffline = () => {
        setIsOffline(true);
        wasOfflineRef.current = true;
        setWasOffline(true);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    } else {
      // Native platforms: listen to AppState changes and interval checks
      const subscription = AppState.addEventListener(
        "change",
        (nextState: AppStateStatus) => {
          if (nextState === "active") {
            checkConnectivity();
          }
        }
      );

      // If offline, check periodically every 15s to auto-recover
      const interval = setInterval(() => {
        if (isOffline) {
          checkConnectivity();
        }
      }, 15000);

      return () => {
        subscription.remove();
        clearInterval(interval);
      };
    }
  }, [checkConnectivity, isOffline]);

  return {
    isOffline,
    isReconnecting,
    wasOffline,
    retryConnection,
  };
}
