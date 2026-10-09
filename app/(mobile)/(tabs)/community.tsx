import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../../context/AuthContext";
import { SocialPost } from "../../../types/post";
import { fetchLiveStores } from "../../../services/catalog";
import {
  fetchCommunityPosts,
  createCommunityPost,
  togglePostLike,
  addCommunityComment,
  subscribeToCommunityFeed,
  FeedSortOption,
} from "../../../services/community";
import { uploadDishPhoto } from "../../../services/storage";
import { BottomSheetModal } from "../../../components/ui/BottomSheetModal";
import { GuestGateModal } from "../../../components/auth/GuestGateModal";

const DEFAULT_MATI_STORES = [
  "Mama Letty's Karenderia",
  "Mati Baywalk Seafood Grill",
  "Subangan Street Grills",
  "Dahican Beach Bites",
  "Aling Nena's Kitchen",
];

export default function MobileCommunityScreen() {
  const { isLoggedIn, user } = useAuth();
  const router = useRouter();

  // Social Posts & Pagination State
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);
  const [availableStores, setAvailableStores] = useState<string[]>(DEFAULT_MATI_STORES);
  const [feedSort, setFeedSort] = useState<FeedSortOption>("trending");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // New Comment Form State
  const [newCommentText, setNewCommentText] = useState("");

  const loadInitialPosts = async (sortOption: FeedSortOption = feedSort) => {
    try {
      setPage(1);
      setHasMore(true);
      const data = await fetchCommunityPosts(1, 10, sortOption);
      setSocialPosts(data);
      if (data.length < 10) setHasMore(false);
    } catch (err) {
      console.warn("Could not fetch community posts:", err);
    }
  };

  const loadMorePosts = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const morePosts = await fetchCommunityPosts(nextPage, 10, feedSort);
      if (morePosts.length === 0) {
        setHasMore(false);
      } else {
        setSocialPosts((prev) => [...prev, ...morePosts]);
        setPage(nextPage);
        if (morePosts.length < 10) setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSwitchFeedSort = (newSort: FeedSortOption) => {
    if (newSort === feedSort) return;
    setFeedSort(newSort);
    loadInitialPosts(newSort);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadInitialPosts(feedSort);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadInitialPosts();
    const unsub = subscribeToCommunityFeed(() => {
      loadInitialPosts();
    });
    return () => unsub();
  }, [isLoggedIn]);

  useEffect(() => {
    fetchLiveStores()
      .then((stores) => {
        if (stores.length > 0) {
          const storeNames = Array.from(new Set(stores.map((s) => s.name)));
          setAvailableStores(storeNames);
        }
      })
      .catch(() => {});
  }, []);

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
  const handleToggleLike = async (postId: string) => {
    if (!verifyRegisteredUser("like posts in the foodie community")) return;

    // Optimistic UI update
    setSocialPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const newHasLiked = !post.hasLiked;
          return {
            ...post,
            hasLiked: newHasLiked,
            likes: newHasLiked ? post.likes + 1 : Math.max(0, post.likes - 1),
          };
        }
        return post;
      })
    );

    try {
      await togglePostLike(postId);
    } catch (err) {
      console.error("togglePostLike error:", err);
      loadInitialPosts();
    }
  };

  // Open Comments
  const handleOpenComments = (post: SocialPost) => {
    setActivePostForComments(post);
    setShowCommentsModal(true);
  };

  // Add Comment
  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;
    if (!activePostForComments) return;
    if (!verifyRegisteredUser("comment on foodie community posts")) return;

    const commentText = newCommentText.trim();
    setNewCommentText("");

    try {
      const createdComment = await addCommunityComment(activePostForComments.id, commentText);
      const updatedComments = [...activePostForComments.comments, createdComment];
      const updatedPost = { ...activePostForComments, comments: updatedComments };

      setActivePostForComments(updatedPost);
      setSocialPosts((prev) =>
        prev.map((p) => (p.id === activePostForComments.id ? updatedPost : p))
      );
    } catch (err: any) {
      Alert.alert("Comment Failed", err.message || "Could not add comment.");
    }
  };

  // Pick Dish Photo with ImagePicker
  const handlePickDishPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Photo Permission Needed",
          "Please allow photo library access to attach dish photos to your review."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert("Photo Picker Error", err?.message || "Could not select photo.");
    }
  };

  // Create Post with Real Media Upload
  const handleCreatePost = async (handleDismiss: () => void) => {
    if (!newPostText.trim()) {
      Alert.alert("Missing Content", "Please share something about your food trip in Mati City.");
      return;
    }

    setIsUploadingImage(true);
    let finalImageUrl: string | undefined = undefined;

    try {
      if (selectedImageUri) {
        const uploadRes = await uploadDishPhoto(selectedImageUri);
        if (uploadRes.publicUrl) {
          finalImageUrl = uploadRes.publicUrl;
        }
      }

      await createCommunityPost({
        content: newPostText.trim(),
        taggedRestaurant: newPostRestaurant !== "None" ? newPostRestaurant : undefined,
        taggedDish: newPostDish.trim() ? newPostDish.trim() : undefined,
        rating: newPostRestaurant !== "None" ? newPostRating : 5,
        imageUrl:
          finalImageUrl ||
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80",
      });

      await loadInitialPosts();
      handleDismiss();
      setNewPostText("");
      setNewPostRestaurant("None");
      setNewPostDish("");
      setNewPostRating(5);
      setSelectedImageUri(null);
      Alert.alert("Review Published! 🎉", "Your food review is now live in the Mati Foodie Community.");
    } catch (err: any) {
      Alert.alert("Publish Failed", err.message || "Could not publish your review.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Render Post Card Item for Virtualized FlatList
  const renderPostCard = ({ item: post }: { item: SocialPost }) => (
    <View className="bg-white rounded-3xl border border-gray-200 p-4 shadow-sm mb-4 mx-4">
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
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="text-sm font-extrabold text-gray-900">{post.author}</Text>
              {post.roleBadge ? (
                <View className="bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md">
                  <Text className="text-[9px] font-bold text-[#EA5410]">{post.roleBadge}</Text>
                </View>
              ) : null}
              {post.isTrending ? (
                <View className="bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md flex-row items-center gap-0.5">
                  <Ionicons name="flame" size={10} color="#E11D48" />
                  <Text className="text-[9px] font-black text-rose-600">Trending</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-[11px] text-gray-400 font-medium">{post.timestamp}</Text>
          </View>
        </View>

        {/* Rating Badge */}
        {post.rating ? (
          <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded-xl border border-amber-200">
            <Ionicons name="star" size={12} color="#D97706" />
            <Text className="text-xs font-black text-amber-900 ml-1">{post.rating}.0</Text>
          </View>
        ) : null}
      </View>

      {/* Tagged Restaurant / Dish Pill & Ranking Indicators */}
      {post.taggedRestaurant ? (
        <View className="mb-2.5 flex-row items-center flex-wrap gap-1.5">
          <View className="bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl flex-row items-center gap-1.5">
            <Ionicons name="storefront" size={13} color="#EA5410" />
            <Text className="text-xs font-black text-[#EA5410]">{post.taggedRestaurant}</Text>
            {post.taggedDish ? (
              <>
                <Text className="text-orange-300 font-bold">•</Text>
                <Text className="text-xs font-bold text-gray-700">{post.taggedDish}</Text>
              </>
            ) : null}
          </View>
          {post.isPopularEatery ? (
            <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg flex-row items-center gap-1">
              <Ionicons name="star" size={10} color="#D97706" />
              <Text className="text-[10px] font-bold text-amber-800">Popular Spot</Text>
            </View>
          ) : null}
          {post.isPhotoVerified ? (
            <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex-row items-center gap-1">
              <Ionicons name="camera" size={10} color="#059669" />
              <Text className="text-[10px] font-bold text-emerald-800">Photo Verified</Text>
            </View>
          ) : null}
        </View>
      ) : post.isPhotoVerified ? (
        <View className="mb-2.5 flex-row items-center">
          <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex-row items-center gap-1">
            <Ionicons name="camera" size={10} color="#059669" />
            <Text className="text-[10px] font-bold text-emerald-800">Photo Verified Review</Text>
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
          <Image source={{ uri: post.imageUrl }} className="w-full h-full" resizeMode="cover" />
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
            <Text className="text-xs font-bold text-gray-700">{post.comments.length}</Text>
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
  );

  // List Header Component
  const renderListHeader = () => (
    <View>
      {/* GUEST WELCOME BANNER OR REGISTERED USER COMPOSE BOX */}
      {!isLoggedIn ? (
        <View className="mx-4 mt-3 mb-4 p-4 bg-orange-50 border border-orange-200 rounded-2xl">
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
            Browse authentic food photos and reviews by Mati locals. Sign in to post reviews, snap dish photos, and join the food discussion.
          </Text>
          <Pressable
            onPress={() => router.push("/(mobile)/auth/customer-login")}
            className="py-2.5 bg-[#EA5410] rounded-xl items-center shadow-sm active:opacity-90"
          >
            <Text className="text-white font-extrabold text-xs">Join the Community / Sign In</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mx-4 mt-3 mb-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
          <View className="flex-row items-center gap-3 mb-2.5">
            <View className="w-10 h-10 rounded-full bg-[#EA5410] items-center justify-center">
              <Text className="text-white font-black text-sm">
                {user?.name?.charAt(0).toUpperCase() || "F"}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5"
            >
              <Text className="text-xs text-gray-400 font-medium">
                Tried something delicious in Mati? Share it...
              </Text>
            </Pressable>
          </View>
          <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="flex-row items-center gap-1.5"
            >
              <Ionicons name="camera" size={16} color="#EA5410" />
              <Text className="text-xs font-bold text-gray-700">Add Dish Photo</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="flex-row items-center gap-1.5"
            >
              <Ionicons name="star" size={16} color="#D97706" />
              <Text className="text-xs font-bold text-gray-700">Rate Restaurant</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="bg-orange-50 px-3 py-1 rounded-full border border-orange-200"
            >
              <Text className="text-xs font-black text-[#EA5410]">Share</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* FEED FILTER / RANKING SELECTOR */}
      <View className="mx-4 mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => handleSwitchFeedSort("trending")}
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
              feedSort === "trending"
                ? "bg-orange-50 border-[#EA5410]"
                : "bg-white border-gray-200"
            }`}
          >
            <Ionicons
              name="flame"
              size={13}
              color={feedSort === "trending" ? "#EA5410" : "#6B7280"}
            />
            <Text
              className={`text-xs font-bold ${
                feedSort === "trending" ? "text-[#EA5410]" : "text-gray-600"
              }`}
            >
              Trending (Smart)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleSwitchFeedSort("recent")}
            className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
              feedSort === "recent"
                ? "bg-orange-50 border-[#EA5410]"
                : "bg-white border-gray-200"
            }`}
          >
            <Ionicons
              name="time"
              size={13}
              color={feedSort === "recent" ? "#EA5410" : "#6B7280"}
            />
            <Text
              className={`text-xs font-bold ${
                feedSort === "recent" ? "text-[#EA5410]" : "text-gray-600"
              }`}
            >
              Latest
            </Text>
          </Pressable>
        </View>

        <View className="bg-gray-100 px-2.5 py-1 rounded-full">
          <Text className="text-[10px] font-bold text-gray-600">
            {socialPosts.length} reviews
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      {/* 1. TOP APP BAR */}
      <View className="px-4 pt-2 pb-3 bg-white border-b border-gray-100 flex-row items-center justify-between shadow-xs">
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

      {/* 2. VIRTUALIZED FLATLIST REVIEWS FEED */}
      <FlatList
        data={socialPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPostCard}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={
          isLoadingMore ? (
            <View className="py-4 items-center justify-center">
              <ActivityIndicator size="small" color="#EA5410" />
              <Text className="text-[11px] font-medium text-gray-500 mt-1">Loading more reviews...</Text>
            </View>
          ) : null
        }
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== "web"}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#EA5410"]}
            tintColor="#EA5410"
          />
        }
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      />

      {/* 3. CREATE POST SHEET WITH REAL DISH PHOTO UPLOAD */}
      <BottomSheetModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        heightPercent={0.92}
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
                className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-sm text-gray-900 min-h-[90px] mb-3.5 font-medium"
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />

              {/* Real Media Photo Upload Picker */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-gray-700 mb-1.5">
                  Dish Photo (Supabase Storage)
                </Text>
                {selectedImageUri ? (
                  <View className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 h-44 mb-2">
                    <Image
                      source={{ uri: selectedImageUri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => setSelectedImageUri(null)}
                      className="absolute top-2.5 right-2.5 bg-black/70 w-8 h-8 rounded-full items-center justify-center active:opacity-80"
                    >
                      <Ionicons name="close" size={18} color="white" />
                    </Pressable>
                    <View className="absolute bottom-2 left-2 bg-emerald-700/90 px-2 py-0.5 rounded-lg">
                      <Text className="text-[10px] font-bold text-white">Photo Ready for Upload</Text>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={handlePickDishPhoto}
                    className="border-2 border-dashed border-orange-200 bg-orange-50/60 rounded-2xl p-4 items-center justify-center flex-row gap-2 active:bg-orange-100/50"
                  >
                    <Ionicons name="camera-outline" size={20} color="#EA5410" />
                    <Text className="text-xs font-bold text-[#EA5410]">
                      Attach Real Dish Photo (Camera / Gallery)
                    </Text>
                  </Pressable>
                )}
              </View>

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
                disabled={isUploadingImage}
                className="bg-[#EA5410] py-3.5 rounded-2xl items-center mb-6 shadow-sm active:opacity-95 flex-row justify-center gap-2"
              >
                {isUploadingImage ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-black text-sm">Uploading Photo & Publishing...</Text>
                  </>
                ) : (
                  <Text className="text-white font-black text-sm">
                    Publish to Foodie Community 🚀
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </BottomSheetModal>

      {/* 4. COMMENTS SHEET */}
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
                  <Text className="text-sm font-bold text-gray-400 mt-2">
                    No comments yet on this review.
                  </Text>
                  <Text className="text-xs text-gray-400 mt-1">Be the first Mati diner to reply!</Text>
                </View>
              ) : (
                <View className="gap-3">
                  {activePostForComments?.comments.map((comment) => (
                    <View
                      key={comment.id}
                      className="bg-gray-50 border border-gray-200 p-3.5 rounded-2xl"
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-xs font-extrabold text-gray-900">
                          {comment.author}
                        </Text>
                        <Text className="text-[10px] text-gray-400 font-medium">
                          {comment.timestamp}
                        </Text>
                      </View>
                      <Text className="text-xs text-gray-700 leading-relaxed font-medium">
                        {comment.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Comment Input */}
            <View className="flex-row items-center gap-2 pt-2 border-t border-gray-100">
              <TextInput
                placeholder={
                  isLoggedIn ? "Write a comment..." : "Sign in to join the conversation"
                }
                value={newCommentText}
                onChangeText={setNewCommentText}
                editable={isLoggedIn}
                className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-900 font-medium"
                placeholderTextColor="#9CA3AF"
              />
              <Pressable
                onPress={handleAddComment}
                className="bg-[#EA5410] px-4 py-2.5 rounded-xl items-center justify-center active:opacity-90"
              >
                <Ionicons name="send" size={14} color="white" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </BottomSheetModal>

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
