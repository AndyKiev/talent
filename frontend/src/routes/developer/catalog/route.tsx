// src/routes/developer/catalog/route.tsx
import { createFileRoute } from '@tanstack/react-router';
import { CatalogGroupLayout } from '../../../components/developer/catalog/CatalogGroupLayout';

export const Route = createFileRoute('/developer/catalog')({
    component: CatalogGroupLayout,
});