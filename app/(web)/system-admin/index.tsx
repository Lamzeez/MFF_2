import { View, Text, Pressable } from "react-native";

export default function SystemAdminDashboard() {
  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      
      {/* Header */}
      <View className="mb-10 flex-row justify-between items-end">
        <View>
          <Text className="text-4xl font-extrabold text-gray-900 mb-2">Dashboard Overview</Text>
          <Text className="text-gray-500 text-lg">Welcome back. Here is what's happening in Mati City today.</Text>
        </View>
        <Pressable className="bg-orange-500 px-6 py-3 rounded-full hover:bg-orange-600 transition-colors hidden md:flex">
          <Text className="text-white font-bold">Generate Report</Text>
        </Pressable>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap gap-6 mb-12">
        <View className="flex-1 min-w-[200px] bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mb-4">
            <Text className="text-xl">👥</Text>
          </View>
          <Text className="text-gray-500 font-medium mb-1">Total Registered Users</Text>
          <Text className="text-3xl font-black text-gray-900">4,209</Text>
          <Text className="text-green-500 font-bold text-sm mt-2">↑ 12% this month</Text>
        </View>

        <View className="flex-1 min-w-[200px] bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <View className="w-12 h-12 bg-orange-100 rounded-full items-center justify-center mb-4">
            <Text className="text-xl">🏪</Text>
          </View>
          <Text className="text-gray-500 font-medium mb-1">Active Store Admins</Text>
          <Text className="text-3xl font-black text-gray-900">142</Text>
          <Text className="text-green-500 font-bold text-sm mt-2">↑ 5 new today</Text>
        </View>

        <View className="flex-1 min-w-[200px] bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <View className="w-12 h-12 bg-red-100 rounded-full items-center justify-center mb-4">
            <Text className="text-xl">📋</Text>
          </View>
          <Text className="text-gray-500 font-medium mb-1">Pending Approvals</Text>
          <Text className="text-3xl font-black text-gray-900">18</Text>
          <Text className="text-red-500 font-bold text-sm mt-2">Needs your attention</Text>
        </View>

        <View className="flex-1 min-w-[200px] bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center mb-4">
            <Text className="text-xl">₱</Text>
          </View>
          <Text className="text-gray-500 font-medium mb-1">Monthly Recurring Rev</Text>
          <Text className="text-3xl font-black text-gray-900">₱45,500</Text>
          <Text className="text-gray-400 font-bold text-sm mt-2">Via PayMongo Subs</Text>
        </View>
      </View>

      <View className="flex-col xl:flex-row gap-8 w-full">
        {/* Pending Store Approvals Widget */}
        <View className="flex-[2] bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <View className="px-8 py-6 border-b border-gray-100 flex-row justify-between items-center">
            <Text className="text-xl font-bold text-gray-900">Pending Store Approvals</Text>
            <Pressable><Text className="text-emerald-600 font-bold">View All</Text></Pressable>
          </View>
          
          <View className="flex-col">
            {/* Mock Item 1 */}
            <View className="px-8 py-5 border-b border-gray-50 flex-row items-center justify-between hover:bg-gray-50 transition-colors">
              <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center"><Text>🍲</Text></View>
                <View>
                  <Text className="font-bold text-gray-900 text-base">Mama Letty's Karenderia</Text>
                  <Text className="text-gray-500 text-sm">Poblacion, Mati City • Applied 2 hours ago</Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                <Pressable className="px-4 py-2 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors">
                  <Text className="text-emerald-700 font-bold">Approve</Text>
                </Pressable>
                <Pressable className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors hidden sm:flex">
                  <Text className="text-gray-700 font-bold">Review</Text>
                </Pressable>
              </View>
            </View>

            {/* Mock Item 2 */}
            <View className="px-8 py-5 border-b border-gray-50 flex-row items-center justify-between hover:bg-gray-50 transition-colors">
              <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center"><Text>🍔</Text></View>
                <View>
                  <Text className="font-bold text-gray-900 text-base">Mati Burger Hub</Text>
                  <Text className="text-gray-500 text-sm">Dahican, Mati City • Applied 5 hours ago</Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                <Pressable className="px-4 py-2 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors">
                  <Text className="text-emerald-700 font-bold">Approve</Text>
                </Pressable>
                <Pressable className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors hidden sm:flex">
                  <Text className="text-gray-700 font-bold">Review</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* System Activity Widget */}
        <View className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <Text className="text-xl font-bold text-gray-900 mb-6">System Health</Text>
          
          <View className="flex-col gap-6">
            <View className="flex-row items-start gap-4">
              <View className="w-3 h-3 rounded-full bg-green-500 mt-1.5" />
              <View>
                <Text className="font-bold text-gray-900">Supabase DB Connected</Text>
                <Text className="text-gray-500 text-sm mt-0.5">Latency: 12ms</Text>
              </View>
            </View>
            <View className="flex-row items-start gap-4">
              <View className="w-3 h-3 rounded-full bg-green-500 mt-1.5" />
              <View>
                <Text className="font-bold text-gray-900">PayMongo Webhooks</Text>
                <Text className="text-gray-500 text-sm mt-0.5">All services operational</Text>
              </View>
            </View>
            <View className="flex-row items-start gap-4">
              <View className="w-3 h-3 rounded-full bg-orange-500 mt-1.5" />
              <View>
                <Text className="font-bold text-gray-900">Social Feed Reports</Text>
                <Text className="text-gray-500 text-sm mt-0.5">4 posts flagged by users</Text>
              </View>
            </View>
          </View>
          
          <Pressable className="w-full mt-8 py-3 bg-gray-100 rounded-xl items-center hover:bg-gray-200 transition-colors">
            <Text className="text-gray-700 font-bold">View Full Logs</Text>
          </Pressable>
        </View>
      </View>

    </View>
  );
}
