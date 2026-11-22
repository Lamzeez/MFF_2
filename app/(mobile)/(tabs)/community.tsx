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
import { SEED_SOCIAL_POSTS } from "../../../mock/posts";
import { fetchLiveStores } from "../../../services/catalog";
import {
  fetchCommunityPosts,
  createCommunityPost,
  togglePostLike,
  addCommunityComment,
  subscribeToCommunityFeed,
  reportCommunityPost,
  COMMUNITY_REPORT_REASONS,
  CommunityReportReason,
  FeedSortOption,
} from "../../../services/community";
import { uploadDishPhoto } from "../../../services/storage";
import { BottomSheetModal } from "../../../components/ui/BottomSheetModal";
import { GuestGateModal } from "../../../components/auth/GuestGateModal";
import { getCustomerProfile } from "../../../lib/customer-profile";

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
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [availableStores, setAvailableStores] = useState<string[]>(DEFAULT_MATI_STORES);
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingPost, setReportingPost] = useState<SocialPost | null>(null);
  const [reportReason, setReportReason] = useState<CommunityReportReason>(COMMUNITY_REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

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
    } finally {
      setIsLoadingInitial(false);
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
    if (isLoggedIn && user?.id) {
      getCustomerProfile(user.id).then((p) => {
        if (p?.avatarUrl) setCurrentUserAvatarUrl(p.avatarUrl);
      });
    }
    const unsub = subscribeToCommunityFeed(() => {
      loadInitialPosts();
    });
    return () => unsub();
  }, [isLoggedIn, user?.id]);

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

  // Initiate Report Post
  const handleInitiateReport = (post: SocialPost) => {
    if (!verifyRegisteredUser("report community content")) return;
    setReportingPost(post);
    setReportReason(COMMUNITY_REPORT_REASONS[0]);
    setReportDetails("");
    setShowReportModal(true);
  };

  // Submit Moderation Report
  const handleSubmitReport = async () => {
    if (!reportingPost) return;
    setIsSubmittingReport(true);
    try {
      await reportCommunityPost(reportingPost.id, reportReason, reportDetails);
      setShowReportModal(false);
      setReportingPost(null);
      Alert.alert(
        "Report Submitted 🛡️",
        "Thank you for helping keep the Mati foodie community trustworthy. Our moderators have received your report."
      );
    } catch (err: any) {
      Alert.alert("Report Failed", err.message || "Could not submit report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
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
    if (!verifyRegisteredUser("post in the foodie community")) return;
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
    <View className="w-full max-w-2xl self-center px-4">
    <View className="bg-white rounded-2xl border border-gray-200/90 p-3 shadow-xs mb-2.5">
      {/* Author & Header Row */}
      <View className="flex-row items-center justify-between mb-2 gap-2">
        <View className="flex-row items-center gap-2 flex-1 min-w-0">
          {post.authorAvatarUrl || (post.author === user?.name && currentUserAvatarUrl) ? (
            <Image
              source={{ uri: post.authorAvatarUrl || currentUserAvatarUrl! }}
              className="w-7.5 h-7.5 rounded-full shrink-0 border border-orange-200"
              resizeMode="cover"
            />
          ) : (
            <View
              className={`w-7.5 h-7.5 rounded-full items-center justify-center shrink-0 ${
                post.avatarBg || "bg-[#EA5410]"
              }`}
            >
              <Text className="text-white font-black text-[11px]">{post.authorInitial}</Text>
            </View>
          )}
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1 flex-wrap">
              <Text className="text-xs font-black text-gray-900">{post.author}</Text>
              {post.roleBadge ? (
                <View className="bg-orange-50 border border-orange-200 px-1 py-0.2 rounded">
                  <Text className="text-[8px] font-bold text-[#EA5410]">{post.roleBadge}</Text>
                </View>
              ) : null}
              {post.isTrending ? (
                <View className="bg-rose-50 border border-rose-200 px-1 py-0.2 rounded flex-row items-center gap-0.5">
                  <Ionicons name="flame" size={9} color="#E11D48" />
                  <Text className="text-[8px] font-black text-rose-600">Trending</Text>
                </View>
              ) : null}
            </View>
            <Text className="text-[10px] text-gray-400 font-medium">{post.timestamp}</Text>
          </View>
        </View>

        {/* Rating Badge & Report Flag Button */}
        <View className="flex-row items-center gap-1">
          {post.rating ? (
            <View className="flex-row items-center bg-amber-50 px-1.5 py-0.5 rounded-lg border border-amber-200">
              <Ionicons name="star" size={10} color="#D97706" />
              <Text className="text-[11px] font-black text-amber-900 ml-0.5">{post.rating}.0</Text>
            </View>
          ) : null}

          {/* Report Post Action Button */}
          <Pressable
            onPress={() => handleInitiateReport(post)}
            className="w-6 h-6 rounded-full items-center justify-center bg-gray-50 active:bg-gray-200 border border-gray-200/60"
            accessibilityRole="button"
            accessibilityLabel="Report post"
          >
            <Ionicons name="flag-outline" size={11} color="#9CA3AF" />
          </Pressable>
        </View>
      </View>

      {/* Tagged Restaurant / Dish Pill & Ranking Indicators */}
      {post.taggedRestaurant ? (
        <View className="mb-2 flex-row items-center flex-wrap gap-1">
          <View className="bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg flex-row items-center gap-1">
            <Ionicons name="storefront" size={11} color="#EA5410" />
            <Text className="text-[11px] font-black text-[#EA5410]">{post.taggedRestaurant}</Text>
            {post.taggedDish ? (
              <>
                <Text className="text-orange-300 font-bold">•</Text>
                <Text className="text-[11px] font-bold text-gray-700">{post.taggedDish}</Text>
              </>
            ) : null}
          </View>
          {post.isPopularEatery ? (
            <View className="bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex-row items-center gap-0.5">
              <Ionicons name="star" size={9} color="#D97706" />
              <Text className="text-[9px] font-bold text-amber-800">Popular</Text>
            </View>
          ) : null}
          {post.isPhotoVerified ? (
            <View className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex-row items-center gap-0.5">
              <Ionicons name="camera" size={9} color="#059669" />
              <Text className="text-[9px] font-bold text-emerald-800">Verified Photo</Text>
            </View>
          ) : null}
        </View>
      ) : post.isPhotoVerified ? (
        <View className="mb-2 flex-row items-center">
          <View className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex-row items-center gap-0.5">
            <Ionicons name="camera" size={9} color="#059669" />
            <Text className="text-[9px] font-bold text-emerald-800">Photo Verified Review</Text>
          </View>
        </View>
      ) : null}

      {/* Post Text Content */}
      <Text className="text-xs text-gray-800 leading-relaxed mb-2.5 font-medium">
        {post.content}
      </Text>

      {/* Visual Food Photo Banner */}
      {post.imageUrl ? (
        <View className="h-40 w-full rounded-xl overflow-hidden mb-2.5 relative bg-gray-100">
          <Image source={{ uri: post.imageUrl }} className="w-full h-full" resizeMode="cover" />
          <View className="absolute inset-0 bg-black/15" />
          {post.photoCaption && (
            <View className="absolute bottom-2 left-2 right-2 bg-black/60 px-2.5 py-1 rounded-lg flex-row items-center gap-1">
              <Ionicons name="camera" size={11} color="white" />
              <Text className="text-white text-[10px] font-bold flex-1" numberOfLines={1}>
                {post.photoCaption}
              </Text>
            </View>
          )}
        </View>
      ) : post.photoEmoji ? (
        <View
          className={`h-28 rounded-xl ${
            post.photoBg || "bg-orange-950"
          } mb-2.5 items-center justify-center p-3 relative overflow-hidden`}
        >
          <Text className="text-4xl mb-1">{post.photoEmoji}</Text>
          <Text className="text-white text-[11px] font-bold text-center px-3">
            {post.photoCaption || "Local Mati Delicacy"}
          </Text>
        </View>
      ) : null}

      {/* Engagement Row: Like, Comments, Share */}
      <View className="flex-row items-center justify-between pt-2 border-t border-gray-100">
        <View className="flex-row items-center gap-4">
          {/* Like Button */}
          <Pressable
            onPress={() => handleToggleLike(post.id)}
            className="flex-row items-center gap-1 py-0.5 active:opacity-75"
          >
            <Ionicons
              name={post.hasLiked ? "heart" : "heart-outline"}
              size={15}
              color={post.hasLiked ? "#EF4444" : "#6B7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                post.hasLiked ? "text-red-600" : "text-gray-700"
              }`}
            >
              {post.likes}
            </Text>
          </Pressable>

          {/* Comments Button */}
          <Pressable
            onPress={() => handleOpenComments(post)}
            className="flex-row items-center gap-1 py-0.5 active:opacity-75"
          >
            <Ionicons name="chatbubble-outline" size={14} color="#6B7280" />
            <Text className="text-[11px] font-bold text-gray-700">{post.comments.length}</Text>
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
          className="flex-row items-center gap-1 py-0.5 active:opacity-75"
        >
          <Ionicons name="share-social-outline" size={13} color="#6B7280" />
          <Text className="text-[11px] font-semibold text-gray-500">Share</Text>
        </Pressable>
      </View>
    </View>
    </View>
  );

  // List Header Component
  const renderListHeader = () => (
    <View className="w-full max-w-2xl self-center">
      {/* GUEST WELCOME BANNER OR REGISTERED USER COMPOSE BOX */}
      {!isLoggedIn ? (
        <View className="mx-4 mt-2.5 mb-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <View className="flex-row items-center justify-between flex-wrap gap-1.5 mb-1">
            <View className="flex-row items-center gap-1 flex-1 min-w-[160px]">
              <Ionicons name="sparkles" size={13} color="#EA5410" />
              <Text className="text-xs font-black text-gray-900">
                Mati Foodie Community 🍽️
              </Text>
            </View>
            <View className="bg-orange-100 px-1.5 py-0.2 rounded-full">
              <Text className="text-[9px] font-black text-[#EA5410]">GUEST MODE</Text>
            </View>
          </View>
          <Text className="text-[11px] text-gray-600 leading-relaxed mb-2.5">
            Browse authentic food photos and reviews by Mati locals. Sign in to post reviews, snap dish photos, and join the food discussion.
          </Text>
          <Pressable
            onPress={() => router.push("/(mobile)/auth/customer-login")}
            className="py-2 bg-[#EA5410] rounded-lg items-center shadow-xs active:opacity-90"
          >
            <Text className="text-white font-extrabold text-[11px]">Join the Community / Sign In</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mx-4 mt-2.5 mb-3 p-3 bg-white border border-gray-200 rounded-xl shadow-xs">
          <View className="flex-row items-center gap-2 mb-2">
            <View className="w-8 h-8 rounded-full bg-[#EA5410] items-center justify-center shrink-0">
              <Text className="text-white font-black text-xs">
                {user?.name?.charAt(0).toUpperCase() || "F"}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              <Text className="text-[11px] text-gray-400 font-medium" numberOfLines={1}>
                Tried something delicious in Mati? Share it...
              </Text>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-gray-100">
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="camera" size={14} color="#EA5410" />
              <Text className="text-[11px] font-bold text-gray-700">Add Photo</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="flex-row items-center gap-1"
            >
              <Ionicons name="star" size={14} color="#D97706" />
              <Text className="text-[11px] font-bold text-gray-700">Rate Restaurant</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200"
            >
              <Text className="text-[11px] font-black text-[#EA5410]">Share</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* FEED FILTER / RANKING SELECTOR */}
      <View className="mx-4 mb-2.5 flex-row flex-wrap items-center justify-between gap-1.5">
        <View className="flex-row items-center gap-1.5">
          <Pressable
            onPress={() => handleSwitchFeedSort("trending")}
            className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full border ${
              feedSort === "trending"
                ? "bg-orange-50 border-[#EA5410]"
                : "bg-white border-gray-200"
            }`}
          >
            <Ionicons
              name="flame"
              size={12}
              color={feedSort === "trending" ? "#EA5410" : "#6B7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                feedSort === "trending" ? "text-[#EA5410]" : "text-gray-600"
              }`}
            >
              Trending (Smart)
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleSwitchFeedSort("recent")}
            className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full border ${
              feedSort === "recent"
                ? "bg-orange-50 border-[#EA5410]"
                : "bg-white border-gray-200"
            }`}
          >
            <Ionicons
              name="time"
              size={12}
              color={feedSort === "recent" ? "#EA5410" : "#6B7280"}
            />
            <Text
              className={`text-[11px] font-bold ${
                feedSort === "recent" ? "text-[#EA5410]" : "text-gray-600"
              }`}
            >
              Latest
            </Text>
          </Pressable>
        </View>

        <View className="bg-gray-100 px-2 py-0.5 rounded-full">
          <Text className="text-[9px] font-bold text-gray-600">
            {socialPosts.length} reviews
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#F8FAFC]">
      {/* 1. TOP APP BAR */}
      <View className="px-4 pt-1.5 pb-2.5 bg-white border-b border-gray-100 shadow-xs">
        <View className="w-full max-w-2xl self-center flex-row items-center justify-between gap-2">
          <View className="flex-1 min-w-0">
            <Text className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">
              MATI COMMUNITY
            </Text>
            <Text className="text-base font-black text-gray-900 tracking-tight" numberOfLines={1}>
              Foodie Reviews & Feed
            </Text>
          </View>

          {isLoggedIn ? (
            <Pressable
              onPress={() => setShowCreateModal(true)}
              className="bg-[#EA5410] px-3 py-1.5 rounded-xl flex-row items-center gap-1 shadow-xs active:opacity-90 shrink-0"
            >
              <Ionicons name="create-outline" size={13} color="white" />
              <Text className="text-white font-black text-[11px]">Write Review</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/(mobile)/auth/customer-login")}
              className="bg-[#EA5410] px-3 py-1.5 rounded-xl flex-row items-center gap-1 shadow-xs active:opacity-90 shrink-0"
            >
              <Ionicons name="log-in-outline" size={13} color="white" />
              <Text className="text-white text-[11px] font-black">Sign In</Text>
            </Pressable>
          )}
        </View>
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
        ListEmptyComponent={
          isLoadingInitial ? (
            <View className="w-full max-w-2xl self-center px-4 py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#EA5410" />
              <Text className="text-xs text-gray-500 font-medium mt-3">Loading Mati foodie reviews...</Text>
            </View>
          ) : (
            <View className="w-full max-w-2xl self-center px-4">
              <View className="bg-white p-8 rounded-3xl border border-gray-200/80 items-center justify-center my-6 shadow-sm">
                <View className="w-16 h-16 rounded-2xl bg-[#EA5410]/10 items-center justify-center mb-3">
                  <Ionicons name="chatbubbles-outline" size={32} color="#EA5410" />
                </View>
                <Text className="text-base font-black text-gray-900 mt-1">No Foodie Reviews Yet</Text>
                <Text className="text-xs text-gray-500 text-center mt-1.5 mb-5 max-w-xs leading-relaxed">
                  Be the first to share a review or dish photo of your favorite restaurant in Mati City!
                </Text>
                {isLoggedIn ? (
                  <Pressable
                    onPress={() => setShowCreateModal(true)}
                    className="bg-[#EA5410] px-6 py-3 rounded-2xl shadow-sm active:opacity-90 flex-row items-center gap-2"
                  >
                    <Ionicons name="create-outline" size={16} color="white" />
                    <Text className="text-white font-extrabold text-xs">Write the First Review</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => router.push("/(mobile)/auth/customer-login")}
                    className="bg-[#EA5410] px-6 py-3 rounded-2xl shadow-sm active:opacity-90 flex-row items-center gap-2"
                  >
                    <Ionicons name="log-in-outline" size={16} color="white" />
                    <Text className="text-white font-extrabold text-xs">Sign In to Post</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )
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
            className="flex-1 bg-white p-4 flex-col"
          >
            {/* Visual Drag Handle Pill */}
            <View className="w-10 h-1 rounded-full bg-gray-300 self-center mb-2.5" />

            {/* Header */}
            <View className="flex-row justify-between items-center pb-2.5 border-b border-gray-100">
              <View>
                <Text className="text-base font-black text-gray-900 tracking-tight">
                  Share Food Review
                </Text>
                <Text className="text-[11px] text-gray-500 font-medium">
                  Posting as {user?.name || "Mati Foodie"}
                </Text>
              </View>
              <Pressable
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close create post sheet"
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Ionicons name="close" size={18} color="#374151" />
              </Pressable>
            </View>

            <ScrollView className="flex-1 mt-2.5" showsVerticalScrollIndicator={false}>
              <Text className="text-[11px] font-bold text-gray-700 mb-1">
                Your Food Experience *
              </Text>
              <TextInput
                multiline
                numberOfLines={3}
                placeholder="What did you eat? How was the taste, price, and vibe in Mati City?"
                value={newPostText}
                onChangeText={setNewPostText}
                className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 min-h-[75px] mb-3 font-medium"
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />

              {/* Real Media Photo Upload Picker */}
              <View className="mb-3">
                <Text className="text-[11px] font-bold text-gray-700 mb-1">
                  Dish Photo (Supabase Storage)
                </Text>
                {selectedImageUri ? (
                  <View className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-100 h-36 mb-2">
                    <Image
                      source={{ uri: selectedImageUri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => setSelectedImageUri(null)}
                      className="absolute top-2 right-2 bg-black/70 w-7 h-7 rounded-full items-center justify-center active:opacity-80"
                    >
                      <Ionicons name="close" size={16} color="white" />
                    </Pressable>
                    <View className="absolute bottom-2 left-2 bg-emerald-700/90 px-1.5 py-0.2 rounded-md">
                      <Text className="text-[9px] font-bold text-white">Photo Ready for Upload</Text>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    onPress={handlePickDishPhoto}
                    className="border-2 border-dashed border-orange-200 bg-orange-50/60 rounded-xl p-3 items-center justify-center flex-row gap-1.5 active:bg-orange-100/50"
                  >
                    <Ionicons name="camera-outline" size={17} color="#EA5410" />
                    <Text className="text-[11px] font-bold text-[#EA5410]">
                      Attach Real Dish Photo (Camera / Gallery)
                    </Text>
                  </Pressable>
                )}
              </View>

              <Text className="text-[11px] font-bold text-gray-700 mb-1.5">
                Tag a Mati Restaurant (Optional)
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-3"
                contentContainerStyle={{ paddingRight: 10 }}
              >
                {["None", ...availableStores].map((resto) => {
                  const isSelected = newPostRestaurant === resto;
                  return (
                    <Pressable
                      key={resto}
                      onPress={() => setNewPostRestaurant(resto)}
                      className={`mr-1.5 px-3 py-1.5 rounded-xl border ${
                        isSelected
                          ? "bg-[#EA5410] border-[#EA5410] shadow-xs"
                          : "bg-gray-100 border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
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
                  <Text className="text-[11px] font-bold text-gray-700 mb-1">
                    Specific Dish Name (Optional)
                  </Text>
                  <TextInput
                    placeholder="e.g. Grilled Tuna Belly, Classic Pork Humba..."
                    value={newPostDish}
                    onChangeText={setNewPostDish}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 mb-3 font-medium"
                    placeholderTextColor="#9CA3AF"
                  />

                  <Text className="text-[11px] font-bold text-gray-700 mb-1">Food Rating</Text>
                  <View className="flex-row items-center gap-1.5 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => setNewPostRating(star)}
                        className="p-0.5"
                      >
                        <Ionicons
                          name={newPostRating >= star ? "star" : "star-outline"}
                          size={22}
                          color={newPostRating >= star ? "#D97706" : "#D1D5DB"}
                        />
                      </Pressable>
                    ))}
                    <Text className="text-xs font-black text-amber-900 ml-1.5">
                      {newPostRating}.0 / 5.0
                    </Text>
                  </View>
                </>
              )}

              <Pressable
                onPress={() => handleCreatePost(handleDismiss)}
                disabled={isUploadingImage}
                className="bg-[#EA5410] py-2.5 rounded-xl items-center mb-5 shadow-xs active:opacity-95 flex-row justify-center gap-1.5"
              >
                {isUploadingImage ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-black text-xs">Uploading Photo & Publishing...</Text>
                  </>
                ) : (
                  <Text className="text-white font-black text-xs">
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
            className="flex-1 bg-white p-4 flex-col"
          >
            {/* Visual Drag Handle Pill */}
            <View className="w-10 h-1 rounded-full bg-gray-300 self-center mb-2.5" />

            {/* Header */}
            <View className="flex-row justify-between items-center pb-2.5 border-b border-gray-100">
              <View>
                <Text className="text-base font-black text-gray-900 tracking-tight">Comments</Text>
                <Text className="text-[11px] text-gray-500 font-medium">
                  Review by {activePostForComments?.author}
                </Text>
              </View>
              <Pressable
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close comments sheet"
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Ionicons name="close" size={18} color="#374151" />
              </Pressable>
            </View>

            <ScrollView className="flex-1 my-2.5" showsVerticalScrollIndicator={false}>
              {activePostForComments?.comments.length === 0 ? (
                <View className="py-10 items-center justify-center">
                  <Ionicons name="chatbubble-ellipses-outline" size={32} color="#9CA3AF" />
                  <Text className="text-xs font-bold text-gray-400 mt-2">
                    No comments yet on this review.
                  </Text>
                  <Text className="text-[11px] text-gray-400 mt-0.5">Be the first Mati diner to reply!</Text>
                </View>
              ) : (
                <View className="gap-2">
                  {activePostForComments?.comments.map((comment) => (
                    <View
                      key={comment.id}
                      className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl"
                    >
                      <View className="flex-row items-center justify-between mb-0.5">
                        <Text className="text-xs font-black text-gray-900">
                          {comment.author}
                        </Text>
                        <Text className="text-[9px] text-gray-400 font-medium">
                          {comment.timestamp}
                        </Text>
                      </View>
                      <Text className="text-[11px] text-gray-700 leading-relaxed font-medium">
                        {comment.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Comment Input */}
            <View className="flex-row items-center gap-1.5 pt-1.5 border-t border-gray-100">
              <TextInput
                placeholder={
                  isLoggedIn ? "Write a comment..." : "Sign in to join the conversation"
                }
                value={newCommentText}
                onChangeText={setNewCommentText}
                editable={isLoggedIn}
                className="flex-1 bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 font-medium"
                placeholderTextColor="#9CA3AF"
              />
              <Pressable
                onPress={handleAddComment}
                className="bg-[#EA5410] px-3.5 py-2 rounded-xl items-center justify-center active:opacity-90"
              >
                <Ionicons name="send" size={13} color="white" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </BottomSheetModal>

      {/* 5. REPORT POST BOTTOM SHEET */}
      <BottomSheetModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        heightPercent={0.72}
      >
        {({ handleDismiss }) => (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="flex-1 bg-white p-4 flex-col"
          >
            {/* Visual Drag Handle Pill */}
            <View className="w-10 h-1 rounded-full bg-gray-300 self-center mb-2.5" />

            {/* Header */}
            <View className="flex-row justify-between items-center pb-2.5 border-b border-gray-100">
              <View className="flex-row items-center gap-2">
                <View className="w-7 h-7 rounded-full bg-rose-50 border border-rose-200 items-center justify-center">
                  <Ionicons name="flag" size={14} color="#E11D48" />
                </View>
                <View>
                  <Text className="text-base font-black text-gray-900 tracking-tight">Report Review</Text>
                  <Text className="text-[11px] text-gray-500 font-medium">
                    Posted by {reportingPost?.author || "Mati Diner"}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Close report modal"
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Ionicons name="close" size={18} color="#374151" />
              </Pressable>
            </View>

            <ScrollView className="flex-1 my-2.5" showsVerticalScrollIndicator={false}>
              {/* Snippet preview */}
              {reportingPost?.content ? (
                <View className="bg-gray-50 border border-gray-200 p-2.5 rounded-xl mb-3">
                  <Text className="text-[11px] text-gray-500 font-medium italic" numberOfLines={2}>
                    "{reportingPost.content}"
                  </Text>
                </View>
              ) : null}

              {/* Reason Selector */}
              <Text className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-1.5">
                Reason for Reporting
              </Text>

              <View className="gap-1.5 mb-3">
                {COMMUNITY_REPORT_REASONS.map((reason) => {
                  const isSelected = reportReason === reason;
                  return (
                    <Pressable
                      key={reason}
                      onPress={() => setReportReason(reason)}
                      className={`p-2.5 rounded-xl border flex-row items-center justify-between ${
                        isSelected
                          ? "bg-rose-50/80 border-rose-300"
                          : "bg-white border-gray-200 active:bg-gray-50"
                      }`}
                    >
                      <View className="flex-row items-center gap-2">
                        <Ionicons
                          name={isSelected ? "radio-button-on" : "radio-button-off"}
                          size={16}
                          color={isSelected ? "#E11D48" : "#9CA3AF"}
                        />
                        <Text
                          className={`text-xs ${
                            isSelected ? "text-rose-950 font-black" : "text-gray-800 font-bold"
                          }`}
                        >
                          {reason}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* Optional Details Input */}
              <Text className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-1.5">
                Additional Details (Optional)
              </Text>
              <TextInput
                value={reportDetails}
                onChangeText={setReportDetails}
                placeholder="Help our moderation team understand the issue..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 font-medium mb-3 min-h-[60px]"
                textAlignVertical="top"
              />
            </ScrollView>

            {/* Action Buttons */}
            <View className="pt-2 border-t border-gray-100 flex-row gap-2">
              <Pressable
                onPress={handleDismiss}
                className="flex-1 py-2.5 bg-gray-100 rounded-xl items-center active:bg-gray-200"
              >
                <Text className="text-xs font-bold text-gray-700">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmitReport}
                disabled={isSubmittingReport}
                className="flex-1 py-2.5 bg-rose-600 rounded-xl items-center active:bg-rose-700"
              >
                {isSubmittingReport ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-xs font-black text-white">Submit Report 🛡️</Text>
                )}
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
