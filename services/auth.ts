import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database";
import type { ApplicationRole, AuthPortalScope, Profile } from "../types/auth";

export interface AccountIdentity {
  id: string;
  email: string;
  profile: Profile;
  roles: ApplicationRole[];
}

export class AccountError extends Error {}
export class ScopeMismatchError extends AccountError {}

export function hasAdminApplicationRole(roles: readonly string[]): boolean {
  return roles.includes("admin") || roles.includes("superadmin") || roles.includes("staff");
}

export function isRoleAllowedForScope(
  scope: AuthPortalScope,
  rawRoles: readonly string[],
): boolean {
  const isAdmin = hasAdminApplicationRole(rawRoles);
  const isMerchant = rawRoles.includes("merchant");
  const isRider = rawRoles.includes("rider");

  switch (scope) {
    case "customer":
      return rawRoles.includes("customer") && !isMerchant && !isRider && !isAdmin;
    case "merchant":
      return isMerchant && !isAdmin;
    case "rider":
      return isRider && !isAdmin;
    case "admin":
      return isAdmin;
  }
}

export function isExclusiveCustomerIdentity(
  identity: Pick<AccountIdentity, "roles"> | null | undefined,
): boolean {
  return !!identity && isRoleAllowedForScope("customer", identity.roles);
}

export function getScopeMismatchMessage(
  scope: AuthPortalScope,
  rawRoles: readonly string[],
): string {
  if (scope === "customer") {
    if (hasAdminApplicationRole(rawRoles)) {
      return "System Administrator accounts cannot sign in as customers. Use the System Admin portal.";
    }
    if (rawRoles.includes("merchant")) {
      return "Store Merchant accounts cannot sign in as customers. Use Store Login or register a separate customer account.";
    }
    if (rawRoles.includes("rider")) {
      return "Delivery Rider accounts cannot sign in as customers. Use Rider Login or register a separate customer account.";
    }
    return "This account cannot access customer features. Contact support.";
  }
  if (scope === "merchant") {
    return "This account does not have an active store merchant role.";
  }
  if (scope === "rider") {
    return "This account is not authorized as an active delivery rider in Mati City.";
  }
  return "Access Denied: This account does not have administrator permissions.";
}

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

export function createAuthService(
  client: SupabaseClient<Database>,
  scope: AuthPortalScope = "customer",
) {
  async function loadIdentityForToken(accessToken?: string): Promise<AccountIdentity> {
    // Validate against Auth, then load authority from RLS-protected database objects.
    const { data: { user }, error: userError } = accessToken
      ? await client.auth.getUser(accessToken)
      : await client.auth.getUser();
    if (userError) throw userError;
    if (!user || user.is_anonymous || !user.email_confirmed_at) {
      throw new AccountError("Please confirm your email and sign in again.");
    }
    const [profileResult, rolesResult] = await Promise.all([
      client.from("profiles").select("*").eq("id", user.id).single(),
      client.rpc("get_my_application_roles"),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (rolesResult.error) throw rolesResult.error;
    if (profileResult.data.account_status !== "active") {
      throw new AccountError("This account cannot access signed-in features. Contact support.");
    }
    if (!isRoleAllowedForScope(scope, rolesResult.data)) {
      throw new ScopeMismatchError(getScopeMismatchMessage(scope, rolesResult.data));
    }
    const roles = rolesResult.data.filter((role): role is ApplicationRole =>
      role === "customer" || role === "merchant" || role === "rider" || role === "admin");
    return { id: user.id, email: user.email ?? "", profile: profileResult.data, roles };
  }

  return {
    async signIn(email: string, password: string) {
      if (!password) throw new AccountError("Enter your password.");
      const { data, error } = await client.auth.signInWithPassword({ email: emailAddress(email), password });
      if (error) throw error;
      try {
        await loadIdentityForToken(data.session?.access_token);
      } catch (err) {
        if (err instanceof ScopeMismatchError) {
          await client.auth.signOut({ scope: "local" });
        }
        throw err;
      }
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
    async updateProfile(updates: {
      display_name?: string;
      contact_phone?: string;
      default_barangay?: string;
      delivery_address?: string;
      personalization_consent?: boolean;
    }) {
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
      const payload: {
        display_name?: string;
        contact_phone?: string | null;
        default_barangay?: string | null;
        delivery_address?: string | null;
        personalization_consent?: boolean;
      } = {};
      if (updates.display_name !== undefined) payload.display_name = updates.display_name.trim();
      if (updates.contact_phone !== undefined) payload.contact_phone = updates.contact_phone.trim() || null;
      if (updates.default_barangay !== undefined) payload.default_barangay = updates.default_barangay.trim() || null;
      if (updates.delivery_address !== undefined) payload.delivery_address = updates.delivery_address.trim() || null;
      if (updates.personalization_consent !== undefined) payload.personalization_consent = updates.personalization_consent;
      const { error } = await client.from("profiles").update(payload).eq("id", user.id);
      if (error) throw error;
    },
    async loadIdentity(accessToken: string): Promise<AccountIdentity> {
      return loadIdentityForToken(accessToken);
    },
  };
}
