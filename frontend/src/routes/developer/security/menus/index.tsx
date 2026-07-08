// src/routes/developer/security/menus/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { MenuCrud } from '../../../../components/developer/security/menus/MenuCrud';

export const Route = createFileRoute('/developer/security/menus/')({
    component: () => <MenuCrud />,
});
