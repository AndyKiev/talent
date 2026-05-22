// custom_types/translations.ts
export interface Language {
    id: number;
    name: string;
    short_name: string;
}

export interface TranslationMessage {
    value: string;
    lang_data: Language;
    lang_id?: number;
}

export interface FullMessage {
    id: number;
    name: string;
    msg: TranslationMessage[];
}

export interface FullMessageCreate {
    name: string;
    msg: Array<{
        lang_id: number;
        value: string;
    }>;
}

export interface FullMessageUpdate {
    name: string;
    msg: Array<{
        lang_id: number;
        value: string;
    }>;
}

export interface TableTranslation {
    id: number;
    key: string;
    [langShortName: string]: string | number;
}