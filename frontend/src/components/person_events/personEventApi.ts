// src/components/person_events/personEventApi.ts
import { axiosInstance } from '../../api/axiosInstance';
import { BASE_URL } from '../../utils/eNums.ts';
import type { MutationResponse } from '../../types/mutationResponse';

const BASE = `${BASE_URL}/person_events`;

/** Lifecycle of a person event. Mirrors person_event_statuses (seeded names). */
export enum PersonEventStatus {
    Draft = 'draft',
    Ready = 'ready',
    Applied = 'applied',
}

/** Seeded person_event_types.key values. */
export enum PersonEventTypeKey {
    LastNameChange = 'LAST_NAME_CHANGE',
}

export interface PersonEventChange {
    id: number;
    event_id: number;
    field_key: string;
    prev_value: string | null;
    new_value: string | null;
    created_at: string;
}

export interface PersonEvent {
    id: number;
    person_id: number;
    event_type_id: number;
    status_id: number;
    effective_date: string;
    description: string | null;
    created_by: number | null;
    created_by_name: string | null;
    created_at: string;
    event_type: { id: number; key: string; name: string } | null;
    status: { id: number; name: string } | null;
    changes: PersonEventChange[];
    /** Statuses this event may move to — read from the backend state machine. */
    allowed_targets: string[];
}

export interface LastNameChangeCreate {
    new_last_name: string;
    /** 'YYYY-MM-DD' — since when the new surname applies. Normally in the past. */
    effective_date: string;
    description?: string | null;
}

export const fetchPersonEvents = async (personId: number): Promise<PersonEvent[]> => {
    const res = await axiosInstance.get<PersonEvent[]>(`${BASE}/by_person/${personId}`);
    return res.data ?? [];
};

export const createLastNameChange = async ({
    personId,
    data,
}: {
    personId: number;
    data: LastNameChangeCreate;
}): Promise<MutationResponse<PersonEvent>> => {
    const res = await axiosInstance.post<MutationResponse<PersonEvent>>(
        `${BASE}/by_person/${personId}/last_name_change`,
        data,
    );
    return res.data;
};

export const changePersonEventStatus = async ({
    id,
    status,
}: {
    id: number;
    status: string;
}): Promise<MutationResponse<PersonEvent>> => {
    const res = await axiosInstance.patch<MutationResponse<PersonEvent>>(
        `${BASE}/${id}/status`,
        { status },
    );
    return res.data;
};

export const deletePersonEvent = async (id: number): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${id}`);
};
