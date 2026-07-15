// src/routes/admin/recruitment/sources/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { CandidateSourceCrud } from '../../../../components/admin/recruitment/sources/CandidateSourceCrud';

export const Route = createFileRoute('/admin/recruitment/sources/')({
    component: CandidateSourceCrud,
});
