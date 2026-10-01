import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";

export default function VerificationPending() {
  return (
    <View className="flex-1 bg-gray-50 items-center justify-center p-6">
      <View className="w-full max-w-md bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100 items-center text-center">
        
        <View className="w-24 h-24 bg-orange-100 rounded-full items-center justify-center mb-6">
          <Text className="text-4xl">⏳</Text>
        </View>
        
        <Text className="text-2xl font-extrabold text-gray-900 mb-4 text-center">Application Received!</Text>
        
        <Text className="text-gray-600 text-center mb-8 leading-relaxed">
          Thank you for applying to join Mati FoodFinder! Our System Admin team is currently reviewing your documents to verify your store's location. 
          {"\n\n"}
          This usually takes less than 24 hours. We will email you once approved!
        </Text>

        <Link href="/portal" asChild>
          <Pressable className="w-full bg-[#111827] py-4 rounded-2xl items-center hover:bg-black transition-colors shadow-sm">
            <Text className="text-white font-extrabold text-base">Return to Portal</Text>
          </Pressable>
        </Link>
        
      </View>
    </View>
  );
}
