// src/routes/developer/process_roles/process/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { ProcessCrud } from '../../../../components/developer/process_roles/process/ProcessCrud';

export const Route = createFileRoute('/developer/process_roles/process/')({
    component: ProcessCrud,
});
