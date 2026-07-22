// src/components/employees/SelectScopeDepartment.tsx
//
// Scope-aware top-department picker — a searchable Autocomplete (type to
// narrow), grouped by category in the backend order (store, directorate,
// other). Clearing the value (✕) means "all departments" when allowAll.
import { Autocomplete, Box, CircularProgress, ListSubheader, TextField } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchScopeDepartments, type ScopeDepartment } from './employeeApi';
import { SCOPE_DEPARTMENTS_QK } from './useEmployeeMutations';
import useString from '../../hooks/useString';
import str from '../../strings/str';
import cfl from '../../utils/helpers.ts';

interface Props {
    value: number | null;
    onChange: (departmentId: number | null) => void;
    /**
     * Accepted for API compatibility. The picker is now always clearable
     * (clearing → null); callers that pass `false` just treat null as "none".
     */
    allowAll?: boolean;
    /** Render even when there is only one option. Default false. */
    alwaysShow?: boolean;
}

export function SelectScopeDepartment({
    value,
    onChange,
    alwaysShow = false,
}: Props) {
    const getString = useString({ str });

    const { data: departments = [], isLoading } = useQuery({
        queryKey: SCOPE_DEPARTMENTS_QK,
        queryFn: fetchScopeDepartments,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 220, height: 40 }}>
                <CircularProgress size={20} />
            </Box>
        );
    }

    // Nothing in scope at all — nothing to pick from.
    if (departments.length === 0) return null;
    // Otherwise show the picker only when there is a real choice to make,
    // unless the caller wants it permanently on screen (alwaysShow).
    if (!alwaysShow && departments.length < 2) return null;

    const selected = departments.find((d) => d.id === value) ?? null;
    const label = cfl(getString('mainDepartment') || 'Main department');

    return (
        <Autocomplete<ScopeDepartment>
            size="small"
            sx={{ minWidth: 260 }}
            options={departments}
            value={selected}
            onChange={(_, opt) => onChange(opt?.id ?? null)}
            // Backend order already keeps categories contiguous, so groupBy
            // reproduces the old ListSubheader grouping as-is.
            groupBy={(d) => d.category_name ?? ''}
            getOptionLabel={(d) => d.name}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            noOptionsText={getString('noOptions')}
            renderGroup={(params) => (
                <li key={params.key}>
                    {params.group && <ListSubheader component="div">{cfl(params.group)}</ListSubheader>}
                    <ul style={{ padding: 0 }}>{params.children}</ul>
                </li>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    variant="outlined"
                    label={label}
                    placeholder={getString('search') || 'Search'}
                />
            )}
        />
    );
}
