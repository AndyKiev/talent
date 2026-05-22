export default function cfl(word: string): string {
    if (!word) return word; // handle empty string or null/undefined
    return word.charAt(0).toUpperCase() + word.slice(1);
}