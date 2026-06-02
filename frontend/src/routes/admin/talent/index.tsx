// src/routes/admin/talent/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TalentPage } from '../../../components/admin/talent/TalentPage';

export const Route = createFileRoute('/admin/talent/')({
    component: TalentPage,
});