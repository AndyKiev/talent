// src/components/missions/useMissionMutations.ts
//
// Every mission mutation invalidates the SAME per-employee list query: KPIs,
// comments and the competence link all ride nested on the mission rows, so one
// key keeps the whole panel consistent without a second round of fetches.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
    createKpi,
    createMission,
    createMissionComment,
    clearMissionDimension,
    deleteKpi,
    deleteMission,
    deleteMissionComment,
    saveDevelopmentVision,
    setMissionDimension,
    updateKpi,
    updateMission,
    updateMissionComment,
    type MissionCreate,
    type MissionUpdate,
} from './missionApi';
import {
    DEVELOPMENT_VISION_QK,
    EMPLOYEE_MISSIONS_QK,
    MISSION_HISTORY_QK,
} from '../../utils/queryKeys';
import type { SnackbarType } from '../../types/types';

interface Options {
    employeeId: number;
    setSnackbar: (s: SnackbarType) => void;
    onMissionSaved?: () => void;
    onMissionDeleted?: () => void;
}

export function useMissionMutations({
    employeeId,
    setSnackbar,
    onMissionSaved,
    onMissionDeleted,
}: Options) {
    const qc = useQueryClient();

    const refresh = async (missionId?: number) => {
        await qc.invalidateQueries({ queryKey: EMPLOYEE_MISSIONS_QK(employeeId) });
        // A KPI or mission edit is exactly what the history dialog shows, so drop
        // its cache too — otherwise a reopened dialog shows a stale trail.
        if (missionId != null) {
            await qc.invalidateQueries({ queryKey: MISSION_HISTORY_QK(missionId) });
        }
    };
    const ok = async (detail: string, missionId?: number, cb?: () => void) => {
        await refresh(missionId);
        setSnackbar({ open: true, message: detail, severity: 'success' });
        cb?.();
    };
    const fail = (err: Error) =>
        setSnackbar({ open: true, message: err.message, severity: 'error' });

    // ── missions ────────────────────────────────────────────────────────────
    const createMissionMutation = useMutation({
        mutationFn: (body: MissionCreate) => createMission(employeeId, body),
        onSuccess: (res) => ok(res.detail, res.data?.id, onMissionSaved),
        onError: fail,
    });

    const updateMissionMutation = useMutation({
        mutationFn: ({ missionId, body }: { missionId: number; body: MissionUpdate }) =>
            updateMission(missionId, body),
        onSuccess: (res, vars) => ok(res.detail, vars.missionId, onMissionSaved),
        onError: fail,
    });

    const deleteMissionMutation = useMutation({
        mutationFn: (missionId: number) => deleteMission(missionId),
        onSuccess: (res) => ok(res.detail, undefined, onMissionDeleted),
        onError: fail,
    });

    // ── KPIs ────────────────────────────────────────────────────────────────
    const createKpiMutation = useMutation({
        mutationFn: ({ missionId, text }: { missionId: number; text: string }) =>
            createKpi(missionId, { text }),
        onSuccess: (res, vars) => ok(res.detail, vars.missionId),
        onError: fail,
    });

    const updateKpiMutation = useMutation({
        mutationFn: ({
            kpiId,
            body,
        }: {
            kpiId: number;
            missionId: number;
            body: { text?: string; percent?: number };
        }) => updateKpi(kpiId, body),
        onSuccess: (res, vars) => ok(res.detail, vars.missionId),
        onError: fail,
    });

    const deleteKpiMutation = useMutation({
        mutationFn: ({ kpiId }: { kpiId: number; missionId: number }) => deleteKpi(kpiId),
        onSuccess: (res, vars) => ok(res.detail, vars.missionId),
        onError: fail,
    });

    // ── competence link ─────────────────────────────────────────────────────
    const setDimensionMutation = useMutation({
        mutationFn: ({ missionId, dimensionId }: { missionId: number; dimensionId: number }) =>
            setMissionDimension(missionId, dimensionId),
        onSuccess: (res, vars) => ok(res.detail, vars.missionId),
        onError: fail,
    });

    const clearDimensionMutation = useMutation({
        mutationFn: ({ missionId }: { missionId: number }) => clearMissionDimension(missionId),
        onSuccess: (res, vars) => ok(res.detail, vars.missionId),
        onError: fail,
    });

    // ── comments ────────────────────────────────────────────────────────────
    const createCommentMutation = useMutation({
        mutationFn: ({ missionId, text }: { missionId: number; text: string }) =>
            createMissionComment(missionId, { text }),
        onSuccess: (res, vars) => ok(res.detail, vars.missionId),
        onError: fail,
    });

    const updateCommentMutation = useMutation({
        mutationFn: ({ commentId, text }: { commentId: number; missionId: number; text: string }) =>
            updateMissionComment(commentId, { text }),
        onSuccess: (res, vars) => ok(res.detail, vars.missionId),
        onError: fail,
    });

    const deleteCommentMutation = useMutation({
        mutationFn: ({ commentId }: { commentId: number; missionId: number }) =>
            deleteMissionComment(commentId),
        onSuccess: (res, vars) => ok(res.detail, vars.missionId),
        onError: fail,
    });

    // ── development vision ──────────────────────────────────────────────────
    const saveVisionMutation = useMutation({
        mutationFn: (text: string) => saveDevelopmentVision(employeeId, text),
        onSuccess: async (res) => {
            await qc.invalidateQueries({ queryKey: DEVELOPMENT_VISION_QK(employeeId) });
            setSnackbar({ open: true, message: res.detail, severity: 'success' });
        },
        onError: fail,
    });

    return {
        createMissionMutation,
        updateMissionMutation,
        deleteMissionMutation,
        createKpiMutation,
        updateKpiMutation,
        deleteKpiMutation,
        setDimensionMutation,
        clearDimensionMutation,
        createCommentMutation,
        updateCommentMutation,
        deleteCommentMutation,
        saveVisionMutation,
    };
}
