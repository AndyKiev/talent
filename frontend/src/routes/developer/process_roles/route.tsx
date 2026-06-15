// src/routes/developer/process_roles/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProcessRolesLayout } from '../../../components/developer/process_roles/ProcessRolesLayout';

export const Route = createFileRoute('/developer/process_roles')({
    component: ProcessRolesLayout,
});
