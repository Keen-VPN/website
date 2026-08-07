/** User-facing singular/plural for referral reward months. */
export function formatReferralRewardLabel(months: number): string {
  const n = Math.max(1, Math.floor(months));
  return n === 1 ? "1 free month" : `${n} free months`;
}
