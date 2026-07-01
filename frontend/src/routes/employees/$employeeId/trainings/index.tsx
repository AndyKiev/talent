// src/routes/employees/$employeeId/trainings/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TrainingsPage } from '../../../../components/employees/trainings/TrainingsPage';

export const Route = createFileRoute('/employees/$employeeId/trainings/')({
  component: TrainingsPage,
});
