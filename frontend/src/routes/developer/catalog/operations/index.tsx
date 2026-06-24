// src/routes/developer/catalog/operations/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { OperationCrud } from '../../../../components/developer/catalog/operations/OperationCrud';

export const Route = createFileRoute('/developer/catalog/operations/')({
    component: () => <OperationCrud />,
});