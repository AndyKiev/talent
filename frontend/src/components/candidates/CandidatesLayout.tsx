import { Box } from '@mui/material';
import { Navigate, Outlet } from '@tanstack/react-router';
import AppShell from '../layout/AppShell';
import { PageContainer } from '../layout/PageContainer';
import { useBooleanSetting } from '../../hooks/useAppSetting';

/**
 * Candidates section shell. Candidates are part of the recruitment module, so
 * the same master flag gates them: a direct /candidates URL redirects home when
 * the module is OFF. Child routes render in the Outlet.
 */
export function CandidatesLayout() {
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
