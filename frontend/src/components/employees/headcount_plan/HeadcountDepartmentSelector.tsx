// src/components/employees/headcount_plan/HeadcountDepartmentSelector.tsx
//
// Department-instance picker for the headcount-plan page, same flow as the
// transfer-event form: pick the TOP instance (scope-aware Select — HRM sees
// only their scope roots, admin/HRS/dev see all), then refine to the exact
// instance (top itself or any descendant) in the subtree picker.
// Fully controlled — both the top and the exact selection live in the URL,
// so browser back/forward restores the page.
import { Box, Typography } from '@mui/material';
import { SelectScopeDepartment } from '../SelectScopeDepartment';
import { DepartmentTreePicker } from '../DepartmentTreePicker';
import type { DepartmentNode } from '../../admin/departments/departmentApi';
import type { GetStringFn } from '../../../types/getStringFn';

interface Props {
    /** The chosen TOP instance whose subtree is rendered. */
    topId: number | null;
    /** The exact department instance chosen (drives the calc grid). */
    value: number | null;
    onTopChange: (topId: number | null) => void;
    onChange: (departmentId: number | null, departmentName: string | null) => void;
    getString: GetStringFn;
}

export function HeadcountDepartmentSelector({
    topId,
    value,
    onTopChange,
    onChange,
    getString,
}: Props) {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
            <SelectScopeDepartment
                value={topId}
                allowAll={false}
                alwaysShow
                onChange={onTopChange}
            />
            {topId != null && (
                <DepartmentTreePicker
                    rootId={topId}
                    selectedId={value}
                    onSelect={(node: DepartmentNode) => onChange(node.id, node.name)}
                />
            )}
            {topId == null && (
                <Typography variant="body2" color="text.secondary">
                    {getString('selectDepartmentFirst')}
                </Typography>
            )}
        </Box>
    );
}
