// src/hooks/useLoadTranslations.ts


import { axiosInstance } from '../api/axiosInstance';
import {useTranslationsStore} from "../store/useTranslationsStore.ts"; // Adjust path

import {apiPrefix, apiVersion} from "../utils/eNums.ts";
const BASE = `/${apiPrefix}/${apiVersion}`;
const BASE_MSG = `${BASE}/full_msgs`;
const BASE_LANGS = `${BASE}/langs`;


interface Language {
    id: number;
    name: string;
    short_name: string;
}

interface MsgItem {
    value: string;
    lang_data: Language;
}

interface FullMessage {
    id: number;
    name: string;
    msg: MsgItem[];
}

export const useLoadTranslations = () => {
    const { setTranslations, setLangs, setLoading, setError } = useTranslationsStore();
    const loadTranslations = async () => {
        try {
            setLoading(true);

            // Fetch languages
            const langsResponse = await axiosInstance.get<Language[]>(BASE_LANGS);
            const langsData = langsResponse.data?.map(lang => lang.short_name) || [];
            setLangs(langsData);

            // Fetch translations
            const translationsResponse = await axiosInstance.get<FullMessage[]>(BASE_MSG);
            const translationsData = translationsResponse.data || [];

            // Transform the data
            const transformed: Record<string, Record<string, string>> = {};

            if (Array.isArray(translationsData)) {
                translationsData.forEach((item) => {
                    if (item?.name && Array.isArray(item?.msg)) {
                        const translations: Record<string, string> = {};
                        item.msg.forEach((msg) => {
                            if (msg?.lang_data?.short_name && msg?.value) {
                                translations[msg.lang_data.short_name] = msg.value;
                            }
                        });
                        transformed[item.name] = translations;
                    }
                });
            }

            setTranslations(transformed);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load translations';
            setError(errorMessage);
            console.error('Error loading translations:', error);
            setTranslations({}); // Set empty so app doesn't break
        } finally {
            setLoading(false);
        }
    };

    return { loadTranslations };
};