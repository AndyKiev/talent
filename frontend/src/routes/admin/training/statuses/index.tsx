// src/routes/admin/training/statuses/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { EmployeeTrainingStatusCrud } from '../../../../components/training/employee_training_statuses/EmployeeTrainingStatusCrud';

export const Route = createFileRoute('/admin/training/statuses/')({
    component: EmployeeTrainingStatusCrud,
});
