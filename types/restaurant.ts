/**
 * Restaurant & Dish Types for Mati FoodFinder
 */

export interface RestaurantProfile {
  name: string;
  category: string;
  rating: string;
  address: string;
  phone: string;
  hours: string;
  availableTables: number;
  emoji: string;
  description: string;
  reviews?: number;
  deliveryFee?: number;
  deliveryTime?: string;
  promo?: string;
  bgColor?: string;
}

export interface FoodItem {
  id: number;
  name: string;
  store: string;
  price: number;
  available: boolean;
  category: string;
  rating: string;
  deliveryTime: string;
  emoji?: string;
  description?: string;
}
