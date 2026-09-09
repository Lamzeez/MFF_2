import { View, Text, Pressable } from "react-native";

export default function StoreBilling() {
  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-4xl self-center">
      <View className="mb-8">
        <Text className="text-3xl font-extrabold text-gray-900 mb-2">Billing & Subscriptions</Text>
        <Text className="text-gray-500 text-lg">Manage your MFF store subscription via PayMongo.</Text>
      </View>

      {/* Subscription Card */}
      <View className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
        <View className="flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <View>
            <Text className="text-gray-500 font-bold mb-1">Current Plan</Text>
            <Text className="text-2xl font-black text-gray-900">2-Month Free Trial</Text>
          </View>
          <View className="bg-emerald-100 px-4 py-2 rounded-full mt-4 md:mt-0">
            <Text className="text-emerald-700 font-bold">Active</Text>
          </View>
        </View>

        <View className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-8">
          <Text className="text-orange-800 font-medium text-center">
            Your trial expires in <Text className="font-bold">45 days</Text>. Add a GCash or Card payment method to avoid store suspension.
          </Text>
        </View>

        <View className="flex-row gap-4">
          <Pressable className="flex-1 py-4 bg-gray-900 rounded-xl hover:bg-black transition-colors items-center">
            <Text className="text-white font-bold">Upgrade to Premium (₱499/mo)</Text>
          </Pressable>
        </View>
      </View>

      {/* Payment Methods */}
      <View className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-center mb-6 border-b border-gray-50 pb-4">
          <Text className="text-xl font-bold text-gray-900">Payment Methods</Text>
          <Pressable><Text className="text-orange-600 font-bold">+ Add Method</Text></Pressable>
        </View>

        <View className="items-center py-8">
          <Text className="text-4xl mb-4">💳</Text>
          <Text className="text-gray-500 font-medium">No payment methods added yet.</Text>
        </View>
      </View>
    </View>
  );
}
