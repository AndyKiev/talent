// src/components/person_events/personEventStatus.ts
//
// THE single definition of the person-event lifecycle for the UI.
// MUST mirror backend/api_v1/person_events/person_event_state_machine.py.
//
// The server also returns `allowed_targets` on every event (read straight from
// its own machine), so prefer that when rendering the actual buttons — this
// config is what gives a status its color and label, and a local fallback when
// an event is rendered without a fresh payload.
import type { GetStringFn } from '../../types/getStringFn';
import { defineStatusMachine, type StatusChipColor } from '../../utils/statusMachine';
import { PersonEventStatus } from './personEventApi';

export type PersonEventStatusKey = 'draft' | 'ready' | 'applied';

export const personEventStatusMachine = defineStatusMachine<PersonEventStatusKey>({
    transitions: {
        draft: ['ready'],
        ready: ['applied', 'draft'],
        applied: ['ready'],
    },
    meta: {
        draft: { color: 'warning', labelKey: 'draft', labelFallback: 'draft' },
        ready: { color: 'info', labelKey: 'ready', labelFallback: 'ready' },
        applied: { color: 'success', labelKey: 'applied', labelFallback: 'applied' },
    },
});

const KEYS: readonly PersonEventStatusKey[] = [
    PersonEventStatus.Draft,
    PersonEventStatus.Ready,
    PersonEventStatus.Applied,
] as const;

const isKnown = (status: string): status is PersonEventStatusKey =>
    KEYS.includes(status as PersonEventStatusKey);

/** Chip color for a person-event status (unknown values render neutral). */
export const personEventStatusColor = (status: string): StatusChipColor =>
    isKnown(status) ? personEventStatusMachine.color(status) : 'default';

/** Translated label for a person-event status. */
export const personEventStatusLabel = (status: string, getString: GetStringFn): string =>
    isKnown(status) ? personEventStatusMachine.label(status, getString) : getString(status) || status;
