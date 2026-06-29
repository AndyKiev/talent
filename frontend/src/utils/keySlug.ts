// Derive a stable, meaning-based translation key from English text, e.g.
//   slugifyKey('reviewLevelReq_', 'Leads small projects')
//     -> 'reviewLevelReq_leadsSmallProjects'
// Positional keys (reviewLevelReq_l1_1) are avoided because rows get reordered;
// the key should reflect the sense of the text, not its position.

/** camelCase slug (first ~6 meaningful words) appended to a domain prefix. */
export function slugifyKey(prefix: string, text: string): string {
    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 6);
    if (words.length === 0) return prefix;
    const camel = words
        .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
        .join('');
    return `${prefix}${camel}`;
}

/** Suffix 2, 3, … until the key is unique per `exists` (collision guard). */
export function uniqueKey(base: string, exists: (key: string) => boolean): string {
    if (!base || !exists(base)) return base;
    let n = 2;
    while (exists(`${base}${n}`)) n += 1;
    return `${base}${n}`;
}
