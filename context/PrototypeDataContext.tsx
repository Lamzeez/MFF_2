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
  const [storeVisits, setStoreVisits] = useState<Record<string, number>>(() => {
    const visits: Record<string, number> = isLoggedIn
      ? {
          "Mama Letty's Karenderia": 5,
          "Mati Baywalk Seafood Grill": 2,
          "Subangan Street Grills": 1,
        }
      : {};
    return visits;
  });

  // Notifications State (Guest starts with 0 notifications)
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    isLoggedIn
      ? [
          {
            id: "notif-1",
            type: "order",
            title: "🛵 Order #MFF-2041 On The Way",
            message: "Rider Jun has picked up your Classic Pork Humba from Mama Letty's and is ~12 mins away.",
            timestamp: "10m ago",
            isRead: false,
          },
          {
            id: "notif-2",
            type: "community",
            title: "💬 Bea Santos commented",
            message: "Bea commented: 'Lami kaayo na ilaha timpla!' on your Tuna Panga review.",
            timestamp: "18m ago",
            isRead: false,
          },
          {
            id: "notif-3",
            type: "system",
            title: "🎉 Welcome to Mati FoodFinder",
            message: "Discover local Karenderias, reserve tables, and enjoy Cash-on-Delivery across Mati City!",
            timestamp: "1h ago",
            isRead: true,
          },
        ]
      : []
  );

  // Table Reservations State (Guest starts with 0 reservations)
  const [reservations, setReservations] = useState<TableReservation[]>(() =>
    isLoggedIn
      ? [
          {
            id: "res-104",
            restaurantName: "Mati Baywalk Seafood Grill",
            date: "Tonight",
            time: "7:30 PM",
            partySize: 4,
            specialNotes: "Outdoor seating facing the bay breeze please.",
            status: "confirmed",
            createdAt: "1h ago",
          },
          {
            id: "res-105",
            restaurantName: "Mama Letty's Karenderia",
            date: "Tomorrow",
            time: "12:00 PM",
            partySize: 2,
            specialNotes: "Lunch reservation for two with pork humba reserved.",
            status: "pending",
            createdAt: "15m ago",
          },
        ]
      : []
  );

  // Active Orders State (Guest starts with 0 orders)
  const [orders, setOrders] = useState<ActiveOrder[]>(() =>
    isLoggedIn
      ? [
          {
            id: "order-1",
            orderNumber: "#MFF-2041",
            restaurantName: "Mama Letty's Karenderia",
            items: [
              { name: "Classic Pork Humba", quantity: 2, price: 90 },
              { name: "Extra Rice", quantity: 2, price: 20 },
            ],
            subtotal: 220,
            deliveryFee: 35,
            total: 255,
            status: "on_the_way",
            deliveryAddress: "Near Baywalk Pavilion, blue gate",
            barangay: "Central (Poblacion)",
            notes: "Extra spicy sauce please",
            createdAt: "15 mins ago",
          },
        ]
      : []
  );

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
