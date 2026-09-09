import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { Link } from "expo-router";

export default function StoreRegister() {
  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ flexGrow: 1, alignItems: 'center', padding: 24 }}>
      <View className="w-full max-w-2xl bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100 my-8">
        
        <View className="mb-8 border-b border-gray-100 pb-6">
          <Text className="text-3xl font-extrabold text-gray-900 mb-2">Partner with MFF</Text>
          <Text className="text-gray-500">
            Join Mati City's exclusive food network. Get your 2-Month Free Trial and start receiving orders today.
          </Text>
        </View>

        <View className="gap-6">
          {/* Section 1 */}
          <View>
            <Text className="text-lg font-bold text-gray-900 mb-4">1. Store Information</Text>
            <View className="gap-4">
              <View>
                <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Store Name *</Text>
                <TextInput 
                  placeholder="e.g. Mama Letty's Karenderia"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View>
                <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Complete Address *</Text>
                <TextInput 
                  placeholder="Street, Barangay, Landmark (Mati City only)"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>

          {/* Section 2 */}
          <View className="pt-4 border-t border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-4">2. Owner Details</Text>
            <View className="gap-4">
              <View className="flex-col md:flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Full Name *</Text>
                  <TextInput 
                    placeholder="Owner's Name"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Mobile Number (GCash) *</Text>
                  <TextInput 
                    placeholder="09XX XXX XXXX"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
              <View>
                <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Email Address *</Text>
                <TextInput 
                  placeholder="store@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <View>
                <Text className="text-sm font-bold text-gray-700 mb-1 ml-1">Password *</Text>
                <TextInput 
                  placeholder="Create a secure password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          {/* Section 3 */}
          <View className="pt-4 border-t border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-4">3. Verification Documents</Text>
            <Text className="text-gray-500 mb-4 text-sm">
              To ensure platform quality, please upload a clear photo of your Store Front or Business Permit.
            </Text>
            <Pressable className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl items-center justify-center hover:bg-gray-100 transition-colors">
              <Text className="text-2xl mb-2">📸</Text>
              <Text className="text-gray-500 font-bold">Click to Upload Document</Text>
              <Text className="text-gray-400 text-xs mt-1">JPEG, PNG up to 5MB</Text>
            </Pressable>
          </View>

          <Link href="/(web)/auth/verification" asChild>
            <Pressable className="w-full bg-orange-500 py-4 rounded-xl items-center shadow-md hover:bg-orange-600 transition-colors mt-6">
              <Text className="text-white font-bold text-lg">Submit Application</Text>
            </Pressable>
          </Link>
          
          <View className="flex-row justify-center mt-2 gap-1">
            <Text className="text-gray-500">Already have an account?</Text>
            <Link href="/(web)/auth/store-login" asChild>
              <Pressable><Text className="text-orange-600 font-bold">Sign In</Text></Pressable>
            </Link>
          </View>

        </View>
      </View>
    </ScrollView>
  );
}
