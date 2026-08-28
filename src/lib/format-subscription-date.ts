export function formatSubscriptionEndDate(
  dateString: string | undefined,
): string {
  if (!dateString) return "the end of your billing period";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
