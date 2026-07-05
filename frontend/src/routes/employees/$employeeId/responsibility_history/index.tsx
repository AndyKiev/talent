// src/routes/employees/$employeeId/responsibility_history/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ResponsibilityHistoryTab } from '../../../../components/employees/ResponsibilityHistoryTab';

export const Route = createFileRoute('/employees/$employeeId/responsibility_history/')({
    component: ResponsibilityHistoryTab,
});