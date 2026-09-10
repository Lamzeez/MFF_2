import { Link } from "expo-router";
import { View, Text, Pressable, ScrollView, Modal, Platform, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

export default function Portal() {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalRole, setModalRole] = useState<string>("");

  const openMobilePrompt = (roleName: string) => {
    setModalRole(roleName);
    setModalVisible(true);
  };

  const handleOpenApp = () => {
    // Custom scheme registered in app.json
    Linking.openURL("mff://").catch(() => {
      // If app is not installed or scheme not handled, alert the user
      alert("Mati FoodFinder app is not yet installed on this device. Please download the APK below!");
    });
  };

  const handleDownloadApk = () => {
    alert("Direct APK download will be available in near-production! In the meantime, run 'npx expo start --lan' on your computer and scan the QR code in the Expo Go app.");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}>
        
        <View className="w-full max-w-5xl px-6 py-12">
          
          <Link href="/(web)" asChild>
            <Pressable className="mb-8 self-start">
              <Text className="text-emerald-600 font-semibold hover:underline text-base">← Back to Home</Text>
            </Pressable>
          </Link>
          
          <View className="items-center mb-12">
            <View className="bg-emerald-100 px-4 py-1.5 rounded-full mb-3">
              <Text className="text-emerald-800 font-bold text-xs uppercase tracking-wider">Unified Access Portal</Text>
            </View>
            <Text className="text-3xl md:text-5xl font-black text-gray-900 mb-3 text-center">
              Welcome to the Portal
            </Text>
            <Text className="text-gray-500 text-center text-base md:text-lg max-w-2xl">
              Select your role to access your dashboard or get the mobile app for ordering, delivery, and kitchen operations.
            </Text>
          </View>

          {/* Grid of Roles */}
          <View className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Store Admins (Desktop & Mobile Web) */}
            <View className="bg-white p-7 rounded-2xl shadow-sm border border-gray-200 flex-col justify-between hover:shadow-md transition-shadow">
              <View>
                <View className="w-12 h-12 bg-orange-100 rounded-xl items-center justify-center mb-4">
                  <Text className="text-2xl">🏪</Text>
                </View>
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="text-xl font-extrabold text-gray-900">Store Admins</Text>
                  <View className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    <Text className="text-[10px] font-bold text-blue-700 uppercase">Web</Text>
                  </View>
                </View>
                <Text className="text-gray-500 text-sm mb-6 leading-relaxed">
                  For Karenderias & Restaurants. Manage menus, prices, approve table reservations, and monitor PayMongo billing.
                </Text>
              </View>
              <View className="flex-row gap-3 w-full">
                <Link href="/(web)/auth/store-register" asChild>
                  <Pressable className="flex-1 py-3 bg-white border border-orange-500 rounded-xl items-center hover:bg-orange-50 transition-colors">
                    <Text className="text-orange-600 font-bold text-sm">Register</Text>
                  </Pressable>
                </Link>
                <Link href="/(web)/auth/store-login" asChild>
                  <Pressable className="flex-1 py-3 bg-orange-500 rounded-xl items-center hover:bg-orange-600 transition-colors shadow-sm">
                    <Text className="text-white font-bold text-sm">Login</Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            {/* 2. Hungry Locals & Customers (Mobile Only) */}
            <View className="bg-white p-7 rounded-2xl shadow-sm border border-gray-200 flex-col justify-between hover:shadow-md transition-shadow">
              <View>
                <View className="w-12 h-12 bg-emerald-100 rounded-xl items-center justify-center mb-4">
                  <Text className="text-2xl">🍔</Text>
                </View>
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="text-xl font-extrabold text-gray-900">Hungry Customers</Text>
                  <View className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Text className="text-[10px] font-bold text-emerald-700 uppercase">App Only</Text>
                  </View>
                </View>
                <Text className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Browse live menus across Mati City, reserve dining tables, and order Cash on Delivery (COD) to your door.
                </Text>
              </View>
              <Pressable 
                onPress={() => openMobilePrompt("Hungry Customers")}
                className="w-full py-3 bg-emerald-700 rounded-xl items-center hover:bg-emerald-800 transition-colors shadow-sm"
              >
                <Text className="text-white font-bold text-sm">Get Customer App</Text>
              </Pressable>
            </View>

            {/* 3. In-App Merchant Mode (Mobile Only) */}
            <View className="bg-white p-7 rounded-2xl shadow-sm border border-gray-200 flex-col justify-between hover:shadow-md transition-shadow">
              <View>
                <View className="w-12 h-12 bg-amber-100 rounded-xl items-center justify-center mb-4">
                  <Text className="text-2xl">🍳</Text>
                </View>
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="text-xl font-extrabold text-gray-900">Kitchen Merchant Mode</Text>
                  <View className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Text className="text-[10px] font-bold text-emerald-700 uppercase">App Only</Text>
                  </View>
                </View>
                <Text className="text-gray-500 text-sm mb-6 leading-relaxed">
                  High-speed kitchen view for Karenderia cooks to toggle dish availability and accept incoming orders instantly.
                </Text>
              </View>
              <Pressable 
                onPress={() => openMobilePrompt("Kitchen Merchant Mode")}
                className="w-full py-3 bg-gray-900 rounded-xl items-center hover:bg-black transition-colors shadow-sm"
              >
                <Text className="text-white font-bold text-sm">Open in Mobile App</Text>
              </Pressable>
            </View>

            {/* 4. Delivery Riders (Mobile Only) */}
            <View className="bg-white p-7 rounded-2xl shadow-sm border border-gray-200 flex-col justify-between hover:shadow-md transition-shadow">
              <View>
                <View className="w-12 h-12 bg-sky-100 rounded-xl items-center justify-center mb-4">
                  <Text className="text-2xl">🛵</Text>
                </View>
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="text-xl font-extrabold text-gray-900">Delivery Riders</Text>
                  <View className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Text className="text-[10px] font-bold text-emerald-700 uppercase">App Only</Text>
                  </View>
                </View>
                <Text className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Independent riders accepting Cash-on-Delivery jobs, routing via live maps, and managing earnings in Mati.
                </Text>
              </View>
              <Pressable 
                onPress={() => openMobilePrompt("Delivery Riders")}
                className="w-full py-3 bg-sky-600 rounded-xl items-center hover:bg-sky-700 transition-colors shadow-sm"
              >
                <Text className="text-white font-bold text-sm">Rider Mode (App Only)</Text>
              </Pressable>
            </View>

            {/* 5. System Admin (Developer Web Only) */}
            <View className="bg-white p-7 rounded-2xl shadow-sm border border-gray-200 flex-col justify-between hover:shadow-md transition-shadow">
              <View>
                <View className="w-12 h-12 bg-purple-100 rounded-xl items-center justify-center mb-4">
                  <Text className="text-2xl">🛡️</Text>
                </View>
                <View className="flex-row items-center gap-2 mb-2">
                  <Text className="text-xl font-extrabold text-gray-900">System Admin</Text>
                  <View className="bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    <Text className="text-[10px] font-bold text-blue-700 uppercase">Web</Text>
                  </View>
                </View>
                <Text className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Developer oversight dashboard for store verifications, moderation of social food feeds, and platform metrics.
                </Text>
              </View>
              <Link href="/(web)/system-admin" asChild>
                <Pressable className="w-full py-3 bg-purple-600 rounded-xl items-center hover:bg-purple-700 transition-colors shadow-sm">
                  <Text className="text-white font-bold text-sm">Open Admin Panel</Text>
                </Pressable>
              </Link>
            </View>

          </View>
        </View>

        {/* Mobile App Exclusive Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View className="flex-1 bg-black/60 items-center justify-center p-4">
            <View className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-gray-100 items-center relative">
              
              {/* Close Button */}
              <Pressable 
                onPress={() => setModalVisible(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <Text className="text-gray-500 font-bold text-lg leading-none">✕</Text>
              </Pressable>

              {/* Badge */}
              <View className="w-16 h-16 bg-emerald-100 rounded-2xl items-center justify-center mb-4">
                <Text className="text-3xl">📱</Text>
              </View>

              <Text className="text-2xl font-black text-gray-900 text-center mb-2">
                Available on Mobile App Only
              </Text>
              
              <Text className="text-orange-600 font-bold text-xs uppercase tracking-wider mb-4 text-center">
                {modalRole}
              </Text>

              <Text className="text-gray-600 text-center text-sm mb-6 leading-relaxed">
                The food feed, real-time availability, interactive map, and in-app kitchen mode are exclusively designed for smartphones running the Mati FoodFinder app.
              </Text>

              {/* Simulated QR Code Frame */}
              <View className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-5 items-center justify-center mb-6 w-full max-w-xs">
                <View className="w-36 h-36 bg-white border border-gray-200 rounded-xl items-center justify-center p-2 mb-3 shadow-inner">
                  {/* Decorative stylized QR representation */}
                  <View className="w-full h-full border-4 border-emerald-800 rounded-lg p-2 justify-between">
                    <View className="flex-row justify-between">
                      <View className="w-6 h-6 bg-emerald-800 rounded" />
                      <View className="w-6 h-6 bg-emerald-800 rounded" />
                    </View>
                    <View className="items-center">
                      <Text className="text-[10px] font-black text-emerald-800 tracking-tighter">MFF APP</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <View className="w-6 h-6 bg-emerald-800 rounded" />
                      <View className="w-4 h-4 bg-orange-500 rounded" />
                    </View>
                  </View>
                </View>
                <Text className="text-xs font-bold text-gray-700 text-center">
                  Scan to Open or Download
                </Text>
                <Text className="text-[11px] text-gray-400 text-center mt-0.5">
                  Point your smartphone camera at this screen
                </Text>
              </View>

              {/* Action Buttons */}
              <View className="w-full gap-3">
                {/* Mobile browser action */}
                <Pressable 
                  onPress={handleOpenApp}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl items-center transition-colors shadow-md"
                >
                  <Text className="text-white font-bold text-base">Open in Installed App</Text>
                </Pressable>

                {/* Direct APK Download */}
                <Pressable 
                  onPress={handleDownloadApk}
                  className="w-full py-3.5 bg-gray-900 hover:bg-black rounded-xl items-center transition-colors shadow-sm"
                >
                  <Text className="text-white font-bold text-sm">Download Android APK (Direct)</Text>
                </Pressable>
              </View>

              <View className="mt-4 pt-3 border-t border-gray-100 w-full items-center">
                <Text className="text-[11px] text-gray-400 text-center">
                  Testing with Expo Go? Run <Text className="font-mono text-gray-600">npx expo start --lan</Text> in terminal and scan with Expo Go on your phone.
                </Text>
              </View>

            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}
