import { View, Text, Pressable, ScrollView } from "react-native";

export default function ApprovalsPage() {
  const mockApplications = [
    { id: "APP-001", store: "Mama Letty's Karenderia", owner: "Letty Mendoza", location: "Poblacion", status: "Pending", date: "Oct 24, 2026" },
    { id: "APP-002", store: "Mati Burger Hub", owner: "James Santos", location: "Dahican", status: "Pending", date: "Oct 24, 2026" },
    { id: "APP-003", store: "Seafoods Paradise", owner: "Maria Cruz", location: "Baywalk", status: "Under Review", date: "Oct 23, 2026" },
    { id: "APP-004", store: "Tapsilog Express", owner: "Ramon Perez", location: "Matiao", status: "Pending", date: "Oct 22, 2026" },
  ];

  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      <View className="mb-8 flex-row justify-between items-end">
        <View>
          <Text className="text-3xl font-extrabold text-gray-900 mb-2">Store Approvals</Text>
          <Text className="text-gray-500 text-lg">Review and verify new Karenderias joining Mati FoodFinder.</Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row gap-4 mb-6 border-b border-gray-200">
        <Pressable className="pb-3 border-b-2 border-green-600 px-2">
          <Text className="text-green-700 font-bold">Pending (18)</Text>
        </Pressable>
        <Pressable className="pb-3 px-2">
          <Text className="text-gray-500 font-medium hover:text-gray-900 transition-colors">Approved Stores</Text>
        </Pressable>
        <Pressable className="pb-3 px-2">
          <Text className="text-gray-500 font-medium hover:text-gray-900 transition-colors">Rejected</Text>
        </Pressable>
      </View>

      {/* Data Table */}
      <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <View className="flex-row bg-gray-50 px-6 py-4 border-b border-gray-200 hidden md:flex">
          <Text className="flex-[2] font-bold text-gray-600">Store Name</Text>
          <Text className="flex-1 font-bold text-gray-600">Owner</Text>
          <Text className="flex-1 font-bold text-gray-600">Location</Text>
          <Text className="flex-1 font-bold text-gray-600">Status</Text>
          <Text className="flex-1 font-bold text-gray-600">Date Applied</Text>
          <Text className="flex-1 font-bold text-gray-600 text-right">Actions</Text>
        </View>

        {/* Table Rows */}
        <ScrollView className="max-h-[600px]">
          {mockApplications.map((app, index) => (
            <View key={app.id} className={`flex-col md:flex-row px-6 py-5 items-start md:items-center border-b border-gray-100 hover:bg-gray-50 transition-colors`}>
              <View className="flex-[2] mb-2 md:mb-0">
                <Text className="font-bold text-gray-900 text-base">{app.store}</Text>
                <Text className="text-gray-400 text-sm">{app.id}</Text>
              </View>
              <Text className="flex-1 text-gray-700 mb-1 md:mb-0">{app.owner}</Text>
              <Text className="flex-1 text-gray-700 mb-2 md:mb-0">{app.location}</Text>
              <View className="flex-1 mb-2 md:mb-0">
                <View className={`self-start px-3 py-1 rounded-full ${app.status === 'Pending' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                  <Text className={`text-xs font-bold ${app.status === 'Pending' ? 'text-orange-700' : 'text-blue-700'}`}>{app.status}</Text>
                </View>
              </View>
              <Text className="flex-1 text-gray-500 text-sm mb-4 md:mb-0">{app.date}</Text>
              
              <View className="flex-1 flex-row gap-2 md:justify-end w-full md:w-auto">
                <Pressable className="px-4 py-2 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors flex-1 md:flex-none items-center">
                  <Text className="text-emerald-700 font-bold">Approve</Text>
                </Pressable>
                <Pressable className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex-1 md:flex-none items-center">
                  <Text className="text-gray-700 font-bold">Review Docs</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
