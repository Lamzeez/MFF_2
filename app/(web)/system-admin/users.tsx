import { View, Text, Pressable, ScrollView, TextInput } from "react-native";

export default function UsersPage() {
  const mockUsers = [
    { id: "USR-1092", name: "Juan Dela Cruz", email: "juan@example.com", role: "Rider", status: "Active" },
    { id: "USR-1093", name: "Maria Clara", email: "maria@example.com", role: "Store Admin", status: "Active" },
    { id: "USR-1094", name: "Crisostomo Ibarra", email: "cris@example.com", role: "User", status: "Suspended" },
    { id: "USR-1095", name: "Andres Bonifacio", email: "andres@example.com", role: "User", status: "Active" },
  ];

  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      <View className="mb-8 flex-row justify-between items-end">
        <View>
          <Text className="text-3xl font-extrabold text-gray-900 mb-2">User Management</Text>
          <Text className="text-gray-500 text-lg">Manage all accounts across the Mati FoodFinder platform.</Text>
        </View>
      </View>

      {/* Search and Filter */}
      <View className="flex-row gap-4 mb-6">
        <View className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex-row items-center">
          <Text className="text-gray-400 mr-2">🔍</Text>
          <TextInput 
            placeholder="Search users by name, email, or ID..." 
            className="flex-1 outline-none text-base"
            placeholderTextColor="#9ca3af"
          />
        </View>
        <Pressable className="bg-gray-900 px-6 py-3 rounded-xl justify-center shadow-sm">
          <Text className="text-white font-bold">Filter</Text>
        </Pressable>
      </View>

      {/* Data Table */}
      <View className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <View className="flex-row bg-gray-50 px-6 py-4 border-b border-gray-200 hidden md:flex">
          <Text className="flex-[2] font-bold text-gray-600">User</Text>
          <Text className="flex-1 font-bold text-gray-600">Role</Text>
          <Text className="flex-1 font-bold text-gray-600">Status</Text>
          <Text className="flex-1 font-bold text-gray-600 text-right">Actions</Text>
        </View>

        {/* Table Rows */}
        <ScrollView className="max-h-[600px]">
          {mockUsers.map((user) => (
            <View key={user.id} className="flex-col md:flex-row px-6 py-5 items-start md:items-center border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <View className="flex-[2] flex-row items-center gap-3 mb-4 md:mb-0">
                <View className="w-10 h-10 bg-indigo-100 rounded-full items-center justify-center">
                  <Text className="text-indigo-700 font-bold">{user.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text className="font-bold text-gray-900 text-base">{user.name}</Text>
                  <Text className="text-gray-400 text-sm">{user.email}</Text>
                </View>
              </View>
              
              <View className="flex-1 mb-2 md:mb-0">
                <View className={`self-start px-3 py-1 rounded-full border ${
                  user.role === 'Rider' ? 'bg-green-50 border-green-200 text-green-700' : 
                  user.role === 'Store Admin' ? 'bg-orange-50 border-orange-200 text-orange-700' : 
                  'bg-gray-100 border-gray-200 text-gray-700'
                }`}>
                  <Text className="text-xs font-bold">{user.role}</Text>
                </View>
              </View>

              <View className="flex-1 mb-4 md:mb-0">
                <View className={`flex-row items-center gap-2`}>
                  <View className={`w-2 h-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <Text className={`font-semibold ${user.status === 'Active' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {user.status}
                  </Text>
                </View>
              </View>
              
              <View className="flex-1 flex-row gap-2 md:justify-end w-full md:w-auto">
                <Pressable className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex-1 md:flex-none items-center">
                  <Text className="text-gray-700 font-bold">Edit</Text>
                </Pressable>
                {user.status === 'Active' ? (
                  <Pressable className="px-4 py-2 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex-1 md:flex-none items-center">
                    <Text className="text-red-600 font-bold">Suspend</Text>
                  </Pressable>
                ) : (
                  <Pressable className="px-4 py-2 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors flex-1 md:flex-none items-center">
                    <Text className="text-emerald-600 font-bold">Restore</Text>
                  </Pressable>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
