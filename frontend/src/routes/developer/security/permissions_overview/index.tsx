// src/routes/developer/security/permissions_overview/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { PermissionManifestPage } from '../../../../components/developer/security/permissions_overview/PermissionManifestPage';

export const Route = createFileRoute('/developer/security/permissions_overview/')({
    component: () => <PermissionManifestPage />,
});
 