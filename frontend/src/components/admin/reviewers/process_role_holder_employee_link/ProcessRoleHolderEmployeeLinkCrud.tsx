// src/components/admin/reviewers/process_role_holder_employee_link/ProcessRoleHolderEmployeeLinkCrud.tsx
//
// Role-driven assignment tool: pick a ROLE, then one of that role's holders, then
// assign EMPLOYEES or DEPARTMENTS depending on the role's link_target.
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { fetchProcessRoleHolders } from '../process_role_holder/processRoleHolderApi';
import { fetchProcessRoles } from '../../../developer/process_roles/process_role/processRoleApi';
import { PROCESS_ROLE_HOLDER_QK, PROCESS_ROLE_QK } from '../../../../utils/queryKeys';
import { EmployeeAssignmentPanel } from './EmployeeAssignmentPanel';
import { DepartmentAssignmentPanel } from '../process_role_holder_department_link/DepartmentAssignmentPanel';
import useString from '../../../../hooks/useString';
import cfl from '../../../../utils/capitalizeFirstLetter';

export function ProcessRoleHolderEmployeeLinkCrud() {
    const getString = useString();

    const [roleId, setRoleId] = useState<number | null>(null);
    const [holderId, setHolderId] = useState<number | null>(null);

    const { data: roles = [] } = useQuery({
        queryKey: PROCESS_ROLE_QK,
        queryFn: () => fetchProcessRoles(),
        staleTime: 2 * 60 * 1000,
    });

    const { data: holders = [] } = useQuery({
        queryKey: [...PROCESS_ROLE_HOLDER_QK, roleId],
        queryFn: () => fetchProcessRoleHolders({ process_role_id: roleId ?? undefined }),
        staleTime: 2 * 60 * 1000,
        enabled: roleId !== null,
    });

    const selectedRole = useMemo(() => roles.find((r) => r.id === roleId) ?? null, [roles, roleId]);
    const isDepartment = selectedRole?.link_target === 'department';

    return (
        <Box>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                {getString('reviewerAssignments') || 'Reviewer assignments'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 260 }} variant="outlined" size="small">
                    <InputLabel id="assign-role-label">{cfl(getString('role')) || 'Role'}</InputLabel>
                    <Select
                        labelId="assign-role-label" variant="outlined" label={cfl(getString('role')) || 'Role'}
                        value={roleId ? String(roleId) : ''}
                        onChange={(e) => { setRoleId(e.target.value ? Number(e.target.value) : null); setHolderId(null); }}
                    >
                        {roles.map((r) => (
                            <MenuItem key={r.id} value={String(r.id)}>
                                {r.process_name ? `${r.process_name} / ` : ''}{r.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 320 }} variant="outlined" size="small" disabled={roleId === null}>
                    <InputLabel id="assign-holder-label">{cfl(getString('reviewer')) || 'Reviewer'}</InputLabel>
                    <Select
                        labelId="assign-holder-label" variant="outlined" label={cfl(getString('reviewer')) || 'Reviewer'}
                        value={holderId ? String(holderId) : ''}
                        onChange={(e) => setHolderId(e.target.value ? Number(e.target.value) : null)}
                    >
                        {holders.map((h) => (
                            <MenuItem key={h.id} value={String(h.id)}>
                                {h.holder_name || h.holder_code || `#${h.id}`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {roleId === null && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {getString('selectRoleToAssign') || 'Select a role, then a holder, to manage assignments.'}
                </Alert>
            )}
            {roleId !== null && holderId === null && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {getString('selectReviewerToManage') || 'Select a reviewer to view and assign.'}
                </Alert>
            )}

            {holderId !== null && (
                isDepartment
                    ? <DepartmentAssignmentPanel key={`d-${holderId}`} holderId={holderId} />
                    : <EmployeeAssignmentPanel key={`e-${holderId}`} holderId={holderId} />
            )}
        </Box>
    );
}
