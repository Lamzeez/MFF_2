import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";

/**
 * Temporary System Admin access gate.
 *
 * This is a frontend-only placeholder until Supabase Auth is wired in.
 * Once the backend exists, replace this with a real admin login screen that
 * authenticates against Supabase and checks an `admin` role claim — never
 * rely on a client-side password in production.
 *
 * The passphrase is read from the EXPO_PUBLIC_ADMIN_PASSPHRASE env var so it
 * is not hardcoded in the repo. In development it falls back to "mff-admin".
 */
const ADMIN_PASSPHRASE =
  process.env.EXPO_PUBLIC_ADMIN_PASSPHRASE ?? (__DEV__ ? "mff-admin" : "");

export default function SystemAdminGate({
  onUnlock,
}: {
  onUnlock: () => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (ADMIN_PASSPHRASE && input === ADMIN_PASSPHRASE) {
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-green-900 px-6">
      <View className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
        <Text className="text-2xl font-extrabold text-gray-900 mb-1">
          MFF Admin
        </Text>
        <Text className="text-gray-500 mb-6">
          Restricted area. Enter the admin passphrase to continue.
        </Text>
        <TextInput
          value={input}
          onChangeText={(t) => {
            setInput(t);
            setError(false);
          }}
          placeholder="Admin passphrase"
          secureTextEntry
          autoFocus
          onSubmitEditing={handleSubmit}
          className={`border rounded-xl px-4 py-3 mb-2 text-base ${
            error ? "border-red-500" : "border-gray-300"
          }`}
          placeholderTextColor="#9ca3af"
        />
        {error && (
          <Text className="text-red-600 text-sm mb-2">
            Incorrect passphrase. Try again.
          </Text>
        )}
        <Pressable
          onPress={handleSubmit}
          className="mt-4 bg-orange-500 rounded-xl py-3 items-center hover:bg-orange-600 transition-colors"
        >
          <Text className="text-white font-bold">Unlock Dashboard</Text>
        </Pressable>
      </View>
    </View>
  );
}
