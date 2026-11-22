/**
 * components/ui/BarangayAutofillInput.tsx
 *
 * Mati FoodFinder - Text input field with live autofill/autocomplete dropdown for
 * selecting strictly from the 26 official barangays of Mati City.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  MATI_BARANGAYS,
  filterMatiBarangays,
  matchOfficialBarangay,
  MatiBarangay,
} from "../../mock/barangays";

export interface BarangayAutofillInputProps {
  value: string;
  onSelectBarangay: (barangay: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  containerClassName?: string;
  inputClassName?: string;
  helperText?: string;
}

export function BarangayAutofillInput({
  value,
  onSelectBarangay,
  label = "Barangay *",
  placeholder = "Type to search official Mati barangay...",
  required = false,
  error,
  disabled = false,
  containerClassName = "mb-3",
  inputClassName,
  helperText,
}: BarangayAutofillInputProps) {
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const isSelectedRef = useRef(false);

  // Sync internal query when value prop changes externally
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  const filteredBarangays = useMemo(() => {
    return filterMatiBarangays(query);
  }, [query]);

  const handleSelect = (barangay: string) => {
    isSelectedRef.current = true;
    setQuery(barangay);
    onSelectBarangay(barangay);
    setIsOpen(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      const match = matchOfficialBarangay(query);
      if (match) {
        setQuery(match);
        onSelectBarangay(match);
      } else if (value) {
        setQuery(value);
      }
      setIsOpen(false);
    }, 200);
  };

  return (
    <View className={`relative ${containerClassName}`} style={{ zIndex: isOpen ? 50 : 1 }}>
      {label ? (
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-xs font-bold text-gray-700">
            {label}
          </Text>
        </View>
      ) : null}

      {/* Input Field */}
      <View
        className={`flex-row items-center bg-gray-50 border rounded-xl px-3 py-2 ${
          isOpen ? "border-[#EA5410] bg-orange-50/10" : error ? "border-red-300" : "border-gray-200"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <Ionicons name="location-outline" size={16} color={isOpen ? "#EA5410" : "#6B7280"} />
        <TextInput
          value={query}
          onChangeText={(text) => {
            setQuery(text);
            if (!isOpen) setIsOpen(true);
            const directMatch = MATI_BARANGAYS.find(
              (b) => b.toLowerCase() === text.trim().toLowerCase()
            );
            if (directMatch) {
              onSelectBarangay(directMatch);
            }
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          editable={!disabled}
          className={`flex-1 ml-2 text-xs text-gray-900 font-medium ${inputClassName || ""}`}
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery("");
              setIsOpen(true);
            }}
            hitSlop={8}
            className="p-1"
          >
            <Ionicons name="close-circle" size={14} color="#9CA3AF" />
          </Pressable>
        )}
        <Pressable onPress={() => setIsOpen(!isOpen)} hitSlop={8} className="p-1 ml-0.5">
          <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={14} color="#6B7280" />
        </Pressable>
      </View>

      {/* Dropdown Autofill Suggestions List */}
      {isOpen && (
        <View
          className="absolute left-0 right-0 top-[100%] mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
          style={{
            maxHeight: 200,
            elevation: 10,
          }}
        >
          <View className="p-2 border-b border-gray-100 bg-gray-50 flex-row items-center justify-between">
            <Text className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Mati Barangays ({filteredBarangays.length})
            </Text>
            <Text className="text-[10px] text-[#EA5410] font-semibold">Select official barangay</Text>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
            style={{ maxHeight: 160 }}
          >
            {filteredBarangays.length > 0 ? (
              filteredBarangays.map((barangay) => {
                const isSelected = value === barangay;
                return (
                  <Pressable
                    key={barangay}
                    onPress={() => handleSelect(barangay)}
                    className={`flex-row items-center justify-between px-3 py-2.5 border-b border-gray-50 active:bg-orange-50 ${
                      isSelected ? "bg-orange-50/70" : ""
                    }`}
                  >
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name="navigate-outline"
                        size={13}
                        color={isSelected ? "#EA5410" : "#6B7280"}
                      />
                      <Text
                        className={`text-xs ${
                          isSelected ? "font-bold text-[#EA5410]" : "text-gray-800"
                        }`}
                      >
                        {barangay}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color="#EA5410" />
                    )}
                  </Pressable>
                );
              })
            ) : (
              <View className="p-3 items-center">
                <Text className="text-xs text-gray-500">No matching official barangay</Text>
                <Text className="text-[10px] text-gray-400 mt-0.5">
                  Must be one of Mati's 26 official barangays
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {error ? (
        <Text className="text-[10px] text-red-600 mt-1">{error}</Text>
      ) : helperText ? (
        <Text className="text-[10px] text-gray-500 mt-1">{helperText}</Text>
      ) : null}
    </View>
  );
}
