import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

export default function SystemAdminDashboard() {
  const [approvals, setApprovals] = useState([
    { id: "APP-001", store: "Mati Baywalk Seafood Grill", owner: "Ramon Cruz", location: "Baywalk Pavilion, Mati", applied: "1 hour ago", status: "Pending", category: "Seafood" },
    { id: "APP-002", store: "Dahican Beach Bites", owner: "Elena Reyes", location: "Dahican Coast, Mati", applied: "3 hours ago", status: "Pending", category: "Snacks & Drinks" },
    { id: "APP-003", store: "Subangan Street Grills", owner: "Danilo Santos", location: "Brgy. Sainz, Mati", applied: "5 hours ago", status: "Pending", category: "BBQ & Grill" },
  ]);

  const handleApprove = (id: string, name: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    alert(`Approved ${name}! Store is now live on the Mati FoodFinder marketplace.`);
  };

  const handleReject = (id: string, name: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    alert(`Rejected ${name}. Notification sent to applicant.`);
  };

  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      {/* Header */}
      <View className="mb-8 flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <View>
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
              MATI CITY PLATFORM OVERSIGHT
            </Text>
            <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              <Text className="text-[10px] font-black text-emerald-800 uppercase">System Healthy</Text>
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">Platform Administration</Text>
          <Text className="text-gray-500 text-sm mt-1">
            Mati FoodFinder operations, merchant approvals, and real-time delivery activity.
          </Text>
        </View>

        <Pressable
          onPress={() => alert("Audit Log exported: In production, downloads CSV audit report from Supabase.")}
          className="bg-[#111827] px-5 py-3 rounded-2xl hover:bg-black transition-colors shadow-sm flex-row items-center gap-2"
        >
          <Ionicons name="download-outline" size={16} color="white" />
          <Text className="text-white font-extrabold text-xs">Export Audit Report</Text>
        </Pressable>
      </View>

      {/* KPI Stats Grid */}
      <View className="flex-row flex-wrap gap-5 mb-10">
        <View className="flex-1 min-w-[220px] bg-white p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Registered Users</Text>
            <View className="w-9 h-9 rounded-xl bg-blue-100 items-center justify-center">
              <Ionicons name="people" size={18} color="#2563EB" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">4,209</Text>
          <Text className="text-emerald-600 font-bold text-xs mt-2">↑ 12% this month</Text>
        </View>

        <View className="flex-1 min-w-[220px] bg-white p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Active Stores</Text>
            <View className="w-9 h-9 rounded-xl bg-orange-100 items-center justify-center">
              <Ionicons name="storefront" size={18} color="#EA5410" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">5 Verified</Text>
          <Text className="text-[#EA5410] font-bold text-xs mt-2">In Poblacion & Dahican</Text>
        </View>

        <View className="flex-1 min-w-[220px] bg-white p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Pending Approvals</Text>
            <View className="w-9 h-9 rounded-xl bg-amber-100 items-center justify-center">
              <Ionicons name="hourglass" size={18} color="#D97706" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">{approvals.length} Stores</Text>
          <Text className="text-amber-600 font-bold text-xs mt-2">Requires review</Text>
        </View>

        <View className="flex-1 min-w-[220px] bg-white p-6 rounded-3xl shadow-sm border border-gray-200/80">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">COD Gross Volume</Text>
            <View className="w-9 h-9 rounded-xl bg-emerald-100 items-center justify-center">
              <Ionicons name="cash" size={18} color="#047857" />
            </View>
          </View>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">₱148,500</Text>
          <Text className="text-emerald-600 font-bold text-xs mt-2">100% Cash on Delivery</Text>
        </View>
      </View>

      {/* Main Section: Pending Store Approvals + Live Audit Stream */}
      <View className="flex-col xl:flex-row gap-8 w-full">
        {/* Pending Approvals Widget */}
        <View className="flex-[2] bg-white rounded-3xl shadow-sm border border-gray-200/80 overflow-hidden">
          <View className="px-8 py-5 border-b border-gray-100 flex-row justify-between items-center">
            <View>
              <Text className="text-lg font-black text-gray-900">Pending Store Approvals</Text>
              <Text className="text-xs text-gray-400">Applications from Mati restaurant owners awaiting verification</Text>
            </View>
            <Link href="/(web)/system-admin/approvals" asChild>
              <Pressable>
                <Text className="text-xs font-bold text-[#EA5410] hover:underline">View All</Text>
              </Pressable>
            </Link>
          </View>

          {approvals.length === 0 ? (
            <View className="py-16 items-center justify-center">
              <Ionicons name="checkmark-done-circle" size={40} color="#047857" />
              <Text className="text-gray-800 font-bold text-sm mt-3">All store applications processed!</Text>
              <Text className="text-gray-400 text-xs mt-1">No pending merchant verifications in Mati City</Text>
            </View>
          ) : (
            <ScrollView className="max-h-[440px]">
              {approvals.map((app) => (
                <View
                  key={app.id}
                  className="px-8 py-5 border-b border-gray-100 flex-col md:flex-row items-start md:items-center justify-between hover:bg-gray-50/70 transition-colors gap-3"
                >
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="font-black text-gray-900 text-base">{app.store}</Text>
                      <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                        <Text className="text-[10px] font-black text-[#EA5410] uppercase">{app.category}</Text>
                      </View>
                    </View>
                    <Text className="text-xs text-gray-500 font-medium">Owner: {app.owner} • {app.location}</Text>
                    <Text className="text-[11px] text-gray-400 mt-0.5">Applied: {app.applied}</Text>
                  </View>

                  <View className="flex-row items-center gap-2">
                    <Pressable
                      onPress={() => handleApprove(app.id, app.store)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-2xs"
                    >
                      <Text className="text-white font-extrabold text-xs">Approve</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleReject(app.id, app.store)}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
                    >
                      <Text className="text-red-700 font-bold text-xs">Reject</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Live Platform Security Stream */}
        <View className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200/80 p-8 flex-col justify-between">
          <View>
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="shield-outline" size={18} color="#EA5410" />
              <Text className="text-lg font-black text-gray-900">Security & Audit</Text>
            </View>
            <Text className="text-xs text-gray-400 mb-6">Recent system security & identity events</Text>

            <View className="gap-4">
              <View className="pb-3 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-xs font-bold text-gray-900">RLS Policies Enforced</Text>
                  <Text className="text-[10px] text-emerald-600 font-bold">Passing</Text>
                </View>
                <Text className="text-[11px] text-gray-500">Row Level Security verified active across public tables.</Text>
              </View>

              <View className="pb-3 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-xs font-bold text-gray-900">Auth Token Cycles</Text>
                  <Text className="text-[10px] text-emerald-600 font-bold">100% Valid</Text>
                </View>
                <Text className="text-[11px] text-gray-500">GoTrue identity session recovery verified on remote Supabase.</Text>
              </View>

              <View className="pb-3 border-b border-gray-100">
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-xs font-bold text-gray-900">Rider Role Verification</Text>
                  <Text className="text-[10px] text-blue-600 font-bold">Active</Text>
                </View>
                <Text className="text-[11px] text-gray-500">get_my_application_roles RPC enforcing courier claims.</Text>
              </View>

              <View>
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-xs font-bold text-gray-900">COD Settlement Integrity</Text>
                  <Text className="text-[10px] text-emerald-600 font-bold">Audited</Text>
                </View>
                <Text className="text-[11px] text-gray-500">4-digit handshake PIN required on all customer handoffs.</Text>
              </View>
            </View>
          </View>

          <Link href="/(web)/system-admin/metrics" asChild>
            <Pressable className="mt-8 py-3 bg-gray-50 border border-gray-200 rounded-2xl items-center hover:bg-gray-100 transition-colors">
              <Text className="text-xs font-bold text-gray-700">View Full Platform Telemetry</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}
