/** MVP simplification: one academic year label per calendar year. */
export function currentAcademicYear(): string {
  return String(new Date().getFullYear());
}
