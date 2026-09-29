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
import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { SocialPost } from "../../../types/post";
import { SEED_SOCIAL_POSTS } from "../../../mock/posts";
import { MATI_RESTAURANTS_DATA } from "../../../mock/restaurants";

export default function MobileCommunityScreen() {
  const { isLoggedIn, user, loginAsRegistered } = useAuth();
  const router = useRouter();

  // Social Posts State
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>(SEED_SOCIAL_POSTS);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activePostForComments, setActivePostForComments] = useState<SocialPost | null>(null);
  const [showGuestGateModal, setShowGuestGateModal] = useState(false);
  const [guestGateAction, setGuestGateAction] = useState<string>("post reviews to the foodie community");

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
      avatarColor: "bg-emerald-600",
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
  const handleCreatePost = () => {
    if (!newPostText.trim()) {
      Alert.alert("Missing Content", "Please share something about your food trip in Mati City.");
      return;
    }

    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      author: user?.name || "Juan dela Cruz",
      authorInitial: (user?.name || "J")[0].toUpperCase(),
      avatarBg: "bg-emerald-600",
      roleBadge: "Verified Foodie",
      timestamp: "Just now",
      content: newPostText.trim(),
      rating: newPostRestaurant !== "None" ? newPostRating : undefined,
      taggedRestaurant: newPostRestaurant !== "None" ? newPostRestaurant : undefined,
      taggedDish: newPostDish.trim() ? newPostDish.trim() : undefined,
      likes: 0,
      hasLiked: false,
      comments: [],
    };

    setSocialPosts([newPost, ...socialPosts]);
    setShowCreateModal(false);
    setNewPostText("");
    setNewPostRestaurant("None");
    setNewPostDish("");
    setNewPostRating(5);
    Alert.alert("Posted! 🎉", "Your food review is now live in the Mati Foodie Community.");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Top Header */}
      <View className="px-5 pt-3.5 pb-3 bg-white border-b border-gray-100 shadow-xs">
        <View className="flex-row justify-between items-center">
          <View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                Mati Community
              </Text>
              <View className="bg-emerald-100 px-1.5 py-0.2 rounded-full">
                <Text className="text-[10px] font-bold text-emerald-800">Live</Text>
              </View>
            </View>
            <Text className="text-xl font-black text-gray-900 tracking-tight">
              Foodie Reviews & Feed
            </Text>
          </View>

          <Pressable
            onPress={() => {
              if (verifyRegisteredUser("post reviews to the foodie community")) {
                setShowCreateModal(true);
              }
            }}
            className="bg-emerald-700 px-3.5 py-2 rounded-xl flex-row items-center gap-1.5 shadow-xs"
          >
            <Ionicons name="create-outline" size={15} color="white" />
            <Text className="text-white font-bold text-xs">Write Review</Text>
          </Pressable>
        </View>
      </View>

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
              className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg flex-row items-center gap-1"
            >
              <Ionicons name="add" size={14} color="#047857" />
              <Text className="text-emerald-800 font-bold text-xs">Share</Text>
            </Pressable>
          </View>
        </View>

        {/* Community Feed Notice */}
        <View className="mx-5 mt-4 flex-row items-center justify-between">
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
                <View className="mb-2.5 flex-row items-center">
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
                  </View>
                </View>
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
                {["None", ...Object.keys(MATI_RESTAURANTS_DATA)].map((resto) => {
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
            <View className="w-14 h-14 bg-orange-100 rounded-2xl items-center justify-center self-center mb-3">
              <Ionicons name="chatbubbles" size={28} color="#ea580c" />
            </View>
            <Text className="text-lg font-black text-gray-900 text-center mb-1">
              Join Mati Foodies
            </Text>
            <Text className="text-xs text-gray-500 text-center mb-5 leading-relaxed">
              Please sign in or create an account to {guestGateAction}.
            </Text>

            <Pressable
              onPress={() => {
                loginAsRegistered("Juan dela Cruz", "juan.mati@example.com");
                setShowGuestGateModal(false);
                Alert.alert(
                  "Welcome, Juan!",
                  "You are now signed in. You can now post reviews, like posts, and join conversations!"
                );
              }}
              className="w-full py-3.5 bg-emerald-700 rounded-xl items-center shadow-md mb-2.5"
            >
              <Text className="text-white font-bold text-sm">Quick Demo Sign In</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setShowGuestGateModal(false);
                router.push("/(mobile)/(tabs)/profile");
              }}
              className="w-full py-2.5 bg-gray-100 rounded-xl items-center mb-2"
            >
              <Text className="text-gray-700 font-bold text-xs">Go to Login / Register</Text>
            </Pressable>

            <Pressable
              onPress={() => setShowGuestGateModal(false)}
              className="py-2 items-center"
            >
              <Text className="text-xs text-gray-400 font-medium">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
