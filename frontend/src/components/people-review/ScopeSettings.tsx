// src/components/people-review/ScopeSettings.tsx
//
// People-review scope switcher. Shows the active mode as a chip and a gear button
// opening a popover with the mode select and (for supervision) the department
// select. The active context is persisted server-side (process_role_active_contexts)
// and shared across pages. Modes available to a role holder:
//   - "only myself"           -> no active role; roster shows just self, so the
//                                holder can reach and edit their own data
//   - an oversight role        -> roster = linked-employee roster (minus self)
//   - a supervision role       -> roster = the picked department subtree (minus self)
// A user with NO people-review role renders nothing here: they naturally see only
// themselves. The mode select always offers "only myself" + every held role; for a
// single-role holder that is a two-option select (their role <-> only myself).
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Chip, FormControl, IconButton, InputLabel, MenuItem,
    Popover, Select, Stack, Tooltip, Typography,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { fetchMyScopes, setActiveContext } from './peopleReviewApi';
import { PEOPLE_REVIEW_MY_SCOPES_QK } from '../../utils/queryKeys';
import useString from '../../hooks/useString';
import cfl from '../../utils/capitalizeFirstLetter';

export function ScopeSettings({ disabled = false }: { disabled?: boolean }) {
    const getString = useString();
    const qc = useQueryClient();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    const { data: scopes } = useQuery({
        queryKey: PEOPLE_REVIEW_MY_SCOPES_QK,
        queryFn: fetchMyScopes,
        staleTime: 60_000,
    });

    const mut = useMutation({
        mutationFn: setActiveContext,
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: PEOPLE_REVIEW_MY_SCOPES_QK });
            await qc.invalidateQueries({ queryKey: ['session_employees'] });
        },
    });

    const roles = scopes?.roles ?? [];
    const allDepartments = scopes?.departments ?? [];
    const active = scopes?.active ?? { process_role_id: null, department_id: null };
    const activeRole = roles.find((r) => r.process_role_id === active.process_role_id) ?? null;
    const deptOptions = allDepartments.filter((d) => d.process_role_id === active.process_role_id);

    if (roles.length === 0) return null; // no people-review role -> naturally sees only self

    const onlyMyselfLabel = getString('modeOnlyMyself') || 'Only myself';
    const roleLabel = (key: string | null, name: string) => (key ? getString(key) || name : name);

    const deptFor = (roleId: number): number | null => {
        const ds = allDepartments.filter((d) => d.process_role_id === roleId);
        return ds.length === 1 ? ds[0].id : null; // auto-pick when unambiguous
    };

    const setMode = (value: string) => {
        if (!value) {
            mut.mutate({ process_role_id: null, department_id: null }); // only myself
            return;
        }
        const roleId = Number(value);
        const r = roles.find((x) => x.process_role_id === roleId);
        const departmentId = r?.link_target === 'department' ? deptFor(roleId) : null;
        mut.mutate({ process_role_id: roleId, department_id: departmentId });
    };
    const setDept = (departmentId: number | null) =>
        mut.mutate({ process_role_id: active.process_role_id, department_id: departmentId });

    const isSupervisionActive = activeRole?.link_target === 'department';
    const chipLabel = activeRole ? roleLabel(activeRole.key, activeRole.name) : onlyMyselfLabel;

    return (
        <Stack direction="row" alignItems="center" spacing={1}>
            <Chip
                size="small"
                label={chipLabel}
                color={activeRole ? 'primary' : 'default'}
                variant="outlined"
            />

            <Tooltip title={getString('scopeSettings') || 'View settings'}>
                <span>
                    <IconButton size="small" disabled={disabled} onClick={(e) => setAnchor(e.currentTarget)}>
                        <SettingsIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>

            <Popover
                open={!!anchor}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Box sx={{ p: 2, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                        {cfl(getString('viewMode') || 'View mode')}
                    </Typography>

                    <FormControl fullWidth variant="outlined" size="small" disabled={disabled}>
                        <InputLabel id="scope-mode-label">{getString('mode') || 'Mode'}</InputLabel>
                        <Select
                            labelId="scope-mode-label"
                            variant="outlined"
                            label={getString('mode') || 'Mode'}
                            value={active.process_role_id ? String(active.process_role_id) : ''}
                            displayEmpty
                            onChange={(e) => setMode(e.target.value)}
                        >
                            <MenuItem value="">{onlyMyselfLabel}</MenuItem>
                            {roles.map((r) => (
                                <MenuItem key={r.process_role_id} value={String(r.process_role_id)}>
                                    {roleLabel(r.key, r.name)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {isSupervisionActive && (
                        <FormControl fullWidth variant="outlined" size="small" disabled={disabled}>
                            <InputLabel id="scope-dept-label">{getString('department') || 'Department'}</InputLabel>
                            <Select
                                labelId="scope-dept-label"
                                variant="outlined"
                                label={getString('department') || 'Department'}
                                value={active.department_id ? String(active.department_id) : ''}
                                onChange={(e) => setDept(e.target.value ? Number(e.target.value) : null)}
                            >
                                {deptOptions.map((d) => (
                                    <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </Box>
            </Popover>
        </Stack>
    );
}
