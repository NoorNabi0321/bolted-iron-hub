import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PROJECT_STATUSES = [
  "Review",
  "Shop Drawings",
  "Fabrication",
  "On-Site",
  "Installed",
  "Inspection Passed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export function getStatusClass(status: string): string {
  switch (status) {
    case "Review": return "bg-purple-50 text-purple-700 border border-purple-200";
    case "Shop Drawings": return "bg-blue-50 text-blue-700 border border-blue-200";
    case "Fabrication": return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    case "On-Site": return "bg-orange-50 text-orange-700 border border-orange-200";
    case "Installed": return "bg-green-50 text-green-700 border border-green-200";
    case "Inspection Passed": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    default: return "bg-gray-100 text-gray-600";
  }
}

export function getStatusIndex(status: string): number {
  return PROJECT_STATUSES.indexOf(status as ProjectStatus);
}

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return "—";
  const [hours, minutes] = time.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return "—";
  
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, "0");
  
  return `${displayHours}:${displayMinutes} ${period}`;
}

// Timezone-aware date conversion functions
// Store dates as midnight UTC (start of day in user's timezone)
export function dateToTimestamp(dateString: string): number | undefined {
  if (!dateString) return undefined;
  // dateString is in format "YYYY-MM-DD" from HTML date input
  // Create a date at midnight in the user's local timezone
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  return date.getTime();
}

export function timestampToDateInput(timestamp: number | null | undefined): string {
  if (!timestamp) return "";
  // Convert timestamp to local date string in YYYY-MM-DD format
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const BILLING_STATUSES = ["Not Started", "Partial", "Fully Billed", "Paid"] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];

export function getBillingStatusColor(status: string): string {
  switch (status) {
    case "Not Started": return "text-muted-foreground";
    case "Partial": return "text-amber-400";
    case "Fully Billed": return "text-blue-400";
    case "Paid": return "text-emerald-400";
    default: return "text-muted-foreground";
  }
}
