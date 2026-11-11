import type { PlatformMetrics, StoreApplication } from "../services/admin";

/** Normalizes Expo Router paths by removing route group segments and trailing slashes. */
export function normalizeAdminPath(route: string): string {
  const withoutQuery = (route || "/").split("?")[0].split("#")[0];
  const withoutGroups = withoutQuery.replace(/\/\([^)]+\)/g, "");
  return withoutGroups.replace(/\/+$/, "") || "/";
}

export function isAdminNavItemActive(pathname: string, itemHref: string): boolean {
  return normalizeAdminPath(pathname) === normalizeAdminPath(itemHref);
}

export function escapeCsvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Builds a downloadable CSV report of platform totals and store applications. */
export function buildAdminCsvReport(
  metrics: PlatformMetrics | null,
  approvals: StoreApplication[],
  generatedAt: Date = new Date(),
): string {
  const rows: string[][] = [
    ["Metric", "Value"],
    ["Report Generated", generatedAt.toISOString()],
    ["Total Users", String(metrics?.total_users ?? 0)],
    ["Active Stores", String(metrics?.total_stores ?? 0)],
    ["Pending Approvals", String(metrics?.pending_stores ?? 0)],
    ["Active Riders", String(metrics?.active_riders ?? 0)],
    ["Total Orders", String(metrics?.total_orders ?? 0)],
    [
      "Order Volume (PHP)",
      ((metrics?.gross_sales_centavos ?? 0) / 100).toFixed(2),
    ],
    [],
    ["Store Name", "Slug", "Barangay", "Address", "Phone", "Status", "Submitted At"],
    ...approvals.map((app) => [
      app.name,
      app.slug,
      app.barangay || "",
      app.address_text,
      app.public_phone || "",
      app.approval_status,
      app.created_at,
    ]),
  ];

  return rows
    .map((cells) => cells.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");
}
