export default function cfl(word: string): string {
    if (!word) return word; // handle empty string or null/undefined
    return word.charAt(0).toUpperCase() + word.slice(1);
}
/**
 * Converts a snake_case string to camelCase.
 * Handles consecutive underscores, leading/trailing underscores, and mixed casing.
 */
export function snakeToCamel(str: string): string {
    if (!str) return str;

    return str
        .split('_')
        .filter(Boolean) // Removes empty strings from `__` or `_` at start/end
        .map((word, index) =>
            index === 0
                ? word.toLowerCase()
                : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('');
}