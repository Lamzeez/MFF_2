import { View, Text, TextInput, Pressable, Image } from "react-native";
import { Link } from "expo-router";

export default function StoreLogin() {
  return (
    <View className="flex-1 bg-gray-50 items-center justify-center p-6">
      <View className="w-full max-w-md bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-4">
            <Text className="text-3xl">🏪</Text>
          </View>
          <Text className="text-2xl font-extrabold text-gray-900">Store Partner Login</Text>
          <Text className="text-gray-500 text-center mt-2">Welcome back! Manage your Karenderia or Restaurant.</Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Email Address</Text>
            <TextInput 
              placeholder="store@example.com"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500 focus:bg-white transition-colors"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View>
            <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Password</Text>
            <TextInput 
              placeholder="••••••••"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500 focus:bg-white transition-colors"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          </View>
          <View className="items-end">
            <Pressable><Text className="text-orange-600 font-bold text-sm">Forgot Password?</Text></Pressable>
          </View>
          
          <Link href="/(web)/dashboard" asChild>
            <Pressable className="w-full bg-orange-500 py-4 rounded-xl items-center shadow-md hover:bg-orange-600 transition-colors mt-2">
              <Text className="text-white font-bold text-lg">Sign In</Text>
            </Pressable>
          </Link>
        </View>

        <View className="flex-row justify-center mt-8 gap-1">
          <Text className="text-gray-500">Don't have a store account?</Text>
          <Link href="/(web)/auth/store-register" asChild>
            <Pressable><Text className="text-orange-600 font-bold">Register here</Text></Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}
