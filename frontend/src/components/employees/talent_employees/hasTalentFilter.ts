// src/components/employees/talent_employees/hasTalentFilter.ts
import type { GetStringFn } from '../../../types/getStringFn';

// The "has talent" filter of the talent employees list. Absent from the URL
// means Yes — the page opens on employees that have at least one talent.
export enum HasTalentFilter {
    Yes = 'yes',
    No = 'no',
    All = 'all',
}

export const HAS_TALENT_FILTERS = [HasTalentFilter.Yes, HasTalentFilter.No, HasTalentFilter.All];

const LABEL_KEY: Record<HasTalentFilter, string> = {
    [HasTalentFilter.Yes]: 'yes',
    [HasTalentFilter.No]: 'no',
    [HasTalentFilter.All]: 'all',
};

export const hasTalentLabel = (v: HasTalentFilter, getString: GetStringFn) =>
    getString(LABEL_KEY[v]);

// Backend has_talent param: true / false, omitted = all.
export const hasTalentParam = (v: HasTalentFilter): boolean | undefined =>
    v === HasTalentFilter.All ? undefined : v === HasTalentFilter.Yes;
