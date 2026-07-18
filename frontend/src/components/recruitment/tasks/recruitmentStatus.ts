// src/components/recruitment/tasks/recruitmentStatus.ts
// Recruitment-task lifecycle as a statusMachine config (mirrors the REVERSIBLE
// backend state machine — a closed task can be reopened, in-work can go back
// to created). The original named exports are kept as thin views over the
// machine so consumers stay unchanged.
import type { RecruitmentStatusKey } from './recruitmentTaskApi';
import type { GetStringFn } from '../../../types/getStringFn';
import { defineStatusMachine, type StatusChipColor } from '../../../utils/statusMachine';

export const recruitmentStatusMachine = defineStatusMachine<RecruitmentStatusKey>({
    transitions: {
        created: ['in_process', 'rejected'],
        in_process: ['created', 'fulfilled', 'rejected'],
        fulfilled: ['in_process'],
        rejected: ['created', 'in_process'],
    },
    meta: {
        created: {
            color: 'default',
            labelKey: 'recruitmentStatusCreated',
            labelFallback: 'Created',
            transitionLabelKey: 'recruitmentTaskToCreated',
            transitionLabelFallback: 'Back to created',
            transitionColor: 'primary',
        },
        in_process: {
            color: 'info',
            labelKey: 'recruitmentStatusInProcess',
            labelFallback: 'In process',
            transitionLabelKey: 'recruitmentTaskStart',
            transitionLabelFallback: 'Start',
            transitionColor: 'primary',
        },
        fulfilled: {
            color: 'success',
            labelKey: 'recruitmentStatusFulfilled',
            labelFallback: 'Fulfilled',
            transitionLabelKey: 'recruitmentTaskFulfill',
            transitionLabelFallback: 'Fulfill',
            transitionColor: 'success',
        },
        rejected: {
            color: 'error',
            labelKey: 'recruitmentStatusRejected',
            labelFallback: 'Rejected',
            transitionLabelKey: 'recruitmentTaskReject',
            transitionLabelFallback: 'Reject',
            transitionColor: 'error',
        },
    },
});

export const STATUS_COLOR: Record<RecruitmentStatusKey, StatusChipColor> = {
    created: recruitmentStatusMachine.color('created'),
    in_process: recruitmentStatusMachine.color('in_process'),
    fulfilled: recruitmentStatusMachine.color('fulfilled'),
    rejected: recruitmentStatusMachine.color('rejected'),
};

export const statusLabel = (key: RecruitmentStatusKey, getString: GetStringFn): string =>
    recruitmentStatusMachine.label(key, getString);

/** Allowed transitions per current status. */
export const NEXT_STATUSES: Record<RecruitmentStatusKey, readonly RecruitmentStatusKey[]> = {
    created: recruitmentStatusMachine.nextStatuses('created'),
    in_process: recruitmentStatusMachine.nextStatuses('in_process'),
    fulfilled: recruitmentStatusMachine.nextStatuses('fulfilled'),
    rejected: recruitmentStatusMachine.nextStatuses('rejected'),
};

/** Button label for transitioning INTO the given target status. */
export const transitionLabel = (target: RecruitmentStatusKey, getString: GetStringFn): string =>
    recruitmentStatusMachine.transitionLabel(target, getString);

export const transitionColor = (target: RecruitmentStatusKey) =>
    recruitmentStatusMachine.transitionColor(target);
