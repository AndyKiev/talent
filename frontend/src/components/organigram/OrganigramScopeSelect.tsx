// src/components/organigram/OrganigramScopeSelect.tsx
//
// Local copy of the scope-aware top-department Select (original:
// components/employees/SelectScopeDepartment) so the organigram folder stays
// standalone. HRM sees only their scope roots; admin/HRS/dev see all.
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
import {
    fetchOrganigramScopeDepartments,
    type OrganigramScopeDepartment,
} from './organigramApi';
import useString from '../../hooks/useString';
import cfl from '../../utils/helpers.ts';

interface Props {
    value: number | null;
    onChange: (departmentId: number | null) => void;
}

export function OrganigramScopeSelect({ value, onChange }: Props) {
    const getString = useString();

    const { data: departments = [], isLoading } = useQuery({
        queryKey: ['employees', 'scope_departments'],
        queryFn: fetchOrganigramScopeDepartments,
        staleTime: 5 * 60 * 1000,
    });

    // Group options by category, preserving the backend order.
    const groups = useMemo(() => {
        const order: string[] = [];
        const byKey = new Map<string, { label: string; items: OrganigramScopeDepartment[] }>();
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

    return (
        <FormControl size="small" fullWidth>
            <InputLabel>{cfl(getString('mainDepartment'))}</InputLabel>
            <Select
                variant="outlined"
                label={cfl(getString('mainDepartment'))}
                value={value == null ? '' : String(value)}
                onChange={(e) => {
                    const v = e.target.value;
                    onChange(v === '' ? null : Number(v));
                }}
            >
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
