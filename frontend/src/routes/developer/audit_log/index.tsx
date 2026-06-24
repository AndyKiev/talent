import { createFileRoute } from '@tanstack/react-router';
import { AuditLogPage } from '../../../components/developer/audit_log/AuditLogPage';

export const Route = createFileRoute('/developer/audit_log/')({
    component: AuditLogPage,
});
