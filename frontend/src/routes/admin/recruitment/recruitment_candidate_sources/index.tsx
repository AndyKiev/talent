// src/routes/admin/recruitment/recruitment_candidate_sources/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentCandidateSourceCrud } from '../../../../components/admin/recruitment/sources/RecruitmentCandidateSourceCrud';

export const Route = createFileRoute('/admin/recruitment/recruitment_candidate_sources/')({
    component: RecruitmentCandidateSourceCrud,
});
