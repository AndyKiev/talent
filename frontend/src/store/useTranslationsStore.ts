// stores/useTranslationsStore.ts
import { create } from 'zustand';

interface TranslationsState {
    strings: Record<string, any>;
    langs: string[];
    isLoading: boolean;
    error: string | null;
    setTranslations: (data: Record<string, any>) => void;
    setLangs: (langs: string[]) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useTranslationsStore = create<TranslationsState>((set) => ({
    strings: {},
    langs: [],
    isLoading: true,
    error: null,
    setTranslations: (data) => set({ strings: data, isLoading: false }),
    setLangs: (langs) => set({ langs }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
}));