import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { Alert } from "react-native";
import { FoodItem } from "../types/restaurant";

export interface CartItem {
  id: string; // `${storeName}-${dishId}` or with modifier key
  dishId: number;
  menuItemId?: string;
  name: string;
  price: number; // in pesos
  quantity: number;
  imageUrl?: string;
  category?: string;
  storeName: string;
  storeId?: string;
  selectedModifiers?: Record<string, string>;
  modifierSummary?: string;
}

export interface AddItemResult {
  success: boolean;
  replacedOtherStore?: boolean;
  conflictStore?: string;
}

export interface CartContextType {
  items: CartItem[];
  storeName: string | null;
  storeId: string | null;
  totalCount: number;
  foodSubtotal: number;
  addItem: (
    dish: FoodItem,
    quantity?: number,
    forceReplace?: boolean,
    selectedModifiers?: Record<string, string>,
    modifierPriceAdjustment?: number,
    modifierSummary?: string
  ) => AddItemResult;
  updateQuantity: (target: string | number, quantity: number) => void;
  removeItem: (target: string | number) => void;
  clearCart: () => void;
  getItemQuantity: (target: string | number) => number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const totalCount = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity, 0);
  }, [items]);

  const foodSubtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [items]);

  const getItemQuantity = (target: string | number): number => {
    if (typeof target === "string") {
      const item = items.find((i) => i.id === target);
      return item ? item.quantity : 0;
    }
    return items.filter((i) => i.dishId === target).reduce((sum, i) => sum + i.quantity, 0);
  };

  const clearCart = () => {
    setItems([]);
    setStoreName(null);
    setStoreId(null);
  };

  const addItem = (
    dish: FoodItem,
    quantity: number = 1,
    forceReplace: boolean = false,
    selectedModifiers?: Record<string, string>,
    modifierPriceAdjustment: number = 0,
    modifierSummary?: string
  ): AddItemResult => {
    const dishStore = dish.store || "Mati Restaurant";
    const effectivePrice = Math.max(0, dish.price + modifierPriceAdjustment);
    const modKey = selectedModifiers && Object.keys(selectedModifiers).length > 0
      ? `-${Object.entries(selectedModifiers).sort().map(([k, v]) => `${k}:${v}`).join("|")}`
      : "";
    const itemId = `${dishStore}-${dish.id}${modKey}`;

    // Single-store validation: Check if cart has items from another restaurant
    if (storeName && storeName !== dishStore && items.length > 0) {
      if (!forceReplace) {
        return {
          success: false,
          conflictStore: storeName,
        };
      }
      // User opted to replace existing cart with new store
      const newItem: CartItem = {
        id: itemId,
        dishId: dish.id,
        menuItemId: dish.menuItemId,
        name: dish.name,
        price: effectivePrice,
        quantity: Math.max(1, quantity),
        imageUrl: dish.imageUrl,
        category: dish.category,
        storeName: dishStore,
        storeId: dish.storeId,
        selectedModifiers,
        modifierSummary,
      };
      setItems([newItem]);
      setStoreName(dishStore);
      setStoreId(dish.storeId || null);
      return { success: true, replacedOtherStore: true };
    }

    // Adding item from same store (or first item in cart)
    setStoreName(dishStore);
    if (dish.storeId) setStoreId(dish.storeId);

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.id === itemId);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      } else {
        const newItem: CartItem = {
          id: itemId,
          dishId: dish.id,
          menuItemId: dish.menuItemId,
          name: dish.name,
          price: effectivePrice,
          quantity: Math.max(1, quantity),
          imageUrl: dish.imageUrl,
          category: dish.category,
          storeName: dishStore,
          storeId: dish.storeId,
          selectedModifiers,
          modifierSummary,
        };
        return [...prevItems, newItem];
      }
    });

    return { success: true };
  };

  const updateQuantity = (target: string | number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(target);
      return;
    }

    setItems((prevItems) => {
      return prevItems.map((item) => {
        const isMatch = typeof target === "string" ? item.id === target : item.dishId === target;
        if (isMatch) {
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const removeItem = (target: string | number) => {
    setItems((prevItems) => {
      const remaining = prevItems.filter((item) => {
        const isMatch = typeof target === "string" ? item.id === target : item.dishId === target;
        return !isMatch;
      });
      if (remaining.length === 0) {
        setStoreName(null);
        setStoreId(null);
      }
      return remaining;
    });
  };

  const value = useMemo(
    () => ({
      items,
      storeName,
      storeId,
      totalCount,
      foodSubtotal,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      getItemQuantity,
      isCartOpen,
      setIsCartOpen,
    }),
    [items, storeName, storeId, totalCount, foodSubtotal, isCartOpen]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
