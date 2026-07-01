// src/routes/training/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TrainingLayout } from '../../components/training/TrainingLayout';

export const Route = createFileRoute('/training')({
    component: TrainingLayout,
});
