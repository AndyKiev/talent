import type { GetStringFn } from '../../types/getStringFn';
import type { PipelineStatusKey } from './candidateApplicationApi';

// Kanban column order (all six stages, left → right).
export const PIPELINE_ORDER: PipelineStatusKey[] = [
    'applied',
    'screen',
    'interview',
    'offer',
    'hired',
    'rejected',
];

type ChipColor =
    | 'default'
    | 'primary'
    | 'secondary'
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

export const PIPELINE_STATUS_COLOR: Record<PipelineStatusKey, ChipColor> = {
    applied: 'default',
    screen: 'info',
    interview: 'secondary',
    offer: 'warning',
    hired: 'success',
    rejected: 'error',
};

// The forward progression line (rejected is a side-exit, not on it).
const STAGE_LINE: PipelineStatusKey[] = ['applied', 'screen', 'interview', 'offer', 'hired'];

// Stages a card may legally move TO from `current` — must mirror the backend
// state machine (any later stage on the line, plus rejection; terminal = none).
export function nextStatuses(current: PipelineStatusKey): PipelineStatusKey[] {
    if (current === 'hired' || current === 'rejected') return [];
    const i = STAGE_LINE.indexOf(current);
    const forward = i >= 0 ? STAGE_LINE.slice(i + 1) : [];
    return [...forward, 'rejected'];
}

export function canMove(from: PipelineStatusKey, to: PipelineStatusKey): boolean {
    return nextStatuses(from).includes(to);
}

const LABEL_KEY: Record<PipelineStatusKey, string> = {
    applied: 'pipelineApplied',
    screen: 'pipelineScreen',
    interview: 'pipelineInterview',
    offer: 'pipelineOffer',
    hired: 'pipelineHired',
    rejected: 'pipelineRejected',
};

export function pipelineLabel(key: PipelineStatusKey, getString: GetStringFn): string {
    return getString(LABEL_KEY[key]) || key;
}
