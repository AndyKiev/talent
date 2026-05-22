// hooks/useBulkTranslations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { axiosInstance, axiosFormDataInstance } from '../api/axiosInstance';
import type { ImportResult } from "./components/dialogs/ImportJsonTextDialogNew.tsx";
import {axiosFormDataInstance, axiosInstance} from "../../../api/axiosInstance.ts";

const BASE = '/api/v1/msg_bulk';

// ── helpers ────────────────────────────────────────────────────────────────────

function buildFilenameParam(custom: boolean, name: string, defaultName: string): string {
    const filename = custom && name ? name : defaultName;
    return encodeURIComponent(filename);
}

async function downloadBlob(url: string, fallbackFilename: string): Promise<void> {
    const response = await axiosInstance.get(url, {
        responseType: 'blob',
    });

    const blob = response.data;
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const disposition = response.headers['content-disposition'] ?? '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    a.download = match?.[1] ?? fallbackFilename;
    a.href = href;
    a.click();
    URL.revokeObjectURL(href);
}

// ── hook ───────────────────────────────────────────────────────────────────────

export function useBulkTranslations() {
    const queryClient = useQueryClient();

    const invalidateMessages = () =>
        queryClient.invalidateQueries({ queryKey: ['fullMessages'] });

    // ── Export JSON ────────────────────────────────────────────────────────

    const downloadJsonMutation = useMutation({
        mutationFn: ({ useCustomName, customFilename }: { useCustomName: boolean; customFilename: string }) => {
            const fn = buildFilenameParam(useCustomName, customFilename, 'translations_export.json');
            return downloadBlob(`${BASE}/export_json?filename=${fn}`, 'translations_export.json');
        },
    });

    // ── Export Excel ───────────────────────────────────────────────────────

    const downloadExcelMutation = useMutation({
        mutationFn: ({ useCustomName, customFilename }: { useCustomName: boolean; customFilename: string }) => {
            const fn = buildFilenameParam(useCustomName, customFilename, 'translations_export.xlsx');
            return downloadBlob(`${BASE}/export_excel?filename=${fn}`, 'translations_export.xlsx');
        },
    });

    // ── Import JSON file ───────────────────────────────────────────────────

    const importJsonFileMutation = useMutation<ImportResult, Error, File>({
        mutationFn: async (file: File): Promise<ImportResult> => {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axiosFormDataInstance.post(`${BASE}/import_json_file`, formData);
            return response.data;
        },
        onSuccess: invalidateMessages,
    });

    // ── Import JSON text ───────────────────────────────────────────────────

    const importJsonTextMutation = useMutation<ImportResult, Error, string>({
        mutationFn: async (text: string): Promise<ImportResult> => {
            const response = await axiosInstance.post(`${BASE}/import_json_text`, text, {
                headers: { 'Content-Type': 'text/plain' },
            });
            return response.data;
        },
        onSuccess: invalidateMessages,
    });

    // ── Import Excel file ──────────────────────────────────────────────────

    const importExcelMutation = useMutation<ImportResult, Error, File>({
        mutationFn: async (file: File): Promise<ImportResult> => {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axiosFormDataInstance.post(`${BASE}/import_excel`, formData);
            return response.data;
        },
        onSuccess: invalidateMessages,
    });

    return {
        downloadJsonMutation,
        downloadExcelMutation,
        importJsonFileMutation,
        importJsonTextMutation,
        importExcelMutation,
    };
}