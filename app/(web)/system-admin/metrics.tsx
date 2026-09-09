import { View, Text, ScrollView } from "react-native";

export default function MetricsPage() {
  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      <View className="mb-8">
        <Text className="text-3xl font-extrabold text-gray-900 mb-2">Platform Metrics</Text>
        <Text className="text-gray-500 text-lg">System-wide analytics, revenue, and active usage statistics.</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Placeholder for Revenue Chart */}
        <View className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
          <View className="flex-row justify-between items-center mb-6">
            <Text className="text-xl font-bold text-gray-900">Monthly Revenue (PayMongo)</Text>
            <View className="bg-gray-100 px-4 py-2 rounded-lg">
              <Text className="text-gray-600 font-bold">This Year</Text>
            </View>
          </View>
          
          <View className="h-64 bg-gray-50 rounded-xl items-center justify-center border border-dashed border-gray-200">
            <Text className="text-3xl mb-2">📈</Text>
            <Text className="text-gray-400 font-bold">[Bar Chart Component Placeholder]</Text>
            <Text className="text-gray-400 text-sm mt-1">Data from Supabase & PayMongo API</Text>
          </View>
        </View>

        {/* Growth Stats */}
        <View className="flex-col md:flex-row gap-8 mb-8">
          <View className="flex-1 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-6">User Acquisition</Text>
            <View className="gap-4">
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-600 font-medium">Organic Search</Text>
                  <Text className="font-bold text-gray-900">45%</Text>
                </View>
                <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View className="w-[45%] h-full bg-blue-500" />
                </View>
              </View>
              
              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-600 font-medium">Social Media</Text>
                  <Text className="font-bold text-gray-900">35%</Text>
                </View>
                <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View className="w-[35%] h-full bg-pink-500" />
                </View>
              </View>

              <View>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-gray-600 font-medium">Direct Referrals</Text>
                  <Text className="font-bold text-gray-900">20%</Text>
                </View>
                <View className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <View className="w-[20%] h-full bg-emerald-500" />
                </View>
              </View>
            </View>
          </View>

          {/* Infrastructure Health */}
          <View className="flex-1 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-6">Infrastructure Load</Text>
            
            <View className="flex-row items-end gap-2 h-40 mt-4 border-b border-gray-200 pb-2">
              <View className="flex-1 bg-indigo-100 h-[20%] rounded-t-sm" />
              <View className="flex-1 bg-indigo-200 h-[30%] rounded-t-sm" />
              <View className="flex-1 bg-indigo-300 h-[45%] rounded-t-sm" />
              <View className="flex-1 bg-indigo-400 h-[60%] rounded-t-sm" />
              <View className="flex-1 bg-indigo-500 h-[90%] rounded-t-sm" />
              <View className="flex-1 bg-indigo-600 h-[75%] rounded-t-sm" />
              <View className="flex-1 bg-indigo-700 h-[85%] rounded-t-sm" />
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-gray-400">Mon</Text>
              <Text className="text-xs text-gray-400">Sun</Text>
            </View>
            <Text className="text-center text-sm text-gray-500 mt-4">API Requests over the last 7 days</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
