import React from "react";
import { Redirect } from "expo-router";

/**
 * Legacy `/auth/merchant-register` route consolidated into the unified Store Registration flow (`/(web)/auth/store-register`).
 */
export default function ConsolidatedMerchantRegisterRedirect() {
  return <Redirect href="/(web)/auth/store-register" />;
}
