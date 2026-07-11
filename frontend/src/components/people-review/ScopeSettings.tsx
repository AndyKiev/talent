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
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Box, Chip, CircularProgress, FormControl, IconButton, InputLabel, MenuItem,
    Popover, Select, Stack, Tooltip, Typography,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { fetchMyScopes, fetchSessionScopeAvailability, setActiveContext } from './peopleReviewApi';
import {
    PEOPLE_REVIEW_MY_SCOPES_QK,
    PEOPLE_REVIEW_SESSION_AVAILABILITY_QK,
} from '../../utils/queryKeys';
import useString from '../../hooks/useString';
import cfl from '../../utils/capitalizeFirstLetter';

export function ScopeSettings({
    disabled = false,
    sessionId,
    sessionDepartmentIds,
    sessionDepartmentName,
}: {
    disabled?: boolean;
    /** Current review-session id. When provided, modes with no one to show in
     *  this session are disabled with an on-hover hint: 'only myself' when the
     *  user is not an employee of the session, an oversight role when none of
     *  its linked employees are in the session. */
    sessionId?: number;
    /** Department ids linked to the current review session. When provided, only
     *  intersecting supervised departments are selectable; others are disabled
     *  with an on-hover hint.  When undefined/empty, behaves as before. */
    sessionDepartmentIds?: number[];
    /** The session's own department name (as shown in the grid and session header
     *  chip). When the supervisor has multiple matching departments and this name
     *  matches one of them, that department is auto-selected. */
    sessionDepartmentName?: string | null;
}) {
    const getString = useString();
    const qc = useQueryClient();
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    const { data: scopes } = useQuery({
        queryKey: PEOPLE_REVIEW_MY_SCOPES_QK,
        queryFn: fetchMyScopes,
        staleTime: 60_000,
    });

    // Session-context availability of the modes (see the sessionId prop docs).
    // Until it loads, nothing is disabled — options only lock once we KNOW.
    const { data: availability } = useQuery({
        queryKey: PEOPLE_REVIEW_SESSION_AVAILABILITY_QK(sessionId ?? 0),
        queryFn: () => fetchSessionScopeAvailability(sessionId as number),
        staleTime: 60_000,
        enabled: sessionId != null,
    });

    const mut = useMutation({
        mutationFn: setActiveContext,
        onSuccess: async (_data, variables) => {
            const r = roles.find((x) => x.process_role_id === variables.process_role_id);
            const awaitingDept = r?.link_target === 'department' && variables.department_id == null;
            if (!awaitingDept) setAnchor(null);
            // Parallel: the roster refetch must not wait for my_scopes (each
            // sequential await added a full round-trip to every scope switch).
            await Promise.all([
                qc.invalidateQueries({ queryKey: PEOPLE_REVIEW_MY_SCOPES_QK }),
                ...(!awaitingDept ? [qc.invalidateQueries({ queryKey: ['session_employees'] })] : []),
            ]);
        },
    });

    const roles = scopes?.roles ?? [];
    const allDepartments = scopes?.departments ?? [];
    const active = scopes?.active ?? { process_role_id: null, department_id: null };
    const activeRole = roles.find((r) => r.process_role_id === active.process_role_id) ?? null;
    const deptOptions = allDepartments.filter((d) => d.process_role_id === active.process_role_id);

    const onlyMyselfLabel = getString('modeOnlyMyself') || 'Only myself';
    const roleLabel = (key: string | null, name: string) => {
        if (!key) return name;
        const translated = getString(key);
        return translated !== key ? translated : name;
    };

    // Whether the session-department cross-check is active.
    const hasSessionDepts = sessionDepartmentIds && sessionDepartmentIds.length > 0;

    const deptFor = (roleId: number): number | null => {
        const ds = allDepartments.filter((d) => d.process_role_id === roleId);
        if (hasSessionDepts) {
            const matching = ds.filter((d) => sessionDepartmentIds!.includes(d.id));
            return matching.length === 1 ? matching[0].id : null;
        }
        return ds.length === 1 ? ds[0].id : null;
    };

    const setMode = (value: string) => {
        if (!value) {
            mut.mutate({ process_role_id: null, department_id: null });
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
    const activeDept = allDepartments.find((d) => d.id === active.department_id) ?? null;

    // While the mode/department change is in flight the server `active` (and thus the
    // chip) still shows the OLD mode. Show an immediate "Loading…" chip in its place
    // so the user gets instant feedback instead of staring at the stale mode.
    const isSwitching = mut.isPending;

    // ── Autoselect department when session changes or scopes load ────────────
    // Auto-pick the session's department when the supervisor navigates into
    // a session (including cross-session navigation where a different department
    // was selected in the previous session).  Does NOT re-fire on manual
    // department changes — only sessionDepartmentIds/sessionDepartmentName
    // (session change) or isSupervisionActive (scopes loaded) trigger it.
    useEffect(() => {
        if (!hasSessionDepts) return;
        if (!isSupervisionActive) return;
        const roleId = active.process_role_id;
        if (roleId == null) return;
        const ds = allDepartments.filter((d) => d.process_role_id === roleId);
        const matching = ds.filter((d) => sessionDepartmentIds!.includes(d.id));
        if (matching.length === 1) {
            if (active.department_id !== matching[0].id) {
                setDept(matching[0].id);
            }
        } else if (matching.length > 1 && sessionDepartmentName) {
            const byName = matching.find(
                (d) => d.name.toLowerCase() === sessionDepartmentName.toLowerCase(),
            );
            if (byName && active.department_id !== byName.id) {
                setDept(byName.id);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionDepartmentIds, sessionDepartmentName, isSupervisionActive]);

    // ── Disabled-option hint text ────────────────────────────────────────────
    const disabledHint = getString('deptNotInSession') || 'This department is not part of this review session';

    // ── Session-context mode availability ───────────────────────────────────
    // 'Only myself' needs the user to BE in the session; an oversight role needs
    // at least one of its linked employees in the session. No availability data
    // (sessions-list level, or still loading) -> everything selectable.
    const selfSelectable = !availability || availability.self_in_session;
    const isOversightSelectable = (roleId: number) =>
        !availability || availability.oversight_role_ids_with_members.includes(roleId);
    const selfNotInSessionHint =
        getString('selfNotInSession') || 'You are not an employee of this review session';
    const oversightNoneInSessionHint =
        getString('oversightNoneInSession') ||
        'None of your oversight employees are in this session';

    if (roles.length === 0) return null;

    return (
        <Stack direction="row" alignItems="center" spacing={1}>
            {isSwitching ? (
                <Chip
                    size="small"
                    icon={<CircularProgress size={12} thickness={5} sx={{ ml: 0.5 }} />}
                    label={getString('loading') || 'Loading…'}
                    variant="outlined"
                />
            ) : (
                <>
                    <Chip
                        size="small"
                        label={chipLabel}
                        color={activeRole ? 'primary' : 'default'}
                        variant="outlined"
                    />

                    {isSupervisionActive && activeDept && (
                        <Chip
                            size="small"
                            label={activeDept.name}
                            color="primary"
                            variant="outlined"
                        />
                    )}
                </>
            )}

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
                            {selfSelectable ? (
                                <MenuItem value="">{onlyMyselfLabel}</MenuItem>
                            ) : (
                                <Tooltip title={selfNotInSessionHint} placement="left">
                                    <span>
                                        <MenuItem value="" disabled>{onlyMyselfLabel}</MenuItem>
                                    </span>
                                </Tooltip>
                            )}
                            {roles.map((r) => {
                                // Oversight roles are session-gated; supervision roles
                                // stay selectable (their department select is gated).
                                const selectable =
                                    r.link_target !== 'employee' ||
                                    isOversightSelectable(r.process_role_id);
                                const item = (
                                    <MenuItem
                                        key={r.process_role_id}
                                        value={String(r.process_role_id)}
                                        disabled={!selectable}
                                    >
                                        {roleLabel(r.key, r.name)}
                                    </MenuItem>
                                );
                                if (!selectable) {
                                    return (
                                        <Tooltip
                                            key={r.process_role_id}
                                            title={oversightNoneInSessionHint}
                                            placement="left"
                                        >
                                            <span>{item}</span>
                                        </Tooltip>
                                    );
                                }
                                return item;
                            })}
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
                                {deptOptions.map((d) => {
                                    const isMatch = !hasSessionDepts || sessionDepartmentIds!.includes(d.id);
                                    const menuItem = (
                                        <MenuItem key={d.id} value={String(d.id)} disabled={!isMatch}>
                                            {d.name}
                                        </MenuItem>
                                    );
                                    if (!isMatch) {
                                        return (
                                            <Tooltip key={d.id} title={disabledHint} placement="left">
                                                <span>{menuItem}</span>
                                            </Tooltip>
                                        );
                                    }
                                    return menuItem;
                                })}
                            </Select>
                        </FormControl>
                    )}
                </Box>
            </Popover>
        </Stack>
    );
}