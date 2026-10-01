import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { SocialPost } from "../../../types/post";
import { SEED_SOCIAL_POSTS } from "../../../mock/posts";
import { MATI_RESTAURANTS_DATA } from "../../../mock/restaurants";
import { fetchLiveStores } from "../../../services/catalog";
import { BottomSheetModal } from "../../../components/ui/BottomSheetModal";
import { GuestGateModal } from "../../../components/auth/GuestGateModal";

export default function MobileCommunityScreen() {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();

  // Social Posts State
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>(SEED_SOCIAL_POSTS);
  const [availableStores, setAvailableStores] = useState<string[]>(
    Object.keys(MATI_RESTAURANTS_DATA)
  );

  React.useEffect(() => {
    fetchLiveStores()
      .then((stores) => {
        if (stores.length > 0) {
          const storeNames = Array.from(
            new Set([...stores.map((s) => s.name), ...Object.keys(MATI_RESTAURANTS_DATA)])
          );
          setAvailableStores(storeNames);
        }
      })
      .catch(() => {});
  }, []);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState<SocialPost | null>(null);
  const [showGuestGateModal, setShowGuestGateModal] = useState(false);
  const [guestGateAction, setGuestGateAction] = useState<string>(
    "post reviews to the foodie community"
  );

  // New Post Form State
  const [newPostText, setNewPostText] = useState("");
  const [newPostRestaurant, setNewPostRestaurant] = useState<string>("None");
  const [newPostDish, setNewPostDish] = useState("");
  const [newPostRating, setNewPostRating] = useState<number>(5);

  // New Comment Form State
  const [newCommentText, setNewCommentText] = useState("");

  // Handle Guest Gate Check
  const verifyRegisteredUser = (actionDescription: string): boolean => {
    if (!isLoggedIn) {
      setGuestGateAction(actionDescription);
      setShowGuestGateModal(true);
      return false;
    }
    return true;
  };

  // Toggle Like on Post
  const handleToggleLike = (postId: string) => {
    if (!verifyRegisteredUser("like posts in the foodie community")) return;

    setSocialPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const newHasLiked = !post.hasLiked;
          return {
            ...post,
            hasLiked: newHasLiked,
            likes: newHasLiked ? post.likes + 1 : post.likes - 1,
          };
        }
        return post;
      })
    );
  };

  // Open Comments
  const handleOpenComments = (post: SocialPost) => {
    setActivePostForComments(post);
    setShowCommentsModal(true);
  };

  // Add Comment
  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    if (!activePostForComments) return;

    const newComment = {
      id: `c-${Date.now()}`,
      author: user?.name || "Juan dela Cruz",
      avatarColor: "bg-[#EA5410]",
      text: newCommentText.trim(),
      timestamp: "Just now",
    };

    const updatedComments = [...activePostForComments.comments, newComment];
    const updatedPost = { ...activePostForComments, comments: updatedComments };

    setActivePostForComments(updatedPost);
    setSocialPosts((prev) =>
      prev.map((p) => (p.id === activePostForComments.id ? updatedPost : p))
    );
    setNewCommentText("");
  };

  // Create Post
  const handleCreatePost = (handleDismiss: () => void) => {
    if (!newPostText.trim()) {
      Alert.alert("Missing Content", "Please share something about your food trip in Mati City.");
      return;
    }

    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      author: user?.name || "Foodie Explorer",
      authorInitial: (user?.name || "F")[0].toUpperCase(),
      avatarBg: "bg-[#EA5410]",
      roleBadge: "Verified Foodie",
      timestamp: "Just now",
      content: newPostText.trim(),
      rating: newPostRestaurant !== "None" ? newPostRating : undefined,
      taggedRestaurant: newPostRestaurant !== "None" ? newPostRestaurant : undefined,
      taggedDish: newPostDish.trim() ? newPostDish.trim() : undefined,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
      photoCaption: `Delicious meal at ${newPostRestaurant !== "None" ? newPostRestaurant : "Mati City"}`,
      likes: 0,
      hasLiked: false,
      comments: [],
    };

    setSocialPosts([newPost, ...socialPosts]);
    handleDismiss();
    setNewPostText("");
    setNewPostRestaurant("None");
    setNewPostDish("");
    setNewPostRating(5);
    Alert.alert("Review Published! 🎉", "Your food review is now live in the Mati Foodie Community.");
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      {/* 1. TOP APP BAR */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-100 flex-row items-center justify-between">
        <View>
          <Text className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
            MATI COMMUNITY
          </Text>
          <Text className="text-xl font-black text-gray-900 tracking-tight mt-0.5">
            Foodie Reviews & Feed
          </Text>
        </View>

        {isLoggedIn ? (
          <Pressable
            onPress={() => setShowCreateModal(true)}
            className="bg-[#EA5410] px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5 shadow-sm active:opacity-90"
          >
            <Ionicons name="create-outline" size={15} color="white" />
            <Text className="text-white font-black text-xs">Write Review</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.push("/(mobile)/auth/customer-login")}
            className="bg-[#EA5410] px-3.5 py-1.5 rounded-full flex-row items-center gap-1 shadow-sm active:opacity-90"
          >
            <Ionicons name="log-in-outline" size={14} color="white" />
            <Text className="text-white text-xs font-black">Sign In</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. GUEST WELCOME BANNER OR REGISTERED USER COMPOSE BOX */}
        {!isLoggedIn ? (
          <View className="mx-4 mt-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="sparkles" size={15} color="#EA5410" />
                <Text className="text-sm font-black text-gray-900">
                  Mati Foodie Community 🍽️
                </Text>
              </View>
              <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-black text-[#EA5410]">GUEST MODE</Text>
              </View>
            </View>
            <Text className="text-xs text-gray-600 leading-relaxed mb-3">
              Browse authentic food photos and reviews by Mati locals. Sign in to post reviews, rate dishes, and join the food discussion.
            </Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.push("/(mobile)/auth/customer-login")}
                className="flex-1 py-2.5 bg-[#EA5410] rounded-xl items-center shadow-sm active:opacity-90"
              >
                <Text className="text-white font-extrabold text-xs">Join the Community / Sign In</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="mx-4 mt-3 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-10 h-10 rounded-full bg-[#EA5410] items-center justify-center">
                <Text className="text-white font-black text-sm">
                  {(user?.name || "F")[0].toUpperCase()}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowCreateModal(true)}
                className="flex-1 bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl justify-center active:bg-gray-100"
              >
                <Text className="text-xs text-gray-500 font-medium" numberOfLines={1}>
                  What did you eat in Mati, {user?.name?.split(" ")[0] || "Foodie"}? Share a review...
                </Text>
              </Pressable>
            </View>

            <View className="flex-row justify-between items-center pt-2.5 border-t border-gray-100">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="pricetag" size={13} color="#EA5410" />
                <Text className="text-[11px] font-bold text-gray-600">
                  Tag Mati restaurants & dishes
                </Text>
              </View>
              <Pressable
                onPress={() => setShowCreateModal(true)}
                className="bg-orange-50 border border-orange-200 px-3 py-1 rounded-xl flex-row items-center gap-1 active:bg-orange-100"
              >
                <Ionicons name="add" size={13} color="#EA5410" />
                <Text className="text-xs font-black text-[#EA5410]">Share</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 3. TRENDING REVIEWS SUBHEADER */}
        <View className="mx-4 mt-4 mb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="flame" size={16} color="#EA5410" />
            <Text className="text-xs font-black text-gray-900 tracking-wide uppercase">
              Trending in Mati City
            </Text>
          </View>
          <View className="bg-gray-100 px-2 py-0.5 rounded-full">
            <Text className="text-[10px] font-bold text-gray-600">
              {socialPosts.length} reviews
            </Text>
          </View>
        </View>

        {/* 4. POSTS FEED LIST */}
        <View className="px-4 gap-4">
          {socialPosts.map((post) => (
            <View
              key={post.id}
              className="bg-white rounded-3xl border border-gray-200 p-4 shadow-sm"
            >
              {/* Author & Header Row */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2.5">
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center ${
                      post.avatarBg || "bg-[#EA5410]"
                    }`}
                  >
                    <Text className="text-white font-black text-xs">{post.authorInitial}</Text>
                  </View>
                  <View>
                    <View className="flex-row items-center gap-1.5">
                      <Text className="text-sm font-extrabold text-gray-900">{post.author}</Text>
                      {post.roleBadge ? (
                        <View className="bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md">
                          <Text className="text-[9px] font-bold text-[#EA5410]">
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

                {/* Rating Badge */}
                {post.rating ? (
                  <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded-xl border border-amber-200">
                    <Ionicons name="star" size={12} color="#D97706" />
                    <Text className="text-xs font-black text-amber-900 ml-1">
                      {post.rating}.0
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Tagged Restaurant / Dish Pill */}
              {post.taggedRestaurant ? (
                <View className="mb-2.5 flex-row items-center">
                  <View className="bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl flex-row items-center gap-1.5">
                    <Ionicons name="storefront" size={13} color="#EA5410" />
                    <Text className="text-xs font-black text-[#EA5410]">
                      {post.taggedRestaurant}
                    </Text>
                    {post.taggedDish ? (
                      <>
                        <Text className="text-orange-300 font-bold">•</Text>
                        <Text className="text-xs font-bold text-gray-700">
                          {post.taggedDish}
                        </Text>
                      </>
                    ) : null}
                  </View>
                </View>
              ) : null}

              {/* Post Text Content */}
              <Text className="text-sm text-gray-800 leading-relaxed mb-3 font-medium">
                {post.content}
              </Text>

              {/* Visual Food Photo Banner */}
              {post.imageUrl ? (
                <View className="h-52 w-full rounded-2xl overflow-hidden mb-3 relative bg-gray-100">
                  <Image
                    source={{ uri: post.imageUrl }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  <View className="absolute inset-0 bg-black/15" />
                  {post.photoCaption && (
                    <View className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/60 px-3 py-1.5 rounded-xl flex-row items-center gap-1.5">
                      <Ionicons name="camera" size={13} color="white" />
                      <Text className="text-white text-[11px] font-bold flex-1" numberOfLines={1}>
                        {post.photoCaption}
                      </Text>
                    </View>
                  )}
                </View>
              ) : post.photoEmoji ? (
                <View
                  className={`h-40 rounded-2xl ${
                    post.photoBg || "bg-orange-950"
                  } mb-3 items-center justify-center p-4 relative overflow-hidden`}
                >
                  <Text className="text-5xl mb-2">{post.photoEmoji}</Text>
                  <Text className="text-white text-xs font-bold text-center px-4">
                    {post.photoCaption || "Local Mati Delicacy"}
                  </Text>
                </View>
              ) : null}

              {/* Engagement Row: Like, Comments, Share */}
              <View className="flex-row items-center justify-between pt-2.5 border-t border-gray-100">
                <View className="flex-row items-center gap-5">
                  {/* Like Button */}
                  <Pressable
                    onPress={() => handleToggleLike(post.id)}
                    className="flex-row items-center gap-1.5 py-1 active:opacity-75"
                  >
                    <Ionicons
                      name={post.hasLiked ? "heart" : "heart-outline"}
                      size={18}
                      color={post.hasLiked ? "#EF4444" : "#6B7280"}
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
                    className="flex-row items-center gap-1.5 py-1 active:opacity-75"
                  >
                    <Ionicons name="chatbubble-outline" size={17} color="#6B7280" />
                    <Text className="text-xs font-bold text-gray-700">
                      {post.comments.length}
                    </Text>
                  </Pressable>
                </View>

                {/* Share Button */}
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Link Copied! 📋",
                      `Link to review by ${post.author} copied to clipboard.`
                    );
                  }}
                  className="flex-row items-center gap-1 py-1 active:opacity-75"
                >
                  <Ionicons name="share-social-outline" size={16} color="#6B7280" />
                  <Text className="text-xs font-semibold text-gray-500">Share</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 5. CREATE POST SHEET (USES 5-STAR BottomSheetModal) */}
      <BottomSheetModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        heightPercent={0.88}
      >
        {({ handleDismiss }) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="flex-1 bg-white p-5 flex-col"
          >
            {/* Visual Drag Handle Pill */}
            <View className="w-12 h-1.5 rounded-full bg-gray-300 self-center mb-3" />

            {/* Header */}
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-xl font-black text-gray-900 tracking-tight">
                  Share Food Review
                </Text>
                <Text className="text-xs text-gray-500 font-medium">
                  Posting as {user?.name || "Mati Foodie"}
                </Text>
              </View>
              <Pressable
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close create post sheet"
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Ionicons name="close" size={20} color="#374151" />
              </Pressable>
            </View>

            <ScrollView className="flex-1 mt-3.5" showsVerticalScrollIndicator={false}>
              <Text className="text-xs font-bold text-gray-700 mb-1.5">
                Your Food Experience *
              </Text>
              <TextInput
                multiline
                numberOfLines={4}
                placeholder="What did you eat? How was the taste, price, and vibe in Mati City?"
                value={newPostText}
                onChangeText={setNewPostText}
                className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-sm text-gray-900 min-h-[95px] mb-4 font-medium"
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />

              <Text className="text-xs font-bold text-gray-700 mb-2">
                Tag a Mati Restaurant (Optional)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ paddingRight: 10 }}
              >
                {["None", ...availableStores].map((resto) => {
                  const isSelected = newPostRestaurant === resto;
                  return (
                    <Pressable
                      key={resto}
                      onPress={() => setNewPostRestaurant(resto)}
                      className={`mr-2 px-3.5 py-2 rounded-xl border ${
                        isSelected
                          ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
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
                  <Text className="text-xs font-bold text-gray-700 mb-1.5">
                    Specific Dish Name (Optional)
                  </Text>
                  <TextInput
                    placeholder="e.g. Grilled Tuna Belly, Classic Pork Humba..."
                    value={newPostDish}
                    onChangeText={setNewPostDish}
                    className="bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-sm text-gray-900 mb-4 font-medium"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text className="text-xs font-bold text-gray-700 mb-1.5">Food Rating</Text>
                  <View className="flex-row items-center gap-2 mb-5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => setNewPostRating(star)}
                        className="p-1"
                      >
                        <Ionicons
                          name={newPostRating >= star ? "star" : "star-outline"}
                          size={28}
                          color={newPostRating >= star ? "#D97706" : "#D1D5DB"}
                        />
                      </Pressable>
                    ))}
                    <Text className="text-sm font-black text-amber-900 ml-2">
                      {newPostRating}.0 / 5.0
                    </Text>
                  </View>
                </>
              )}

              <Pressable
                onPress={() => handleCreatePost(handleDismiss)}
                className="bg-[#EA5410] py-3.5 rounded-2xl items-center mb-6 shadow-sm active:opacity-95"
              >
                <Text className="text-white font-black text-sm">
                  Publish to Foodie Community 🚀
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </BottomSheetModal>

      {/* 6. COMMENTS SHEET (USES 5-STAR BottomSheetModal) */}
      <BottomSheetModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        heightPercent={0.82}
      >
        {({ handleDismiss }) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="flex-1 bg-white p-5 flex-col"
          >
            {/* Visual Drag Handle Pill */}
            <View className="w-12 h-1.5 rounded-full bg-gray-300 self-center mb-3" />

            {/* Header */}
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <View>
                <Text className="text-xl font-black text-gray-900 tracking-tight">Comments</Text>
                <Text className="text-xs text-gray-500 font-medium">
                  Review by {activePostForComments?.author}
                </Text>
              </View>
              <Pressable
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close comments sheet"
                className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Ionicons name="close" size={20} color="#374151" />
              </Pressable>
            </View>

            <ScrollView className="flex-1 my-3" showsVerticalScrollIndicator={false}>
              {activePostForComments?.comments.length === 0 ? (
                <View className="py-12 items-center justify-center">
                  <Ionicons name="chatbubble-ellipses-outline" size={36} color="#9CA3AF" />
                  <Text className="text-xs text-gray-400 font-medium mt-2">
                    No comments yet. Be the first to share your thoughts!
                  </Text>
                </View>
              ) : (
                activePostForComments?.comments.map((comment) => (
                  <View
                    key={comment.id}
                    className="flex-row gap-2.5 mb-3 bg-gray-50 p-3 rounded-2xl border border-gray-100"
                  >
                    <View
                      className={`w-7 h-7 rounded-full items-center justify-center ${
                        comment.avatarColor || "bg-[#EA5410]"
                      }`}
                    >
                      <Text className="text-white font-bold text-[10px]">
                        {comment.author[0].toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-0.5">
                        <Text className="text-xs font-black text-gray-900">
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
                  placeholder={`Comment as ${user?.name?.split(" ")[0] || "Foodie"}...`}
                  value={newCommentText}
                  onChangeText={setNewCommentText}
                  className="flex-1 bg-gray-100 px-3.5 py-2.5 rounded-xl text-xs text-gray-900 font-medium"
                  placeholderTextColor="#9CA3AF"
                />
                <Pressable
                  onPress={handleAddComment}
                  disabled={!newCommentText.trim()}
                  className={`px-4 py-2.5 rounded-xl ${
                    newCommentText.trim() ? "bg-[#EA5410]" : "bg-gray-200"
                  }`}
                >
                  <Ionicons
                    name="send"
                    size={15}
                    color={newCommentText.trim() ? "white" : "#9CA3AF"}
                  />
                </Pressable>
              </View>
            ) : (
              <View className="p-3.5 bg-orange-50 border border-orange-200 rounded-2xl flex-row items-center justify-between">
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-black text-gray-900">Sign in to comment</Text>
                  <Text className="text-[11px] text-gray-600 leading-tight">
                    Guests can read comments. Log in to reply.
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    handleDismiss();
                    router.push("/(mobile)/auth/customer-login");
                  }}
                  className="bg-[#EA5410] px-3.5 py-1.5 rounded-xl"
                >
                  <Text className="text-white font-black text-xs">Sign In</Text>
                </Pressable>
              </View>
            )}
          </KeyboardAvoidingView>
        )}
      </BottomSheetModal>

      {/* 7. GUEST GATE MODAL */}
      <GuestGateModal
        visible={showGuestGateModal}
        onClose={() => setShowGuestGateModal(false)}
        actionDescription={guestGateAction}
        onQuickSignIn={() => {
          setShowGuestGateModal(false);
          router.push("/(mobile)/auth/customer-login");
        }}
        onNavigateToAuth={() => {
          setShowGuestGateModal(false);
          router.push("/(mobile)/auth/customer-login");
        }}
      />
    </SafeAreaView>
  );
}
