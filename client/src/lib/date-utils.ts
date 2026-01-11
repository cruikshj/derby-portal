// Parse an ISO timestamp string or Date object into a Date
// Properly handles both full ISO timestamps and date-only strings (YYYY-MM-DD)
export function parseDateTime(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  // Check if it's a date-only string (YYYY-MM-DD format)
  // These must be parsed in local time to avoid timezone drift
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  
  // For ISO timestamps, parse directly (they include timezone info)
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

// Legacy function for backward compatibility with date-only strings (YYYY-MM-DD)
export function parseLocalDate(dateString: string | null | undefined): Date | null {
  return parseDateTime(dateString);
}

// Format a date for display (date only)
export function formatLocalDate(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDateTime(value);
  if (!date) return "";
  return date.toLocaleDateString("en-US", options);
}

// Format a date and time for display
export function formatDateTime(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  const date = parseDateTime(value);
  if (!date) return "";
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  };
  return date.toLocaleString("en-US", defaultOptions);
}

// Convert a Date to ISO string for API submission
export function toISOString(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString();
}

// Get the time remaining until a date, with support for hours when less than a day
export function getTimeUntil(value: string | Date | null | undefined): string {
  const date = parseDateTime(value);
  if (!date) return "";
  
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) return "";
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days === 0) {
    if (hours === 0) {
      if (minutes <= 0) return "< 1 min";
      return `${minutes} min${minutes !== 1 ? "s" : ""}`;
    }
    return `${hours} hr${hours !== 1 ? "s" : ""}`;
  }
  
  return `${days} day${days !== 1 ? "s" : ""}`;
}

// Get the urgency color class based on time remaining
// Returns: "text-destructive" for < 1 day, "text-yellow-500" for 1-3 days, "text-primary" for > 3 days
export function getTimeUntilColor(value: string | Date | null | undefined): string {
  const date = parseDateTime(value);
  if (!date) return "text-primary";
  
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) return "text-primary";
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days === 0) {
    return "text-destructive"; // Red for less than a day
  }
  
  if (days <= 3) {
    return "text-yellow-500"; // Yellow for 1-3 days
  }
  
  return "text-primary"; // Blue for more than 3 days
}

// Format date for input (YYYY-MM-DD)
export function formatDateForInput(value: string | Date | null | undefined): string {
  const date = parseDateTime(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format time for input (HH:MM)
export function formatTimeForInput(value: string | Date | null | undefined): string {
  const date = parseDateTime(value);
  if (!date) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Combine date string and time string into a Date object
export function combineDateAndTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  }
  return new Date(year, month - 1, day, 0, 0);
}

// Convert Date/string value to ISO string for form values
// Returns empty string for null/undefined (safe for form inputs)
export function toFormValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return value;
}
