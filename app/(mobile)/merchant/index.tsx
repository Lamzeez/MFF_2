import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";
import { useState } from "react";

export default function MobileMerchantMode() {
  const [isOnline, setIsOnline] = useState(true);

  const [menu, setMenu] = useState([
    { id: 1, name: "Chicken Adobo", qty: 12, available: true },
    { id: 2, name: "Pork Sinigang", qty: 5, available: true },
    { id: 3, name: "Lechon Kawali", qty: 0, available: false },
    { id: 4, name: "Extra Rice", qty: 50, available: true },
  ]);

  const toggleItem = (id: number) => {
    setMenu(menu.map(item => item.id === id ? { ...item, available: !item.available } : item));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      
      {/* Top App Bar */}
      <View className="px-5 py-4 bg-white border-b border-gray-200 flex-row justify-between items-center z-10 shadow-sm">
        <View>
          <Text className="text-xl font-extrabold text-gray-900">Mama Letty's</Text>
          <Text className="text-orange-500 font-bold text-xs mt-0.5">MERCHANT MODE</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text className={`font-bold ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
            {isOnline ? 'ONLINE' : 'CLOSED'}
          </Text>
          <Switch 
            value={isOnline} 
            onValueChange={setIsOnline} 
            trackColor={{ false: "#d1d5db", true: "#34d399" }}
            thumbColor={"#ffffff"}
          />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Live Orders Section */}
        <View className="p-5">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-lg font-extrabold text-gray-900">Live Orders (2)</Text>
            <Text className="text-orange-600 font-bold text-sm">View All</Text>
          </View>

          <View className="gap-4">
            {/* Order Card 1 */}
            <View className="bg-white p-5 rounded-2xl border border-orange-200 shadow-sm">
              <View className="flex-row justify-between items-start border-b border-gray-100 pb-3 mb-3">
                <View>
                  <Text className="font-extrabold text-gray-900 text-lg">#1094</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">Just now • COD</Text>
                </View>
                <Text className="font-black text-gray-900 text-lg">₱180.00</Text>
              </View>
              <View className="mb-4">
                <Text className="text-gray-700 font-bold">2x Chicken Adobo</Text>
                <Text className="text-gray-700 font-bold">3x Extra Rice</Text>
              </View>
              <View className="flex-row gap-3">
                <Pressable className="flex-1 py-3 bg-gray-100 rounded-xl items-center hover:bg-gray-200 transition-colors">
                  <Text className="text-gray-700 font-bold">Decline</Text>
                </Pressable>
                <Pressable className="flex-1 py-3 bg-orange-500 rounded-xl items-center hover:bg-orange-600 transition-colors">
                  <Text className="text-white font-bold">Accept Order</Text>
                </Pressable>
              </View>
            </View>

            {/* Order Card 2 */}
            <View className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <View className="flex-row justify-between items-start border-b border-gray-100 pb-3 mb-3">
                <View>
                  <Text className="font-extrabold text-gray-900 text-lg">#1093</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">5 mins ago • GCash Paid</Text>
                </View>
                <Text className="font-black text-gray-900 text-lg">₱70.00</Text>
              </View>
              <View className="mb-4">
                <Text className="text-gray-700 font-bold">1x Pork Sinigang</Text>
              </View>
              <View className="flex-row gap-3">
                <Pressable className="flex-1 py-3 bg-emerald-100 rounded-xl items-center">
                  <Text className="text-emerald-700 font-bold">Ready for Pickup</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Menu Toggles */}
        <View className="px-5 pt-2 pb-6">
          <View className="flex-row justify-between items-end mb-4">
            <Text className="text-lg font-extrabold text-gray-900">Quick Availability</Text>
            <Text className="text-gray-500 text-sm font-medium">Tap to toggle</Text>
          </View>

          <View className="gap-3">
            {menu.map((item) => (
              <Pressable 
                key={item.id}
                onPress={() => toggleItem(item.id)}
                className={`flex-row justify-between items-center p-4 rounded-2xl border ${
                  item.available ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-300 opacity-70'
                }`}
              >
                <View>
                  <Text className={`font-bold text-base ${item.available ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                    {item.name}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-0.5">{item.qty} servings left</Text>
                </View>
                
                <View className={`px-4 py-2 rounded-full ${item.available ? 'bg-emerald-100' : 'bg-gray-300'}`}>
                  <Text className={`font-bold text-xs ${item.available ? 'text-emerald-700' : 'text-gray-600'}`}>
                    {item.available ? 'IN STOCK' : 'SOLD OUT'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Floating Action Button (Camera) */}
      <Pressable className="absolute bottom-8 right-6 w-16 h-16 bg-orange-500 rounded-full items-center justify-center shadow-lg active:scale-95 transition-transform">
        <Text className="text-2xl text-white">📸</Text>
      </Pressable>

    </SafeAreaView>
  );
}
