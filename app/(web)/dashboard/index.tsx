import { View, Text, Pressable, ScrollView } from "react-native";

export default function StoreDashboardOverview() {
  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      <View className="mb-10 flex-row justify-between items-end">
        <View>
          <Text className="text-3xl font-extrabold text-gray-900 mb-2">Store Overview</Text>
          <Text className="text-gray-500 text-lg">Manage your daily Karenderia operations.</Text>
        </View>
        <Pressable className="bg-orange-500 px-6 py-3 rounded-full hover:bg-orange-600 transition-colors hidden md:flex">
          <Text className="text-white font-bold">View Public Page</Text>
        </Pressable>
      </View>

      <View className="flex-row flex-wrap gap-6 mb-12">
        <View className="flex-1 min-w-[200px] bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <Text className="text-gray-500 font-medium mb-2">Today's Orders</Text>
          <Text className="text-4xl font-black text-gray-900">42</Text>
          <Text className="text-emerald-500 font-bold text-sm mt-2">↑ 8 more than yesterday</Text>
        </View>

        <View className="flex-1 min-w-[200px] bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <Text className="text-gray-500 font-medium mb-2">Today's Revenue</Text>
          <Text className="text-4xl font-black text-gray-900">₱4,250</Text>
          <Text className="text-emerald-500 font-bold text-sm mt-2">Via Cash on Delivery</Text>
        </View>

        <View className="flex-1 min-w-[200px] bg-orange-50 p-6 rounded-3xl shadow-sm border border-orange-100">
          <Text className="text-orange-800 font-medium mb-2">Current Status</Text>
          <Text className="text-3xl font-black text-orange-600 mt-1">OPEN</Text>
          <Text className="text-orange-600 font-bold text-sm mt-2">Accepting new orders</Text>
        </View>
      </View>

      <View className="flex-col xl:flex-row gap-8 w-full">
        {/* Recent Orders Widget */}
        <View className="flex-[2] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <View className="px-8 py-6 border-b border-gray-100">
            <Text className="text-xl font-bold text-gray-900">Recent Orders (Live)</Text>
          </View>
          
          <ScrollView className="max-h-[400px]">
            {[1, 2, 3].map((order) => (
              <View key={order} className="px-8 py-5 border-b border-gray-50 flex-row items-center justify-between">
                <View>
                  <Text className="font-bold text-gray-900">Order #109{order}</Text>
                  <Text className="text-gray-500 text-sm mt-1">2x Chicken Adobo, 3x Rice</Text>
                </View>
                <View className="items-end">
                  <Text className="font-bold text-gray-900 mb-1">₱180.00</Text>
                  <Text className="text-orange-500 text-sm font-bold">Preparing</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Top Items Widget */}
        <View className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <Text className="text-xl font-bold text-gray-900 mb-6">Top Selling Today</Text>
          <View className="gap-4">
            <View className="flex-row justify-between items-center pb-4 border-b border-gray-50">
              <Text className="font-bold text-gray-900">1. Chicken Adobo</Text>
              <Text className="text-gray-500">24 orders</Text>
            </View>
            <View className="flex-row justify-between items-center pb-4 border-b border-gray-50">
              <Text className="font-bold text-gray-900">2. Pork Sinigang</Text>
              <Text className="text-gray-500">18 orders</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="font-bold text-gray-900">3. Extra Rice</Text>
              <Text className="text-gray-500">52 orders</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
