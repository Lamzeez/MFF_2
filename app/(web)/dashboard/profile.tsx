import { View, Text, TextInput, Pressable, ScrollView } from "react-native";

export default function StoreProfile() {
  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-4xl self-center">
      <View className="mb-8">
        <Text className="text-3xl font-extrabold text-gray-900 mb-2">Store Profile</Text>
        <Text className="text-gray-500 text-lg">Update how your Karenderia appears to users in Mati City.</Text>
      </View>

      <ScrollView className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden" contentContainerStyle={{ padding: 32 }}>
        
        {/* Banner/Logo Uploads */}
        <View className="flex-row items-center gap-6 mb-10">
          <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center border-2 border-dashed border-gray-300">
            <Text className="text-2xl">🏪</Text>
          </View>
          <View>
            <Pressable className="px-5 py-2.5 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors mb-2 self-start">
              <Text className="text-white font-bold">Upload Logo</Text>
            </Pressable>
            <Text className="text-gray-400 text-sm">JPEG or PNG, up to 2MB</Text>
          </View>
        </View>

        <View className="gap-6">
          <View>
            <Text className="font-bold text-gray-700 mb-2">Store Name</Text>
            <TextInput 
              value="Mama Letty's Karenderia"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500"
            />
          </View>
          
          <View>
            <Text className="font-bold text-gray-700 mb-2">Short Description</Text>
            <TextInput 
              value="Serving authentic home-cooked Filipino meals in the heart of Poblacion."
              multiline
              numberOfLines={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500 h-24 text-top"
              textAlignVertical="top"
            />
          </View>

          <View className="flex-col md:flex-row gap-6">
            <View className="flex-1">
              <Text className="font-bold text-gray-700 mb-2">Operating Hours (Open)</Text>
              <TextInput 
                value="07:00 AM"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500"
              />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-gray-700 mb-2">Operating Hours (Close)</Text>
              <TextInput 
                value="08:00 PM"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 focus:border-orange-500"
              />
            </View>
          </View>
        </View>

        <View className="mt-10 pt-8 border-t border-gray-100 flex-row justify-end">
          <Pressable className="px-8 py-4 bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors">
            <Text className="text-white font-bold text-lg">Save Changes</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}
