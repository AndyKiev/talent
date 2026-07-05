// src/routes/employees/$employeeId/career_history/index.tsx
//
// File-based TanStack route for the Job History tab. Drop this into your routes
// tree alongside the existing employee sub-routes (summary/, events/, etc.).
// Adjust the path string only if your route tree differs.
import { createFileRoute } from '@tanstack/react-router';
import { CareerHistoryTab } from '../../../../components/employees/CareerHistoryTab';

export const Route = createFileRoute('/employees/$employeeId/career_history/')({
    component: CareerHistoryTab,
});