/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateEngagementScore,
  isPopularMatiEatery,
  ENGAGEMENT_WEIGHTS,
} from "../../services/community";

test("isPopularMatiEatery identifies canonical Mati culinary spots case-insensitively", () => {
  assert.equal(isPopularMatiEatery("Mama Letty's Karenderia"), true);
  assert.equal(isPopularMatiEatery("mama letty"), true);
  assert.equal(isPopularMatiEatery("MATI BAYWALK SEAFOOD GRILL"), true);
  assert.equal(isPopularMatiEatery("Subangan Street Grills"), true);
  assert.equal(isPopularMatiEatery("Dahican Beach Bites"), true);
  assert.equal(isPopularMatiEatery("Aling Nena's Kitchen"), true);

  // Unrelated or empty restaurant names
  assert.equal(isPopularMatiEatery("Random Manila Bistro"), false);
  assert.equal(isPopularMatiEatery(""), false);
  assert.equal(isPopularMatiEatery(null), false);
  assert.equal(isPopularMatiEatery(undefined), false);
});

test("calculateEngagementScore awards photo bonus for verified dish photos", () => {
  const refTime = Date.now();
  const createdAt = new Date(refTime).toISOString();

  const photoReview = calculateEngagementScore(
    {
      likesCount: 5,
      commentsCount: 2,
      hasPhoto: true,
      rating: 5,
      taggedRestaurant: "Mama Letty's Karenderia",
      createdAt,
    },
    refTime
  );

  const textOnlyReview = calculateEngagementScore(
    {
      likesCount: 5,
      commentsCount: 2,
      hasPhoto: false,
      rating: 5,
      taggedRestaurant: "Mama Letty's Karenderia",
      createdAt,
    },
    refTime
  );

  assert.equal(photoReview.photoBonus, ENGAGEMENT_WEIGHTS.PHOTO_BONUS);
  assert.equal(textOnlyReview.photoBonus, 0);
  assert.equal(photoReview.baseScore - textOnlyReview.baseScore, ENGAGEMENT_WEIGHTS.PHOTO_BONUS);
  assert.ok(photoReview.finalScore > textOnlyReview.finalScore);
});

test("calculateEngagementScore boosts popular Mati eateries with tagged bonuses", () => {
  const refTime = Date.now();
  const createdAt = new Date(refTime).toISOString();

  const popularEateryReview = calculateEngagementScore(
    {
      likesCount: 3,
      commentsCount: 1,
      hasPhoto: true,
      rating: 5,
      taggedRestaurant: "Mati Baywalk Seafood Grill",
      createdAt,
    },
    refTime
  );

  const genericTaggedReview = calculateEngagementScore(
    {
      likesCount: 3,
      commentsCount: 1,
      hasPhoto: true,
      rating: 5,
      taggedRestaurant: "Generic Cafe XYZ",
      createdAt,
    },
    refTime
  );

  const untaggedReview = calculateEngagementScore(
    {
      likesCount: 3,
      commentsCount: 1,
      hasPhoto: true,
      rating: 5,
      taggedRestaurant: undefined,
      createdAt,
    },
    refTime
  );

  // Tagged popular eatery gets both TAGGED_RESTAURANT_BONUS and POPULAR_EATERY_BONUS
  assert.equal(popularEateryReview.restaurantBonus, ENGAGEMENT_WEIGHTS.TAGGED_RESTAURANT_BONUS);
  assert.equal(popularEateryReview.popularEateryBonus, ENGAGEMENT_WEIGHTS.POPULAR_EATERY_BONUS);

  // Generic tagged gets only TAGGED_RESTAURANT_BONUS
  assert.equal(genericTaggedReview.restaurantBonus, ENGAGEMENT_WEIGHTS.TAGGED_RESTAURANT_BONUS);
  assert.equal(genericTaggedReview.popularEateryBonus, 0);

  // Untagged gets neither
  assert.equal(untaggedReview.restaurantBonus, 0);
  assert.equal(untaggedReview.popularEateryBonus, 0);

  assert.ok(popularEateryReview.finalScore > genericTaggedReview.finalScore);
  assert.ok(genericTaggedReview.finalScore > untaggedReview.finalScore);
});

test("verified photo review of a popular Mati eatery outranks text-only review with higher likes", () => {
  const refTime = Date.now();
  // Both posted 2 hours ago
  const twoHoursAgo = new Date(refTime - 2 * 60 * 60 * 1000).toISOString();

  // Photo review of Mama Letty's with only 4 likes and 1 comment
  const photoMamaLetty = calculateEngagementScore(
    {
      likesCount: 4,
      commentsCount: 1,
      hasPhoto: true,
      rating: 5,
      taggedRestaurant: "Mama Letty's Karenderia",
      createdAt: twoHoursAgo,
    },
    refTime
  );

  // Text-only review with 15 likes but no photo and no restaurant
  const textOnlyHighLikes = calculateEngagementScore(
    {
      likesCount: 15,
      commentsCount: 0,
      hasPhoto: false,
      rating: 5,
      taggedRestaurant: undefined,
      createdAt: twoHoursAgo,
    },
    refTime
  );

  // Verified photo of popular spot trends higher despite lower like count
  assert.ok(
    photoMamaLetty.finalScore > textOnlyHighLikes.finalScore,
    `Expected photo score (${photoMamaLetty.finalScore}) to exceed text score (${textOnlyHighLikes.finalScore})`
  );
});

test("time decay factor applies gravity so fresh posts trend over aged posts", () => {
  const refTime = Date.now();
  const freshPostTime = new Date(refTime - 1 * 60 * 60 * 1000).toISOString(); // 1 hour ago
  const oldPostTime = new Date(refTime - 96 * 60 * 60 * 1000).toISOString(); // 4 days ago

  const freshPost = calculateEngagementScore(
    {
      likesCount: 10,
      commentsCount: 3,
      hasPhoto: true,
      rating: 5,
      taggedRestaurant: "Dahican Beach Bites",
      createdAt: freshPostTime,
    },
    refTime
  );

  const oldPost = calculateEngagementScore(
    {
      likesCount: 10,
      commentsCount: 3,
      hasPhoto: true,
      rating: 5,
      taggedRestaurant: "Dahican Beach Bites",
      createdAt: oldPostTime,
    },
    refTime
  );

  assert.equal(freshPost.baseScore, oldPost.baseScore);
  assert.ok(freshPost.timeDecayFactor > oldPost.timeDecayFactor);
  assert.ok(freshPost.finalScore > oldPost.finalScore);
});
