// src/routes/developer/catalog/essences/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { EssenceCrud } from '../../../../components/developer/catalog/essences/EssenceCrud';

export const Route = createFileRoute('/developer/catalog/essences/')({
    component: () => <EssenceCrud />,
});