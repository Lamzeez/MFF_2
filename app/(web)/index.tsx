import { Link } from "expo-router";
import { View, Text, ScrollView, Image, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WebLanding() {
  const { width } = Dimensions.get("window");
  
  const carouselPlaceholders = [
    { id: 1, title: "Discover Local Favorites", desc: "Browse menus from Karenderias to Fine Dining." },
    { id: 2, title: "Real-Time Updates", desc: "Know if your favorite dish is available before leaving home." },
    { id: 3, title: "Book a Table", desc: "Reserve your spot instantly with zero hassle." },
    { id: 4, title: "Fast Delivery", desc: "Independent riders ready to deliver straight to your door via COD." },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: "center" }} className="w-full">
        
        {/* Navigation Bar */}
        <View className="px-6 py-4 bg-white shadow-sm w-full sticky top-0 z-50 items-center justify-center">
          <View style={{ width: "100%", maxWidth: 1152, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View className="flex-row items-center gap-3">
              <Image 
                source={require("../../assets/logo.jpg")} 
                style={{ width: 56, height: 56, borderRadius: 28 }}
                resizeMode="contain"
              />
              <Text className="text-2xl font-extrabold text-green-800 tracking-tight hidden sm:flex">
                Mati FoodFinder
              </Text>
            </View>
            <View>
              <Link href="/(web)/portal" asChild>
                <Pressable className="px-6 py-2.5 rounded-full bg-orange-500 hover:bg-orange-600 transition-colors shadow-sm">
                  <Text className="text-white font-bold text-sm md:text-base">Login / Register</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </View>

        {/* Hero Section */}
        <View className="bg-green-800 w-full py-16 md:py-28 px-6 relative overflow-hidden items-center">
          <View className="absolute top-0 right-0 w-96 h-96 bg-green-700 rounded-full opacity-50 -translate-y-1/2 translate-x-1/3" />
          <View className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500 rounded-full opacity-20 translate-y-1/3 -translate-x-1/4" />
          
          <View className="w-full max-w-6xl self-center flex-col md:flex-row items-center justify-center gap-12 z-10">
            <View className="flex-1 max-w-xl items-center md:items-start text-center md:text-left">
              <Text className="text-4xl md:text-6xl font-black text-white leading-tight mb-6 text-center md:text-left">
                Stop guessing.{"\n"}
                <Text className="text-orange-400">Start eating.</Text>
              </Text>
              <Text className="text-lg md:text-xl text-green-100 mb-8 leading-relaxed text-center md:text-left">
                Mati City's exclusive food network. Browse live menus, check available tables, and get cash-on-delivery right to your door. From family-owned Karenderias to premium restaurants!
              </Text>
              <View className="flex-row flex-wrap justify-center md:justify-start gap-4 w-full">
                <Pressable className="px-8 py-4 rounded-full bg-orange-500 shadow-lg hover:bg-orange-600 transition-all">
                  <Text className="text-white text-lg font-bold">Get the App</Text>
                </Pressable>
                <Link href="/(web)/portal" asChild>
                  <Pressable className="px-8 py-4 rounded-full bg-white shadow-lg hover:bg-gray-100 transition-all">
                    <Text className="text-green-900 text-lg font-bold">Partner With Us</Text>
                  </Pressable>
                </Link>
              </View>
            </View>
            
            {/* Hero Image Container */}
            <View className="flex-1 w-full max-w-md items-center justify-center mt-10 md:mt-0">
              <View className="w-64 h-96 md:w-80 md:h-[500px] bg-white rounded-[40px] shadow-2xl items-center justify-center border-8 border-green-900 overflow-hidden">
                <Image 
                  source={require("../../assets/logo.jpg")} 
                  style={{ width: 128, height: 128, opacity: 0.5, marginBottom: 16, borderRadius: 64 }}
                  resizeMode="contain"
                />
                <Text className="text-gray-400 font-bold text-center px-4">
                  [Drop Mobile App Mockup Image Here]
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Carousel Section */}
        <View className="py-20 bg-gray-50 w-full items-center">
          <View className="w-full max-w-6xl self-center px-6 mb-10 items-center">
            <Text className="text-3xl md:text-4xl font-extrabold text-green-900 text-center">Experience Mati's Best</Text>
            <Text className="text-gray-500 text-lg mt-3 text-center">Swipe through the features waiting for you inside the app.</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 40, gap: 24 }}
            className="w-full max-w-7xl self-center"
          >
            {carouselPlaceholders.map((item) => (
              <View key={item.id} className="w-72 md:w-80 bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
                <View className="h-48 bg-gray-200 items-center justify-center">
                  <Text className="text-gray-400 font-bold">[Image {item.id}]</Text>
                </View>
                <View className="p-6">
                  <Text className="text-xl font-bold text-gray-900 mb-2">{item.title}</Text>
                  <Text className="text-gray-600 leading-relaxed">{item.desc}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Comprehensive Features Section */}
        <View className="py-24 bg-white w-full items-center">
          <View className="w-full max-w-5xl self-center px-6">
            <Text className="text-3xl md:text-5xl font-extrabold text-center text-green-900 mb-20">
              An Ecosystem Built for <Text className="text-orange-500">Everyone</Text>
            </Text>

            {/* Feature Row 1: Users */}
            <View className="flex-col md:flex-row items-center justify-center gap-12 mb-24 w-full">
              <View className="flex-1 max-w-lg items-center md:items-start text-center md:text-left">
                <View className="w-16 h-16 bg-blue-100 rounded-2xl items-center justify-center mb-6">
                  <Text className="text-3xl">🤤</Text>
                </View>
                <Text className="text-3xl font-bold text-gray-900 mb-4 text-center md:text-left">For the Hungry Locals</Text>
                <Text className="text-lg text-gray-600 mb-6 leading-relaxed text-center md:text-left">
                  No more driving around town to find out your favorite Karenderia is closed or out of chicken adobo. 
                  MFF provides real-time menus, prices, and availability.
                </Text>
                <View className="gap-4 w-full">
                  <Text className="text-gray-700 text-base font-semibold">✨ Smart Personalized Recommendations based on your order history and favorite spots.</Text>
                  <Text className="text-gray-700 text-base font-semibold">📍 Live Maps for instant directions.</Text>
                  <Text className="text-gray-700 text-base font-semibold">💬 Built-in Food Social Feed to share your meals.</Text>
                </View>
              </View>
              <View className="flex-1 w-full max-w-md h-80 bg-blue-50 rounded-3xl items-center justify-center border border-blue-100 shadow-inner">
                 <Text className="text-blue-300 font-bold">[User App Features Image]</Text>
              </View>
            </View>

            {/* Feature Row 2: Store Admins */}
            <View className="flex-col md:flex-row-reverse items-center justify-center gap-12 mb-24 w-full">
              <View className="flex-1 max-w-lg items-center md:items-start text-center md:text-left">
                <View className="w-16 h-16 bg-orange-100 rounded-2xl items-center justify-center mb-6">
                  <Text className="text-3xl">🏪</Text>
                </View>
                <Text className="text-3xl font-bold text-gray-900 mb-4 text-center md:text-left">For Store Owners</Text>
                <Text className="text-lg text-gray-600 mb-6 leading-relaxed text-center md:text-left">
                  Whether you own a large restaurant or a small family-owned Karenderia, MFF is built for you. 
                  Manage everything directly from your mobile phone with our specialized "Merchant Mode".
                </Text>
                <View className="gap-4 w-full">
                  <Text className="text-gray-700 text-base font-semibold">🎁 2-Month Free Trial to start growing your customers.</Text>
                  <Text className="text-gray-700 text-base font-semibold">💳 Easy GCash subscriptions via PayMongo.</Text>
                  <Text className="text-gray-700 text-base font-semibold">📲 Hear a "Ding!" on your phone for new reservations.</Text>
                </View>
              </View>
              <View className="flex-1 w-full max-w-md h-80 bg-orange-50 rounded-3xl items-center justify-center border border-orange-100 shadow-inner">
                 <Text className="text-orange-300 font-bold">[Merchant Dashboard Image]</Text>
              </View>
            </View>

            {/* Feature Row 3: Riders */}
            <View className="flex-col md:flex-row items-center justify-center gap-12 w-full">
              <View className="flex-1 max-w-lg items-center md:items-start text-center md:text-left">
                <View className="w-16 h-16 bg-green-100 rounded-2xl items-center justify-center mb-6">
                  <Text className="text-3xl">🛵</Text>
                </View>
                <Text className="text-3xl font-bold text-gray-900 mb-4 text-center md:text-left">For Independent Riders</Text>
                <Text className="text-lg text-gray-600 mb-6 leading-relaxed text-center md:text-left">
                  Join the network as an independent delivery rider. Accept COD (Cash on Delivery) requests 
                  from users who want Mati's best food brought directly to their homes.
                </Text>
                <View className="gap-4 w-full">
                  <Text className="text-gray-700 text-base font-semibold">🗺️ Smart Map Routing for quick pickups/dropoffs.</Text>
                  <Text className="text-gray-700 text-base font-semibold">🕒 Flexible hours—deliver when you want.</Text>
                  <Text className="text-gray-700 text-base font-semibold">💵 Keep your hard-earned delivery fees via COD.</Text>
                </View>
              </View>
              <View className="flex-1 w-full max-w-md h-80 bg-green-50 rounded-3xl items-center justify-center border border-green-100 shadow-inner">
                 <Text className="text-green-300 font-bold">[Rider App Image]</Text>
              </View>
            </View>

          </View>
        </View>

        {/* Call to Action Footer */}
        <View className="bg-gray-900 py-24 w-full items-center justify-center px-6">
          <Image 
            source={require("../../assets/logo.jpg")} 
            style={{ width: 96, height: 96, marginBottom: 24, borderRadius: 48 }}
            resizeMode="contain"
          />
          <Text className="text-3xl md:text-5xl font-bold text-white text-center mb-6 max-w-3xl">
            Ready to change how you dine in Mati City?
          </Text>
          <Text className="text-gray-400 text-lg text-center mb-10 max-w-2xl">
            Join thousands of locals and store owners building the ultimate food network. 
            Download the app or register your store today.
          </Text>
          
          <Link href="/(web)/portal" asChild>
            <Pressable className="px-10 py-5 rounded-full bg-orange-500 hover:bg-orange-600 shadow-xl transition-transform active:scale-95">
              <Text className="text-white text-xl font-bold">Go to Portal</Text>
            </Pressable>
          </Link>
        </View>

        {/* Minimal Footer */}
        <View className="bg-black py-8 w-full items-center border-t border-gray-800">
          <Text className="text-gray-500 text-sm">
            © 2026 Mati FoodFinder. All rights reserved. Exclusive to Mati City, Philippines.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
