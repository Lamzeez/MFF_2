import React, { useState, useEffect } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchAdminModerationReportsWithStatus,
  moderateReportedPost,
  ModerationReport,
} from "../../../services/community";
import { NotificationBanner, type BannerMessage } from "../../../components/ui/NotificationBanner";

export default function ModerationPage() {
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [resolvedCount, setResolvedCount] = useState<number>(0);
  const [banner, setBanner] = useState<BannerMessage | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const { reports: allReports, error } = await fetchAdminModerationReportsWithStatus();
      if (error) {
        setReports([]);
        setResolvedCount(0);
        setBanner({
          type: "error",
          message: `Could not load moderation reports: ${error}`,
        });
        return;
      }

      setReports(allReports.filter((r) => r.status === "pending"));
      setResolvedCount(allReports.filter((r) => r.status !== "pending").length);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not load moderation reports.";
      setReports([]);
      setResolvedCount(0);
      setBanner({
        type: "error",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleAction = async (reportId: string, action: "hide" | "delete" | "dismiss") => {
    setActionInProgress(reportId);
    try {
      await moderateReportedPost(reportId, action);
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setResolvedCount((c) => c + 1);
      setBanner({
        type: "success",
        message:
          action === "delete"
            ? "Post deleted."
            : action === "hide"
            ? "Post hidden."
            : "Report dismissed.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update moderation report.";
      setBanner({
        type: "error",
        message,
      });
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <View className="flex-1 p-4 lg:p-6 w-full max-w-6xl self-center">
      {/* Header */}
      <View className="mb-5">
        <Text className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">
          Moderation
        </Text>
        <Text className="text-gray-500 text-xs mt-0.5">
          Review and resolve reported community posts.
        </Text>
      </View>

      {/* Notification Banner */}
      <NotificationBanner banner={banner} onDismiss={() => setBanner(null)} />

      {/* Stats Summary */}
      <View className="flex-col sm:flex-row gap-3.5 mb-5">
        <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Pending Reports
            </Text>
            <View className="w-7 h-7 rounded-lg bg-rose-100 items-center justify-center">
              <Ionicons name="flag" size={14} color="#E11D48" />
            </View>
          </View>
          <Text className="text-xl font-bold text-rose-600">{reports.length}</Text>
        </View>

        <View className="flex-1 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Resolved
            </Text>
            <View className="w-7 h-7 rounded-lg bg-emerald-100 items-center justify-center">
              <Ionicons name="checkmark-done" size={14} color="#047857" />
            </View>
          </View>
          <Text className="text-xl font-bold text-gray-900">{resolvedCount}</Text>
        </View>
      </View>

      {/* Reports List */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View className="py-14 items-center justify-center">
            <ActivityIndicator size="small" color="#EA5410" />
            <Text className="text-[11px] font-semibold text-gray-500 mt-2">Loading reports...</Text>
          </View>
        ) : reports.length === 0 ? (
          <View className="bg-white p-12 rounded-2xl border border-gray-200/80 items-center justify-center shadow-2xs">
            <Ionicons name="checkmark-done-circle-outline" size={32} color="#047857" />
            <Text className="text-gray-900 font-bold text-sm mt-2.5">No Pending Reports</Text>
            <Text className="text-gray-400 text-[11px] mt-1 text-center max-w-xs">
              All reported community posts have been reviewed.
            </Text>
          </View>
        ) : (
          <View className="gap-3.5 pb-6">
            {reports.map((report) => (
              <View
                key={report.id}
                className="bg-white p-4 lg:p-5 rounded-2xl shadow-2xs border border-gray-200/80 flex-col lg:flex-row gap-4"
              >
                <View className="flex-1 justify-between">
                  <View>
                    <View className="flex-row items-center gap-2 mb-1.5 flex-wrap">
                      <View className="px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-200">
                        <Text className="text-[10px] font-bold uppercase text-rose-800">
                          {report.reason}
                        </Text>
                      </View>
                      <Text className="text-gray-400 text-[11px] font-medium">
                        • {new Date(report.createdAt).toLocaleDateString()}{" "}
                        {new Date(report.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>

                    <Text className="text-sm font-bold text-gray-900 mb-1.5">
                      Author: <Text className="text-[#EA5410]">{report.postAuthor}</Text>
                    </Text>
                    <View className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-2">
                      <Text className="text-xs text-gray-700 leading-relaxed italic">
                        "{report.postContent}"
                      </Text>
                    </View>
                    <Text className="text-[11px] text-gray-400 font-medium">
                      Reported by: {report.reporterName || "Community Member"}
                      {report.details ? ` (${report.details})` : ""}
                    </Text>
                  </View>

                  {/* Action Row */}
                  <View className="flex-row flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                    <Pressable
                      disabled={actionInProgress === report.id}
                      onPress={() => handleAction(report.id, "delete")}
                      className="px-3.5 py-2 bg-rose-600 rounded-lg hover:bg-rose-700 active:bg-rose-800 transition-colors flex-1 md:flex-none items-center shadow-2xs"
                    >
                      <Text className="text-white font-semibold text-xs">Delete Post</Text>
                    </Pressable>

                    <Pressable
                      disabled={actionInProgress === report.id}
                      onPress={() => handleAction(report.id, "hide")}
                      className="px-3.5 py-2 bg-amber-600 rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors flex-1 md:flex-none items-center shadow-2xs"
                    >
                      <Text className="text-white font-semibold text-xs">Hide Post</Text>
                    </Pressable>

                    <Pressable
                      disabled={actionInProgress === report.id}
                      onPress={() => handleAction(report.id, "dismiss")}
                      className="px-3.5 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors flex-1 md:flex-none items-center border border-gray-200"
                    >
                      <Text className="text-gray-700 font-semibold text-xs">Dismiss</Text>
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
