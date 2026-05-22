// hooks/useClipboard.ts
import { useCallback } from 'react';
import useString from './useString';

interface UseClipboardOptions {
    onSuccess?: (message: string) => void;
    onError?: (message: string) => void;
    successMessage?: string;
    errorMessage?: string;
}

interface UseClipboardReturn {
    copyToClipboard: (text: string, customOptions?: Partial<UseClipboardOptions>) => Promise<boolean>;
    copyViaLegacy: (text: string) => boolean;
    isClipboardSupported: boolean;
}

export const useClipboard = (defaultOptions?: UseClipboardOptions): UseClipboardReturn => {
    const getString = useString();

    const copyViaLegacy = useCallback((text: string): boolean => {
        const textArea = document.createElement('textarea');
        textArea.value = text;

        // Make the textarea out of viewport
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.opacity = '0';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch (err) {
            document.body.removeChild(textArea);
            return false;
        }
    }, []);

    const copyToClipboard = useCallback(async (
        text: string,
        customOptions?: Partial<UseClipboardOptions>
    ): Promise<boolean> => {
        if (!text) return false;

        const options = {
            onSuccess: defaultOptions?.onSuccess,
            onError: defaultOptions?.onError,
            successMessage: defaultOptions?.successMessage || getString('copiedToClipboard'),
            errorMessage: defaultOptions?.errorMessage || getString('errorCopyingToClipboard'),
            ...customOptions
        };

        let success = false;

        // Try modern Clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                success = true;
            } catch (err) {
                success = copyViaLegacy(text);
            }
        } else {
            success = copyViaLegacy(text);
        }

        // Handle callbacks
        if (success && options.onSuccess) {
            options.onSuccess(options.successMessage);
        } else if (!success && options.onError) {
            options.onError(options.errorMessage);
        }

        return success;
    }, [getString, copyViaLegacy, defaultOptions]);

    const isClipboardSupported = !!(navigator.clipboard && window.isSecureContext) ||
        !!document.execCommand('copy');

    return {
        copyToClipboard,
        copyViaLegacy,
        isClipboardSupported
    };
};