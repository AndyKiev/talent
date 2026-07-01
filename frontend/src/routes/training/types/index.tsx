// src/routes/training/types/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TrainingTypeCrud } from '../../../components/training/training_types/TrainingTypeCrud';

export const Route = createFileRoute('/training/types/')({
    component: TrainingTypeCrud,
});
