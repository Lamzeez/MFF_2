import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSession } from "../../context/SessionContext";
import { authMessage } from "../../services/auth";

type Mode = "login" | "register" | "confirm" | "recover" | "recover-code" | "password";

interface AccountFormProps {
  initialMode?: "login" | "register";
  onSuccess?: () => void;
}

function cleanPhilippineNumber(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("63")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

function formatPhilippineDisplay(digits: string): string {
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

/**
 * World-class mobile authentication form adhering to international standards (Uber Eats / Foodpanda / Grab).
 * Supports password visibility toggling, Philippine phone auto-formatting, 12+ character live password validation,
 * a clean 6-digit OTP entry system with resend countdown timers, and Terms/Privacy disclosures.
 */
export function AccountForm({ initialMode = "login", onSuccess }: AccountFormProps) {
  const auth = useSession();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (auth.recovering) setMode("password");
  }, [auth.recovering]);

  // Resend countdown timer for OTP screens
  useEffect(() => {
    if (mode !== "confirm" && mode !== "recover-code") return;
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, countdown]);

  const run = async (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (failure) {
      if (mounted.current) setError(authMessage(failure));
    } finally {
      pending.current = false;
      if (mounted.current) {
        setBusy(false);
        setPassword("");
      }
    }
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setPassword("");
    setCode("");
    setError(null);
    setNotice(null);
    if (next === "confirm" || next === "recover-code") {
      setCountdown(60);
    }
  };

  const submit = () =>
    run(async () => {
      switch (mode) {
        case "login":
          await auth.signIn(email, password);
          if (onSuccess) {
            onSuccess();
          }
          break;
        case "register": {
          const formattedPhone = phoneDigits ? `+63${phoneDigits}` : "";
          await auth.signUp(name, email, password, formattedPhone);
          setMode("confirm");
          setCountdown(60);
          setNotice("A 6-digit verification code has been sent to your email. Enter it below to activate your account.");
          break;
        }
        case "confirm":
          await auth.verifyCode(email, code, "signup");
          setCode("");
          break;
        case "recover":
          await auth.requestRecovery(email);
          setMode("recover-code");
          setCountdown(60);
          setNotice("If an account exists for this email, you’ll receive a 6-digit reset code.");
          break;
        case "recover-code":
          await auth.verifyCode(email, code, "recovery");
          setCode("");
          setMode("password");
          break;
        case "password":
          await auth.updatePassword(password);
          setMode("login");
          setNotice("Your password has been successfully updated. Please sign in with your new password.");
          break;
      }
    });

  const handleResend = () =>
    run(async () => {
      if (mode === "confirm") {
        await auth.resendConfirmation(email);
        setNotice("A new 6-digit verification code has been sent to your inbox.");
      } else {
        await auth.requestRecovery(email);
        setNotice("A new reset code has been sent to your email.");
      }
      setCountdown(60);
    });

  const isPasswordValid = password.length >= 12;
  const hasLettersAndNumbers = /[a-zA-Z]/.test(password) && /[0-9]/.test(password);

  return (
    <View className="w-full">
      {/* SCREEN HEADERS */}
      {mode === "login" && (
        <View className="mb-6">
          <Text className="text-2xl font-black text-gray-900 tracking-tight">Sign In</Text>
          <Text className="text-xs text-gray-500 mt-1">
            Welcome back! Enter your details to access your account.
          </Text>
        </View>
      )}

      {mode === "register" && (
        <View className="mb-6">
          <Text className="text-2xl font-black text-gray-900 tracking-tight">Create an Account</Text>
          <Text className="text-xs text-gray-500 mt-1">
            Join Mati City's food discovery & ordering community.
          </Text>
        </View>
      )}

      {mode === "confirm" && (
        <View className="items-center mb-6">
          <View className="w-14 h-14 rounded-2xl bg-orange-100 items-center justify-center mb-3">
            <Ionicons name="mail-unread-outline" size={28} color="#EA5410" />
          </View>
          <Text className="text-xl font-black text-gray-900 text-center">Verify Your Email</Text>
          <Text className="text-xs text-gray-500 text-center mt-1 px-4">
            We sent a 6-digit confirmation code to
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs font-bold text-gray-800">{email || "your email"}</Text>
            <Pressable onPress={() => changeMode("register")} className="ml-2">
              <Text className="text-xs font-bold text-[#EA5410]">Change</Text>
            </Pressable>
          </View>
        </View>
      )}

      {mode === "recover" && (
        <View className="mb-5">
          <Text className="text-xl font-black text-gray-900">Reset Password</Text>
          <Text className="text-xs text-gray-500 mt-1">
            Enter your email address and we'll send you a 6-digit verification code.
          </Text>
        </View>
      )}

      {mode === "recover-code" && (
        <View className="items-center mb-6">
          <View className="w-14 h-14 rounded-2xl bg-orange-100 items-center justify-center mb-3">
            <Ionicons name="key-outline" size={28} color="#EA5410" />
          </View>
          <Text className="text-xl font-black text-gray-900 text-center">Enter Reset Code</Text>
          <Text className="text-xs text-gray-500 text-center mt-1">
            Enter the 6-digit reset code sent to <Text className="font-bold text-gray-800">{email}</Text>
          </Text>
        </View>
      )}

      {mode === "password" && (
        <View className="mb-5">
          <Text className="text-xl font-black text-gray-900">Set New Password</Text>
          <Text className="text-xs text-gray-500 mt-1">
            Please choose a secure password with at least 12 characters.
          </Text>
        </View>
      )}

      {/* FULL NAME (Registration) */}
      {mode === "register" && (
        <View className="mb-3.5">
          <Text className="text-xs font-bold text-gray-700 mb-1.5">Full Name</Text>
          <View className="relative flex-row items-center">
            <View className="absolute left-3.5 z-10">
              <Ionicons name="person-outline" size={18} color="#9ca3af" />
            </View>
            <TextInput
              accessibilityLabel="Full Name"
              placeholder="e.g. Maria Santos"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              editable={!busy}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={120}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-3 text-sm text-gray-900 font-medium"
            />
          </View>
        </View>
      )}

      {/* PHILIPPINE CONTACT PHONE (Registration - Optional) */}
      {mode === "register" && (
        <View className="mb-3.5">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-bold text-gray-700">Mobile Number</Text>
            <Text className="text-[11px] text-gray-400 font-medium">Optional</Text>
          </View>
          <View className="flex-row items-center">
            <View className="flex-row items-center bg-gray-100 border border-gray-200 rounded-xl px-3 py-3 mr-2">
              <Text className="text-sm mr-1">🇵🇭</Text>
              <Text className="text-xs font-black text-gray-700">+63</Text>
            </View>
            <TextInput
              accessibilityLabel="Contact phone number"
              placeholder="912 345 6789"
              placeholderTextColor="#9ca3af"
              value={formatPhilippineDisplay(phoneDigits)}
              onChangeText={(text) => setPhoneDigits(cleanPhilippineNumber(text))}
              editable={!busy}
              keyboardType="phone-pad"
              maxLength={12}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 font-medium"
            />
          </View>
        </View>
      )}

      {/* EMAIL ADDRESS */}
      {mode !== "password" && (
        <View className="mb-3.5">
          <Text className="text-xs font-bold text-gray-700 mb-1.5">Email Address</Text>
          <View className="relative flex-row items-center">
            <View className="absolute left-3.5 z-10">
              <Ionicons name="mail-outline" size={18} color="#9ca3af" />
            </View>
            <TextInput
              accessibilityLabel="Email address"
              placeholder="name@example.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              editable={!busy && mode !== "confirm" && mode !== "recover-code"}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              className={`flex-1 bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-3.5 py-3 text-sm text-gray-900 font-medium ${
                mode === "confirm" || mode === "recover-code" ? "opacity-60 bg-gray-100" : ""
              }`}
            />
          </View>
        </View>
      )}

      {/* PASSWORD FIELD (Login, Register, Password reset) */}
      {(mode === "login" || mode === "register" || mode === "password") && (
        <View className="mb-3.5">
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="text-xs font-bold text-gray-700">Password</Text>
            {mode === "login" && (
              <Pressable disabled={busy} onPress={() => changeMode("recover")}>
                <Text className="text-xs font-bold text-[#EA5410]">Forgot?</Text>
              </Pressable>
            )}
          </View>
          <View className="relative flex-row items-center">
            <View className="absolute left-3.5 z-10">
              <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
            </View>
            <TextInput
              accessibilityLabel="Password"
              placeholder={mode === "login" ? "Enter your password" : "At least 12 characters"}
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              editable={!busy}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showPassword}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-11 py-3 text-sm text-gray-900 font-medium"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={10}
              className="absolute right-3.5 z-10"
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#6b7280"
              />
            </Pressable>
          </View>

          {/* PASSWORD REQUIREMENTS INDICATOR (For register & password change) */}
          {(mode === "register" || mode === "password") && password.length > 0 && (
            <View className="mt-2 flex-row flex-wrap gap-2">
              <View
                className={`flex-row items-center px-2.5 py-1 rounded-full ${
                  isPasswordValid ? "bg-emerald-50 border border-emerald-200" : "bg-gray-100"
                }`}
              >
                <Ionicons
                  name={isPasswordValid ? "checkmark-circle" : "ellipse-outline"}
                  size={13}
                  color={isPasswordValid ? "#047857" : "#9ca3af"}
                />
                <Text
                  className={`text-[11px] font-bold ml-1.5 ${
                    isPasswordValid ? "text-emerald-800" : "text-gray-500"
                  }`}
                >
                  12+ characters ({password.length}/12)
                </Text>
              </View>
              <View
                className={`flex-row items-center px-2.5 py-1 rounded-full ${
                  hasLettersAndNumbers ? "bg-emerald-50 border border-emerald-200" : "bg-gray-100"
                }`}
              >
                <Ionicons
                  name={hasLettersAndNumbers ? "checkmark-circle" : "ellipse-outline"}
                  size={13}
                  color={hasLettersAndNumbers ? "#047857" : "#9ca3af"}
                />
                <Text
                  className={`text-[11px] font-bold ml-1.5 ${
                    hasLettersAndNumbers ? "text-emerald-800" : "text-gray-500"
                  }`}
                >
                  Letters & numbers
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* 6-DIGIT OTP INPUT BOXES (For confirm & recover-code) */}
      {(mode === "confirm" || mode === "recover-code") && (
        <View className="mb-4">
          <Text className="text-xs font-bold text-gray-700 mb-2 text-center">
            Enter 6-Digit Code
          </Text>
          <View className="relative">
            <View className="flex-row justify-between mb-2">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const digit = code[index] || "";
                const isCurrent = code.length === index;
                return (
                  <View
                    key={index}
                    className={`w-12 h-14 rounded-2xl border-2 items-center justify-center bg-gray-50 ${
                      isCurrent
                        ? "border-[#EA5410] bg-white shadow-2xs"
                        : digit
                        ? "border-gray-400 bg-white"
                        : "border-gray-200"
                    }`}
                  >
                    <Text className="text-2xl font-black text-gray-900">{digit}</Text>
                  </View>
                );
              })}
            </View>
            <TextInput
              accessibilityLabel="6-Digit Verification Code"
              value={code}
              onChangeText={(text) => setCode(text.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus={true}
              editable={!busy}
              className="absolute inset-0 opacity-0 text-transparent"
            />
          </View>
        </View>
      )}

      {/* ERROR MESSAGE DISPLAY */}
      {!!(error || auth.error) && (
        <View className="flex-row items-center bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <Ionicons name="alert-circle-outline" size={18} color="#b91c1c" />
          <Text accessibilityRole="alert" className="text-xs font-semibold text-red-700 ml-2 flex-1">
            {error || auth.error}
          </Text>
        </View>
      )}

      {/* SUCCESS / INFORMATIONAL NOTICE */}
      {!!notice && (
        <View className="flex-row items-center bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
          <Ionicons name="checkmark-circle-outline" size={18} color="#047857" />
          <Text accessibilityLiveRegion="polite" className="text-xs font-semibold text-emerald-800 ml-2 flex-1">
            {notice}
          </Text>
        </View>
      )}

      {/* PRIMARY SUBMIT ACTION BUTTON */}
      <Pressable
        accessibilityRole="button"
        disabled={busy || auth.status === "loading"}
        onPress={submit}
        className="w-full py-4 bg-[#EA5410] rounded-2xl items-center shadow-sm mb-4 active:opacity-90"
        style={{ opacity: busy || auth.status === "loading" ? 0.6 : 1 }}
      >
        {busy || auth.status === "loading" ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-black text-sm tracking-wide">
            {mode === "login" && "Sign In"}
            {mode === "register" && "Create Account"}
            {mode === "confirm" && "Verify Code & Continue"}
            {mode === "recover" && "Send 6-Digit Code"}
            {mode === "recover-code" && "Verify & Proceed"}
            {mode === "password" && "Save New Password"}
          </Text>
        )}
      </Pressable>

      {/* TERMS OF SERVICE & PRIVACY POLICY DISCLOSURE */}
      {(mode === "register" || mode === "login") && (
        <View className="px-3 mb-4">
          <Text className="text-[11px] text-gray-500 text-center leading-relaxed">
            By continuing, you agree to our{" "}
            <Text className="text-[#EA5410] font-bold underline">Terms of Service</Text>
            {" "}and acknowledge our{" "}
            <Text className="text-[#EA5410] font-bold underline">Privacy Policy</Text>.
          </Text>
        </View>
      )}

      {/* OTP RESEND BUTTON WITH COOLDOWN TIMER */}
      {(mode === "confirm" || mode === "recover-code") && (
        <View className="items-center py-2">
          {countdown > 0 ? (
            <Text className="text-xs text-gray-400 font-medium">
              Resend code in <Text className="font-bold text-gray-600">{countdown}s</Text>
            </Text>
          ) : (
            <Pressable disabled={busy} onPress={handleResend} className="py-2">
              <Text className="text-xs font-bold text-[#EA5410]">
                Didn't get the code? Resend Code
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* RETRY SESSION (When auth status has network failure) */}
      {auth.status === "error" && (
        <Pressable disabled={busy} onPress={() => run(auth.retrySession)} className="py-2 items-center">
          <Text className="text-xs font-bold text-[#EA5410]">Retry connection</Text>
        </Pressable>
      )}

      {/* SWITCH BETWEEN LOGIN AND REGISTER */}
      {mode === "login" && (
        <View className="items-center mt-2">
          <Pressable
            disabled={busy}
            onPress={() => changeMode("register")}
            className="py-2"
          >
            <Text className="text-xs text-gray-600">
              New to Mati FoodFinder? <Text className="font-bold text-[#EA5410]">Create an account</Text>
            </Text>
          </Pressable>

          <Pressable
            disabled={busy}
            onPress={() => changeMode("confirm")}
            className="py-2"
          >
            <Text className="text-xs font-medium text-gray-500">
              Have an unverified email? <Text className="text-[#EA5410] font-semibold">Enter 6-digit code</Text>
            </Text>
          </Pressable>
        </View>
      )}

      {mode === "register" && (
        <View className="items-center mt-2">
          <Pressable
            disabled={busy}
            onPress={() => changeMode("login")}
            className="py-2"
          >
            <Text className="text-xs text-gray-600">
              Already have an account? <Text className="font-bold text-[#EA5410]">Sign in</Text>
            </Text>
          </Pressable>
        </View>
      )}

      {(mode === "recover" || mode === "confirm" || mode === "recover-code") && (
        <Pressable
          disabled={busy}
          onPress={() => changeMode("login")}
          className="py-3 items-center flex-row justify-center mt-2"
        >
          <Ionicons name="arrow-back" size={14} color="#374151" className="mr-1" />
          <Text className="text-xs font-bold text-gray-700 ml-1">Back to Sign In</Text>
        </Pressable>
      )}

      {auth.recovering && (
        <Pressable
          disabled={busy}
          onPress={() =>
            run(async () => {
              await auth.logoutToGuest();
              changeMode("login");
            })
          }
          className="py-3 items-center"
        >
          <Text className="text-xs font-bold text-gray-500">Cancel and sign out</Text>
        </Pressable>
      )}
    </View>
  );
}
