// src/types/essence.ts
import type { ElementType } from 'react';

export interface RawEssenceConfig {
    parent: string;
    key: string;
    labelKey: string;
    descriptionKey: string;
    Icon: ElementType;
    color: string;
    isGroup?: boolean;
    parentGroup?: string;
    groupKey?: string;
    isTree?: boolean;   // marks a tree/organigram essence (renders TreeEssenceCard)
}

export interface CardEssenceConfig {
    parent: string;
    key: string;
    label: string;
    description: string;
    Icon: ElementType;
    color: string;
    isGroup?: boolean;
    parentGroup?: string;
    groupKey?: string;
    isTree?: boolean;
}
