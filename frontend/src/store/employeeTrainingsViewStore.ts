// src/store/employeeTrainingsViewStore.ts
//
// "Grid or cards" preference for the employee card's assigned-trainings list
// (EmployeeTrainingsPanel, non-compact usage). One-liner over the shared
// factory — see .claude/skills/grid-cards-toggle/SKILL.md.
import { createViewStore } from './createViewStore';

export const useEmployeeTrainingsViewStore = createViewStore('employee_trainings_view');
