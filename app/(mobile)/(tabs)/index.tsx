import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "expo-router";

interface FeedComment {
  id: string;
  author: string;
  avatarColor: string;
  text: string;
  timestamp: string;
}

interface SocialPost {
  id: string;
  author: string;
  authorInitial: string;
  avatarBg: string;
  roleBadge?: string;
  timestamp: string;
  content: string;
  rating?: number;
  taggedRestaurant?: string;
  taggedDish?: string;
  photoEmoji?: string;
  photoBg?: string;
  photoCaption?: string;
  likes: number;
  hasLiked: boolean;
  comments: FeedComment[];
}

interface RestaurantProfile {
  name: string;
  category: string;
  rating: string;
  address: string;
  phone: string;
  hours: string;
  availableTables: number;
  emoji: string;
  description: string;
}

export default function MobileFeedScreen() {
  const {
    isLoggedIn,
    user,
    loginAsRegistered,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    createReservation,
    placeActiveOrder,
    checkInToStore,
    mostVisitedStore,
  } = useAuth();
  const router = useRouter();

  // View Mode: "menus" (Live Menus & Discovery) vs "community" (Social Media Food Feed)
  const [feedMode, setFeedMode] = useState<"menus" | "community">("menus");

  // Filter & Search
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals visibility
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [selectedNotifFilter, setSelectedNotifFilter] = useState<"all" | "order" | "reservation" | "community">("all");
  
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutDish, setCheckoutDish] = useState<any>(null);
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [checkoutBarangay, setCheckoutBarangay] = useState("Central (Poblacion)");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");

  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationResto, setReservationResto] = useState("Mama Letty's Karenderia");
  const [reservationDate, setReservationDate] = useState("Tonight");
  const [reservationTime, setReservationTime] = useState("7:30 PM");
  const [reservationPartySize, setReservationPartySize] = useState(2);
  const [reservationNotes, setReservationNotes] = useState("");

  const [showRestaurantModal, setShowRestaurantModal] = useState(false);
  const [activeRestaurant, setActiveRestaurant] = useState<RestaurantProfile | null>(null);

  const [showScanQrModal, setShowScanQrModal] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState<SocialPost | null>(null);
  const [showGuestGateModal, setShowGuestGateModal] = useState(false);
  const [guestGateAction, setGuestGateAction] = useState<string>("interact with the food feed");

  // New Post Form State
  const [newPostText, setNewPostText] = useState("");
  const [newPostRestaurant, setNewPostRestaurant] = useState<string>("None");
  const [newPostDish, setNewPostDish] = useState("");
  const [newPostRating, setNewPostRating] = useState<number>(5);

  // New Comment Form State
  const [newCommentText, setNewCommentText] = useState("");

  const categories = ["All", "Karenderias", "Seafood", "BBQ & Grill", "Merienda", "Beverages"];
  const matiBarangays = ["Central (Poblacion)", "Dahican", "Sainz", "Matiao", "Badas", "Mayo"];

  const matiRestaurantsData: Record<string, RestaurantProfile> = {
    "Mama Letty's Karenderia": {
      name: "Mama Letty's Karenderia",
      category: "Authentic Karenderia & Homecooked",
      rating: "4.8",
      address: "Magsaysay St, Brgy. Central, Mati City",
      phone: "+63 917 234 5678",
      hours: "7:00 AM - 8:30 PM Daily",
      availableTables: 4,
      emoji: "🍲",
      description: "Beloved neighborhood karenderia famed for slow-cooked Classic Pork Humba, native tinola, and unlimited sabaw for Mati residents and workers.",
    },
    "Mati Baywalk Seafood Grill": {
      name: "Mati Baywalk Seafood Grill",
      category: "Fresh Seafood & Seaside Dining",
      rating: "4.9",
      address: "Baywalk Boulevard, Pujada Bay, Mati City",
      phone: "+63 928 345 6789",
      hours: "10:30 AM - 10:00 PM Daily",
      availableTables: 6,
      emoji: "🐟",
      description: "Premier bayside grill serving fresh morning catches of Tuna Panga, blue marlin, and grilled squid with sea breeze dining overlooking Pujada Bay.",
    },
    "Subangan Street Grills": {
      name: "Subangan Street Grills",
      category: "Barbecue & Night Market Specialties",
      rating: "4.9",
      address: "Near Subangan Museum Grounds, Mati City",
      phone: "+63 939 456 7890",
      hours: "4:00 PM - 11:00 PM Daily",
      availableTables: 3,
      emoji: "🍢",
      description: "Locals' top evening hangout for sizzling pork skewers, isaw, chicken inasal, and sweet spicy local dipping vinegar.",
    },
    "Dahican Beach Bites": {
      name: "Dahican Beach Bites",
      category: "Coastal Quick Bites & Shakes",
      rating: "4.7",
      address: "Dahican Beach Coastline, Mati City",
      phone: "+63 908 567 8901",
      hours: "8:00 AM - 7:00 PM Daily",
      availableTables: 5,
      emoji: "🏖️",
      description: "Beachfront surf spot serving fresh kinilaw, fruit smoothies, halo-halo, and sandwiches right next to Dahican's famous waves.",
    },
    "Aling Nena's Kitchen": {
      name: "Aling Nena's Kitchen",
      category: "Traditional Filipino & Soups",
      rating: "4.6",
      address: "Rizal Extension, Brgy. Sainz, Mati City",
      phone: "+63 919 678 9012",
      hours: "8:00 AM - 7:30 PM Daily",
      availableTables: 2,
      emoji: "🥣",
      description: "Comfort food kitchen specializing in hearty Native Chicken Tinola, Bulalo, and traditional Davao Oriental specialties.",
    },
  };

  const foodItems = [
    {
      id: 1,
      name: "Tuna Panga Grill",
      store: "Mati Baywalk Seafood Grill",
      price: 280,
      available: true,
      category: "Seafood",
      rating: "4.9",
      deliveryTime: "25-35 min",
    },
    {
      id: 2,
      name: "Classic Pork Humba",
      store: "Mama Letty's Karenderia",
      price: 90,
      available: true,
      category: "Karenderias",
      rating: "4.8",
      deliveryTime: "15-20 min",
    },
    {
      id: 3,
      name: "Fresh Kinilaw na Isda",
      store: "Dahican Beach Bites",
      price: 160,
      available: true,
      category: "Seafood",
      rating: "4.7",
      deliveryTime: "20-30 min",
    },
    {
      id: 4,
      name: "Native Chicken Tinola",
      store: "Aling Nena's Kitchen",
      price: 120,
      available: false,
      category: "Karenderias",
      rating: "4.6",
      deliveryTime: "30-40 min",
    },
    {
      id: 5,
      name: "Pork BBQ Skewers (3pcs)",
      store: "Subangan Street Grills",
      price: 75,
      available: true,
      category: "BBQ & Grill",
      rating: "4.9",
      deliveryTime: "15-25 min",
    },
  ];

  // Seed Social Media Posts
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([
    {
      id: "post-1",
      author: "Rico Alcantara",
      authorInitial: "R",
      avatarBg: "bg-emerald-600",
      roleBadge: "Verified Foodie",
      timestamp: "25m ago",
      content:
        "Just had the freshly grilled Tuna Panga at Mati Baywalk Seafood Grill! Super juicy, perfectly seasoned with calamansi and grilled right by the bay. Dipping it into the spicy soy sauce is unmatched! 🐟🔥",
      rating: 5,
      taggedRestaurant: "Mati Baywalk Seafood Grill",
      taggedDish: "Tuna Panga Grill",
      photoEmoji: "🐟",
      photoBg: "bg-emerald-900",
      photoCaption: "Grilled fresh tuna panga with spicy calamansi dip at Baywalk",
      likes: 18,
      hasLiked: false,
      comments: [
        {
          id: "c-1",
          author: "Bea Santos",
          avatarColor: "bg-pink-600",
          text: "Lami kaayo na ilaha timpla! Did you get their kinilaw as well?",
          timestamp: "18m ago",
        },
        {
          id: "c-2",
          author: "Mark Matias",
          avatarColor: "bg-blue-600",
          text: "Sulit gyud diha pag gabii kay presko ang hangin!",
          timestamp: "10m ago",
        },
      ],
    },
    {
      id: "post-2",
      author: "Carla Mae Tan",
      authorInitial: "C",
      avatarBg: "bg-amber-600",
      roleBadge: "Top Contributor",
      timestamp: "2h ago",
      content:
        "Sulit lunchtime at Mama Letty's Karenderia! For only ₱90, their Classic Pork Humba is so tender it literally melts with your spoon. Plus unlimited sabaw! Best budget lunch in Mati City. 🍲",
      rating: 5,
      taggedRestaurant: "Mama Letty's Karenderia",
      taggedDish: "Classic Pork Humba",
      photoEmoji: "🍲",
      photoBg: "bg-amber-900",
      photoCaption: "Melt-in-your-mouth pork humba with egg at Mama Letty's",
      likes: 34,
      hasLiked: false,
      comments: [
        {
          id: "c-3",
          author: "Jun-jun Mati",
          avatarColor: "bg-indigo-600",
          text: "Diyan kami palagi nag lunch ng mga kasamahan ko sa trabaho! 👍",
          timestamp: "1h ago",
        },
      ],
    },
    {
      id: "post-3",
      author: "Dave Wilson",
      authorInitial: "D",
      avatarBg: "bg-sky-600",
      timestamp: "4h ago",
      content:
        "Spending the afternoon at Dahican Beach! Any recommendations for cold halo-halo or merienda spots open near the beach this afternoon? Drop your suggestions below! 🏖️🍹",
      photoEmoji: "🏖️",
      photoBg: "bg-cyan-900",
      photoCaption: "Dahican Beach waves this afternoon",
      likes: 12,
      hasLiked: false,
      comments: [
        {
          id: "c-4",
          author: "Sarah K.",
          avatarColor: "bg-rose-600",
          text: "Dahican Beach Bites serves killer mango shakes and halo-halo!",
          timestamp: "3h ago",
        },
      ],
    },
    {
      id: "post-4",
      author: "Kenji Ramos",
      authorInitial: "K",
      avatarBg: "bg-rose-600",
      roleBadge: "Street Food Lover",
      timestamp: "6h ago",
      content:
        "Subangan Street Grills pork skewers are always fire! 🍢 3 big sticks for ₱75, juicy and drenched in their signature sweet glaze.",
      rating: 5,
      taggedRestaurant: "Subangan Street Grills",
      taggedDish: "Pork BBQ Skewers (3pcs)",
      photoEmoji: "🍢",
      photoBg: "bg-red-950",
      photoCaption: "Hot grilled pork barbecue at Subangan",
      likes: 27,
      hasLiked: false,
      comments: [],
    },
  ]);

  // Handle Guest Gate Check
  const verifyRegisteredUser = (actionDescription: string): boolean => {
    if (!isLoggedIn) {
      setGuestGateAction(actionDescription);
      setShowGuestGateModal(true);
      return false;
    }
    return true;
  };

  // Open Restaurant Profile
  const handleOpenRestaurant = (restaurantName: string) => {
    const resto = matiRestaurantsData[restaurantName] || {
      name: restaurantName,
      category: "Local Mati Restaurant",
      rating: "4.8",
      address: "Mati City, Davao Oriental",
      phone: "+63 900 000 0000",
      hours: "8:00 AM - 9:00 PM Daily",
      availableTables: 4,
      emoji: "🏪",
      description: "Authentic food establishment in Mati City serving local specialties.",
    };
    setActiveRestaurant(resto);
    setShowRestaurantModal(true);
  };

  // Open Table Reservation Sheet
  const handleOpenReservation = (restaurantName?: string) => {
    if (!verifyRegisteredUser("book dining tables")) return;
    if (restaurantName) {
      setReservationResto(restaurantName);
    }
    setShowRestaurantModal(false);
    setShowReservationModal(true);
  };

  // Submit Table Reservation
  const handleSubmitReservation = () => {
    if (!verifyRegisteredUser("book dining tables")) return;

    createReservation({
      restaurantName: reservationResto,
      date: reservationDate,
      time: reservationTime,
      partySize: reservationPartySize,
      specialNotes: reservationNotes.trim() || undefined,
    });

    setShowReservationModal(false);
    setReservationNotes("");

    Alert.alert(
      "Table Booking Requested! 📅",
      `Your reservation for ${reservationPartySize} at ${reservationResto} (${reservationDate} at ${reservationTime}) is sent to the restaurant for confirmation.`,
      [
        { text: "Continue Browsing" },
        { text: "View in Bookings", onPress: () => router.push("/(mobile)/(tabs)/orders") },
      ]
    );
  };

  // Open COD Checkout Drawer
  const handleOpenCheckout = (dish: any) => {
    if (!verifyRegisteredUser("place Cash-on-Delivery orders")) return;
    setCheckoutDish(dish);
    setCheckoutQty(1);
    setCheckoutAddress("");
    setCheckoutNotes("");
    setShowCheckoutModal(true);
  };

  // Confirm COD Order
  const handleConfirmOrder = () => {
    if (!verifyRegisteredUser("place Cash-on-Delivery orders")) return;
    if (!checkoutDish) return;

    const subtotal = checkoutDish.price * checkoutQty;
    const deliveryFee = 35;
    const total = subtotal + deliveryFee;

    const orderNumber = placeActiveOrder({
      restaurantName: checkoutDish.store,
      items: [
        {
          name: checkoutDish.name,
          quantity: checkoutQty,
          price: checkoutDish.price,
        },
      ],
      subtotal,
      deliveryFee,
      total,
      deliveryAddress: checkoutAddress.trim() || "Main Street, Central",
      barangay: checkoutBarangay,
      notes: checkoutNotes.trim() || undefined,
    });

    setShowCheckoutModal(false);

    Alert.alert(
      "Order Placed! 🛵",
      `Order ${orderNumber} from ${checkoutDish.store} has been placed via Cash-on-Delivery! Total COD to prepare: ₱${total.toFixed(2)}.`,
      [
        { text: "Done" },
        { text: "Track Order", onPress: () => router.push("/(mobile)/(tabs)/orders") },
      ]
    );
  };

  // Perform Store Stand Check-in
  const handlePerformCheckIn = (storeName: string) => {
    if (!verifyRegisteredUser("check in at store stands")) return;
    
    const visitCount = checkInToStore(storeName);
    setShowScanQrModal(false);

    Alert.alert(
      "In-Store Check-in Confirmed! 📍",
      `You checked in at ${storeName}! Total in-store visits: ${visitCount}. Ranked in your Most Visited Places personalization!`,
      [{ text: "Awesome!" }]
    );
  };

  // Toggle Like Reaction
  const handleToggleLike = (postId: string) => {
    if (!verifyRegisteredUser("like posts on the foodie feed")) return;

    setSocialPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          const hasLiked = !post.hasLiked;
          return {
            ...post,
            hasLiked,
            likes: hasLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
          };
        }
        return post;
      })
    );
  };

  // Open Comments Modal
  const handleOpenComments = (post: SocialPost) => {
    setActivePostForComments(post);
    setShowCommentsModal(true);
  };

  // Submit New Comment
  const handleAddComment = () => {
    if (!verifyRegisteredUser("post comments")) return;
    if (!newCommentText.trim() || !activePostForComments) return;

    const newComment: FeedComment = {
      id: `comment-${Date.now()}`,
      author: user?.name || "Juan dela Cruz",
      avatarColor: "bg-emerald-600",
      text: newCommentText.trim(),
      timestamp: "Just now",
    };

    setSocialPosts((prev) =>
      prev.map((p) => {
        if (p.id === activePostForComments.id) {
          const updatedComments = [...p.comments, newComment];
          const updatedPost = { ...p, comments: updatedComments };
          setActivePostForComments(updatedPost);
          return updatedPost;
        }
        return p;
      })
    );

    setNewCommentText("");
  };

  // Submit New Post
  const handleCreatePost = () => {
    if (!verifyRegisteredUser("share food reviews")) return;
    if (!newPostText.trim()) {
      Alert.alert("Content Required", "Please write something about your food experience!");
      return;
    }

    const hasTag = newPostRestaurant && newPostRestaurant !== "None";

    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      author: user?.name || "Juan dela Cruz",
      authorInitial: (user?.name || "J")[0].toUpperCase(),
      avatarBg: "bg-emerald-600",
      roleBadge: "Mati Resident",
      timestamp: "Just now",
      content: newPostText.trim(),
      rating: hasTag ? newPostRating : undefined,
      taggedRestaurant: hasTag ? newPostRestaurant : undefined,
      taggedDish: newPostDish.trim() ? newPostDish.trim() : undefined,
      photoEmoji: hasTag ? "🍽️" : "✨",
      photoBg: "bg-emerald-900",
      photoCaption: hasTag
        ? `${newPostDish.trim() || "Food review"} at ${newPostRestaurant}`
        : "Foodie moment in Mati City",
      likes: 1,
      hasLiked: true,
      comments: [],
    };

    setSocialPosts([newPost, ...socialPosts]);
    setNewPostText("");
    setNewPostRestaurant("None");
    setNewPostDish("");
    setNewPostRating(5);
    setShowCreateModal(false);
  };

  const filteredItems = foodItems.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.store.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredNotifications = notifications.filter((notif) => {
    if (selectedNotifFilter === "all") return true;
    return notif.type === selectedNotifFilter;
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* TOP APP BAR */}
      <View className="px-5 pt-3 pb-2.5 bg-white border-b border-gray-100 shadow-xs">
        <View className="flex-row justify-between items-center mb-2.5">
          <View>
            <View className="flex-row items-center gap-1">
              <Ionicons name="location" size={15} color="#047857" />
              <Text className="text-xs font-extrabold text-emerald-800 tracking-wide uppercase">
                Mati City
              </Text>
            </View>
            <Text className="text-lg font-black text-gray-900 tracking-tight">Mati FoodFinder</Text>
          </View>

          {/* Top Actions: QR Scanner, Notifications Bell, Map, Profile */}
          <View className="flex-row items-center gap-2">
            {/* Scan Store Stand QR Button */}
            <Pressable
              onPress={() => {
                if (verifyRegisteredUser("scan store stand QR codes")) {
                  setShowScanQrModal(true);
                }
              }}
              className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 items-center justify-center"
            >
              <Ionicons name="qr-code-outline" size={18} color="#047857" />
            </Pressable>

            {/* Notification Bell */}
            <Pressable
              onPress={() => {
                if (verifyRegisteredUser("view personal notifications")) {
                  setShowNotificationsModal(true);
                }
              }}
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center relative"
            >
              <Ionicons name="notifications-outline" size={18} color="#374151" />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border-2 border-white">
                  <Text className="text-white text-[10px] font-black">{unreadCount}</Text>
                </View>
              )}
            </Pressable>

            {/* Map Shortcut */}
            <Pressable
              onPress={() => router.push("/(mobile)/(tabs)/map")}
              className="flex-row items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full"
            >
              <Ionicons name="map" size={14} color="#047857" />
              <Text className="text-xs font-bold text-emerald-800">Map</Text>
            </Pressable>

            {/* Profile Avatar */}
            <Pressable
              onPress={() => router.push("/(mobile)/(tabs)/profile")}
              className="flex-row items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full"
            >
              <Ionicons
                name={isLoggedIn ? "person-circle" : "person-outline"}
                size={16}
                color="#374151"
              />
              <Text className="text-xs font-bold text-gray-700">
                {isLoggedIn ? user?.name?.split(" ")[0] : "Guest"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Mode Switcher: Live Menus vs Foodie Community */}
        <View className="flex-row bg-gray-100 p-1 rounded-xl">
          <Pressable
            onPress={() => setFeedMode("menus")}
            className={`flex-1 flex-row items-center justify-center py-2 rounded-lg gap-1.5 ${
              feedMode === "menus" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <Ionicons
              name={feedMode === "menus" ? "restaurant" : "restaurant-outline"}
              size={15}
              color={feedMode === "menus" ? "#047857" : "#6b7280"}
            />
            <Text
              className={`text-xs font-bold ${
                feedMode === "menus" ? "text-emerald-800" : "text-gray-600"
              }`}
            >
              Live Menus
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFeedMode("community")}
            className={`flex-1 flex-row items-center justify-center py-2 rounded-lg gap-1.5 ${
              feedMode === "community" ? "bg-white shadow-xs" : "bg-transparent"
            }`}
          >
            <Ionicons
              name={feedMode === "community" ? "chatbubbles" : "chatbubbles-outline"}
              size={15}
              color={feedMode === "community" ? "#047857" : "#6b7280"}
            />
            <Text
              className={`text-xs font-bold ${
                feedMode === "community" ? "text-emerald-800" : "text-gray-600"
              }`}
            >
              Foodie Community
            </Text>
            <View className="w-2 h-2 rounded-full bg-emerald-600" />
          </Pressable>
        </View>
      </View>

      {/* VIEW MODE 1: LIVE MENUS & DISCOVERY */}
      {feedMode === "menus" && (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 36 }}>
          {/* Search Bar */}
          <View className="px-5 pt-3">
            <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-xs">
              <Ionicons name="search" size={18} color="#9ca3af" />
              <TextInput
                placeholder="Search Karenderias, tuna panga, humba..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 text-sm text-gray-900 ml-2"
                placeholderTextColor="#9ca3af"
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color="#9ca3af" />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Guest Banner */}
          {!isLoggedIn && (
            <View className="mx-5 mt-3.5 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Ionicons name="sparkles" size={15} color="#ea580c" />
                  <Text className="font-extrabold text-orange-900 text-sm">Browsing as Guest</Text>
                </View>
                <Text className="text-xs text-orange-800 leading-snug">
                  Sign in to order COD, book tables, and scan store stand QR codes to personalize your favorites.
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/(mobile)/(tabs)/profile")}
                className="bg-orange-500 px-3.5 py-2 rounded-xl"
              >
                <Text className="text-white font-bold text-xs">Sign In</Text>
              </Pressable>
            </View>
          )}

          {/* Category Chips */}
          <View className="mt-3.5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    className={`mr-2.5 px-4 py-2 rounded-full border ${
                      isSelected ? "bg-emerald-700 border-emerald-700" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Live GPS Map Banner */}
          <Pressable
            onPress={() => router.push("/(mobile)/(tabs)/map")}
            className="mx-5 mt-3.5 p-4 bg-emerald-800 rounded-2xl flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-1 pr-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Ionicons name="navigate" size={13} color="#a7f3d0" />
                <Text className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider">
                  Live Food Map
                </Text>
              </View>
              <Text className="text-base font-black text-white">Find Nearby Karenderias on Map</Text>
              <Text className="text-xs text-emerald-100 mt-0.5">
                View your GPS location & distances in Mati City →
              </Text>
            </View>
            <View className="w-11 h-11 rounded-xl bg-white/20 items-center justify-center">
              <Ionicons name="map" size={22} color="white" />
            </View>
          </Pressable>

          {/* STATISTICAL ML RECOMMENDATIONS + MOST VISITED STORE BANNER */}
          <View className="mt-5">
            <View className="px-5 flex-row justify-between items-center mb-2.5">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-base font-black text-gray-900">🧠 Recommended For You</Text>
                <View className="bg-emerald-100 px-1.5 py-0.5 rounded">
                  <Text className="text-[9px] font-bold text-emerald-800">ML Personalization</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowScanQrModal(true)}
                className="flex-row items-center gap-1"
              >
                <Ionicons name="qr-code" size={12} color="#047857" />
                <Text className="text-[11px] text-emerald-800 font-bold">Scan Stand</Text>
              </Pressable>
            </View>

            {/* If user has checked in to stores, display their #1 Most Visited spot! */}
            {mostVisitedStore && (
              <View className="mx-5 mb-3.5 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex-row items-center justify-between shadow-xs">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-1.5 mb-0.5">
                    <Ionicons name="trophy" size={14} color="#d97706" />
                    <Text className="text-[11px] font-black text-amber-900 uppercase">
                      #1 Most Visited by You ({mostVisitedStore.visits} in-store scans)
                    </Text>
                  </View>
                  <Text className="text-sm font-black text-gray-900">
                    {mostVisitedStore.name}
                  </Text>
                  <Text className="text-[11px] text-gray-600 mt-0.5">
                    Your frequent in-store visits have personalized this spot to the top of your feed.
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleOpenRestaurant(mostVisitedStore.name)}
                  className="bg-amber-600 px-3 py-1.5 rounded-xl"
                >
                  <Text className="text-white font-bold text-xs">View Menu</Text>
                </Pressable>
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {/* Dynamic Card 1: Derived from user's most visited place */}
              {mostVisitedStore && (
                <View className="w-64 mr-3 bg-white border-2 border-emerald-600 p-3.5 rounded-2xl shadow-xs justify-between">
                  <View>
                    <View className="flex-row justify-between items-start mb-1.5">
                      <View className="bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] font-black text-emerald-800">
                          🔥 99% Match • Most Visited
                        </Text>
                      </View>
                      <Text className="text-2xl">🍲</Text>
                    </View>

                    <Text className="text-sm font-extrabold text-gray-900">Classic Pork Humba</Text>
                    <Pressable onPress={() => handleOpenRestaurant(mostVisitedStore.name)}>
                      <Text className="text-xs text-emerald-700 font-bold mb-1.5">
                        {mostVisitedStore.name} →
                      </Text>
                    </Pressable>

                    <Text className="text-[11px] text-gray-500 italic leading-snug mb-3">
                      "Personalized from your {mostVisitedStore.visits} in-store QR stand check-ins"
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
                    <Text className="text-base font-black text-gray-900">₱90.00</Text>
                    <Pressable
                      onPress={() =>
                        handleOpenCheckout({
                          name: "Classic Pork Humba",
                          store: mostVisitedStore.name,
                          price: 90,
                          available: true,
                        })
                      }
                      className="bg-emerald-700 px-3 py-1.5 rounded-lg flex-row items-center gap-1"
                    >
                      <Ionicons name="cart-outline" size={13} color="white" />
                      <Text className="text-white text-xs font-bold">Order COD</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Static Seed Recommendations */}
              <View className="w-64 mr-3 bg-white border border-gray-200 p-3.5 rounded-2xl shadow-xs justify-between">
                <View>
                  <View className="flex-row justify-between items-start mb-1.5">
                    <View className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-black text-orange-700">98% Match</Text>
                    </View>
                    <Text className="text-2xl">🐟</Text>
                  </View>

                  <Text className="text-sm font-extrabold text-gray-900">Tuna Panga Grill</Text>
                  <Pressable onPress={() => handleOpenRestaurant("Mati Baywalk Seafood Grill")}>
                    <Text className="text-xs text-emerald-700 font-bold mb-1.5">
                      Mati Baywalk Seafood Grill →
                    </Text>
                  </Pressable>

                  <Text className="text-[11px] text-gray-500 italic leading-snug mb-3">
                    "Based on frequent seafood orders near Pujada Bay"
                  </Text>
                </View>

                <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
                  <Text className="text-base font-black text-gray-900">₱280.00</Text>
                  <Pressable
                    onPress={() =>
                      handleOpenCheckout({
                        name: "Tuna Panga Grill",
                        store: "Mati Baywalk Seafood Grill",
                        price: 280,
                        available: true,
                      })
                    }
                    className="bg-emerald-700 px-3 py-1.5 rounded-lg flex-row items-center gap-1"
                  >
                    <Ionicons name="cart-outline" size={13} color="white" />
                    <Text className="text-white text-xs font-bold">Order COD</Text>
                  </Pressable>
                </View>
              </View>

              <View className="w-64 mr-3 bg-white border border-gray-200 p-3.5 rounded-2xl shadow-xs justify-between">
                <View>
                  <View className="flex-row justify-between items-start mb-1.5">
                    <View className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-black text-orange-700">92% Match</Text>
                    </View>
                    <Text className="text-2xl">🍢</Text>
                  </View>

                  <Text className="text-sm font-extrabold text-gray-900">Pork BBQ Skewers (3pcs)</Text>
                  <Pressable onPress={() => handleOpenRestaurant("Subangan Street Grills")}>
                    <Text className="text-xs text-emerald-700 font-bold mb-1.5">
                      Subangan Street Grills →
                    </Text>
                  </Pressable>

                  <Text className="text-[11px] text-gray-500 italic leading-snug mb-3">
                    "Trending evening street food in Mati City"
                  </Text>
                </View>

                <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
                  <Text className="text-base font-black text-gray-900">₱75.00</Text>
                  <Pressable
                    onPress={() =>
                      handleOpenCheckout({
                        name: "Pork BBQ Skewers (3pcs)",
                        store: "Subangan Street Grills",
                        price: 75,
                        available: true,
                      })
                    }
                    className="bg-emerald-700 px-3 py-1.5 rounded-lg flex-row items-center gap-1"
                  >
                    <Ionicons name="cart-outline" size={13} color="white" />
                    <Text className="text-white text-xs font-bold">Order COD</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>

          {/* Food Menu Items */}
          <View className="px-5 mt-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-lg font-black text-gray-900">Today's Live Menus</Text>
              <Text className="text-xs font-bold text-emerald-700">
                {filteredItems.length} dishes
              </Text>
            </View>

            <View className="gap-3.5">
              {filteredItems.map((dish) => (
                <View
                  key={dish.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-base font-extrabold text-gray-900">{dish.name}</Text>
                        <View
                          className={`px-2 py-0.5 rounded-md ${
                            dish.available ? "bg-emerald-100" : "bg-gray-100"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              dish.available ? "text-emerald-800" : "text-gray-500"
                            }`}
                          >
                            {dish.available ? "Available Now" : "Sold Out"}
                          </Text>
                        </View>
                      </View>

                      {/* Clickable Store Name opens Restaurant Profile */}
                      <Pressable
                        onPress={() => handleOpenRestaurant(dish.store)}
                        className="flex-row items-center gap-1 mb-2"
                      >
                        <Text className="text-xs text-gray-600 font-bold">{dish.store}</Text>
                        <Ionicons name="information-circle-outline" size={13} color="#047857" />
                      </Pressable>

                      <View className="flex-row items-center gap-3">
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="star" size={13} color="#f59e0b" />
                          <Text className="text-xs font-bold text-gray-700">{dish.rating}</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="time-outline" size={13} color="#6b7280" />
                          <Text className="text-xs text-gray-500">{dish.deliveryTime}</Text>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="cash-outline" size={13} color="#047857" />
                          <Text className="text-xs font-bold text-emerald-800">COD Available</Text>
                        </View>
                      </View>
                    </View>

                    <View className="items-end justify-between">
                      <Text className="text-lg font-black text-gray-900 mb-3">₱{dish.price}.00</Text>
                      <Pressable
                        disabled={!dish.available}
                        onPress={() => handleOpenCheckout(dish)}
                        className={`px-3 py-1.5 rounded-lg ${
                          dish.available ? "bg-orange-500" : "bg-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            dish.available ? "text-white" : "text-gray-400"
                          }`}
                        >
                          {dish.available
                            ? isLoggedIn
                              ? "Order COD"
                              : "Sign In to Order"
                            : "Unavailable"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* VIEW MODE 2: FOODIE COMMUNITY (SOCIAL MEDIA FOOD FEED) */}
      {feedMode === "community" && (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 36 }}>
          {/* Create Post Header Card */}
          <View className="mx-5 mt-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
            <View className="flex-row items-center gap-3 mb-3">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  isLoggedIn ? "bg-emerald-700" : "bg-gray-400"
                }`}
              >
                <Text className="text-white font-extrabold text-sm">
                  {isLoggedIn ? (user?.name || "J")[0].toUpperCase() : "G"}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (verifyRegisteredUser("post reviews to the foodie community")) {
                    setShowCreateModal(true);
                  }
                }}
                className="flex-1 bg-gray-100 px-4 py-2.5 rounded-xl justify-center"
              >
                <Text className="text-xs text-gray-500 font-medium">
                  {isLoggedIn
                    ? `What are you eating in Mati City, ${user?.name?.split(" ")[0]}?`
                    : "Sign in to share your food reviews & photos..."}
                </Text>
              </Pressable>
            </View>

            <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
              <View className="flex-row items-center gap-2">
                <Ionicons name="pricetag" size={14} color="#047857" />
                <Text className="text-[11px] font-bold text-gray-600">
                  Tag Mati restaurants & dishes
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  if (verifyRegisteredUser("post reviews to the foodie community")) {
                    setShowCreateModal(true);
                  }
                }}
                className="bg-emerald-700 px-3.5 py-1.5 rounded-lg flex-row items-center gap-1"
              >
                <Ionicons name="create-outline" size={14} color="white" />
                <Text className="text-white font-bold text-xs">Write Review</Text>
              </Pressable>
            </View>
          </View>

          {/* Community Feed Notice */}
          <View className="mx-5 mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="flame" size={16} color="#ea580c" />
              <Text className="text-xs font-black text-gray-800 tracking-wide uppercase">
                Trending in Mati City
              </Text>
            </View>
            <Text className="text-xs text-gray-500 font-semibold">
              {socialPosts.length} reviews
            </Text>
          </View>

          {/* Posts List */}
          <View className="px-5 mt-3 gap-4">
            {socialPosts.map((post) => (
              <View
                key={post.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs"
              >
                {/* Author Header */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2.5">
                    <View
                      className={`w-9 h-9 rounded-full items-center justify-center ${post.avatarBg}`}
                    >
                      <Text className="text-white font-black text-xs">{post.authorInitial}</Text>
                    </View>
                    <View>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-extrabold text-gray-900">{post.author}</Text>
                        {post.roleBadge ? (
                          <View className="bg-emerald-100 px-1.5 py-0.5 rounded">
                            <Text className="text-[9px] font-bold text-emerald-800">
                              {post.roleBadge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-[11px] text-gray-400 font-medium">
                        {post.timestamp}
                      </Text>
                    </View>
                  </View>

                  {/* Rating Stars (if rated) */}
                  {post.rating ? (
                    <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                      <Ionicons name="star" size={12} color="#f59e0b" />
                      <Text className="text-xs font-black text-amber-900 ml-1">
                        {post.rating}.0
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Tagged Restaurant / Dish Badge */}
                {post.taggedRestaurant ? (
                  <Pressable
                    onPress={() => handleOpenRestaurant(post.taggedRestaurant!)}
                    className="mb-2.5 flex-row items-center"
                  >
                    <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex-row items-center gap-1.5">
                      <Ionicons name="storefront" size={13} color="#047857" />
                      <Text className="text-xs font-extrabold text-emerald-900">
                        {post.taggedRestaurant}
                      </Text>
                      {post.taggedDish ? (
                        <>
                          <Text className="text-emerald-400 font-bold">•</Text>
                          <Text className="text-xs font-semibold text-emerald-800">
                            {post.taggedDish}
                          </Text>
                        </>
                      ) : null}
                      <Ionicons name="chevron-forward" size={11} color="#047857" />
                    </View>
                  </Pressable>
                ) : null}

                {/* Post Text Content */}
                <Text className="text-sm text-gray-800 leading-relaxed mb-3">{post.content}</Text>

                {/* Visual Food Card / Photo Placeholder */}
                {post.photoEmoji ? (
                  <View
                    className={`h-40 rounded-xl ${post.photoBg || "bg-emerald-900"} mb-3 items-center justify-center p-4 relative overflow-hidden`}
                  >
                    <View className="absolute inset-0 bg-black/20" />
                    <Text className="text-5xl mb-2">{post.photoEmoji}</Text>
                    <Text className="text-white text-xs font-bold text-center px-4">
                      {post.photoCaption || "Local Mati Delicacy"}
                    </Text>
                    <View className="absolute top-2.5 right-2.5 bg-black/40 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                      <Ionicons name="camera" size={11} color="white" />
                      <Text className="text-[10px] text-white font-medium">Photo</Text>
                    </View>
                  </View>
                ) : null}

                {/* Engagement Counters & Action Buttons */}
                <View className="flex-row items-center justify-between pt-2.5 border-t border-gray-100">
                  <View className="flex-row items-center gap-5">
                    {/* Like Reaction */}
                    <Pressable
                      onPress={() => handleToggleLike(post.id)}
                      className="flex-row items-center gap-1.5 py-1"
                    >
                      <Ionicons
                        name={post.hasLiked ? "heart" : "heart-outline"}
                        size={18}
                        color={post.hasLiked ? "#ef4444" : "#4b5563"}
                      />
                      <Text
                        className={`text-xs font-bold ${
                          post.hasLiked ? "text-red-600" : "text-gray-700"
                        }`}
                      >
                        {post.likes}
                      </Text>
                    </Pressable>

                    {/* Comments Button */}
                    <Pressable
                      onPress={() => handleOpenComments(post)}
                      className="flex-row items-center gap-1.5 py-1"
                    >
                      <Ionicons name="chatbubble-outline" size={16} color="#4b5563" />
                      <Text className="text-xs font-bold text-gray-700">
                        {post.comments.length}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Share button */}
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        "Shared!",
                        `Link to review by ${post.author} copied to clipboard.`
                      );
                    }}
                    className="flex-row items-center gap-1 py-1"
                  >
                    <Ionicons name="share-social-outline" size={16} color="#6b7280" />
                    <Text className="text-xs font-medium text-gray-500">Share</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* MODAL: CUSTOMER STORE QR SCANNER */}
      <Modal visible={showScanQrModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/70">
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-lg font-black text-gray-900">Scan Store Stand QR</Text>
                <Text className="text-xs text-gray-500 font-medium">
                  Check in to earn visit points & personalize your feed
                </Text>
              </View>
              <Pressable
                onPress={() => setShowScanQrModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              {/* Simulated Camera Viewfinder */}
              <View className="h-52 bg-gray-900 rounded-2xl items-center justify-center relative overflow-hidden mb-4">
                <View className="w-36 h-36 border-2 border-emerald-400 rounded-2xl items-center justify-center">
                  <Ionicons name="scan-outline" size={48} color="#34d399" />
                </View>
                <Text className="text-white text-xs font-bold mt-2">Point camera at counter stand QR</Text>
              </View>

              <Text className="text-xs font-bold text-gray-700 mb-2">
                Simulate In-Store Stand Check-In:
              </Text>

              {/* Quick check-in buttons for Mati establishments */}
              <View className="gap-2.5 mb-6">
                <Pressable
                  onPress={() => handlePerformCheckIn("Mama Letty's Karenderia")}
                  className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2.5">
                    <Text className="text-xl">🍲</Text>
                    <View>
                      <Text className="text-xs font-black text-gray-900">Mama Letty's Karenderia</Text>
                      <Text className="text-[10px] text-emerald-800">Counter Stand #MFF-ST-101</Text>
                    </View>
                  </View>
                  <Text className="text-xs font-bold text-emerald-700">Check In →</Text>
                </Pressable>

                <Pressable
                  onPress={() => handlePerformCheckIn("Mati Baywalk Seafood Grill")}
                  className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2.5">
                    <Text className="text-xl">🐟</Text>
                    <View>
                      <Text className="text-xs font-black text-gray-900">Mati Baywalk Seafood Grill</Text>
                      <Text className="text-[10px] text-gray-500">Table Stand #MFF-ST-102</Text>
                    </View>
                  </View>
                  <Text className="text-xs font-bold text-gray-700">Check In →</Text>
                </Pressable>

                <Pressable
                  onPress={() => handlePerformCheckIn("Subangan Street Grills")}
                  className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-2.5">
                    <Text className="text-xl">🍢</Text>
                    <View>
                      <Text className="text-xs font-black text-gray-900">Subangan Street Grills</Text>
                      <Text className="text-[10px] text-gray-500">Stand #MFF-ST-103</Text>
                    </View>
                  </View>
                  <Text className="text-xs font-bold text-gray-700">Check In →</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* FEATURE 1: NOTIFICATIONS MODAL SHEET */}
      <Modal visible={showNotificationsModal} transparent={true} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-lg font-black text-gray-900">Notifications</Text>
                <Text className="text-xs text-gray-500 font-medium">
                  {unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                {unreadCount > 0 && (
                  <Pressable
                    onPress={markAllNotificationsRead}
                    className="bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                  >
                    <Text className="text-[11px] font-bold text-emerald-800">Mark all read</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setShowNotificationsModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="#4b5563" />
                </Pressable>
              </View>
            </View>

            {/* Filter Pills */}
            <View className="flex-row gap-2 my-3">
              {(["all", "order", "reservation", "community"] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setSelectedNotifFilter(tab)}
                  className={`px-3 py-1.5 rounded-full border ${
                    selectedNotifFilter === tab
                      ? "bg-emerald-700 border-emerald-700"
                      : "bg-gray-100 border-gray-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold capitalize ${
                      selectedNotifFilter === tab ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Notifications List */}
            <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
              {filteredNotifications.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <Ionicons name="notifications-off-outline" size={36} color="#9ca3af" />
                  <Text className="text-xs text-gray-400 font-medium mt-2">
                    No notifications in this category
                  </Text>
                </View>
              ) : (
                filteredNotifications.map((notif) => (
                  <Pressable
                    key={notif.id}
                    onPress={() => {
                      setShowNotificationsModal(false);
                      if (notif.type === "order" || notif.type === "reservation") {
                        router.push("/(mobile)/(tabs)/orders");
                      } else if (notif.type === "community") {
                        setFeedMode("community");
                      }
                    }}
                    className={`p-3.5 mb-2.5 rounded-2xl border ${
                      notif.isRead
                        ? "bg-white border-gray-200"
                        : "bg-emerald-50/60 border-emerald-300"
                    }`}
                  >
                    <View className="flex-row items-start justify-between mb-1">
                      <Text className="text-xs font-extrabold text-gray-900 flex-1 pr-2">
                        {notif.title}
                      </Text>
                      <Text className="text-[10px] text-gray-400 font-medium">
                        {notif.timestamp}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-600 leading-snug">{notif.message}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* FEATURE 3: CART & COD CHECKOUT BOTTOM SHEET */}
      <Modal visible={showCheckoutModal} transparent={true} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="bg-white rounded-t-3xl p-5 max-h-[92%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-lg font-black text-gray-900">Cash on Delivery Checkout</Text>
                <Text className="text-xs text-emerald-800 font-bold">
                  {checkoutDish?.store}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowCheckoutModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
              {/* Selected Dish Item & Quantity Stepper */}
              <View className="bg-gray-50 border border-gray-200 p-4 rounded-2xl mb-4">
                <View className="flex-row justify-between items-center">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-black text-gray-900">
                      {checkoutDish?.name}
                    </Text>
                    <Text className="text-xs font-bold text-gray-500">
                      ₱{checkoutDish?.price}.00 each
                    </Text>
                  </View>

                  {/* Quantity Stepper */}
                  <View className="flex-row items-center bg-white border border-gray-200 rounded-xl p-1 gap-3">
                    <Pressable
                      onPress={() => setCheckoutQty(Math.max(1, checkoutQty - 1))}
                      className="w-7 h-7 rounded-lg bg-gray-100 items-center justify-center"
                    >
                      <Ionicons name="remove" size={16} color="#374151" />
                    </Pressable>
                    <Text className="text-sm font-black text-gray-900 min-w-[16px] text-center">
                      {checkoutQty}
                    </Text>
                    <Pressable
                      onPress={() => setCheckoutQty(checkoutQty + 1)}
                      className="w-7 h-7 rounded-lg bg-emerald-700 items-center justify-center"
                    >
                      <Ionicons name="add" size={16} color="white" />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Delivery Barangay Selector */}
              <Text className="text-xs font-bold text-gray-700 mb-1.5">
                Delivery Barangay (Mati City) *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ paddingRight: 10 }}
              >
                {matiBarangays.map((brgy) => {
                  const isSelected = checkoutBarangay === brgy;
                  return (
                    <Pressable
                      key={brgy}
                      onPress={() => setCheckoutBarangay(brgy)}
                      className={`mr-2 px-3.5 py-2 rounded-xl border ${
                        isSelected
                          ? "bg-emerald-700 border-emerald-700"
                          : "bg-gray-100 border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {brgy}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Delivery Address / Landmark */}
              <Text className="text-xs font-bold text-gray-700 mb-1">
                Street / House / Landmark *
              </Text>
              <TextInput
                placeholder="e.g. Near Baywalk Pavilion, blue gate, Purok 3"
                value={checkoutAddress}
                onChangeText={setCheckoutAddress}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4"
                placeholderTextColor="#9ca3af"
              />

              {/* Special Notes */}
              <Text className="text-xs font-bold text-gray-700 mb-1">
                Special Kitchen / Rider Instructions (Optional)
              </Text>
              <TextInput
                placeholder="e.g. Extra calamansi & chili, call upon arrival"
                value={checkoutNotes}
                onChangeText={setCheckoutNotes}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-5"
                placeholderTextColor="#9ca3af"
              />

              {/* Cost Summary Breakdown */}
              <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl mb-5">
                <Text className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider mb-2">
                  Payment Summary (Cash on Delivery)
                </Text>
                <View className="flex-row justify-between mb-1">
                  <Text className="text-xs text-gray-600">
                    Items ({checkoutQty}x {checkoutDish?.name})
                  </Text>
                  <Text className="text-xs font-bold text-gray-800">
                    ₱{(checkoutDish?.price || 0) * checkoutQty}.00
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-xs text-gray-600">Local Mati Rider Delivery</Text>
                  <Text className="text-xs font-bold text-gray-800">₱35.00</Text>
                </View>
                <View className="flex-row justify-between pt-2 border-t border-emerald-200 items-center">
                  <Text className="text-sm font-black text-emerald-950">Total COD to Pay</Text>
                  <Text className="text-lg font-black text-emerald-900">
                    ₱{(checkoutDish?.price || 0) * checkoutQty + 35}.00
                  </Text>
                </View>
              </View>

              {/* Confirm Order Button */}
              <Pressable
                onPress={handleConfirmOrder}
                className="bg-orange-500 py-3.5 rounded-xl items-center mb-6 shadow-sm"
              >
                <Text className="text-white font-extrabold text-sm">
                  Confirm Cash-on-Delivery Order
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* FEATURE 4: RESTAURANT PROFILE MODAL */}
      <Modal visible={showRestaurantModal} transparent={true} animationType="slide">
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-white rounded-t-3xl p-5 max-h-[90%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <Text className="text-3xl">{activeRestaurant?.emoji}</Text>
                <View>
                  <Text className="text-lg font-black text-gray-900">
                    {activeRestaurant?.name}
                  </Text>
                  <Text className="text-xs text-emerald-700 font-bold">
                    {activeRestaurant?.category}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setShowRestaurantModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
              <Text className="text-xs text-gray-600 leading-relaxed mb-4">
                {activeRestaurant?.description}
              </Text>

              {/* Info Badges */}
              <View className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 gap-2.5 mb-5">
                <View className="flex-row items-center gap-2">
                  <Ionicons name="star" size={15} color="#f59e0b" />
                  <Text className="text-xs font-bold text-gray-800">
                    Rating: {activeRestaurant?.rating} / 5.0 (Mati FoodFinder verified)
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="location-outline" size={15} color="#047857" />
                  <Text className="text-xs text-gray-700 font-medium">
                    {activeRestaurant?.address}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="time-outline" size={15} color="#6b7280" />
                  <Text className="text-xs text-gray-700 font-medium">
                    Hours: {activeRestaurant?.hours}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="call-outline" size={15} color="#2563eb" />
                  <Text className="text-xs text-gray-700 font-medium">
                    {activeRestaurant?.phone}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2 pt-1 border-t border-gray-200">
                  <Ionicons name="restaurant-outline" size={15} color="#047857" />
                  <Text className="text-xs font-extrabold text-emerald-800">
                    {activeRestaurant?.availableTables} Tables Available for Dining Reservation
                  </Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View className="gap-2.5 mb-6">
                <Pressable
                  onPress={() => handleOpenReservation(activeRestaurant?.name)}
                  className="bg-emerald-700 py-3.5 rounded-xl flex-row items-center justify-center gap-2 shadow-xs"
                >
                  <Ionicons name="calendar-outline" size={18} color="white" />
                  <Text className="text-white font-extrabold text-sm">
                    Book a Dining Table Here
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setShowRestaurantModal(false);
                    router.push("/(mobile)/(tabs)/map");
                  }}
                  className="bg-gray-100 py-3 rounded-xl flex-row items-center justify-center gap-2"
                >
                  <Ionicons name="navigate-outline" size={16} color="#374151" />
                  <Text className="text-gray-800 font-bold text-xs">View Location on Map</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* FEATURE 2: TABLE RESERVATION MODAL SHEET */}
      <Modal visible={showReservationModal} transparent={true} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="bg-white rounded-t-3xl p-5 max-h-[92%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-lg font-black text-gray-900">Book Dining Table</Text>
                <Text className="text-xs text-emerald-800 font-bold">{reservationResto}</Text>
              </View>
              <Pressable
                onPress={() => setShowReservationModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
              <Text className="text-xs font-bold text-gray-700 mb-1.5">Restaurant *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ paddingRight: 10 }}
              >
                {Object.keys(matiRestaurantsData).map((resto) => {
                  const isSelected = reservationResto === resto;
                  return (
                    <Pressable
                      key={resto}
                      onPress={() => setReservationResto(resto)}
                      className={`mr-2 px-3.5 py-2 rounded-xl border ${
                        isSelected
                          ? "bg-emerald-700 border-emerald-700"
                          : "bg-gray-100 border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {resto}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text className="text-xs font-bold text-gray-700 mb-1.5">Date *</Text>
              <View className="flex-row gap-2 mb-4">
                {["Tonight", "Tomorrow", "This Weekend"].map((d) => (
                  <Pressable
                    key={d}
                    onPress={() => setReservationDate(d)}
                    className={`flex-1 py-2 rounded-xl border items-center ${
                      reservationDate === d
                        ? "bg-emerald-700 border-emerald-700"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        reservationDate === d ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {d}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-xs font-bold text-gray-700 mb-1.5">Time Slot *</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {["11:30 AM", "12:30 PM", "6:00 PM", "7:30 PM", "8:30 PM"].map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setReservationTime(t)}
                    className={`px-3 py-2 rounded-xl border ${
                      reservationTime === t
                        ? "bg-emerald-700 border-emerald-700"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        reservationTime === t ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-xs font-bold text-gray-700 mb-1.5">Party Size *</Text>
              <View className="flex-row gap-2 mb-4">
                {[1, 2, 4, 6, 8].map((size) => (
                  <Pressable
                    key={size}
                    onPress={() => setReservationPartySize(size)}
                    className={`flex-1 py-2 rounded-xl border items-center ${
                      reservationPartySize === size
                        ? "bg-emerald-700 border-emerald-700"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        reservationPartySize === size ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {size} {size === 1 ? "Guest" : "Guests"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="text-xs font-bold text-gray-700 mb-1">
                Special Requests / Seating Preference
              </Text>
              <TextInput
                placeholder="e.g. Bayside outdoor seating, baby chair needed, birthday"
                value={reservationNotes}
                onChangeText={setReservationNotes}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-5"
                placeholderTextColor="#9ca3af"
              />

              <Pressable
                onPress={handleSubmitReservation}
                className="bg-emerald-700 py-3.5 rounded-xl items-center mb-6 shadow-sm"
              >
                <Text className="text-white font-extrabold text-sm">
                  Send Table Booking Request
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CREATE POST MODAL (REGISTERED USERS) */}
      <Modal visible={showCreateModal} transparent={true} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="bg-white rounded-t-3xl p-5 max-h-[90%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-lg font-black text-gray-900">Share Food Review</Text>
                <Text className="text-xs text-gray-500 font-medium">
                  Posting as {user?.name || "Juan dela Cruz"}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
              <Text className="text-xs font-bold text-gray-700 mb-1">Your Food Experience *</Text>
              <TextInput
                multiline
                numberOfLines={4}
                placeholder="What did you eat? How was the taste, price, and vibe in Mati City?"
                value={newPostText}
                onChangeText={setNewPostText}
                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 min-h-[90px] mb-4"
                placeholderTextColor="#9ca3af"
                textAlignVertical="top"
              />

              <Text className="text-xs font-bold text-gray-700 mb-1.5">
                Tag a Mati Restaurant / Karenderia (Optional)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ paddingRight: 10 }}
              >
                {["None", ...Object.keys(matiRestaurantsData)].map((resto) => {
                  const isSelected = newPostRestaurant === resto;
                  return (
                    <Pressable
                      key={resto}
                      onPress={() => setNewPostRestaurant(resto)}
                      className={`mr-2 px-3 py-2 rounded-xl border ${
                        isSelected
                          ? "bg-emerald-700 border-emerald-700"
                          : "bg-gray-100 border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {resto}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {newPostRestaurant !== "None" && (
                <>
                  <Text className="text-xs font-bold text-gray-700 mb-1">
                    Specific Dish Name (Optional)
                  </Text>
                  <TextInput
                    placeholder="e.g. Grilled Tuna Belly, Sinigang, Pork BBQ..."
                    value={newPostDish}
                    onChangeText={setNewPostDish}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4"
                    placeholderTextColor="#9ca3af"
                  />

                  <Text className="text-xs font-bold text-gray-700 mb-1.5">Food Rating</Text>
                  <View className="flex-row items-center gap-3 mb-5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => setNewPostRating(star)}
                        className="p-1.5"
                      >
                        <Ionicons
                          name={newPostRating >= star ? "star" : "star-outline"}
                          size={28}
                          color={newPostRating >= star ? "#f59e0b" : "#d1d5db"}
                        />
                      </Pressable>
                    ))}
                    <Text className="text-sm font-black text-amber-900 ml-1">
                      {newPostRating}.0 / 5.0
                    </Text>
                  </View>
                </>
              )}

              <Pressable
                onPress={handleCreatePost}
                className="bg-emerald-700 py-3.5 rounded-xl items-center mb-6 shadow-sm"
              >
                <Text className="text-white font-extrabold text-sm">
                  Publish to Foodie Community
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* COMMENTS MODAL SHEET */}
      <Modal visible={showCommentsModal} transparent={true} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-end bg-black/60"
        >
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-base font-black text-gray-900">Comments</Text>
                <Text className="text-xs text-gray-500 font-medium">
                  Review by {activePostForComments?.author}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowCommentsModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#4b5563" />
              </Pressable>
            </View>

            <ScrollView className="my-3 max-h-72" showsVerticalScrollIndicator={false}>
              {activePostForComments?.comments.length === 0 ? (
                <View className="py-8 items-center justify-center">
                  <Ionicons name="chatbubble-ellipses-outline" size={32} color="#9ca3af" />
                  <Text className="text-xs text-gray-400 font-medium mt-2">
                    No comments yet. Be the first to share your thoughts!
                  </Text>
                </View>
              ) : (
                activePostForComments?.comments.map((comment) => (
                  <View
                    key={comment.id}
                    className="flex-row gap-2.5 mb-3.5 bg-gray-50 p-3 rounded-xl border border-gray-100"
                  >
                    <View
                      className={`w-7 h-7 rounded-full items-center justify-center ${comment.avatarColor}`}
                    >
                      <Text className="text-white font-bold text-[10px]">
                        {comment.author[0].toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-0.5">
                        <Text className="text-xs font-extrabold text-gray-900">
                          {comment.author}
                        </Text>
                        <Text className="text-[10px] text-gray-400 font-medium">
                          {comment.timestamp}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-700 leading-snug">{comment.text}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            {isLoggedIn ? (
              <View className="flex-row items-center gap-2 pt-2 border-t border-gray-100">
                <TextInput
                  placeholder={`Comment as ${user?.name?.split(" ")[0]}...`}
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                  className="flex-1 bg-gray-100 px-3.5 py-2.5 rounded-xl text-xs text-gray-900"
                  placeholderTextColor="#9ca3af"
                />
                <Pressable
                  onPress={handleAddComment}
                  disabled={!newCommentText.trim()}
                  className={`px-4 py-2.5 rounded-xl ${
                    newCommentText.trim() ? "bg-emerald-700" : "bg-gray-200"
                  }`}
                >
                  <Ionicons
                    name="send"
                    size={15}
                    color={newCommentText.trim() ? "white" : "#9ca3af"}
                  />
                </Pressable>
              </View>
            ) : (
              <View className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-bold text-orange-900">Sign in to comment</Text>
                  <Text className="text-[11px] text-orange-800 leading-tight">
                    Guests can read comments. Log in to reply.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setShowCommentsModal(false);
                    router.push("/(mobile)/(tabs)/profile");
                  }}
                  className="bg-orange-500 px-3 py-1.5 rounded-lg"
                >
                  <Text className="text-white font-bold text-xs">Sign In</Text>
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* GUEST INTERACTION GATE MODAL */}
      <Modal visible={showGuestGateModal} transparent={true} animationType="fade">
        <View className="flex-1 items-center justify-center bg-black/60 px-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <View className="w-12 h-12 rounded-2xl bg-orange-100 items-center justify-center mb-3">
              <Ionicons name="lock-closed" size={24} color="#ea580c" />
            </View>

            <Text className="text-lg font-black text-gray-900 mb-1">Sign In Required</Text>
            <Text className="text-xs text-gray-600 leading-relaxed mb-5">
              To {guestGateAction}, you need to be signed in as a registered user on Mati
              FoodFinder.
            </Text>

            <Pressable
              onPress={() => {
                loginAsRegistered("Juan dela Cruz", "juan.mati@example.com");
                setShowGuestGateModal(false);
                Alert.alert(
                  "Welcome, Juan!",
                  "You are now logged in as a registered user. You can now post, order COD, and scan store stand QR codes!"
                );
              }}
              className="bg-emerald-700 py-3 rounded-xl items-center mb-2.5 shadow-xs"
            >
              <Text className="text-white font-bold text-xs">Sign In as Registered User</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowGuestGateModal(false);
                router.push("/(mobile)/(tabs)/profile");
              }}
              className="bg-gray-100 py-3 rounded-xl items-center mb-2.5"
            >
              <Text className="text-gray-800 font-bold text-xs">Go to Account Settings</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowGuestGateModal(false)}
              className="py-2 items-center"
            >
              <Text className="text-gray-400 font-medium text-xs">
                Continue Browsing as Guest
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
