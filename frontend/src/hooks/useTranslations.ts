// hooks/useTranslations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../api/axiosInstance';
import {useMemo} from "react";
import type {
    FullMessage,
    FullMessageCreate,
    FullMessageUpdate,
    Language
} from "../components/developer/translations/translations.ts";
import {BASE_URL} from "../utils/eNums.ts";
const BASE_FM = `${BASE_URL}/full_msgs`;

interface UseTranslationsReturn {
    strings: Record<string, Record<string, string>>;
    langs: Language[];
    translationsData: FullMessage[];
    isLoading: boolean;
    error: Error | null;
    addKeyMutation: ReturnType<typeof useMutation<unknown, Error, FullMessageCreate[]>>;
    updateStringMutation: ReturnType<typeof useMutation<unknown, Error, { msg_key_id: number } & FullMessageUpdate>>;
    deleteStringMutation: ReturnType<typeof useMutation<unknown, Error, number>>;
    uploadExcelMutation: ReturnType<typeof useMutation<unknown, Error, File>>;
    downloadExcelMutation: ReturnType<typeof useMutation<Blob, Error, string | undefined>>;
    uploadJsonMutation: ReturnType<typeof useMutation<unknown, Error, File>>;
    downloadJsonMutation: ReturnType<typeof useMutation<Blob, Error, string | undefined>>;
}

export const useTranslations = (): UseTranslationsReturn => {
    const queryClient = useQueryClient();

    // Fetch languages
    const { data: langs = [], isLoading: isLangsLoading } = useQuery<Language[]>({
        queryKey: ['directories', 'languages'],
        queryFn: async (): Promise<Language[]> => {
            const response = await axiosInstance.get('/api/v1/langs');
            return response.data ?? [];
        },
        staleTime: Infinity
    });

    // Fetch translations
    const {
        data: translationsData,
        isLoading: isTranslationsLoading,
        error: translationsError
    } = useQuery<FullMessage[]>({
        queryKey: ['translations'],
        queryFn: async (): Promise<FullMessage[]> => {
            const response = await axiosInstance.get(BASE_FM);
            return response.data ?? []; // Ensure we always return an array
        }
    });

    // Transform translations data to match the expected format
    const strings = useMemo(() => {
        const data = translationsData || []; // Handle null/undefined case
        return data.reduce((acc, item) => {
            acc[item.name] = (item.msg || []).reduce((translations, msg) => {
                translations[msg.lang_data.short_name] = msg.value;
                return translations;
            }, {} as Record<string, string>);
            return acc;
        }, {} as Record<string, Record<string, string>>);
    }, [translationsData]);

    const addKeyMutation = useMutation<unknown, Error, FullMessageCreate[]>({
        mutationFn: async (newKeyData: FullMessageCreate[]): Promise<unknown> => {
            const response = await axiosInstance.post(BASE_FM, newKeyData);
            return response.data;
        },
        onSuccess: async (data: unknown) => {
            if (typeof data === 'object' && data !== null && 'detail' in data) {
                console.log('The "detail" key exists');
            } else {
                await queryClient.invalidateQueries({ queryKey: ['translations'] });
            }
        },
        onError: (error: Error) => {
            console.error('Error adding new key:', error);
        }
    });

    const updateStringMutation = useMutation<unknown, Error, { msg_key_id: number } & FullMessageUpdate>({
        mutationFn: async (updateData: { msg_key_id: number } & FullMessageUpdate): Promise<unknown> => {
            const response = await axiosInstance.patch(
                `${BASE_FM}/${updateData.msg_key_id}`,
                {
                    name: updateData.name,
                    msg: updateData.msg
                }
            );
            return response.data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['translations'] });
        },
        onError: (error: Error) => {
            console.error('Error updating translation:', error);
        }
    });

    const deleteStringMutation = useMutation<unknown, Error, number>({
        mutationFn: async (msg_key_id: number): Promise<unknown> => {
            const response = await axiosInstance.delete(`${BASE_FM}/${msg_key_id}`);
            return response.data;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['translations'] });
        },
        onError: (error: Error) => {
            console.error('Error deleting translation:', error);
        }
    });

    // Add Excel upload mutation
    const uploadExcelMutation = useMutation<unknown, Error, File>({
        mutationFn: async (file: File): Promise<unknown> => {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axiosInstance.post(
                '/api/v1/upload_excel',

                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        },
        onSuccess: async () => {
            // Refresh translations data after successful import
            await queryClient.invalidateQueries({ queryKey: ['translations'] });
        },
        onError: (error: Error) => {
            console.error('Error uploading Excel file:', error);
        }
    });

    // Add Excel download mutation
// hooks/useTranslations.ts - Add this mutation
    const downloadExcelMutation = useMutation({
        mutationFn: async (filename?: string): Promise<Blob> => {
            const url = filename
                ? `/api/v1/download_excel?filename=${encodeURIComponent(filename)}`
                : '/api/v1/download_excel';

            const response = await axiosInstance.get(url, {
                responseType: 'blob', // Important for file downloads
            });

            return response.data;
        },
        onSuccess: (blob: Blob, filename?: string) => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || 'translations_export.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        },
        onError: (error: Error) => {
            console.error('Error downloading Excel file:', error);
        }
    });

    const downloadJsonMutation = useMutation({
        mutationFn: async (filename?: string): Promise<Blob> => {
            const url = filename
                ? `/api/v1/download_json?filename=${encodeURIComponent(filename)}`
                : '/api/v1/download_json';

            const response = await axiosInstance.get(url, {
                responseType: 'blob',
            });

            return response.data;
        },
        onSuccess: (blob: Blob, filename?: string) => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || 'translations_export.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        },
        onError: (error: Error) => {
            console.error('Error downloading JSON file:', error);
        }
    });

    const uploadJsonMutation = useMutation({
        mutationFn: async (file: File): Promise<unknown> => {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axiosInstance.post(
                '/api/v1/upload_json',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            return response.data;
        },
        onSuccess: async () => {
            // Refresh translations data after successful import
            await queryClient.invalidateQueries({ queryKey: ['translations'] });
        },
        onError: (error: Error) => {
            console.error('Error uploading JSON file:', error);
        }
    });

    return {
        strings,
        langs,
        translationsData: translationsData || [], // Ensure we always return an array
        isLoading: isLangsLoading || isTranslationsLoading,
        error: translationsError as Error | null,
        addKeyMutation,
        updateStringMutation,
        deleteStringMutation,
        uploadExcelMutation,
        downloadExcelMutation,
        downloadJsonMutation,
        uploadJsonMutation
    };
};