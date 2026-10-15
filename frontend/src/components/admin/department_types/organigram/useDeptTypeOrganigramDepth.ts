// src/components/admin/department_types/organigram/useDeptTypeOrganigramDepth.ts
import { useIntegerSetting } from '../../../../hooks/useAppSetting';
import { useDeptTypeOrganigramStore } from '../../../../store/deptTypeOrganigramStore';

export const MIN_DEPTH = 2;
export const MAX_DEPTH = 6;
const DEFAULT_DEPTH = 3;

const clamp = (n: number) => Math.min(MAX_DEPTH, Math.max(MIN_DEPTH, n));

/** Rows drawn (top row included): the per-browser override when set,
 *  otherwise the app setting `department_type_organigram_depth`. */
export function useDeptTypeOrganigramDepth(): {
    depth: number;
    setDepth: (depth: number) => void;
} {
    const { value: settingDepth } = useIntegerSetting(
        'department_type_organigram_depth',
        DEFAULT_DEPTH,
    );
    const override = useDeptTypeOrganigramStore((s) => s.depth);
    const setOverride = useDeptTypeOrganigramStore((s) => s.setDepth);
    return {
        depth: clamp(override ?? settingDepth),
        setDepth: (depth) => setOverride(clamp(depth)),
    };
}
