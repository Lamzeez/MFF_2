import { View, Text, Pressable, ScrollView, Image } from "react-native";

export default function ModerationPage() {
  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      <View className="mb-8 flex-row justify-between items-end">
        <View>
          <Text className="text-3xl font-extrabold text-gray-900 mb-2">Social Feed Moderation</Text>
          <Text className="text-gray-500 text-lg">Review flagged posts, images, and reviews from the community feed.</Text>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row gap-4 mb-8">
        <View className="flex-1 bg-red-50 p-4 rounded-xl border border-red-100">
          <Text className="text-red-800 font-bold">Pending Reports</Text>
          <Text className="text-2xl font-black text-red-900 mt-1">12</Text>
        </View>
        <View className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-200">
          <Text className="text-gray-600 font-bold">Reviewed Today</Text>
          <Text className="text-2xl font-black text-gray-900 mt-1">45</Text>
        </View>
      </View>

      {/* Reports Feed */}
      <ScrollView className="flex-1">
        <View className="gap-6">
          
          {/* Mock Flagged Post 1 */}
          <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-col md:flex-row gap-6">
            <View className="w-full md:w-64 h-48 bg-gray-200 rounded-xl items-center justify-center overflow-hidden">
               <Text className="text-gray-400 font-bold">[Reported Image]</Text>
            </View>
            <View className="flex-1 justify-between">
              <View>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="bg-red-100 px-3 py-1 rounded-full"><Text className="text-red-700 text-xs font-bold">Inappropriate Content</Text></View>
                  <Text className="text-gray-400 text-sm">Reported 20 mins ago</Text>
                </View>
                <Text className="text-xl font-bold text-gray-900 mb-1">Post by @hungry_juan</Text>
                <Text className="text-gray-600 mb-4">"This place has the worst customer service ever, I hope they shut down permanently!! [Expletives removed]"</Text>
                <Text className="text-sm text-gray-500">Reported by: 3 different users</Text>
              </View>
              
              <View className="flex-row gap-3 mt-6">
                <Pressable className="px-6 py-3 bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex-1 md:flex-none items-center">
                  <Text className="text-white font-bold">Delete Post & Warn</Text>
                </Pressable>
                <Pressable className="px-6 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex-1 md:flex-none items-center">
                  <Text className="text-gray-700 font-bold">Ignore / Keep</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Mock Flagged Post 2 */}
          <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-col md:flex-row gap-6">
            <View className="w-full md:w-64 h-48 bg-gray-200 rounded-xl items-center justify-center overflow-hidden">
               <Text className="text-gray-400 font-bold">[Spam Image]</Text>
            </View>
            <View className="flex-1 justify-between">
              <View>
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="bg-orange-100 px-3 py-1 rounded-full"><Text className="text-orange-700 text-xs font-bold">Spam / Advertisement</Text></View>
                  <Text className="text-gray-400 text-sm">Reported 1 hour ago</Text>
                </View>
                <Text className="text-xl font-bold text-gray-900 mb-1">Post by @crypto_king_mati</Text>
                <Text className="text-gray-600 mb-4">"Forget food, click here to double your GCash in 10 minutes!! Link in bio."</Text>
                <Text className="text-sm text-gray-500">Reported by: System Automoderator</Text>
              </View>
              
              <View className="flex-row gap-3 mt-6">
                <Pressable className="px-6 py-3 bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex-1 md:flex-none items-center">
                  <Text className="text-white font-bold">Ban User & Delete</Text>
                </Pressable>
                <Pressable className="px-6 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex-1 md:flex-none items-center">
                  <Text className="text-gray-700 font-bold">Ignore</Text>
                </Pressable>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
