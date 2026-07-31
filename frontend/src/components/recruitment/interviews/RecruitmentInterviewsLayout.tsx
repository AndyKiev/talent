import { Box } from '@mui/material';
import { Navigate, Outlet } from '@tanstack/react-router';
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { useBooleanSetting } from '../../../hooks/useAppSetting';

/**
 * Interviews section shell — part of the recruitment module, so the same
 * master flag gates it: a direct /interviews URL redirects home when the
 * module is OFF.
 */
export function RecruitmentInterviewsLayout() {
    const { enabled: recruitmentModuleOn, isLoading } = useBooleanSetting('recruitment_module_enabled');
    if (isLoading) return null;
    if (!recruitmentModuleOn) return <Navigate to="/" replace />;

    return (
        <AppShell>
            <PageContainer>
                <Box>
                    <Outlet />
                </Box>
            </PageContainer>
        </AppShell>
    );
}
