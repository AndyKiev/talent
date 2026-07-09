// src/components/admin/persons/PersonsPage.tsx
import AppShell from '../../layout/AppShell.tsx';
import { PageContainer } from '../../layout/PageContainer';
import { Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { PersonCrud } from './PersonCrud.tsx';
import cfl from '../../../utils/helpers.ts';
import useString from '../../../hooks/useString.ts';

export function PersonsPage() {
    const getString = useString();
    return (
        <AppShell>
            <PageContainer>
                <Breadcrumbs
                    separator={<NavigateNextIcon fontSize="small" />}
                    sx={{ mb: 3 }}
                >
                    <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" color="text.secondary">
                            {cfl(getString('admin'))}
                        </Typography>
                    </Link>
                    <Typography variant="body2" color="text.primary" fontWeight={600}>
                        {cfl(getString('persons'))}
                    </Typography>
                </Breadcrumbs>

                <PersonCrud />
            </PageContainer>
        </AppShell>
    );
}
