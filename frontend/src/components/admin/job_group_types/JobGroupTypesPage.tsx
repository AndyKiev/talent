// src/components/admin/job_group_types/JobGroupTypesPage.tsx
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { JobGroupTypeCrud } from './JobGroupTypeCrud';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';

export function JobGroupTypesPage() {
  const getString = useString({ str });

  return (
    <AppShell>
      <PageContainer>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 3 }}>
          <Link to="/admin" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="body2" color="text.secondary">
              {cfl(getString('admin'))}
            </Typography>
          </Link>
          <Typography variant="body2" color="text.primary" fontWeight={600}>
            {cfl(getString('jobGroupTypes'))}
          </Typography>
        </Breadcrumbs>
        <JobGroupTypeCrud />
      </PageContainer>
    </AppShell>
  );
}
