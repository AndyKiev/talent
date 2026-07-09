// src/components/admin/people_review/PeopleReviewLayout.tsx
import { Box, Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { EssenceCard } from '../../ui/EssenceCard';
import { useEssences } from '../../../hooks/useEssences';
import { ESSENCES as RAW_ESSENCES } from '../admin.essences.config';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';

export function PeopleReviewLayout() {
    const getString = useString({ str });
    const { pathname } = useLocation();
    const isIndex = pathname === '/admin/people_review' || pathname === '/admin/people_review/';

    const allEssences = useEssences(RAW_ESSENCES);
    const children = allEssences.filter((e) => e.parentGroup === 'people_review');

    return (
        <AppShell>
            <PageContainer>
                {isIndex ? (
                    <>
                        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
                            <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                                <Typography variant="body2" color="text.secondary">
                                    {cfl(getString('admin'))}
                                </Typography>
                            </Link>
                            <Typography variant="body2" color="text.primary" fontWeight={600}>
                                {cfl(getString('peopleReview') || 'People Review')}
                            </Typography>
                        </Breadcrumbs>

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
