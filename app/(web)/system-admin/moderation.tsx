import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ModerationPage() {
  const [reports, setReports] = useState([
    {
      id: "REP-001",
      user: "@crypto_king_mati",
      type: "Spam / Commercial Bot",
      time: "25 mins ago",
      content: "Double your GCash in 10 minutes while waiting for your food!! Click the link in my bio.",
      reporter: "Automated Content Filter",
      severity: "high",
    },
    {
      id: "REP-002",
      user: "@unhappy_tourist",
      type: "Harassment / Profanity",
      time: "1 hour ago",
      content: "This stall was completely awful, worst service in Mati, I hope the owner goes bankrupt!! [Repeated expletives removed]",
      reporter: "3 Mati Community Members",
      severity: "medium",
    },
  ]);

  const handleResolve = (id: string, action: string) => {
    setReports((prev) => prev.filter((r) => r.id !== id));
    alert(`Report ${id} resolved with action: ${action}`);
  };

  return (
    <View className="flex-1 p-6 md:p-10 w-full max-w-7xl self-center">
      {/* Header */}
      <View className="mb-8">
        <View className="flex-row items-center gap-2 mb-1">
          <Text className="text-[11px] font-black text-[#EA5410] uppercase tracking-wider">
            COMMUNITY SAFETY
          </Text>
        </View>
        <Text className="text-3xl font-black text-gray-900 tracking-tight">Social Feed Moderation</Text>
        <Text className="text-gray-500 text-sm mt-1">
          Review community reviews, comments, and flagged content to protect Mati diners.
        </Text>
      </View>

      {/* Stats Summary */}
      <View className="flex-row gap-5 mb-8">
        <View className="flex-1 bg-white p-5 rounded-3xl border border-gray-200/80 shadow-2xs">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Pending Flags</Text>
            <View className="w-8 h-8 rounded-xl bg-red-100 items-center justify-center">
              <Ionicons name="flag" size={16} color="#DC2626" />
            </View>
          </View>
          <Text className="text-2xl font-black text-red-600">{reports.length} Reports</Text>
        </View>

        <View className="flex-1 bg-white p-5 rounded-3xl border border-gray-200/80 shadow-2xs">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Resolved Today</Text>
            <View className="w-8 h-8 rounded-xl bg-emerald-100 items-center justify-center">
              <Ionicons name="checkmark-done" size={16} color="#047857" />
            </View>
          </View>
          <Text className="text-2xl font-black text-gray-900">45 Items</Text>
        </View>
      </View>

      {/* Reports List */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {reports.length === 0 ? (
          <View className="bg-white p-16 rounded-3xl border border-gray-200/80 items-center justify-center shadow-sm">
            <Ionicons name="shield-checkmark" size={44} color="#047857" />
            <Text className="text-gray-900 font-black text-base mt-3">Community Feed is Clean</Text>
            <Text className="text-gray-400 text-xs mt-1 text-center max-w-xs">
              No flagged reviews or spam reports currently require moderation in Mati City.
            </Text>
          </View>
        ) : (
          <View className="gap-5">
            {reports.map((report) => (
              <View
                key={report.id}
                className="bg-white p-7 rounded-3xl shadow-sm border border-gray-200/80 flex-col md:flex-row gap-6"
              >
                <View className="flex-1 justify-between">
                  <View>
                    <View className="flex-row items-center gap-2 mb-2">
                      <View
                        className={`px-3 py-1 rounded-full ${
                          report.severity === "high" ? "bg-red-100" : "bg-amber-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-black uppercase ${
                            report.severity === "high" ? "text-red-700" : "text-amber-800"
                          }`}
                        >
                          {report.type}
                        </Text>
                      </View>
                      <Text className="text-gray-400 text-xs font-medium">• {report.time}</Text>
                    </View>

                    <Text className="text-base font-black text-gray-900 mb-1.5">
                      Flagged author: <Text className="text-[#EA5410]">{report.user}</Text>
                    </Text>
                    <View className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-3">
                      <Text className="text-xs text-gray-700 leading-relaxed italic">
                        "{report.content}"
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-400 font-medium">
                      Source: {report.reporter}
                    </Text>
                  </View>

                  <View className="flex-row flex-wrap gap-3 mt-6 pt-4 border-t border-gray-100">
                    <Pressable
                      onPress={() => handleResolve(report.id, "Deleted & User Banned")}
                      className="px-5 py-2.5 bg-red-600 rounded-xl hover:bg-red-700 transition-colors flex-1 md:flex-none items-center shadow-2xs"
                    >
                      <Text className="text-white font-extrabold text-xs">Delete & Ban Account</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleResolve(report.id, "Ignored / Marked Safe")}
                      className="px-5 py-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex-1 md:flex-none items-center"
                    >
                      <Text className="text-gray-700 font-bold text-xs">Dismiss / Mark Safe</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
