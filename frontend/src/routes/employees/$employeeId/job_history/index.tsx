// src/routes/employees/$employeeId/job_history/index.tsx
//
// File-based TanStack route for the Job History tab. Drop this into your routes
// tree alongside the existing employee sub-routes (summary/, events/, etc.).
// Adjust the path string only if your route tree differs.
import { createFileRoute } from '@tanstack/react-router';
import { JobHistoryTab } from '../../../../components/employees/JobHistoryTab';

export const Route = createFileRoute('/employees/$employeeId/job_history/')({
    component: JobHistoryTab,
});