/**
 * @deprecated DECOMMISSIONED in Phase 3 Milestone 6.
 * All domains (orders, table reservations, notifications, visits, community, catalog, auth)
 * now query the live remote Supabase PostgreSQL backend directly via their respective services:
 * - services/orders.ts
 * - services/reservations.ts
 * - services/notifications.ts
 * - services/visits.ts
 * - services/community.ts
 * - services/catalog.ts
 * - services/admin.ts
 */

import { useSession } from "./SessionContext";
import React, { createContext, useContext, useState, ReactNode } from "react";

export interface AppNotification {
  id: string;
  type: "order" | "reservation" | "community" | "system";
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export interface TableReservation {
  id: string;
  restaurantName: string;
  date: string;
  time: string;
  partySize: number;
  specialNotes?: string;
  status: "pending" | "confirmed" | "declined";
  createdAt: string;
}

export interface ActiveOrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ActiveOrder {
  id: string;
  orderNumber: string;
  restaurantName: string;
  items: ActiveOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: "confirmed" | "prepped" | "on_the_way" | "delivered";
  deliveryAddress: string;
  barangay: string;
  notes?: string;
  createdAt: string;
}

interface PrototypeDataContextType {
  // Notifications
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<AppNotification, "id" | "timestamp" | "isRead">) => void;
  markAllNotificationsRead: () => void;

  // Table Reservations
  reservations: TableReservation[];
  createReservation: (data: Omit<TableReservation, "id" | "status" | "createdAt">) => void;
  updateReservationStatus: (id: string, status: "pending" | "confirmed" | "declined") => void;

  // Active Orders
  orders: ActiveOrder[];
  placeActiveOrder: (data: Omit<ActiveOrder, "id" | "orderNumber" | "status" | "createdAt">) => string;

  // Store Visits & ML Personalization
  personalizationEnabled: boolean;
  togglePersonalization: (enabled?: boolean) => void;
  storeVisits: Record<string, number>;
  checkInToStore: (storeName: string) => number;
  mostVisitedStore: { name: string; visits: number } | null;
}

const PrototypeDataContext = createContext<PrototypeDataContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllNotificationsRead: () => {},
  reservations: [],
  createReservation: () => {},
  updateReservationStatus: () => {},
  orders: [],
  placeActiveOrder: () => "",
  personalizationEnabled: false,
  togglePersonalization: () => {},
  storeVisits: {},
  checkInToStore: () => 0,
  mostVisitedStore: null,
});

export function PrototypeDataProvider({ children }: { children: ReactNode }) {
  const { identity } = useSession();
  const isLoggedIn = !!identity;

  // Personalization Mode (Only available to Registered Users)
  const [personalizationEnabled, setPersonalizationEnabled] = useState(false);

  // In-Store Visits Tracker (For Statistical ML "Most Visited" Personalization)
  const [storeVisits, setStoreVisits] = useState<Record<string, number>>({});

  // Notifications State (Guest and new users start with 0 notifications)
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Table Reservations State (Guest and new users start with 0 reservations)
  const [reservations, setReservations] = useState<TableReservation[]>([]);

  // Active Orders State (Guest and new users start with 0 orders)
  const [orders, setOrders] = useState<ActiveOrder[]>([]);

  const unreadCount = isLoggedIn ? notifications.filter((n) => !n.isRead).length : 0;

  const togglePersonalization = (enabled?: boolean) => {
    if (!isLoggedIn) {
      // Guest users cannot enable personalization
      return;
    }
    setPersonalizationEnabled((prev) => (enabled !== undefined ? enabled : !prev));
  };

  const addNotification = (notif: Omit<AppNotification, "id" | "timestamp" | "isRead">) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: "Just now",
      isRead: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const createReservation = (data: Omit<TableReservation, "id" | "status" | "createdAt">) => {
    const newRes: TableReservation = {
      ...data,
      id: `res-${Date.now().toString().slice(-4)}`,
      status: "pending",
      createdAt: "Just now",
    };
    setReservations((prev) => [newRes, ...prev]);

    // Send a notification
    addNotification({
      type: "reservation",
      title: "📅 Table Reservation Submitted",
      message: `Your booking for ${data.partySize} at ${data.restaurantName} (${data.date} at ${data.time}) is awaiting confirmation.`,
    });
  };

  const updateReservationStatus = (id: string, status: "pending" | "confirmed" | "declined") => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );

    const target = reservations.find((r) => r.id === id);
    if (target) {
      addNotification({
        type: "reservation",
        title: status === "confirmed" ? "✅ Table Booking Confirmed!" : "❌ Table Booking Declined",
        message:
          status === "confirmed"
            ? `${target.restaurantName} has confirmed your table for ${target.partySize} guests (${target.date} at ${target.time}).`
            : `${target.restaurantName} is fully booked for ${target.time}. Please choose another time.`,
      });
    }
  };

  const placeActiveOrder = (
    data: Omit<ActiveOrder, "id" | "orderNumber" | "status" | "createdAt">
  ): string => {
    const orderNum = `#MFF-${Math.floor(1000 + Math.random() * 9000)}`;
    const newOrder: ActiveOrder = {
      ...data,
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      status: "confirmed",
      createdAt: "Just now",
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Send notification
    addNotification({
      type: "order",
      title: `🛵 Order ${orderNum} Placed (COD)`,
      message: `Your order from ${data.restaurantName} (Total: ₱${data.total.toFixed(2)}) is being prepared.`,
    });

    return orderNum;
  };

  // Check-in to Store via Stand QR (Strictly Registered Users with Personalization Enabled)
  const checkInToStore = (storeName: string): number => {
    if (!isLoggedIn || !personalizationEnabled) {
      return 0;
    }

    const nextCount = (storeVisits[storeName] || 0) + 1;
    setStoreVisits((prev) => ({ ...prev, [storeName]: nextCount }));

    addNotification({
      type: "system",
      title: `📍 Store Check-in Recorded!`,
      message: `You checked in at ${storeName}! Total in-store visits: ${nextCount}. Ranking updated in your Most Visited Places.`,
    });

    return nextCount;
  };

  // Only calculate most visited store if user is registered and has personalization turned on
  const getMostVisitedStore = () => {
    if (!isLoggedIn || !personalizationEnabled) {
      return null;
    }
    const entries = Object.entries(storeVisits);
    if (entries.length === 0) return null;
    entries.sort((a, b) => b[1] - a[1]);
    return { name: entries[0][0], visits: entries[0][1] };
  };

  const mostVisitedStore = getMostVisitedStore();

  return (
    <PrototypeDataContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAllNotificationsRead,
        reservations,
        createReservation,
        updateReservationStatus,
        orders,
        placeActiveOrder,
        personalizationEnabled,
        togglePersonalization,
        storeVisits,
        checkInToStore,
        mostVisitedStore,
      }}
    >
      {children}
    </PrototypeDataContext.Provider>
  );
}

export const usePrototypeData = () => useContext(PrototypeDataContext);
