// src/components/employees/useEmployeeMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums';
import {
    updateEmployee,
    deleteEmployee,
    type Employee,
    type EmployeeUpdate,
} from './employeeApi';
import { updatePerson, type PersonUpdate } from '../admin/persons/personApi';
import { createTalentAudit, createTalentAuditJob } from './talent_audit/talentAuditApi';
import useString from '../../hooks/useString';
import { PERSON_QK } from '../../utils/queryKeys';
import type {
    EmployeeWithActivationPayload,
    EmployeeCreateResult,
} from './EmployeeCreateDialog';

// Talent target jobs and talent_audit both use the "created" status (id 1) — the
// same defaults the standalone talent-audit page uses on creation.
const TALENT_DEFAULT_STATUS_ID = 1;

type Snackbar = { open: boolean; message: string; severity: 'success' | 'error' };

export const EMPLOYEES_QK = ['employees'] as const;
export const SCOPE_DEPARTMENTS_QK = ['employees', 'scope_departments'] as const;

interface Props {
    setSnackbar: (s: Snackbar) => void;
    onCreateSuccess?: () => void;
    onUpdateSuccess?: () => void;
    onDeleteSuccess?: () => void;
    onDeleteError?: () => void;
}

// ── API call for the orchestration endpoint ───────────────────────────────────

const createEmployeeWithActivation = async (
    payload: EmployeeWithActivationPayload,
): Promise<EmployeeCreateResult> => {
    // talent_jobs is a client-side orchestration extra — strip it before posting
    // to the /with_activation endpoint, which knows nothing about talent.
    const { talent_jobs, ...employeeFields } = payload;

    const res = await axiosInstance.post<Employee>(
        `${BASE_URL}/employees/with_activation`,
        employeeFields,
    );
    const employee = res.data;

    // The employee is the primary entity; talent is a supplementary add-on. If a
    // talent call fails we keep the (valid) employee and report the talent error
    // separately, rather than failing the whole creation.
    let talentError: string | null = null;
    if (talent_jobs && talent_jobs.length > 0) {
        try {
            const auditRes = await createTalentAudit({
                employee_id: employee.id,
                status_id: TALENT_DEFAULT_STATUS_ID,
            });
            const auditId = auditRes.data.id;
            for (const tj of talent_jobs) {
                await createTalentAuditJob({
                    talent_audit_id: auditId,
                    target_job_id: tj.target_job_id,
                    status_id: TALENT_DEFAULT_STATUS_ID,
                    talent_status_period_link_id: tj.talent_status_period_link_id,
                });
            }
        } catch (err) {
            talentError = (err as Error).message;
        }
    }

    return { employee, talentError };
};

export function useEmployeeMutations({
    setSnackbar,
    onCreateSuccess,
    onUpdateSuccess,
    onDeleteSuccess,
    onDeleteError,
}: Props) {
    const qc = useQueryClient();
    const getString = useString();

    // Employee create/update touch the persons table too (person created under
    // the hood; renames sync employees.name) — refresh both caches.
    const invalidate = async () => {
        await qc.invalidateQueries({ queryKey: EMPLOYEES_QK });
        await qc.invalidateQueries({ queryKey: PERSON_QK });
    };

    // ── Create employee + activation, then optional talent audit/jobs ─────────

    const createMutation = useMutation({
        mutationFn: createEmployeeWithActivation,
        onSuccess: async ({ talentError }) => {
            await invalidate();
            // Employee always created; if the optional talent step failed, surface
            // that as a warning instead of a plain success.
            if (talentError) {
                setSnackbar({
                    open: true,
                    message: getString('employeeCreatedTalentFailed', { error: talentError }),
                    severity: 'error',
                });
            } else {
                setSnackbar({
                    open: true,
                    message: getString('employeeCreated') || 'Employee created successfully',
                    severity: 'success',
                });
            }
            onCreateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    // ── Update employee (email / is_active) + optional person name patch ──────
    // Name fields live on the person now: when the edit dialog changed them, we
    // PATCH /persons/{id} first (the backend rebuilds employees.name), then the
    // employee's own fields.

    const updateMutation = useMutation({
        mutationFn: async ({
            id,
            data,
            personId,
            personData,
        }: {
            id: number;
            data: EmployeeUpdate;
            personId?: number | null;
            personData?: PersonUpdate;
        }) => {
            if (personId && personData) {
                await updatePerson({ id: personId, data: personData });
            }
            return updateEmployee({ id, data });
        },
        onSuccess: async () => {
            await invalidate();
            setSnackbar({
                open: true,
                message: getString('employeeUpdated') || 'Employee updated successfully',
                severity: 'success',
            });
            onUpdateSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
        },
    });

    // ── Delete employee ───────────────────────────────────────────────────────

    const deleteMutation = useMutation({
        mutationFn: ({ id, force }: { id: number; force?: boolean }) =>
            deleteEmployee(id, force ?? false),
        onSuccess: async (res) => {
            await invalidate();
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
            onDeleteSuccess?.();
        },
        onError: (err: Error) => {
            setSnackbar({ open: true, message: err.message, severity: 'error' });
            onDeleteError?.();
        },
    });

    return { createMutation, updateMutation, deleteMutation };
}
