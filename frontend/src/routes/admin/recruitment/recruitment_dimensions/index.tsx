// src/routes/admin/recruitment/recruitment_dimensions/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { RecruitmentDimensionCrud } from '../../../../components/admin/recruitment/dimensions/RecruitmentDimensionCrud';

export const Route = createFileRoute('/admin/recruitment/recruitment_dimensions/')({
    component: RecruitmentDimensionCrud,
});
