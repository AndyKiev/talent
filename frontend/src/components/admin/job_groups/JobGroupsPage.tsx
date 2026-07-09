// src/components/admin/job_groups/JobGroupsPage.tsx
import AppShell from '../../layout/AppShell';
import { PageContainer } from '../../layout/PageContainer';
import { Breadcrumbs, Typography } from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Link } from '@tanstack/react-router';
import { JobGroupCrud } from './JobGroupCrud';
import useString from '../../../hooks/useString';
import str from '../../../strings/str';
import cfl from '../../../utils/helpers.ts';

export function JobGroupsPage() {
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
            {cfl(getString('jobGroups'))}
          </Typography>
        </Breadcrumbs>
        <JobGroupCrud />
      </PageContainer>
    </AppShell>
  );
}
