# Mati FoodFinder (MFF) 🍔📍

Mati FoodFinder is a unified food discovery, reservation, and delivery network exclusively built for Mati City. 

This repository contains the Universal Frontend Application (Web + Mobile) built with **React Native**, **Expo Router**, and **NativeWind (Tailwind CSS)**.

## Features
- **Unified Codebase:** A single React Native codebase that deploys to both the Web (Dashboards/Portal) and Mobile Apps (iOS/Android).
- **Role-Based Portals:**
  - **System Admin Dashboard:** For developers to manage approvals, moderation, and view platform metrics.
  - **Store Admin (Karenderias):** A desktop web dashboard for heavy-duty analytics/billing, and a dedicated "Merchant Mode" in the mobile app for fast-paced kitchen operations.
  - **Hungry Locals & Riders:** A dedicated mobile experience for browsing live menus, viewing maps, and accepting Cash-on-Delivery (COD) orders.
- **Modern Styling:** Powered by NativeWind v4 and Tailwind CSS.
- **Smart Personalization:** (Upcoming) Machine Learning algorithms analyzing order history and favorite spots to provide personalized food recommendations.

## Tech Stack
* **Framework:** React Native + Expo (SDK 51+)
* **Routing:** Expo Router (File-based routing)
* **Styling:** NativeWind v4 + Tailwind CSS
* **Database & Auth (Backend Placeholder):** Supabase (PostgreSQL)
* **Payments (Upcoming):** PayMongo

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed.

### Installation
```bash
# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

### Testing on Mobile (LDPlayer / Android Emulator)
If you are running LDPlayer or a physical device:
```bash
# Run with a tunnel if local network is blocking connection
npx expo start --tunnel
```

---
*Built exclusively for Mati City, Philippines.*
