// src/routes/admin/people_review/index.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/people_review/')({
    component: () => null, // Layout renders everything — no sub-route content needed
});
