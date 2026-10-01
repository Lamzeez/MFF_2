import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { ApplicationRole, Profile } from "../types/auth";

export interface AccountIdentity {
  id: string;
  email: string;
  profile: Profile;
  roles: ApplicationRole[];
}

export class AccountError extends Error {}

export function authMessage(error: unknown): string {
  if (error instanceof AccountError) return error.message;
  const code = typeof error === "object" && error !== null && "code" in error && typeof (error as any).code === "string" ? (error as any).code : "";
  const rawMsg = typeof error === "object" && error !== null && "message" in error && typeof (error as any).message === "string" ? (error as any).message.toLowerCase() : "";
  const status = typeof error === "object" && error !== null && "status" in error && typeof (error as any).status === "number" ? (error as any).status : 0;

  // Supabase Auth mailer / SMTP errors
  if (rawMsg.includes("error sending confirmation email") || rawMsg.includes("error sending confirmation")) {
    return "Unable to send verification email. The email service hourly limit may have been reached. Please wait a few minutes or contact support.";
  }

  // Account existence
  if (rawMsg.includes("already registered") || rawMsg.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }

  // Rate limits
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || rawMsg.includes("rate limit") || status === 429) {
    return "Too many requests. Please wait a minute before trying again.";
  }

  // Standard codes and known patterns
  if (code === "invalid_credentials" || rawMsg.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (code === "email_not_confirmed" || rawMsg.includes("email not confirmed")) {
    return "Confirm your email before signing in. You can request another code below.";
  }
  if (code === "otp_expired" || rawMsg.includes("token has expired") || rawMsg.includes("otp expired")) {
    return "That code is invalid or expired. Request a new code and try again.";
  }
  if (code === "weak_password" || rawMsg.includes("password should be at least")) {
    return "Choose a stronger password with at least 12 characters.";
  }
  if (code === "same_password") {
    return "Choose a password different from your current one.";
  }
  if (rawMsg.includes("signup is disabled")) {
    return "Sign up is currently disabled. Please contact support.";
  }

  return "We couldn’t complete that request. Check your connection and try again.";
}

function emailAddress(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccountError("Enter a valid email address.");
  return email;
}
function strongPassword(value: string) {
  if (value.length < 12) throw new AccountError("Use a password with at least 12 characters.");
}

export function createAuthService(client: SupabaseClient<Database>) {
  return {
    async signIn(email: string, password: string) {
      if (!password) throw new AccountError("Enter your password.");
      const { error } = await client.auth.signInWithPassword({ email: emailAddress(email), password });
      if (error) throw error;
    },
    async signUp(name: string, email: string, password: string, phone: string) {
      if (!name.trim() || name.trim().length > 120) throw new AccountError("Enter your name (up to 120 characters).");
      if (phone.trim().length > 32) throw new AccountError("Enter a valid contact phone number.");
      strongPassword(password);
      const { error } = await client.auth.signUp({ email: emailAddress(email), password,
        options: { data: { display_name: name.trim(), contact_phone: phone.trim() || null } } });
      if (error) throw error;
      // Never infer success/roles from signup metadata or reveal account existence.
    },
    async resendConfirmation(email: string) {
      const { error } = await client.auth.resend({ email: emailAddress(email), type: "signup" });
      if (error) throw error;
    },
    async requestRecovery(email: string) {
      const { error } = await client.auth.resetPasswordForEmail(emailAddress(email));
      if (error) throw error;
    },
    async verifyCode(email: string, token: string, type: "signup" | "email" | "recovery") {
      if (!/^\d{6}$/.test(token.trim())) throw new AccountError("Enter the six-digit code from your email.");
      const otpType = type === "recovery" ? "recovery" : "signup";
      const { error } = await client.auth.verifyOtp({
        email: emailAddress(email),
        token: token.trim(),
        type: otpType,
      });
      if (error && otpType === "signup") {
        const fallback = await client.auth.verifyOtp({
          email: emailAddress(email),
          token: token.trim(),
          type: "email",
        });
        if (fallback.error) throw error;
        return;
      }
      if (error) throw error;
    },
    async updatePassword(password: string) {
      strongPassword(password);
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
    },
    async signOut() {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw error;
    },
    async updateProfile(updates: { display_name?: string; contact_phone?: string }) {
      if (updates.display_name !== undefined) {
        if (!updates.display_name.trim() || updates.display_name.trim().length > 120) {
          throw new AccountError("Enter your name (up to 120 characters).");
        }
      }
      if (updates.contact_phone !== undefined && updates.contact_phone.trim().length > 32) {
        throw new AccountError("Enter a valid contact phone number.");
      }
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError || !user) throw new AccountError("You must be signed in to update your profile.");
      const payload: { display_name?: string; contact_phone?: string | null } = {};
      if (updates.display_name !== undefined) payload.display_name = updates.display_name.trim();
      if (updates.contact_phone !== undefined) payload.contact_phone = updates.contact_phone.trim() || null;
      const { error } = await client.from("profiles").update(payload).eq("id", user.id);
      if (error) throw error;
    },
    async loadIdentity(accessToken: string): Promise<AccountIdentity> {
      // Validate against Auth, then load authority from RLS-protected database objects.
      const { data: { user }, error: userError } = await client.auth.getUser(accessToken);
      if (userError) throw userError;
      if (!user || user.is_anonymous || !user.email_confirmed_at) throw new AccountError("Please confirm your email and sign in again.");
      const [profileResult, rolesResult] = await Promise.all([
        client.from("profiles").select("*").eq("id", user.id).single(),
        client.rpc("get_my_application_roles"),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (rolesResult.error) throw rolesResult.error;
      if (profileResult.data.account_status !== "active" || !rolesResult.data.includes("customer")) {
        throw new AccountError("This account cannot access signed-in features. Contact support.");
      }
      const roles = rolesResult.data.filter((role): role is ApplicationRole =>
        role === "customer" || role === "merchant" || role === "rider" || role === "admin");
      return { id: user.id, email: user.email ?? "", profile: profileResult.data, roles };
    },
  };
}
