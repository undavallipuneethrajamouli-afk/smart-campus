/**
 * Transparent, rule-based academic risk flag — NOT a machine-learning
 * prediction and NOT a medical/psychological assessment. A student is
 * flagged when their overall attendance drops below this threshold.
 */
export const AT_RISK_ATTENDANCE_THRESHOLD = 75;

export function attendancePct(present: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((present / total) * 100);
}
