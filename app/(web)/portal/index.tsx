import { Link } from "expo-router";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Portal() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
        
        <View className="w-full max-w-4xl px-4 py-12">
          
          <Link href="/(web)" asChild>
            <Pressable className="mb-8 self-start">
              <Text className="text-emerald-600 font-semibold hover:underline">← Back to Home</Text>
            </Pressable>
          </Link>
          
          <Text className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 text-center">
            Welcome to the Portal
          </Text>
          <Text className="text-gray-500 mb-10 text-center text-lg">
            Select your role to login or download the app.
          </Text>

          <View className="flex-row flex-wrap justify-center gap-6">
            
            {/* Store Admin Portal */}
            <View className="bg-white p-8 rounded-2xl w-full md:w-80 shadow-md border border-gray-100 flex-col items-center">
              <Text className="text-2xl mb-4">🏪</Text>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">Store Admins</Text>
              <Text className="text-gray-500 text-center mb-6 text-sm">
                Manage your Karenderia or Restaurant. View orders, analytics, and billing.
              </Text>
              <View className="flex-row gap-3 w-full">
                <Link href="/(web)/auth/store-register" asChild>
                  <Pressable className="flex-1 py-3 bg-white border border-orange-500 rounded-lg hover:bg-orange-50 items-center transition-colors">
                    <Text className="text-orange-600 font-bold">Register</Text>
                  </Pressable>
                </Link>
                <Link href="/(web)/auth/store-login" asChild>
                  <Pressable className="flex-1 py-3 bg-orange-500 rounded-lg hover:bg-orange-600 items-center transition-colors">
                    <Text className="text-white font-bold">Login</Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            {/* Users & Riders Portal */}
            <View className="bg-white p-8 rounded-2xl w-full md:w-80 shadow-md border border-gray-100 flex-col items-center">
              <Text className="text-2xl mb-4">📱</Text>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">Mobile App UIs</Text>
              <Text className="text-gray-500 text-center mb-6 text-sm">
                View the React Native mobile screens designed for smartphones.
              </Text>
              <Link href="/(mobile)/merchant" asChild>
                <Pressable className="w-full py-3 bg-gray-900 rounded-lg hover:bg-gray-800 items-center transition-colors">
                  <Text className="text-white font-bold">Mobile Merchant Mode</Text>
                </Pressable>
              </Link>
            </View>

          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
