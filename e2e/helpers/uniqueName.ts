// Unique-name convention shared by all E2E-created records. Every record a
// test creates MUST use this prefix so the janitor
// (backend/tests/cleanup_e2e_data.py) can find leftovers after a crashed run.
// Mirrors backend/tests/helpers/unique_name.py.
//
// IMPORTANT: maxLength must match the essence's schema max_length (check the
// backend _schema.py AND the Form's html maxLength - inputs truncate
// SILENTLY, which breaks the exact-match ?name= lookup). When trimming, the
// SLUG is shortened, never the random tail - otherwise names stop being
// unique.
export const E2E_PREFIX = "E2E_";

function randToken(length: number): string {
  let token = "";
  while (token.length < length) {
    token += Math.random().toString(36).slice(2).toUpperCase();
  }
  return token.slice(0, length);
}

export function uniqueName(slug: string, maxLength = 64): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const suffix = `_${stamp}_${randToken(4)}`;
  const room = maxLength - E2E_PREFIX.length - suffix.length;
  if (room < 1) {
    // Field too short for the full convention - keep prefix + random only.
    return `${E2E_PREFIX}${randToken(maxLength - E2E_PREFIX.length)}`;
  }
  return `${E2E_PREFIX}${slug.slice(0, room)}${suffix}`;
}

/** Short unique identifier for `key`-style fields (often max 8 chars).
 *  NEVER build keys by slicing uniqueName() - the random tail is what makes
 *  it unique, and a slice keeps only the constant prefix. */
export function uniqueKey(maxLength = 8): string {
  const prefix = maxLength >= 8 ? "E2E_" : "E";
  return `${prefix}${randToken(maxLength - prefix.length)}`;
}
