import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  MAX_MENU_ITEM_IMAGE_BYTES,
  resolveMerchantImageMimeType,
  validateMerchantImageFile,
} from "../../lib/merchant-validation";

export interface SelectedMerchantImageAsset {
  blobOrUri: Blob | string;
  previewUri: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  isObjectUrl?: boolean;
}

interface ImageUploadDropzoneProps {
  title: string;
  subtitle: string;
  previewUrl?: string | null;
  variant?: "compact" | "square" | "banner";
  maxSizeBytes?: number;
  disabled?: boolean;
  uploading?: boolean;
  error?: string | null;
  onSelectAsset: (asset: SelectedMerchantImageAsset) => void;
  onRemoveAsset?: () => void;
  onValidationError?: (message: string) => void;
}

export function ImageUploadDropzone({
  title,
  subtitle,
  previewUrl,
  variant = "compact",
  maxSizeBytes = MAX_MENU_ITEM_IMAGE_BYTES,
  disabled = false,
  uploading = false,
  error = null,
  onSelectAsset,
  onRemoveAsset,
  onValidationError,
}: ImageUploadDropzoneProps) {
  const dropZoneRef = useRef<View | null>(null);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const reportError = useCallback(
    (msg: string) => {
      onValidationError?.(msg);
    },
    [onValidationError]
  );

  const handleWebFile = useCallback(
    (file: File) => {
      const mimeType = resolveMerchantImageMimeType({
        mimeType: file.type,
        fileName: file.name,
      });
      const validationError = validateMerchantImageFile(
        {
          mimeType,
          fileName: file.name,
          sizeBytes: file.size,
        },
        maxSizeBytes
      );
      if (validationError) {
        reportError(validationError);
        return;
      }

      const previewUri =
        typeof URL !== "undefined" ? URL.createObjectURL(file) : "";
      onSelectAsset({
        blobOrUri: file,
        previewUri,
        fileName: file.name,
        mimeType: mimeType || "image/jpeg",
        sizeBytes: file.size,
        isObjectUrl: Boolean(previewUri),
      });
    },
    [maxSizeBytes, onSelectAsset, reportError]
  );

  useEffect(() => {
    if (Platform.OS !== "web" || disabled) return;
    const node = dropZoneRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== "function") return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current += 1;
      setIsDragging(true);
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepthRef.current = 0;
      setIsDragging(false);
      if (uploading || disabled) return;
      const file = e.dataTransfer?.files?.[0];
      if (file) {
        handleWebFile(file);
      }
    };

    node.addEventListener("dragenter", handleDragEnter);
    node.addEventListener("dragover", handleDragOver);
    node.addEventListener("dragleave", handleDragLeave);
    node.addEventListener("drop", handleDrop);

    return () => {
      node.removeEventListener("dragenter", handleDragEnter);
      node.removeEventListener("dragover", handleDragOver);
      node.removeEventListener("dragleave", handleDragLeave);
      node.removeEventListener("drop", handleDrop);
    };
  }, [disabled, handleWebFile, uploading]);

  const handleBrowse = async () => {
    if (disabled || uploading) return;

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/jpeg,image/png,image/webp";
      input.onchange = (e: Event) => {
        const target = e.target as HTMLInputElement | null;
        const file = target?.files?.[0];
        if (file) {
          handleWebFile(file);
        }
      };
      input.click();
      return;
    }

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        reportError("Allow photo library access to select an image.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const picked = result.assets[0];
      const mimeType = resolveMerchantImageMimeType({
        mimeType: picked.mimeType,
        fileName: picked.fileName,
      });
      const validationError = validateMerchantImageFile(
        {
          mimeType: mimeType || "image/jpeg",
          fileName: picked.fileName,
          sizeBytes: typeof picked.fileSize === "number" ? picked.fileSize : undefined,
        },
        maxSizeBytes
      );
      if (validationError) {
        reportError(validationError);
        return;
      }

      onSelectAsset({
        blobOrUri: picked.uri,
        previewUri: picked.uri,
        fileName: picked.fileName || "image.jpg",
        mimeType: mimeType || "image/jpeg",
        sizeBytes: picked.fileSize,
      });
    } catch {
      reportError("Could not open your photo library. Please try again.");
    }
  };

  const maxMb = Math.round(maxSizeBytes / (1024 * 1024));

  const previewClass =
    variant === "banner"
      ? "w-full h-32 rounded-xl bg-gray-100 border border-gray-200"
      : variant === "square"
        ? "w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 shrink-0"
        : "w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 shrink-0";

  return (
    <View>
      <View
        ref={dropZoneRef}
        className={`rounded-xl border border-dashed p-3 transition-colors ${
          error
            ? "border-rose-400 bg-rose-50/40"
            : isDragging
              ? "border-[#EA5410] bg-orange-50/70"
              : "border-gray-300 bg-gray-50/80 hover:border-[#EA5410]/60"
        }`}
      >
        {previewUrl ? (
          <View
            className={
              variant === "banner"
                ? "gap-2.5"
                : "flex-row items-center gap-3"
            }
          >
            <Image
              source={{ uri: previewUrl }}
              className={previewClass}
              resizeMode="cover"
            />
            <View className="flex-1 min-w-0">
              <Text className="text-xs font-bold text-gray-900" numberOfLines={1}>
                {title}
              </Text>
              <Text className="text-[11px] text-gray-500 mt-0.5">
                {uploading
                  ? "Uploading photo..."
                  : isDragging
                    ? "Drop to replace this photo"
                    : "Drop a new file or click Change to update."}
              </Text>
              <View className="flex-row flex-wrap items-center gap-2 mt-2">
                <Pressable
                  disabled={disabled || uploading}
                  onPress={handleBrowse}
                  className="h-7 px-2.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 flex-row items-center gap-1 cursor-pointer"
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#EA5410" />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={12} color="#374151" />
                  )}
                  <Text className="text-[11px] font-semibold text-gray-700">
                    {uploading ? "Uploading..." : "Change"}
                  </Text>
                </Pressable>
                {onRemoveAsset && !uploading ? (
                  <Pressable
                    disabled={disabled}
                    onPress={onRemoveAsset}
                    className="h-7 px-2.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 flex-row items-center gap-1 cursor-pointer"
                  >
                    <Ionicons name="trash-outline" size={12} color="#e11d48" />
                    <Text className="text-[11px] font-semibold text-rose-600">Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            disabled={disabled || uploading}
            onPress={handleBrowse}
            className="items-center justify-center py-2.5 px-2 cursor-pointer"
          >
            <View className="w-8 h-8 rounded-full bg-white border border-gray-200 items-center justify-center mb-1.5 shadow-2xs">
              {uploading ? (
                <ActivityIndicator size="small" color="#EA5410" />
              ) : (
                <Ionicons
                  name={isDragging ? "arrow-down-circle" : "cloud-upload-outline"}
                  size={16}
                  color="#EA5410"
                />
              )}
            </View>
            <Text className="text-xs font-bold text-gray-800 text-center">
              {uploading
                ? "Uploading photo..."
                : isDragging
                  ? "Drop image to upload"
                  : title}
            </Text>
            <Text className="text-[11px] text-gray-500 text-center mt-0.5">
              {subtitle}
            </Text>
            <Text className="text-[10px] text-gray-400 text-center mt-1">
              Drag & drop or click to browse • JPEG, PNG, WebP up to {maxMb}MB
            </Text>
          </Pressable>
        )}
      </View>

      {error ? (
        <Text className="text-[11px] font-semibold text-rose-600 mt-1">{error}</Text>
      ) : null}
    </View>
  );
}
