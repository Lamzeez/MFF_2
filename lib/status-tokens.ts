/**
 * lib/status-tokens.ts
 *
 * Mati FoodFinder - Unified Semantic Design Tokens for Order & Reservation Statuses.
 * Enforces brand consistency across Customer, Rider, Merchant, and Admin portals.
 *
 * Semantic Order Status Mapping:
 * - placed: Blue (Order sent to kitchen, awaiting confirmation)
 * - accepted: Amber (Kitchen acknowledged order)
 * - preparing: Orange (Food actively cooking in kitchen)
 * - ready_for_pickup: Purple / Violet (Kitchen packaged order, awaiting courier pickup - NOT green!)
 * - out_for_delivery: Sky Blue (Courier in transit on road)
 * - delivered: Emerald Green (Order successfully completed & handed off)
 * - cancelled: Rose / Red (Order cancelled or customer no-show)
 */

export interface StatusTheme {
  label: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  iconName: string;
  dotColor: string;
  summary: string;
}

export function getOrderStatusTheme(status: string): StatusTheme {
  const normalized = (status || "").toLowerCase().trim();

  switch (normalized) {
    case "placed":
      return {
        label: "Kitchen Received",
        badgeBg: "bg-blue-100",
        badgeText: "text-blue-800",
        borderColor: "border-blue-300",
        iconName: "receipt-outline",
        dotColor: "bg-blue-500",
        summary: "Order submitted to restaurant. Awaiting store confirmation.",
      };

    case "accepted":
    case "confirmed":
      return {
        label: "Kitchen Confirmed",
        badgeBg: "bg-amber-100",
        badgeText: "text-amber-800",
        borderColor: "border-amber-300",
        iconName: "checkmark-circle-outline",
        dotColor: "bg-amber-500",
        summary: "Restaurant confirmed order. Preparing kitchen workspace.",
      };

    case "preparing":
    case "prepped":
      return {
        label: "Kitchen Preparing",
        badgeBg: "bg-orange-100",
        badgeText: "text-orange-800",
        borderColor: "border-orange-300",
        iconName: "flame-outline",
        dotColor: "bg-orange-500",
        summary: "Fresh food is actively being cooked in the kitchen.",
      };

    case "ready_for_pickup":
      return {
        label: "Ready for Courier",
        badgeBg: "bg-purple-100",
        badgeText: "text-purple-800",
        borderColor: "border-purple-300",
        iconName: "cube-outline",
        dotColor: "bg-purple-500",
        summary: "Food is freshly packaged and awaiting courier dispatch.",
      };

    case "out_for_delivery":
    case "on_the_way":
      return {
        label: "Out for Delivery",
        badgeBg: "bg-sky-100",
        badgeText: "text-sky-800",
        borderColor: "border-sky-300",
        iconName: "bicycle-outline",
        dotColor: "bg-sky-500",
        summary: "Independent courier is en route to your delivery address.",
      };

    case "delivered":
      return {
        label: "Delivered",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-800",
        borderColor: "border-emerald-300",
        iconName: "checkmark-done-circle-outline",
        dotColor: "bg-emerald-500",
        summary: "Order successfully delivered and handed over.",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        badgeBg: "bg-rose-100",
        badgeText: "text-rose-800",
        borderColor: "border-rose-300",
        iconName: "close-circle-outline",
        dotColor: "bg-rose-500",
        summary: "Order has been cancelled.",
      };

    default:
      return {
        label: status.toUpperCase(),
        badgeBg: "bg-gray-100",
        badgeText: "text-gray-800",
        borderColor: "border-gray-200",
        iconName: "ellipse-outline",
        dotColor: "bg-gray-400",
        summary: "Status update pending.",
      };
  }
}

export function getReservationStatusTheme(status: string): StatusTheme {
  const normalized = (status || "").toLowerCase().trim();

  switch (normalized) {
    case "pending":
      return {
        label: "Awaiting Confirmation",
        badgeBg: "bg-amber-100",
        badgeText: "text-amber-800",
        borderColor: "border-amber-300",
        iconName: "time-outline",
        dotColor: "bg-amber-500",
        summary: "Restaurant reviewing table booking request.",
      };

    case "confirmed":
      return {
        label: "Confirmed Table",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-800",
        borderColor: "border-emerald-300",
        iconName: "checkmark-circle-outline",
        dotColor: "bg-emerald-500",
        summary: "Table is reserved and guaranteed upon arrival.",
      };

    case "completed":
      return {
        label: "Dining Completed",
        badgeBg: "bg-sky-100",
        badgeText: "text-sky-800",
        borderColor: "border-sky-300",
        iconName: "restaurant-outline",
        dotColor: "bg-sky-500",
        summary: "Guest party has finished dining.",
      };

    case "no_show":
      return {
        label: "Table Released (No-Show)",
        badgeBg: "bg-rose-100",
        badgeText: "text-rose-800",
        borderColor: "border-rose-300",
        iconName: "alert-circle-outline",
        dotColor: "bg-rose-500",
        summary: "Guest did not arrive within grace period; table released.",
      };

    case "declined":
    case "cancelled":
      return {
        label: normalized === "declined" ? "Booking Declined" : "Booking Cancelled",
        badgeBg: "bg-gray-100",
        badgeText: "text-gray-700",
        borderColor: "border-gray-300",
        iconName: "close-circle-outline",
        dotColor: "bg-gray-400",
        summary: "Reservation is no longer active.",
      };

    default:
      return {
        label: status.toUpperCase(),
        badgeBg: "bg-gray-100",
        badgeText: "text-gray-800",
        borderColor: "border-gray-200",
        iconName: "calendar-outline",
        dotColor: "bg-gray-400",
        summary: "Reservation status update.",
      };
  }
}

export function getStoreApprovalTheme(status: string): StatusTheme {
  const normalized = (status || "").toLowerCase().trim();

  switch (normalized) {
    case "pending":
      return {
        label: "Pending",
        badgeBg: "bg-amber-100",
        badgeText: "text-amber-800",
        borderColor: "border-amber-300",
        iconName: "time-outline",
        dotColor: "bg-amber-500",
        summary: "Store application awaiting admin verification.",
      };

    case "approved":
      return {
        label: "Approved",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-800",
        borderColor: "border-emerald-300",
        iconName: "checkmark-circle-outline",
        dotColor: "bg-emerald-500",
        summary: "Store approved for Mati platform operations.",
      };

    case "rejected":
      return {
        label: "Rejected",
        badgeBg: "bg-rose-100",
        badgeText: "text-rose-800",
        borderColor: "border-rose-300",
        iconName: "close-circle-outline",
        dotColor: "bg-rose-500",
        summary: "Store application rejected.",
      };

    default:
      return {
        label: status.toUpperCase(),
        badgeBg: "bg-gray-100",
        badgeText: "text-gray-800",
        borderColor: "border-gray-200",
        iconName: "ellipse-outline",
        dotColor: "bg-gray-400",
        summary: "Application status pending.",
      };
  }
}

export function getUserAccountStatusTheme(status: string): StatusTheme {
  const normalized = (status || "").toLowerCase().trim();

  switch (normalized) {
    case "active":
      return {
        label: "Active",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-800",
        borderColor: "border-emerald-300",
        iconName: "checkmark-circle-outline",
        dotColor: "bg-emerald-500",
        summary: "User account in good standing.",
      };

    case "suspended":
      return {
        label: "Suspended",
        badgeBg: "bg-rose-100",
        badgeText: "text-rose-800",
        borderColor: "border-rose-300",
        iconName: "ban-outline",
        dotColor: "bg-rose-500",
        summary: "User account suspended by administrator.",
      };

    default:
      return {
        label: status.toUpperCase(),
        badgeBg: "bg-gray-100",
        badgeText: "text-gray-800",
        borderColor: "border-gray-200",
        iconName: "ellipse-outline",
        dotColor: "bg-gray-400",
        summary: "Account status update.",
      };
  }
}

export function getUserRoleTheme(role: string): StatusTheme {
  const normalized = (role || "").toLowerCase().trim();

  switch (normalized) {
    case "superadmin":
      return {
        label: "Superadmin",
        badgeBg: "bg-rose-100",
        badgeText: "text-rose-800",
        borderColor: "border-rose-300",
        iconName: "shield-checkmark",
        dotColor: "bg-rose-500",
        summary: "Platform super administrator.",
      };

    case "store admin":
    case "merchant":
      return {
        label: "Store Admin",
        badgeBg: "bg-orange-100",
        badgeText: "text-[#EA5410]",
        borderColor: "border-orange-300",
        iconName: "storefront",
        dotColor: "bg-[#EA5410]",
        summary: "Merchant store staff / manager.",
      };

    case "rider":
      return {
        label: "Rider",
        badgeBg: "bg-blue-100",
        badgeText: "text-blue-800",
        borderColor: "border-blue-300",
        iconName: "bicycle",
        dotColor: "bg-blue-500",
        summary: "Independent delivery courier.",
      };

    default:
      return {
        label: role || "Customer",
        badgeBg: "bg-gray-100",
        badgeText: "text-gray-700",
        borderColor: "border-gray-200",
        iconName: "person",
        dotColor: "bg-gray-400",
        summary: "Customer diner account.",
      };
  }
}
