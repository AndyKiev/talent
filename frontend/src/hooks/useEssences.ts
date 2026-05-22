// src/hooks/useEssences.ts
import { useMemo } from 'react';
import useString from './useString';
import str from '../strings/str';
import type { CardEssenceConfig, RawEssenceConfig } from '../types/essence';

export function useEssences(rawEssences: RawEssenceConfig[]): CardEssenceConfig[] {
    const getString = useString({ str });

    return useMemo(
        () => rawEssences.map((e) => ({
            ...e,
            label: getString(e.labelKey),
            description: getString(e.descriptionKey),
        })),
        [rawEssences, getString]
    );
}