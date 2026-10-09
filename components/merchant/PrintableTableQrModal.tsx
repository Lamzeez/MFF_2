import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { toQR } from "toqr";
import { BottomSheetModal } from "../ui/BottomSheetModal";

interface PrintableTableQrModalProps {
  visible: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
}

const TABLE_PRESETS = [
  "Counter Stand",
  "Table 1",
  "Table 2",
  "Table 3",
  "Table 4",
  "Table 5",
  "Table 6",
  "Patio A",
  "Patio B",
];

export function PrintableTableQrModal({
  visible,
  onClose,
  storeId,
  storeName,
}: PrintableTableQrModalProps) {
  const [selectedTable, setSelectedTable] = useState("Table 1");

  // Construct check-in QR payload
  const checkInPayload = useMemo(() => {
    return `mff://check-in?storeId=${encodeURIComponent(
      storeId
    )}&storeName=${encodeURIComponent(storeName)}&table=${encodeURIComponent(
      selectedTable
    )}`;
  }, [storeId, storeName, selectedTable]);

  // Generate SVG QR Matrix
  const { svgMarkup, svgDataUri, dimension } = useMemo(() => {
    try {
      const modules = toQR(checkInPayload);
      const n = Math.round(Math.sqrt(modules.length));
      const size = 260;
      const cellSize = size / n;

      let rects = "";
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (modules[r * n + c] === 1) {
            rects += `<rect x="${(c * cellSize).toFixed(2)}" y="${(
              r * cellSize
            ).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(
              2
            )}" fill="#111827"/>`;
          }
        }
      }

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#FFFFFF"/>${rects}</svg>`;
      const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

      return { svgMarkup: svg, svgDataUri: dataUri, dimension: n };
    } catch {
      return { svgMarkup: "", svgDataUri: "", dimension: 21 };
    }
  }, [checkInPayload]);

  // Print Action (Web Print Dialog or Native Sharing)
  const handlePrint = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Stand - ${storeName} (${selectedTable})</title>
              <style>
                @page { size: A6 portrait; margin: 10mm; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  margin: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  background: #f8fafc;
                }
                .stand-card {
                  width: 380px;
                  background: white;
                  border: 2px solid #e2e8f0;
                  border-radius: 24px;
                  padding: 28px;
                  text-align: center;
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .brand-badge {
                  background: #ea5410;
                  color: white;
                  font-size: 11px;
                  font-weight: 900;
                  letter-spacing: 1px;
                  text-transform: uppercase;
                  padding: 6px 14px;
                  border-radius: 20px;
                  display: inline-block;
                  margin-bottom: 14px;
                }
                .store-title {
                  font-size: 22px;
                  font-weight: 900;
                  color: #0f172a;
                  margin: 0 0 4px 0;
                }
                .table-title {
                  font-size: 14px;
                  font-weight: 700;
                  color: #ea5410;
                  margin: 0 0 18px 0;
                }
                .qr-container {
                  background: white;
                  padding: 14px;
                  border: 3px solid #0f172a;
                  border-radius: 20px;
                  display: inline-block;
                  margin-bottom: 16px;
                }
                .instructions {
                  font-size: 12px;
                  color: #475569;
                  line-height: 1.5;
                  margin: 0;
                  font-weight: 600;
                }
                @media print {
                  body { background: white; }
                  .stand-card { border: 2px solid #cbd5e1; box-shadow: none; width: 100%; max-width: 400px; }
                }
              </style>
            </head>
            <body>
              <div class="stand-card">
                <div class="brand-badge">Mati FoodFinder Check-In</div>
                <h1 class="store-title">${storeName}</h1>
                <p class="table-title">${selectedTable}</p>
                <div class="qr-container">
                  ${svgMarkup}
                </div>
                <p class="instructions">
                  Scan with your mobile camera to check in,<br/>
                  browse today's menu, and earn foodie rewards!
                </p>
              </div>
              <script>
                window.onload = function() { window.print(); }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else {
      Alert.alert(
        "Table Stand Ready! 🖨️",
        `High-resolution QR Stand generated for ${storeName} - ${selectedTable}.\n\nPayload: ${checkInPayload}\n\nOn computer web, click 'Print Stand' to open the instant A6 print template.`
      );
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} heightPercent={0.88}>
      {({ handleDismiss }) => (
        <View className="flex-1 bg-white p-5 flex-col">
          {/* Drag Handle */}
          <View className="w-12 h-1.5 rounded-full bg-gray-300 self-center mb-3" />

          {/* Header */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
            <View>
              <Text className="text-xl font-black text-gray-900 tracking-tight">
                Print Table QR Stand
              </Text>
              <Text className="text-xs text-[#EA5410] font-bold">
                High-Resolution Scannable Stand for Dining Tables
              </Text>
            </View>
            <Pressable
              onPress={handleDismiss}
              accessibilityRole="button"
              accessibilityLabel="Close stand generator"
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200"
            >
              <Ionicons name="close" size={20} color="#374151" />
            </Pressable>
          </View>

          <ScrollView className="flex-1 mt-3" showsVerticalScrollIndicator={false}>
            {/* Table Selector */}
            <Text className="text-xs font-bold text-gray-700 mb-1.5">
              Select Table Designation
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              contentContainerStyle={{ paddingRight: 10 }}
            >
              {TABLE_PRESETS.map((tbl) => {
                const isSelected = selectedTable === tbl;
                return (
                  <Pressable
                    key={tbl}
                    onPress={() => setSelectedTable(tbl)}
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
                      {tbl}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Stand Card Preview (A6 Table Stand Format) */}
            <View className="bg-slate-50 p-5 rounded-3xl border border-slate-200 items-center shadow-xs mb-4">
              <View className="bg-[#EA5410] px-3.5 py-1 rounded-full mb-3 shadow-xs">
                <Text className="text-[10px] font-black text-white uppercase tracking-wider">
                  MATI FOODFINDER CHECK-IN
                </Text>
              </View>

              <Text className="text-xl font-black text-gray-900 text-center mb-0.5">
                {storeName}
              </Text>
              <Text className="text-xs font-extrabold text-[#EA5410] mb-4">
                {selectedTable}
              </Text>

              {/* Scannable QR Frame */}
              <View className="w-56 h-56 bg-white p-3 border-4 border-gray-900 rounded-3xl items-center justify-center mb-4 shadow-sm">
                {svgDataUri ? (
                  <Image
                    source={{ uri: svgDataUri }}
                    className="w-full h-full"
                    resizeMode="contain"
                  />
                ) : (
                  <View className="items-center justify-center">
                    <Ionicons name="qr-code" size={60} color="#EA5410" />
                    <Text className="text-xs font-bold text-gray-500 mt-2">
                      Generating QR...
                    </Text>
                  </View>
                )}
              </View>

              <Text className="text-xs font-bold text-gray-700 text-center max-w-[240px] leading-relaxed">
                Scan with your phone camera to check in, browse today's menu, and earn loyalty points!
              </Text>
              <Text className="text-[10px] text-gray-400 mt-1">
                Standard {dimension}x{dimension} ISO Matrix
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="gap-2.5 mb-6">
              <Pressable
                onPress={handlePrint}
                className="py-3.5 bg-[#EA5410] rounded-2xl items-center flex-row justify-center gap-2 shadow-sm active:opacity-90"
              >
                <Ionicons name="print-outline" size={18} color="white" />
                <Text className="text-white font-black text-sm">
                  Print Stand Card (A6 / Acrylic) 🖨️
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Check-In QR Payload",
                    checkInPayload,
                    [
                      {
                        text: "Done",
                      },
                    ]
                  );
                }}
                className="py-3 bg-gray-100 rounded-2xl items-center border border-gray-200 active:bg-gray-200"
              >
                <Text className="text-gray-700 font-bold text-xs">
                  Inspect Raw QR Payload Link
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      )}
    </BottomSheetModal>
  );
}
