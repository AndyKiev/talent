// components/Customized/Admin/Locale/custom_types.ts
import type { FullMessageCreate, FullMessageUpdate, TableTranslation } from './translations';

export interface TranslationFormData {
    key: string;
    translations: {
        lang_id: number;
        value: string;
    }[];
}

export type { TableTranslation, FullMessageCreate, FullMessageUpdate };