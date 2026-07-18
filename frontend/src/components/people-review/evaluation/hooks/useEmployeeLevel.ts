import { useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { GetStringFn } from '../../../../types/getStringFn';
import {
    setEmployeeCurrentLevel,
    type ReviewLevelLite,
    type ProposedLevel,
    type ReviewSessionEmployee,
} from '../../peopleReviewApi';

interface Args {
    sid: number;
    eid: number;
    rseDetail: ReviewSessionEmployee | undefined;
    employeeId: number | undefined;
    viewOnly: boolean;
    allLevels: ReviewLevelLite[];
    sessionLevels: ReviewLevelLite[];
    proposedLevel: ProposedLevel | null | undefined;
    persistDefaultLevel: boolean;
    getString: GetStringFn;
    onError: (message: string) => void;
}

/**
 * Competency-level derivations for the header/job panel: resolve current + base +
 * proposed level, the increase/same/decrease "sense", the Mark-reviewed level gate,
 * the current-level mutation, and the optional persist-default-level effect.
 */
export function useEmployeeLevel({
    sid, eid, rseDetail, employeeId, viewOnly,
    allLevels, sessionLevels, proposedLevel, persistDefaultLevel, getString, onError,
}: Args) {
    const qc = useQueryClient();

    // Resolve a level by id from the active live set, falling back to the session's
    // frozen set (so a proposed/current level later deactivated still resolves).
    const findLevel = (id: number | null) =>
        id == null
            ? null
            : allLevels.find((l) => l.id === id) ??
              sessionLevels.find((l) => l.id === id) ??
              null;
    const proposedLevelKey = proposedLevel
        ? findLevel(proposedLevel.level_id)?.name_key ?? null
        : null;
    const proposedLevelName = proposedLevelKey ? getString(proposedLevelKey) : null;

    // Current level (and the personal-data facts) come off the people-review-scoped
    // RSE detail — no admin GET /employees/{id}.
    const currentLevelId = rseDetail?.current_level_id ?? null;
    // Every employee must have a level: when none is set, fall back to the base
    // level (lowest sort_order). A developer setting decides whether that base is
    // only displayed or actually persisted to the employee record (and re-read).
    const baseLevelId = [...allLevels].sort((a, b) => a.sort_order - b.sort_order)[0]?.id ?? null;
    const displayLevelId = currentLevelId ?? baseLevelId;
    const currentLevelObj = findLevel(displayLevelId);
    const proposedLevelObj = proposedLevel ? findLevel(proposedLevel.level_id) : null;
    const proposedLevelSense: 'increase' | 'same' | 'decrease' | null =
        currentLevelObj && proposedLevelObj
            ? proposedLevelObj.sort_order > currentLevelObj.sort_order
                ? 'increase'
                : proposedLevelObj.sort_order < currentLevelObj.sort_order
                    ? 'decrease'
                    : 'same'
            : null;

    // Level-decision gate for Mark-reviewed (mirrors the backend rule): once the
    // employee has a current level, a proposed level is mandatory; unless it is a
    // decrease, every active requirement of that level must be justified.
    const levelDecisionComplete = (() => {
        if (!currentLevelId) return true;
        if (!proposedLevel) return false;
        if (proposedLevelSense === 'decrease') return true;
        // Count the FROZEN requirement set the employee actually saw (matches the
        // backend gate); fall back to the live level's active requirements.
        const frozenLevel = sessionLevels.find((l) => l.id === proposedLevel.level_id);
        const reqs = frozenLevel
            ? frozenLevel.requirements
            : (proposedLevelObj?.requirements ?? []).filter((r) => r.is_active);
        const answered = new Set(
            proposedLevel.answers.filter((a) => (a.facts ?? '').trim()).map((a) => a.requirement_id),
        );
        return reqs.every((r) => answered.has(r.id));
    })();

    const currentLevelMut = useMutation({
        mutationFn: (levelId: number) => setEmployeeCurrentLevel(employeeId!, levelId),
        onSuccess: async () => {
            // The header (current level) rides on the RSE detail now.
            await qc.invalidateQueries({ queryKey: ['rse_detail', sid, eid] });
        },
        onError: (err: Error) => onError(err.message),
    });

    // Persist-default-level mode: when an editable employee has no current level,
    // write the base level once. The re-read then surfaces it like a real level
    // (display-only mode skips this and just shows the base in the chip).
    const persistedLevelForRef = useRef<number | null>(null);
    useEffect(() => {
        if (!persistDefaultLevel || viewOnly) return;
        if (!employeeId || currentLevelId != null || baseLevelId == null) return;
        if (currentLevelMut.isPending || persistedLevelForRef.current === employeeId) return;
        persistedLevelForRef.current = employeeId;
        currentLevelMut.mutate(baseLevelId);
    }, [persistDefaultLevel, viewOnly, employeeId, currentLevelId, baseLevelId, currentLevelMut]);

    return {
        displayLevelId,
        proposedLevelName,
        proposedLevelSense,
        levelDecisionComplete,
        currentLevelMut,
    };
}
