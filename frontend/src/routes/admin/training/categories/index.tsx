// src/routes/admin/training/categories/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TrainingCategoryCrud } from '../../../../components/training/training_categories/TrainingCategoryCrud';

export const Route = createFileRoute('/admin/training/categories/')({
    component: TrainingCategoryCrud,
});
