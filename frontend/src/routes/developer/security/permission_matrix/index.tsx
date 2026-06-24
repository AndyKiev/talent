// src/routes/developer/security/permission_matrix/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { PermissionMatrixPage } from '../../../../components/developer/security/permission_matrix/PermissionMatrixPage';

export const Route = createFileRoute('/developer/security/permission_matrix/')({
    component: () => <PermissionMatrixPage />,
});
 