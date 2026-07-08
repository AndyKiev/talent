// src/routes/admin/persons/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { PersonsPage } from '../../../components/admin/persons/PersonsPage';

export const Route = createFileRoute('/admin/persons/')({
    component: PersonsPage,
});
