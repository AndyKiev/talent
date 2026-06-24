// src/components/developer/event_apply/eventApplyApi.ts
import { axiosInstance } from '../../../api/axiosInstance';
import { BASE_URL } from '../../../utils/eNums';

const BASE = `${BASE_URL}`;

export interface EventApplyFailure {
  event_id: number;
  employee_id: number;
  error: string;
}

export interface EventApplyStats {
  checked: number;
  applied: number;
  failed: number;
  applied_ids: number[];
  failures: EventApplyFailure[];
}

// Triggers the same sweep the scheduler runs: apply every `ready` event whose
// effective_date is on or before today. Returns the run stats.
export const applyDueEmployeeEvents = async (): Promise<EventApplyStats> => {
  const { data } = await axiosInstance.post<EventApplyStats>(
    `${BASE}/employees/events/apply_due`,
  );
  return data;
};
