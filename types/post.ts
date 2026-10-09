/**
 * Social Foodie Feed Types for Mati FoodFinder
 */

export interface FeedComment {
  id: string;
  author: string;
  avatarColor: string;
  text: string;
  timestamp: string;
}

export interface SocialPost {
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
  imageUrl?: string;
  likes: number;
  hasLiked: boolean;
  comments: FeedComment[];
  createdAt?: string;
  engagementScore?: number;
  isTrending?: boolean;
  isPhotoVerified?: boolean;
  isPopularEatery?: boolean;
}
