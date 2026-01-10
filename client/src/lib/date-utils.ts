export function parseLocalDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatLocalDate(dateString: string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  const date = parseLocalDate(dateString);
  if (!date) return "";
  return date.toLocaleDateString("en-US", options);
}
