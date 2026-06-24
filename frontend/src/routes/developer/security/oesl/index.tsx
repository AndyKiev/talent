// src/routes/developer/security/oesl/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { OeslCrud } from '../../../../components/developer/security/operation_essence_set_links/OeslCrud';

export const Route = createFileRoute('/developer/security/oesl/')({
    component: () => <OeslCrud />,
});