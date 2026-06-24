// src/routes/developer/security/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { SecurityGroupLayout } from '../../../components/developer/security/SecurityGroupLayout';

export const Route = createFileRoute('/developer/security')({
    component: SecurityGroupLayout,
});
