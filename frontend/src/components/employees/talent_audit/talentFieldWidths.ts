/**
 * Width of a talent status+period field. Its options are short codes like
 * "PO - 12", so from `sm` up it is sized to the content instead of stretching
 * across the dialog and reading as an empty box. On a phone it stays full width
 * — there the container is already narrow. Shared so every place offering the
 * same pair list looks the same.
 */
export const TALENT_PAIR_FIELD_WIDTH = { xs: '100%', sm: 220 };
