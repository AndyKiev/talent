// src/components/admin/people_review/PeopleReviewLayout.tsx
import { Box } from '@mui/material';
import { Outlet, useLocation } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { EssenceCard } from '../../ui/EssenceCard';
import { useEssences } from '../../../hooks/useEssences';
import { ESSENCES as RAW_ESSENCES } from '../admin.essences.config';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import { PageBreadcrumbs } from '../../ui/PageBreadcrumbs';

export function PeopleReviewLayout() {
    const getString = useString();
    const { pathname } = useLocation();
    const isIndex = pathname === '/admin/people_review' || pathname === '/admin/people_review/';

    const allEssences = useEssences(RAW_ESSENCES);
    const children = allEssences.filter((e) => e.parentGroup === 'people_review');

    return (
        <AppShell>
            <PageContainer>
                {isIndex ? (
                    <>
                        <PageBreadcrumbs
                            items={[
                                { to: '/admin', label: cfl(getString('admin')) },
                                { label: cfl(getString('peopleReview') || 'People Review') },
                            ]}
                        />

                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: 2,
                            }}
                        >
                            {children.map((essence) => (
                                <EssenceCard key={essence.key} essence={essence} />
                            ))}
                        </Box>
                    </>
                ) : (
                    <Outlet />
                )}
            </PageContainer>
        </AppShell>
    );
}
