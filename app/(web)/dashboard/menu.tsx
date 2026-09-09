import { View, Text, Pressable, ScrollView, TextInput } from "react-native";

export default function MenuManager() {
  const mockMenu = [
    { id: 1, name: "Chicken Adobo", price: "₱60", available: true },
    { id: 2, name: "Pork Sinigang", price: "₱70", available: true },
    { id: 3, name: "Beef Caldereta", price: "₱80", available: false },
    { id: 4, name: "Extra Rice", price: "₱15", available: true },
  ];

  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      <View className="mb-8 flex-row justify-between items-end">
        <View>
          <Text className="text-3xl font-extrabold text-gray-900 mb-2">Menu Manager</Text>
          <Text className="text-gray-500 text-lg">Update your food items, prices, and live availability.</Text>
        </View>
        <Pressable className="bg-orange-500 px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors hidden md:flex">
          <Text className="text-white font-bold">+ Add New Item</Text>
        </Pressable>
      </View>

      <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <View className="flex-row bg-gray-50 px-8 py-4 border-b border-gray-200 hidden md:flex">
          <Text className="flex-[2] font-bold text-gray-600">Item Name</Text>
          <Text className="flex-1 font-bold text-gray-600">Price</Text>
          <Text className="flex-1 font-bold text-gray-600">Availability</Text>
          <Text className="flex-1 font-bold text-gray-600 text-right">Actions</Text>
        </View>

        <ScrollView className="max-h-[600px]">
          {mockMenu.map((item) => (
            <View key={item.id} className="flex-col md:flex-row px-8 py-5 items-start md:items-center border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <View className="flex-[2] mb-2 md:mb-0">
                <Text className="font-bold text-gray-900 text-lg">{item.name}</Text>
              </View>
              <Text className="flex-1 text-gray-700 text-lg font-medium mb-2 md:mb-0">{item.price}</Text>
              
              <View className="flex-1 mb-4 md:mb-0">
                <Pressable className={`self-start px-4 py-2 rounded-full border ${item.available ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-100 border-gray-300'}`}>
                  <Text className={`font-bold text-sm ${item.available ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {item.available ? 'Available' : 'Sold Out'}
                  </Text>
                </Pressable>
              </View>

              <View className="flex-1 flex-row gap-3 md:justify-end w-full md:w-auto">
                <Pressable className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex-1 md:flex-none items-center">
                  <Text className="text-gray-700 font-bold">Edit</Text>
                </Pressable>
                <Pressable className="px-4 py-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex-1 md:flex-none items-center">
                  <Text className="text-red-600 font-bold">Delete</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
