// hooks/useString.ts
import { useMemo } from 'react';
import {defaultLangShortName} from "../utils/eNums.ts";
import {useTranslationsStore} from "../store/useTranslationsStore.ts";
import {useAuthStore} from "../store/authStore.ts";

// Define the string structure type
export interface StringResource {
    [key: string]: {
        [language: string]: string;
    };
}

// Define the hook parameters
interface UseStringParams {
    exrStr?: StringResource;
    str?: StringResource;
}

// Define the return type - accept any value that can be converted to string
type UseStringReturn = (stringKey: string, variables?: Record<string, unknown>) => string;

export const useString = ({ exrStr, str }: UseStringParams = {}):
    UseStringReturn => {
    // Primitive selectors only: subscribing to the whole store (or the whole
    // user object) re-renders every getString consumer on ANY store change
    // (isLoading flips, setUser on mount, etc.). Selecting just the lang code
    // and the strings map keeps getString stable in steady state.
    const userLang = useAuthStore(
        (state) => state.user?.lang?.short_name || defaultLangShortName,
    );
    const strings = useTranslationsStore((state) => state.strings);

    const getString = useMemo(() => {
        return (stringKey: string, variables: Record<string, unknown> = {}): string => {
            if (typeof stringKey !== 'string' || stringKey.length === 0) {
                console.warn('Invalid string key provided:', stringKey);
                return '';
            }
            let baseString: string | undefined;
            // First, check database str
            if (strings?.[stringKey]) {
                baseString = strings[stringKey][userLang] || strings[stringKey][defaultLangShortName];
            }

            // Then, check exrStr (external str passed as parameter)
            if (!baseString && exrStr?.[stringKey]) {
                baseString = exrStr[stringKey][userLang] || exrStr[stringKey][defaultLangShortName];
            }

            // Finally, check str (hardcoded str)
            if (!baseString && str?.[stringKey]) {
                baseString = str[stringKey][userLang] || str[stringKey][defaultLangShortName];
            }

            // If still not found, return the key and log warning
            if (!baseString) {
                console.warn(`String key "${stringKey}" not found in any string source for language "${userLang}".`);
                return stringKey;
            }

            // If no variables provided, return the base string immediately
            if (Object.keys(variables).length === 0) {
                return baseString;
            }

            // Replace variables in the string - convert all values to str
            return baseString.replace(/\$\{(\w+)\}/g, (match, variableName) => {
                const variableValue = variables[variableName];

                // Handle various types that can be converted to string
                if (variableValue === undefined || variableValue === null) {
                    return match; // Keep the original placeholder
                }

                // Convert to string
                return String(variableValue);
            });
        };
    }, [userLang, exrStr, str, strings]);

    return getString;
};

export default useString;