// src/components/candidates/recruitmentApplicationStatus.ts
// RecruitmentCandidate-application pipeline as a statusMachine config — any later stage
// on the forward line, plus rejection as a side-exit; hired/rejected are
// terminal. MUST mirror the backend state machine. The original named exports
// are kept as thin views over the machine so consumers stay unchanged.
import type { GetStringFn } from '../../../types/getStringFn';
import type { RecruitmentApplicationStatusKey } from './recruitmentApplicationApi';
import { defineStatusMachine, type StatusChipColor } from '../../../utils/statusMachine';

// Kanban column order (all six stages, left → right).
export const PIPELINE_ORDER: RecruitmentApplicationStatusKey[] = [
    'applied',
    'screen',
    'interview',
    'offer',
    'hired',
    'rejected',
];

export const pipelineStatusMachine = defineStatusMachine<RecruitmentApplicationStatusKey>({
    transitions: {
        applied: ['screen', 'interview', 'offer', 'hired', 'rejected'],
        screen: ['interview', 'offer', 'hired', 'rejected'],
        interview: ['offer', 'hired', 'rejected'],
        offer: ['hired', 'rejected'],
        hired: [],
        rejected: [],
    },
    meta: {
        applied: { color: 'default', labelKey: 'pipelineApplied', labelFallback: 'applied' },
        screen: { color: 'info', labelKey: 'pipelineScreen', labelFallback: 'screen' },
        interview: { color: 'secondary', labelKey: 'pipelineInterview', labelFallback: 'interview' },
        offer: { color: 'warning', labelKey: 'pipelineOffer', labelFallback: 'offer' },
        hired: { color: 'success', labelKey: 'pipelineHired', labelFallback: 'hired' },
        rejected: { color: 'error', labelKey: 'pipelineRejected', labelFallback: 'rejected' },
    },
});

export const PIPELINE_STATUS_COLOR: Record<RecruitmentApplicationStatusKey, StatusChipColor> = {
    applied: pipelineStatusMachine.color('applied'),
    screen: pipelineStatusMachine.color('screen'),
    interview: pipelineStatusMachine.color('interview'),
    offer: pipelineStatusMachine.color('offer'),
    hired: pipelineStatusMachine.color('hired'),
    rejected: pipelineStatusMachine.color('rejected'),
};

/** Stages a card may legally move TO from `current` (terminal = none). */
export function nextStatuses(current: RecruitmentApplicationStatusKey): readonly RecruitmentApplicationStatusKey[] {
    return pipelineStatusMachine.nextStatuses(current);
}

export function canMove(from: RecruitmentApplicationStatusKey, to: RecruitmentApplicationStatusKey): boolean {
    return pipelineStatusMachine.canMove(from, to);
}

export function pipelineLabel(key: RecruitmentApplicationStatusKey, getString: GetStringFn): string {
    return pipelineStatusMachine.label(key, getString);
}
