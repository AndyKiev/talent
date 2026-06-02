// src/routes/employees/$employeeId/dr_history/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { DrHistoryTab } from '../../../../components/employees/DrHistoryTab';

export const Route = createFileRoute('/employees/$employeeId/dr_history/')({
    component: DrHistoryTab,
});