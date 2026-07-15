import type { RecruitmentStatusKey } from './recruitmentTaskApi';
import type { GetStringFn } from '../../../types/getStringFn';

type ChipColor = 'default' | 'info' | 'success' | 'error';

export const STATUS_COLOR: Record<RecruitmentStatusKey, ChipColor> = {
    created: 'default',
    in_process: 'info',
    fulfilled: 'success',
    rejected: 'error',
};

const STATUS_LABEL_KEY: Record<RecruitmentStatusKey, string> = {
    created: 'recruitmentStatusCreated',
    in_process: 'recruitmentStatusInProcess',
    fulfilled: 'recruitmentStatusFulfilled',
    rejected: 'recruitmentStatusRejected',
};

const STATUS_FALLBACK: Record<RecruitmentStatusKey, string> = {
    created: 'Created',
    in_process: 'In process',
    fulfilled: 'Fulfilled',
    rejected: 'Rejected',
};

export const statusLabel = (key: RecruitmentStatusKey, getString: GetStringFn): string =>
    getString(STATUS_LABEL_KEY[key]) || STATUS_FALLBACK[key];

/** Allowed transitions per current status (mirrors the backend state machine). */
export const NEXT_STATUSES: Record<RecruitmentStatusKey, RecruitmentStatusKey[]> = {
    created: ['in_process', 'rejected'],
    in_process: ['fulfilled', 'rejected'],
    fulfilled: [],
    rejected: [],
};

const TRANSITION_LABEL_KEY: Record<RecruitmentStatusKey, string> = {
    created: 'recruitmentTaskStart',
    in_process: 'recruitmentTaskStart',
    fulfilled: 'recruitmentTaskFulfill',
    rejected: 'recruitmentTaskReject',
};

const TRANSITION_FALLBACK: Record<RecruitmentStatusKey, string> = {
    created: 'Start',
    in_process: 'Start',
    fulfilled: 'Fulfill',
    rejected: 'Reject',
};

/** Button label for transitioning INTO the given target status. */
export const transitionLabel = (target: RecruitmentStatusKey, getString: GetStringFn): string =>
    getString(TRANSITION_LABEL_KEY[target]) || TRANSITION_FALLBACK[target];

export const transitionColor = (target: RecruitmentStatusKey): 'primary' | 'success' | 'error' =>
    target === 'fulfilled' ? 'success' : target === 'rejected' ? 'error' : 'primary';
