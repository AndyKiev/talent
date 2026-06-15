// src/routes/developer/process_roles/process_role/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProcessRoleCrud } from '../../../../components/developer/process_roles/process_role/ProcessRoleCrud';

export const Route = createFileRoute('/developer/process_roles/process_role/')({
    component: ProcessRoleCrud,
});
