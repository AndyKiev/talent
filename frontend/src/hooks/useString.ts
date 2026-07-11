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

// Translation keys are camelCase by project rule, but some domain identifiers
// arrive snake_case (e.g. process-role keys like `oversight_manager`). Convert
// so a snake_case lookup transparently resolves the camelCase entry.
const snakeToCamel = (key: string): string =>
    key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const useString = ({ exrStr, str }: UseStringParams = {}):
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
            // An empty/whitespace key is a no-op (empty in → empty out). Callers
            // frequently pass an optional/dynamic key that may be blank; that is
            // not an error and must not spam the console.
            if (typeof stringKey !== 'string' || stringKey.trim().length === 0) {
                return '';
            }
            // Try the key as given, then its camelCase form (snake_case domain
            // identifiers resolve their camelCase translation entry).
            const camel = snakeToCamel(stringKey);
            const candidates = camel === stringKey ? [stringKey] : [stringKey, camel];

            let baseString: string | undefined;
            for (const key of candidates) {
                // First, check database str
                if (strings?.[key]) {
                    baseString = strings[key][userLang] || strings[key][defaultLangShortName];
                }
                // Then, check exrStr (external str passed as parameter)
                if (!baseString && exrStr?.[key]) {
                    baseString = exrStr[key][userLang] || exrStr[key][defaultLangShortName];
                }
                // Finally, check str (hardcoded str)
                if (!baseString && str?.[key]) {
                    baseString = str[key][userLang] || str[key][defaultLangShortName];
                }
                if (baseString) break;
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