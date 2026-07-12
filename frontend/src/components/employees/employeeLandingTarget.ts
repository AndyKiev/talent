// src/components/employees/employeeLandingTarget.ts
//
// Where a click on an employee forwards — the tab of the employee card,
// driven by the per-user `employee_select_target` app setting (integer bound
// to a fixed option set). Keep the value → route-segment map and the option
// list (dev + user settings) in sync with this single source of truth.
import { useIntegerSetting } from '../../hooks/useAppSetting';

export const EMPLOYEE_SELECT_TARGET_KEY = 'employee_select_target';

// 1 = summary is the employee card's own default landing (see the
// /employees/$employeeId index redirect), so it is the setting default too.
export const EMPLOYEE_SELECT_TARGET_DEFAULT = 1;

export const EMPLOYEE_SELECT_TARGET_SEGMENT: Record<number, string> = {
    1: 'summary',
    2: 'events',
    3: 'career_history',
};

// Option list for the settings single-select (value stored as the integer).
// labelKey resolves via getString in the settings pages.
export const EMPLOYEE_SELECT_TARGET_OPTIONS: { value: string; labelKey: string }[] = [
    { value: '1', labelKey: 'summary' },
    { value: '2', labelKey: 'events' },
    { value: '3', labelKey: 'careerHistory' },
];

/** The route segment to forward to on employee select, per the user's setting. */
export function useEmployeeLandingSegment(): { segment: string; isLoading: boolean } {
    const { value, isLoading } = useIntegerSetting(
        EMPLOYEE_SELECT_TARGET_KEY,
        EMPLOYEE_SELECT_TARGET_DEFAULT,
    );
    const segment =
        EMPLOYEE_SELECT_TARGET_SEGMENT[value] ??
        EMPLOYEE_SELECT_TARGET_SEGMENT[EMPLOYEE_SELECT_TARGET_DEFAULT];
    return { segment, isLoading };
}
