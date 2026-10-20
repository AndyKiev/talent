// src/components/employees/talent_employees/talentRowHandlers.ts
import type { GetStringFn } from '../../../types/getStringFn';
import type { RosterRow, RosterTalent } from './talentEmployeesApi';

// Row / per-talent actions of the talent employees list — the same CRUD the
// employee card's Talent audit tab offers. Shared by the grid and the cards.
export interface TalentRowHandlers {
    openAudit: (row: RosterRow) => void;
    createAudit: (row: RosterRow) => void;
    addJob: (row: RosterRow) => void;
    addInterview: (row: RosterRow) => void;
    changeStatus: (row: RosterRow, talent: RosterTalent) => void;
    deleteTalent: (row: RosterRow, talent: RosterTalent) => void;
}

// Effective status / period label: the HRS interview result when one exists,
// else the HRM assessment (both already resolved by the backend).
export const effectiveLabel = (t: RosterTalent) => t.hrs_label ?? t.hrm_label;

// "HRM status/period: PO - 12 · HRS status/period: PA - 24" (HRS part only
// once interviewed).
export const talentSourceTooltip = (t: RosterTalent, getString: GetStringFn) =>
    [
        `${getString('hrmStatusPeriod')}: ${t.hrm_label}`,
        t.hrs_label ? `${getString('hrsStatusPeriod')}: ${t.hrs_label}` : null,
    ]
        .filter(Boolean)
        .join(' · ');
