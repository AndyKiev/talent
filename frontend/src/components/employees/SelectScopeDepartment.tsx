// src/components/employees/SelectScopeDepartment.tsx
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ListSubheader,
    CircularProgress,
    Box,
} from '@mui/material';
import { fetchScopeDepartments, type ScopeDepartment } from './employeeApi';
import { SCOPE_DEPARTMENTS_QK } from './useEmployeeMutations';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

interface Props {
    value: number | null;
    onChange: (departmentId: number | null) => void;
    /** Offer the "All departments" item (value null). Default true. */
    allowAll?: boolean;
    /** Render even when there is only one option. Default false. */
    alwaysShow?: boolean;
}

const ALL_VALUE = '__all__';

export function SelectScopeDepartment({
    value,
    onChange,
    allowAll = true,
    alwaysShow = false,
}: Props) {
    const getString = useString({ str });

    const { data: departments = [], isLoading } = useQuery({
        queryKey: SCOPE_DEPARTMENTS_QK,
        queryFn: fetchScopeDepartments,
        staleTime: 5 * 60 * 1000,
    });

    // Group options by category, preserving the backend order (store, directorate, other).
    const groups = useMemo(() => {
        const order: string[] = [];
        const byKey = new Map<string, { label: string; items: ScopeDepartment[] }>();
        for (const d of departments) {
            const key = d.category_key ?? '__none__';
            if (!byKey.has(key)) {
                byKey.set(key, { label: d.category_name ?? '', items: [] });
                order.push(key);
            }
            byKey.get(key)!.items.push(d);
        }
        return order.map((k) => ({ key: k, ...byKey.get(k)! }));
    }, [departments]);

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 220, height: 40 }}>
                <CircularProgress size={20} />
            </Box>
        );
    }

    // Show the Select only when there is a real choice to make.
    if (!alwaysShow && departments.length < 2) return null;

    return (
        <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>{cfl(getString('mainDepartment') || 'main Department')}</InputLabel>

            <Select
                variant="outlined"
                label={cfl(getString('mainDepartment') || 'main Department')}
                value={value == null ? (allowAll ? ALL_VALUE : '') : String(value)}
                onChange={(e) => {
                    const v = e.target.value;
                    onChange(v === ALL_VALUE ? null : Number(v));
                }}
            >
                {allowAll && (
                    <MenuItem value={ALL_VALUE}>
                        <em>{getString('allDepartments') || 'All departments'}</em>
                    </MenuItem>
                )}
                {groups.flatMap((g) => [
                    g.label ? (
                        <ListSubheader key={`h_${g.key}`}>{cfl(g.label)}</ListSubheader>
                    ) : null,
                    ...g.items.map((d) => (
                        <MenuItem key={d.id} value={String(d.id)}>
                            {d.name}
                        </MenuItem>
                    )),
                ])}
            </Select>
        </FormControl>
    );
}
