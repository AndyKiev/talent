// src/routes/employees/$employeeId/talent_audit/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TalentAuditPage } from '../../../../components/employees/talent_audit/TalentAuditPage';

export const Route = createFileRoute('/employees/$employeeId/talent_audit/')({
  component: TalentAuditPage,
});
