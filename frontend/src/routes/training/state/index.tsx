// src/routes/training/state/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { TrainingStatePage } from '../../../components/training/state/TrainingStatePage';

export const Route = createFileRoute('/training/state/')({
    component: TrainingStatePage,
});
